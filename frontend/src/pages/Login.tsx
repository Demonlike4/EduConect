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
        <div className="flex w-full min-h-screen bg-gray-50 dark:bg-background-dark items-center justify-center p-6">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded shadow-lg border border-gray-100 dark:border-white/10">
                <div className="flex flex-col items-center mb-8" onClick={() => navigate('/')}>
                    <div className="bg-primary p-2 rounded text-white mb-2">
                        <span className="material-symbols-outlined text-2xl">school</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">EduConect</span>
                    <p className="text-gray-500 text-sm mt-1">Acceso al Sistema FCT</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-600 text-sm font-medium">
                        {error}
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">Email</label>
                        <input
                            className="block w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:border-primary focus:outline-none transition-none"
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@ejemplo.com"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300" htmlFor="password">Contraseña</label>
                            <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</button>
                        </div>
                        <input
                            className="block w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:border-primary focus:outline-none transition-none"
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="pt-2">
                        <p className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rol de Usuario</p>
                        <div className="grid grid-cols-3 gap-2">
                            {(['alumno', 'empresa', 'tutor'] as Role[]).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setRole(r)}
                                    className={`py-2 px-1 rounded border text-xs font-bold uppercase ${role === r
                                        ? 'bg-primary border-primary text-white'
                                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'
                                        }`}
                                    type="button"
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded shadow mt-6 disabled:opacity-50 transition-none"
                        type="submit"
                    >
                        {loading ? 'Cargando...' : 'Entrar en el Sistema'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>¿No tienes cuenta? <button onClick={() => navigate('/registro')} className="text-primary font-bold hover:underline">Regístrate</button></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
