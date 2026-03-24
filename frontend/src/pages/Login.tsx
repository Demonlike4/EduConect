import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';

type Role = 'alumno' | 'empresa' | 'tutor';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useUser();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>('alumno');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Llamada real al backend Symfony
            const response = await axios.post('http://localhost:8000/api/login', {
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
        <div className="flex w-full min-h-screen bg-white dark:bg-background-dark">
            {/* Left Side: High-Quality Image */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
                <div className="absolute inset-0 z-10 bg-gradient-to-br from-primary/80 to-primary/40 mix-blend-multiply"></div>
                <img
                    alt="Estudiantes colaborando"
                    className="absolute inset-0 object-cover w-full h-full"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRvdVkKHfFNRidgzxJSQEc-2iWh_k4QfvETMJjJih78PovOEhoXyoe2NhV0F7HAzMQDLWbPwyFwPwePLrcCwypt2dz0wN0RQnjG7zxvUhmHJ8223jBjfdMje7wAT0rpHPg0iU2x18aFKycf0lNijO7IqSGNqgcV169HHFpQ9WiLNebXlKE-3FzL-K7tP-9CGRWnxa2k7m6wOp5rn_rVEBui7hq38krUm2BRAYUWhdi5XUgkMYKqcRsSeNSWeYoCYfNSEO5dyWl1AE"
                />
                <div className="relative z-20 flex flex-col justify-end p-20 text-white w-full">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-white p-2 rounded-lg text-primary">
                            <span className="material-symbols-outlined text-3xl">rocket_launch</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">EduPrácticas Connect</h1>
                    </div>
                    <h2 className="text-5xl font-black leading-[1.1] mb-6">Impulsa tu carrera profesional con nosotros.</h2>
                    <p className="text-xl text-white/90 max-w-md font-light">
                        Conectando talento universitario con las empresas líderes del sector. Tu futuro comienza aquí.
                    </p>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 md:px-12 lg:px-24">
                <div className="max-w-md w-full">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-12" onClick={() => navigate('/')}>
                        <div className="bg-primary p-2 rounded-lg text-white">
                            <span className="material-symbols-outlined">rocket_launch</span>
                        </div>
                        <span className="text-xl font-bold text-slate-900 dark:text-slate-100 italic">EduPrácticas Connect</span>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Iniciar Sesión</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Bienvenido de nuevo. Accede a tu portal personal.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-3">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="email">Correo electrónico</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">mail</span>
                                </div>
                                <input
                                    className="block w-full pl-11 pr-4 py-3.5 bg-background-light dark:bg-slate-800/50 border-none rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-slate-400 transition-all"
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nombre@ejemplo.com"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">Contraseña</label>
                                <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-semibold text-primary hover:underline">¿Olvidaste tu contraseña?</button>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">lock</span>
                                </div>
                                <input
                                    className="block w-full pl-11 pr-12 py-3.5 bg-background-light dark:bg-slate-800/50 border-none rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-slate-400 transition-all"
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                    type="button"
                                >
                                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Role Selector */}
                        <div className="pt-2">
                            <p className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Selecciona tu rol</p>
                            <div className="grid grid-cols-3 gap-2 p-1.5 bg-background-light dark:bg-slate-800 rounded-2xl">
                                {(['alumno', 'empresa', 'tutor'] as Role[]).map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setRole(r)}
                                        className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all ${role === r
                                            ? 'bg-white dark:bg-primary shadow-md text-primary dark:text-white'
                                            : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-700'
                                            }`}
                                        type="button"
                                    >
                                        <span className="material-symbols-outlined text-[22px] mb-1">
                                            {r === 'alumno' ? 'school' : r === 'empresa' ? 'corporate_fare' : 'supervisor_account'}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{r}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            disabled={loading}
                            className="w-full py-4 px-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
                            type="submit"
                        >
                            {loading ? (
                                <span className="animate-spin material-symbols-outlined">progress_activity</span>
                            ) : (
                                <>
                                    <span>Entrar</span>
                                    <span className="material-symbols-outlined text-[20px]">login</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        <p>¿No tienes una cuenta? <button onClick={() => navigate('/registro')} className="text-primary font-bold hover:underline">Regístrate ahora</button></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
