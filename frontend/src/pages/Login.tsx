import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useUser, type UserRole } from '../context/UserContext';
import { motion } from 'framer-motion';
import Logo from '../components/common/Logo';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useUser();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const firebaseUser = result.user;
            const email = firebaseUser.email || '';

            const roleMapping: Record<string, UserRole> = {
                'andresmartinezmartinez2005@gmail.com': 'SUPERADMIN',
                'admin@educonect.com': 'SUPERADMIN',
                'tutor@centro.edu': 'TUTOR_CENTRO',
                'empresa@colabora.com': 'EMPRESA'
            };

            const assignedRole: UserRole = roleMapping[email] || 'ALUMNO';
            
            const userData = {
                id: Math.floor(Math.random() * 1000),
                email: email,
                nombre: firebaseUser.displayName || 'Usuario Google',
                role: assignedRole,
                foto: firebaseUser.photoURL || undefined
            };
            
            login(userData, 'google_auth_token_mock');

            if (assignedRole === 'SUPERADMIN') navigate('/dashboard/superadmin');
            else if (assignedRole === 'TUTOR_CENTRO') navigate('/dashboard/tutor-centro');
            else if (assignedRole === 'EMPRESA') navigate('/dashboard/empresa');
            else navigate('/dashboard/alumno');

        } catch (err: any) {
            console.error(err);
            setError('Error al iniciar sesión con Google.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/login', {
                email,
                password
            });

            // Validación exhaustiva de la respuesta del backend
            const { token, user: userData } = response.data;

            // Verificar que el token no sea nulo, undefined ni cadena vacía
            if (!token || typeof token !== 'string' || token.trim() === '') {
                console.error("Login fallido: Token recibido es nulo, indefinido o vacío.", token);
                setError('Respuesta de servidor incompleta: token inválido.');
                return;
            }

            // Verificar que los datos del usuario sean válidos
            if (!userData || !userData.role) {
                console.error("Login fallido: Datos de usuario incompletos.", userData);
                setError('Respuesta de servidor incompleta: datos de usuario inválidos.');
                return;
            }

            // Normalizar el rol: eliminar prefijo ROLE_ si existe
            const normalizedRole = userData.role.startsWith('ROLE_')
                ? userData.role.substring(5)
                : userData.role;

            const normalizedUserData = {
                ...userData,
                role: normalizedRole
            };

            // Persistencia en contexto y sessionStorage
            login(normalizedUserData, token);
            console.log(`Login exitoso para usuario ${userData.email} con rol ${normalizedRole}`);

            // Redirección inteligente según el rol normalizado
            const dashboardRoutes: Record<string, string> = {
                'SUPERADMIN': '/dashboard/superadmin',
                'TUTOR_CENTRO': '/dashboard/tutor-centro',
                'TUTOR_EMPRESA': '/dashboard/tutor-empresa',
                'EMPRESA': '/dashboard/empresa',
                'ALUMNO': '/dashboard/alumno'
            };

            const targetPath = dashboardRoutes[normalizedRole] || '/';
            navigate(targetPath);
        } catch (err: any) {
            // Manejo de errores específicos
            if (err.response?.status === 429) {
                setError('Demasiados intentos. Por seguridad, tu acceso ha sido restringido temporalmente (15 min).');
            } else if (err.response?.status === 401) {
                setError('Credenciales inválidas. Verifica tu email y contraseña.');
            } else if (err.response?.status === 500) {
                setError('Error del servidor. Por favor, intenta más tarde.');
            } else {
                setError(err.response?.data?.error || 'Error al iniciar sesión. Comprueba tus credenciales.');
            }
            console.error("Error en handleSubmit:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden font-inter selection:bg-indigo-100 selection:text-indigo-900">
            {/* Background Premium Global */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <img 
                    src="/home_bg_premium.png" 
                    alt="" 
                    className="w-full h-full object-cover"
                    style={{ filter: 'brightness(0.95) contrast(1.1)' }}
                />
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
            </div>

            <main className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-16">
                {/* Login Glass Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-[460px] bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/50 shadow-2xl p-10 lg:p-14"
                >
                    <div className="flex flex-col gap-8">
                        {/* Logo */}
                        <Logo size="md" variant="default" className="w-fit" />

                        {/* Header */}
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2 font-outfit">Bienvenido de nuevo</h2>
                            <p className="text-slate-600 text-sm font-medium">Gestión inteligente de la Formación Profesional.</p>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50/50 backdrop-blur-sm border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-3 animate-bounce-slow">
                                <span className="material-symbols-outlined text-[18px]">error_outline</span>
                                {error}
                            </div>
                        )}

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider" htmlFor="email">Email Corporativo</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4F46E5] transition-colors">mail</span>
                                    <input
                                        type="email"
                                        id="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="nombre@centro.com"
                                        className="block w-full pl-12 pr-4 py-4 bg-white/60 border border-white/50 rounded-2xl text-slate-900 text-sm font-semibold outline-none focus:bg-white/80 focus:ring-4 focus:ring-indigo-600/10 focus:border-[#4F46E5] transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="password">Contraseña</label>
                                    <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-bold text-[#4F46E5] hover:underline">¿Olvidaste tu clave?</button>
                                </div>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4F46E5] transition-colors">lock</span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="block w-full pl-12 pr-12 py-4 bg-white/60 border border-white/50 rounded-2xl text-slate-900 text-sm font-semibold outline-none focus:bg-white/80 focus:ring-4 focus:ring-indigo-600/10 focus:border-[#4F46E5] transition-all"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#4F46E5] transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    disabled={loading}
                                    className="w-full py-4 bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold text-xl tracking-wide rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
                                    type="submit"
                                >
                                    {loading ? (
                                        <span className="animate-spin material-symbols-outlined">progress_activity</span>
                                    ) : (
                                        <>
                                            Entrar
                                            <span className="material-symbols-outlined text-2xl group-hover:translate-x-1 transition-transform">login</span>
                                        </>
                                    )}
                                </button>
                                
                                <div className="relative py-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/40"></div>
                                    </div>
                                    <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-medium text-slate-500">
                                        <span className="bg-transparent px-4">O continúa con</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    className="w-full py-4 bg-white/60 hover:bg-white/80 border border-white/50 text-slate-900 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-black/5 active:scale-[0.98]"
                                >
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="size-5" alt="Google" />
                                    Google
                                </button>
                            </div>
                        </form>

                        <div className="text-center">
                            <p className="text-slate-500 font-semibold text-xs">
                                ¿No tienes cuenta? 
                                <button 
                                    onClick={() => navigate('/registro')} 
                                    className="ml-2 text-[#4F46E5] font-black hover:underline"
                                >
                                    Regístrate aquí
                                </button>
                            </p>
                        </div>
                    </div>

                    <footer className="mt-8 flex items-center justify-center gap-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Link to="/aviso-legal" className="hover:text-[#4F46E5] transition-colors">Aviso Legal</Link>
                        <Link to="/privacidad" className="hover:text-[#4F46E5] transition-colors">Privacidad</Link>
                    </footer>
                </motion.div>

                {/* Floating Office Image (Optional Integration) */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="hidden xl:block relative w-full max-w-lg"
                >
                    <div className="absolute -inset-10 bg-[#4F46E5]/10 rounded-full blur-[100px] animate-pulse"></div>
                    <img 
                        src="/login_bg.png" 
                        alt="Workspace" 
                        className="relative w-full h-auto rounded-[3rem] shadow-2xl border border-white/20 skew-y-1 hover:skew-y-0 transition-transform duration-700"
                    />
                    <div className="absolute -bottom-6 -left-6 bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/50 max-w-[200px]">
                        <p className="text-[10px] font-black text-[#4F46E5] uppercase tracking-widest mb-1">Ecosistema FCT</p>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed">Conexión inteligente entre talento y empresa.</p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default Login;
