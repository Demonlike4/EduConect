import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';

interface Centro {
    id: number;
    nombre: string;
}

// Removed hardcoded centros
interface Empresa {
    id: number;
    nombre: string;
}

interface Centro {
    id: number;
    nombre: string;
    direccion?: string;
}

interface Grado {
    id: number;
    nombre: string;
}

type Role = 'alumno' | 'tutor_centro' | 'tutor_empresa' | 'empresa' | null;

const Registro: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useUser();
    const [role, setRole] = useState<Role>(location.state?.role || null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedCentro, setSelectedCentro] = useState<string>('');
    const [selectedGrado, setSelectedGrado] = useState<string>('');
    const [nombre, setNombre] = useState('');
    const [nombreEmpresa, setNombreEmpresa] = useState<string>('');
    const [cif, setCif] = useState<string>('');
    const [centros, setCentros] = useState<Centro[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');
    const [gradosDisponibles, setGradosDisponibles] = useState<Grado[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        const fetchCentros = async () => {
            try {
                const res = await axios.get('https://educonect.alwaysdata.net/api/public/centros');
                setCentros(res.data);
            } catch (err) {
                console.error("Error fetching centros", err);
            }
        };
        const fetchEmpresas = async () => {
            try {
                const res = await axios.get('https://educonect.alwaysdata.net/api/public/empresas');
                setEmpresas(res.data);
            } catch (err) {
                console.error("Error fetching empresas", err);
            }
        };
        fetchCentros();
        fetchEmpresas();
    }, []);

    interface Tutor {
        id: number;
        nombre: string;
    }

    const [selectedTutor, setSelectedTutor] = useState<string>('');
    const [tutoresDisponibles, setTutoresDisponibles] = useState<Tutor[]>([]);

    const handleCentroChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const centroId = e.target.value;
        setSelectedCentro(centroId);
        setSelectedGrado('');
        setSelectedTutor('');

        if (centroId) {
            try {
                const res = await axios.get(`https://educonect.alwaysdata.net/api/public/centros/${centroId}/grados`);
                setGradosDisponibles(res.data);

                const resTutores = await axios.get(`https://educonect.alwaysdata.net/api/public/centros/${centroId}/tutores`);
                setTutoresDisponibles(resTutores.data);
            } catch (err) {
                console.error("Error fetching data", err);
                setGradosDisponibles([]);
                setTutoresDisponibles([]);
            }
        } else {
            setGradosDisponibles([]);
            setTutoresDisponibles([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validar formato base de email en el cliente
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Por favor, introduce un correo electrónico válido.");
            setLoading(false);
            return;
        }

        try {
            const data = {
                nombre,
                email,
                password,
                role,
                centroId: selectedCentro ? parseInt(selectedCentro) : null,
                grade: selectedGrado,
                tutorId: selectedTutor ? parseInt(selectedTutor) : null,
                nombreEmpresa: role === 'empresa' ? nombreEmpresa : null,
                cif: role === 'empresa' ? cif : null,
                empresaId: role === 'tutor_empresa' ? parseInt(selectedEmpresa) : null
            };

            // Asegúrate de que el backend Symfony esté corriendo en el puerto 8000
            const response = await axios.post('https://educonect.alwaysdata.net/api/register', data);

            if (response.status === 201) {
                const newUser = response.data.user;
                if (newUser.isAprobado) {
                    // Auto-login if approved
                    login(newUser);
                    navigate('/');
                } else {
                    // Show pending message if not approved
                    let message = 'Registro completado. Tu cuenta está pendiente de aprobación.';
                    if (role === 'alumno') {
                        message = 'Registro completado. Tu cuenta está pendiente de aprobación por tu Tutor de Centro.';
                    } else if (role === 'tutor_centro') {
                        message = 'Registro completado. Tu cuenta está pendiente de aprobación por el Administrador del sistema.';
                    } else if (role === 'tutor_empresa') {
                        message = 'Registro completado. Tu cuenta está pendiente de aprobación por tu Empresa.';
                    } else if (role === 'empresa') {
                        message = 'Registro completado. La empresa ha sido registrada y está pendiente de aprobación por el Administrador.';
                    }
                    alert(message);
                    navigate('/login');
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Error al conectar con el servidor. ¿Está el backend encendido?');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { id: 'alumno', label: 'Alumno', icon: 'school' },
        { id: 'tutor_centro', label: 'Tutor Centro', icon: 'psychology' },
        { id: 'tutor_empresa', label: 'Tutor Empresa', icon: 'supervisor_account' },
        { id: 'empresa', label: 'Empresa', icon: 'corporate_fare' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background-dark flex flex-col items-center justify-center p-6">
            {/* Logo Section */}
            <div className="flex items-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('/')}>
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 p-2 rounded text-white shadow-sm">
                    <span className="material-symbols-outlined text-2xl">school</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-800 dark:text-white uppercase">EduConect</span>
            </div>

            <div className="w-full max-w-lg bg-white dark:bg-gray-800 border border-[#e0e0e0] dark:border-white/10 rounded p-8 shadow-sm">

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-3 animate-in fade-in duration-300">
                        <span className="material-symbols-outlined">error</span>
                        {error}
                    </div>
                )}

                {!role ? (
                    <div>
                        <div className="mb-8 text-center">
                            <h2 className="text-2xl font-bold tracking-tight mb-2 dark:text-white">Selecciona tu perfil</h2>
                            <p className="text-gray-500 text-sm">¿Cómo vas a utilizar la plataforma?</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {roles.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => setRole(r.id as Role)}
                                    className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 dark:bg-white/5 border border-transparent hover:border-indigo-600/50 hover:bg-white dark:hover:bg-white/10 rounded transition-none group text-gray-700 dark:text-gray-300"
                                >
                                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white rounded flex items-center justify-center">
                                        <span className="material-symbols-outlined text-2xl">{r.icon}</span>
                                    </div>
                                    <span className="font-bold text-sm uppercase">{r.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div>
                        <button
                            onClick={() => { setRole(null); setError(null); }}
                            className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-6 hover:underline"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Cambiar tipo de cuenta
                        </button>

                        <div className="mb-8">
                            <h2 className="text-2xl font-bold tracking-tight mb-2 dark:text-white uppercase">Registro</h2>
                            <p className="text-gray-500 text-sm">
                                Creando cuenta como <span className="text-indigo-600 font-bold">{role.replace('_', ' ').toUpperCase()}</span>
                            </p>
                        </div>

                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-[#111318] dark:text-white ml-1">Nombre Completo</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#616f89] group-focus-within:text-indigo-600 transition-colors">person</span>
                                    <input
                                        type="text"
                                        required
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-[#e0e0e0] dark:border-white/10 rounded py-3 pl-12 pr-4 outline-none focus:border-indigo-600 transition-none font-medium text-sm"
                                        placeholder="Nombre y Apellidos"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-[#111318] dark:text-white ml-1">Email profesional</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#616f89] group-focus-within:text-indigo-600 transition-colors">mail</span>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-[#e0e0e0] dark:border-white/10 rounded py-3 pl-12 pr-4 outline-none focus:border-indigo-600 transition-none font-medium text-sm"
                                        placeholder="ejemplo@correo.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-[#111318] dark:text-white ml-1">Contraseña</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#616f89] group-focus-within:text-indigo-600 transition-colors">lock</span>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-[#e0e0e0] dark:border-white/10 rounded py-3 pl-12 pr-4 outline-none focus:border-indigo-600 transition-none font-medium text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {(role === 'alumno' || role === 'tutor_centro') && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-[#111318] dark:text-white ml-1">Centro Educativo</label>
                                        <div className="relative group">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#616f89] group-focus-within:text-indigo-600 transition-colors">school</span>
                                            <select
                                                required
                                                value={selectedCentro}
                                                onChange={handleCentroChange}
                                                className="w-full bg-white dark:bg-[#1e293b] text-[#111318] dark:text-white border border-[#dbdfe6] dark:border-white/10 rounded-xl py-3.5 pl-12 pr-10 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all appearance-none cursor-pointer font-medium"
                                            >
                                                <option value="" className="bg-white dark:bg-[#1e293b] text-[#111318] dark:text-white">Selecciona un centro</option>
                                                {centros.map(centro => (
                                                    <option key={centro.id} value={centro.id} className="bg-white dark:bg-[#1e293b] text-[#111318] dark:text-white">
                                                        {centro.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#616f89] pointer-events-none">expand_more</span>
                                        </div>
                                    </div>

                                    {role === 'alumno' && (
                                        <>
                                            <div className="space-y-1.5 animate-in fade-in duration-300">
                                                <label className="text-sm font-bold text-[#111318] dark:text-white ml-1">Grado formativo</label>
                                                <div className="relative group">
                                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#616f89] group-focus-within:text-indigo-600 transition-colors">workspace_premium</span>
                                                    <select
                                                        required
                                                        value={selectedGrado}
                                                        onChange={(e) => setSelectedGrado(e.target.value)}
                                                        disabled={!selectedCentro}
                                                        className="w-full bg-white dark:bg-[#1e293b] text-[#111318] dark:text-white border border-[#dbdfe6] dark:border-white/10 rounded-xl py-3.5 pl-12 pr-10 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                                    >
                                                        <option value="" className="bg-white dark:bg-[#1e293b] text-[#111318] dark:text-white">Selecciona un grado</option>
                                                        {gradosDisponibles.map(grado => (
                                                            <option key={grado.id} value={grado.id} className="bg-white dark:bg-[#1e293b] text-[#111318] dark:text-white">
                                                                {grado.nombre}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#616f89] pointer-events-none">expand_more</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 animate-in fade-in duration-300 mt-4">
                                                <label className="text-sm font-bold text-[#111318] dark:text-white ml-1">Tutor de Centro</label>
                                                <div className="relative group">
                                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#616f89] group-focus-within:text-indigo-600 transition-colors">person</span>
                                                    <select
                                                        required
                                                        value={selectedTutor}
                                                        onChange={(e) => setSelectedTutor(e.target.value)}
                                                        disabled={!selectedCentro}
                                                        className="w-full bg-white dark:bg-[#1e293b] text-[#111318] dark:text-white border border-[#dbdfe6] dark:border-white/10 rounded-xl py-3.5 pl-12 pr-10 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                                    >
                                                        <option value="" className="bg-white dark:bg-[#1e293b] text-[#111318] dark:text-white">Selecciona tu tutor</option>
                                                        {tutoresDisponibles.map(tutor => (
                                                            <option key={tutor.id} value={tutor.id} className="bg-white dark:bg-[#1e293b] text-[#111318] dark:text-white">
                                                                {tutor.nombre}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#616f89] pointer-events-none">expand_more</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {role === 'tutor_empresa' && (
                                <div className="space-y-1.5 animate-in fade-in duration-300">
                                    <label className="text-sm font-bold text-[#111318] dark:text-white ml-1">Selecciona tu Empresa</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#616f89] group-focus-within:text-indigo-600 transition-colors">corporate_fare</span>
                                        <select
                                            required
                                            value={selectedEmpresa}
                                            onChange={(e) => setSelectedEmpresa(e.target.value)}
                                            className="w-full bg-white dark:bg-[#1e293b] text-[#111318] dark:text-white border border-[#dbdfe6] dark:border-white/10 rounded-xl py-3.5 pl-12 pr-10 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all appearance-none cursor-pointer font-medium"
                                        >
                                            <option value="" className="bg-white dark:bg-[#1e293b] text-[#111318] dark:text-white">Selecciona empresa</option>
                                            {empresas.map(emp => (
                                                <option key={emp.id} value={emp.id} className="bg-white dark:bg-[#1e293b] text-[#111318] dark:text-white">
                                                    {emp.nombre}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#616f89] pointer-events-none">expand_more</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2 px-1">Nota: Deberás ser aprobado por la empresa antes de poder gestionar alumnos.</p>
                                </div>
                            )}

                            {role === 'empresa' && (
                                <div className="space-y-1.5 animate-in fade-in duration-300">
                                    <label className="text-sm font-bold text-[#111318] dark:text-white ml-1">Nombre de la Empresa</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#616f89] group-focus-within:text-indigo-600 transition-colors">business</span>
                                        <input
                                            type="text"
                                            required
                                            value={nombreEmpresa}
                                            onChange={(e) => setNombreEmpresa(e.target.value)}
                                            className="w-full bg-background-light dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium"
                                            placeholder="Nombre fiscal o comercial"
                                        />
                                    </div>
                                    <div className="relative group mt-3">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#616f89] group-focus-within:text-indigo-600 transition-colors">badge</span>
                                        <input
                                            type="text"
                                            required
                                            value={cif}
                                            onChange={(e) => setCif(e.target.value)}
                                            className="w-full bg-background-light dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium"
                                            placeholder="CIF (ej: B12345678)"
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white font-bold py-3.5 rounded shadow hover:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/90 active:scale-95 transition-none flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin material-symbols-outlined">progress_activity</span>
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Confirmar registro</span>
                                        <span className="material-symbols-outlined">check</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                <div className="text-center pt-8">
                    <p className="text-sm text-[#616f89]">
                        ¿Ya tienes cuenta?{' '}
                        <button
                            onClick={() => navigate('/login')}
                            className="text-indigo-600 font-bold hover:underline"
                        >
                            Iniciar sesión
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Registro;
