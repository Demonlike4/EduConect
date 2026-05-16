import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';
import Logo from '../components/common/Logo';

interface Centro { id: number; nombre: string; }
interface Empresa { id: number; nombre: string; }
interface Grado { id: number; nombre: string; }
interface Tutor { id: number; nombre: string; }

type Role = 'alumno' | 'tutor_centro' | 'tutor_empresa' | 'empresa' | null;

const Registro: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
        const { } = useUser(); // Using hook for other things if needed, or remove it entirely
    
    // States
    const [step, setStep] = useState(1);
    const [role, setRole] = useState<Role>(location.state?.role || null);
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        confirmPassword: '',
        selectedCentro: '',
        selectedGrado: '',
        selectedTutor: '',
        selectedEmpresa: '',
        nombreEmpresa: '',
        cif: ''
    });

    const [centros, setCentros] = useState<Centro[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [gradosDisponibles, setGradosDisponibles] = useState<Grado[]>([]);
    const [tutoresDisponibles, setTutoresDisponibles] = useState<Tutor[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [centrosRes, empresasRes] = await Promise.all([
                    api.get('/public/centros'),
                    api.get('/public/empresas')
                ]);
                setCentros(centrosRes.data);
                setEmpresas(empresasRes.data);
            } catch (err) {
                console.error("Error fetching initial data", err);
            }
        };
        fetchData();
    }, []);

    // Fetch Grados and Tutores when Centro changes
    useEffect(() => {
        if (formData.selectedCentro) {
            const fetchCentroDetails = async () => {
                try {
                    const [gradosRes, tutoresRes] = await Promise.all([
                        api.get(`/public/centros/${formData.selectedCentro}/grados`),
                        api.get(`/public/centros/${formData.selectedCentro}/tutores`)
                    ]);
                    setGradosDisponibles(gradosRes.data);
                    setTutoresDisponibles(tutoresRes.data);
                } catch (err) {
                    console.error("Error fetching centro details", err);
                }
            };
            fetchCentroDetails();
        }
    }, [formData.selectedCentro]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleRoleSelect = (selectedRole: Role) => {
        setRole(selectedRole);
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Create User in Firebase
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const firebaseUser = userCredential.user;

            // 2. Register in our Backend
            const backendData = {
                nombre: formData.nombre,
                email: formData.email,
                password: formData.password,
                role: role,
                firebaseUid: firebaseUser.uid,
                centroId: formData.selectedCentro ? parseInt(formData.selectedCentro) : null,
                grade: formData.selectedGrado,
                tutorId: formData.selectedTutor ? parseInt(formData.selectedTutor) : null,
                nombreEmpresa: role === 'empresa' ? formData.nombreEmpresa : null,
                cif: role === 'empresa' ? formData.cif : null,
                empresaId: role === 'tutor_empresa' ? parseInt(formData.selectedEmpresa) : null
            };

            const response = await api.post('/register', backendData);

            if (response.status === 201) {
                const newUser = response.data.user;
                if (newUser.isAprobado) {
                    navigate('/login', { state: { message: 'Registro exitoso. Por favor, inicia sesión.' } });
                } else {
                    setStep(3); // Success step
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(err.code === 'auth/email-already-in-use' 
                ? 'Este correo ya está registrado.' 
                : 'Hubo un error al procesar tu registro. Por favor, inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { id: 'alumno', label: 'Alumno', icon: 'school', desc: 'Gestiona tus prácticas y dual' },
        { id: 'tutor_centro', label: 'Tutor Centro', icon: 'psychology', desc: 'Coordina alumnos y empresas' },
        { id: 'tutor_empresa', label: 'Tutor Empresa', icon: 'supervisor_account', desc: 'Supervisa alumnos en prácticas' },
        { id: 'empresa', label: 'Empresa', icon: 'corporate_fare', desc: 'Gestiona convenios y ofertas' },
    ];

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-zinc-950 flex items-center justify-center p-4 sm:p-6 font-sans overflow-hidden relative">
            
            {/* Fondo Premium Global */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <img 
                    src="/home_bg_premium.png" 
                    alt="" 
                    className="w-full h-full object-cover"
                    style={{ filter: 'brightness(0.95) contrast(1.1)' }}
                />
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
            </div>

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden min-h-[750px] relative z-10">
                
                {/* Left Panel: Info & Progress (Glass Overhaul) */}
                <div className="lg:col-span-4 bg-white/30 backdrop-blur-lg p-8 lg:p-12 border-r border-slate-200/50 flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <Logo size="md" variant="default" className="mb-12" />

                        <div className="space-y-8">
                            <h2 className="text-4xl font-black leading-tight tracking-tighter text-slate-900 font-outfit">Únete al futuro de la <span className="text-[#4F46E5]">Formación.</span></h2>
                            <p className="text-slate-600 font-bold leading-relaxed">Crea tu cuenta profesional en segundos y empieza a gestionar el talento del mañana.</p>
                        </div>
                    </div>

                    <div className="relative z-10 mt-12 lg:mt-0">
                        <div className="space-y-6">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className={`flex items-center gap-4 transition-all duration-500 ${step >= s ? 'opacity-100' : 'opacity-40'}`}>
                                    <div className={`size-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 shadow-sm transition-all ${step >= s ? 'bg-[#4F46E5] text-white border-[#4F46E5] scale-110 shadow-indigo-500/20' : 'bg-white/50 text-slate-400 border-white/60'}`}>
                                        {s < step ? <span className="material-symbols-outlined text-xl font-black">check</span> : s}
                                    </div>
                                    <span className={`font-black text-xs uppercase tracking-[0.2em] ${step >= s ? 'text-[#4F46E5]' : 'text-slate-400'}`}>
                                        {s === 1 ? 'Perfil' : s === 2 ? 'Detalles' : 'Finalizar'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Decorative Glass Blobs */}
                    <div className="absolute -bottom-20 -right-20 size-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute top-1/3 -left-32 size-64 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
                </div>

                {/* Right Panel: Content */}
                <div className="lg:col-span-8 p-8 lg:p-16 flex flex-col relative overflow-hidden bg-white/20 backdrop-blur-md">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full"
                            >
                                <div className="mb-10">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 font-outfit">Elige tu rol</h3>
                                    <p className="text-slate-500 dark:text-zinc-400 font-bold">Selecciona cómo vas a utilizar la plataforma EduConect.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {roles.map((r) => (
                                        <button
                                            key={r.id}
                                            onClick={() => handleRoleSelect(r.id as Role)}
                                            className="group flex flex-col p-6 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-3xl hover:border-indigo-600 dark:hover:border-indigo-500 transition-all text-left relative overflow-hidden"
                                        >
                                            <div className="size-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-2xl">{r.icon}</span>
                                            </div>
                                            <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">{r.label}</span>
                                            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">{r.desc}</span>
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="material-symbols-outlined text-indigo-600">arrow_forward</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-auto pt-10 text-center lg:text-left">
                                    <p className="text-sm text-slate-500 font-medium">
                                        ¿Ya tienes cuenta?{' '}
                                        <button onClick={() => navigate('/login')} className="text-indigo-600 font-bold hover:underline">Inicia sesión aquí</button>
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col"
                            >
                                <button 
                                    onClick={() => setStep(1)}
                                    className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-8 hover:-translate-x-1 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    Volver a Perfiles
                                </button>

                                <div className="mb-10">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Casi listo...</h3>
                                    <p className="text-slate-500 dark:text-zinc-400 font-medium">Completa tus datos profesionales para el perfil <span className="text-indigo-600 font-bold uppercase">{role?.replace('_', ' ')}</span>.</p>
                                </div>

                                {error && (
                                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-3 animate-pulse">
                                        <span className="material-symbols-outlined">error</span>
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                    {/* Personal Info */}
                                    <div className="sm:col-span-2 space-y-1">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] ml-1">Nombre Completo</label>
                                        <input
                                            type="text" id="nombre" required value={formData.nombre} onChange={handleInputChange}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm font-medium"
                                            placeholder="Nombre y Apellidos"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] ml-1">Email Profesional</label>
                                        <input
                                            type="email" id="email" required value={formData.email} onChange={handleInputChange}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm font-medium"
                                            placeholder="ejemplo@correo.com"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] ml-1">Contraseña</label>
                                        <input
                                            type="password" id="password" required value={formData.password} onChange={handleInputChange}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>

                                    {/* Role Specific Fields */}
                                    {(role === 'alumno' || role === 'tutor_centro') && (
                                        <div className="sm:col-span-2 space-y-1">
                                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] ml-1">Centro Educativo</label>
                                            <select
                                                id="selectedCentro" required value={formData.selectedCentro} onChange={handleInputChange}
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm font-medium appearance-none"
                                            >
                                                <option value="">Selecciona un centro</option>
                                                {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {role === 'alumno' && (
                                        <>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] ml-1">Grado Formativo</label>
                                                <select
                                                    id="selectedGrado" required value={formData.selectedGrado} onChange={handleInputChange}
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm font-medium"
                                                >
                                                    <option value="">Selecciona grado</option>
                                                    {gradosDisponibles.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] ml-1">Tutor Asignado</label>
                                                <select
                                                    id="selectedTutor" required value={formData.selectedTutor} onChange={handleInputChange}
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm font-medium"
                                                >
                                                    <option value="">Selecciona tutor</option>
                                                    {tutoresDisponibles.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    {role === 'tutor_empresa' && (
                                        <div className="sm:col-span-2 space-y-1">
                                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] ml-1">Empresa</label>
                                            <select
                                                id="selectedEmpresa" required value={formData.selectedEmpresa} onChange={handleInputChange}
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm font-medium"
                                            >
                                                <option value="">Selecciona tu empresa</option>
                                                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {role === 'empresa' && (
                                        <>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] ml-1">Nombre Fiscal</label>
                                                <input
                                                    type="text" id="nombreEmpresa" required value={formData.nombreEmpresa} onChange={handleInputChange}
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm font-medium"
                                                    placeholder="Ej: Tech Solutions S.L."
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] ml-1">CIF / NIF</label>
                                                <input
                                                    type="text" id="cif" required value={formData.cif} onChange={handleInputChange}
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm font-medium"
                                                    placeholder="Ej: B12345678"
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="space-y-1 sm:col-span-2">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] ml-1">Confirmar Contraseña</label>
                                        <input
                                            type="password" id="confirmPassword" required value={formData.confirmPassword} onChange={handleInputChange}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm font-medium"
                                            placeholder="Repite tu contraseña"
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="sm:col-span-2 w-full py-4 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
                                    >
                                        {loading ? <span className="animate-spin material-symbols-outlined">progress_activity</span> : 'Crear mi cuenta'}
                                        <span className="material-symbols-outlined text-[20px]">person_add</span>
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center h-full text-center py-10"
                            >
                                <div className="size-24 bg-green-100 text-green-600 rounded-[2.5rem] flex items-center justify-center mb-8 animate-bounce">
                                    <span className="material-symbols-outlined text-5xl">verified</span>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">¡Registro enviado!</h3>
                                <div className="max-w-md space-y-4 text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                                    <p>Tu cuenta ha sido creada en el sistema, pero requiere un paso final.</p>
                                    <div className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-800 text-sm">
                                        {role === 'alumno' && 'Tu Tutor de Centro debe aprobar tu perfil para que puedas acceder.'}
                                        {role === 'tutor_centro' && 'El Administrador del sistema revisará y aprobará tu cuenta.'}
                                        {role === 'tutor_empresa' && 'La empresa seleccionada debe validar tu vinculación.'}
                                        {role === 'empresa' && 'El Administrador revisará los datos fiscales de tu empresa.'}
                                    </div>
                                    <p className="text-xs pt-4">Te enviaremos un email cuando seas aprobado.</p>
                                </div>
                                <button 
                                    onClick={() => navigate('/login')}
                                    className="mt-10 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-indigo-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                                >
                                    Volver al Login
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Registro;
