import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';



const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useUser();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Llamada real al backend Symfony
            const response = await axios.post('https://educonect.alwaysdata.net/api/login', {
                email,
                password
            });

            if (response.data.status === 'success') {
                const userData = response.data.user;

                // Actualizar contexto global con el nombre real de la BD
                login(userData);

                // Redirigir según el rol devuelto por la BD
                if (userData.role === 'ALUMNO') navigate('/dashboard/alumno');
                else if (userData.role === 'EMPRESA') navigate('/dashboard/empresa');
                else if (userData.role === 'TUTOR_CENTRO') navigate('/dashboard/tutor-centro');
                else if (userData.role === 'TUTOR_EMPRESA') navigate('/dashboard/tutor-empresa');
                else if (userData.role === 'SUPERADMIN') navigate('/dashboard/superadmin');
                else navigate('/');
            }

        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al iniciar sesión. Comprueba tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-white dark:bg-zinc-950 overflow-hidden">
            {/* Left Side: Image & Branding (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 hover:scale-110"
                    style={{ backgroundImage: "url('/login_bg.png')" }}
                ></div>
                <div className="absolute inset-0 bg-linear-to-tr from-indigo-900/90 via-indigo-900/40 to-transparent"></div>
                
                <div className="relative z-10 flex flex-col justify-between p-16 h-full text-white">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="bg-white/20 backdrop-blur-md p-2.5 rounded-2xl border border-white/20">
                            <span className="material-symbols-outlined text-2xl text-white">school</span>
                        </div>
                        <span className="text-2xl font-black tracking-tight uppercase">EduConect</span>
                    </div>

                    <div className="max-w-md animate-in slide-in-from-left-8 duration-700">
                        <h2 className="text-5xl font-black leading-tight tracking-tight mb-6">
                            Gestiona el futuro de la <span className="text-indigo-300">Formación Profesional</span>
                        </h2>
                        <div className="h-1.5 w-24 bg-indigo-500 rounded-full mb-8"></div>
                        <p className="text-lg text-white/80 font-medium leading-relaxed">
                            Conecta centros educativos, empresas y alumnos en un entorno digital eficiente y transparente.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-bold text-white/50 uppercase tracking-widest">
                        <span>FCT Management System</span>
                        <div className="size-1 bg-white/30 rounded-full"></div>
                        <span>v2.0 2026</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20 bg-zinc-50 dark:bg-zinc-950 animate-in fade-in duration-500">
                <div className="w-full max-w-[420px] transition-all">
                    <div className="mb-10 lg:hidden flex flex-col items-center">
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 p-3 rounded-2xl text-white shadow-xl shadow-indigo-600/20 mb-4">
                            <span className="material-symbols-outlined text-3xl">school</span>
                        </div>
                        <h1 className="text-2xl font-black text-zinc-900 dark:text-white uppercase">EduConect</h1>
                    </div>

                    <div className="space-y-2 mb-10">
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Bienvenido de nuevo</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Introduce tus credenciales para acceder a la plataforma.</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-3 animate-in shake-x duration-500">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1" htmlFor="email">Email Corporativo</label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-600 transition-colors">mail</span>
                                <input
                                    className="block w-full px-12 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all"
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nombre@centro.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest" htmlFor="password">Contraseña</label>
                                <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">¿Olvidaste tu contraseña?</button>
                            </div>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-600 transition-colors">lock</span>
                                <input
                                    className="block w-full px-12 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all"
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                            type="submit"
                        >
                            {loading ? (
                                <span className="animate-spin material-symbols-outlined">progress_activity</span>
                            ) : (
                                <>
                                    Acceder al Sistema
                                    <span className="material-symbols-outlined text-[20px]">login</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
                            ¿Aún no tienes cuenta? 
                            <button 
                                onClick={() => navigate('/registro')} 
                                className="ml-2 text-indigo-600 font-black hover:text-indigo-700 hover:underline transition-all"
                            >
                                Crea tu perfil ahora
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
