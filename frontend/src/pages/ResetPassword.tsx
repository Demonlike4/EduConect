import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../lib/firebase';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [oobCode, setOobCode] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [message, setMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const code = query.get('oobCode');

        if (code) {
            setOobCode(code);
            // Verify the code is valid
            verifyPasswordResetCode(auth, code)
                .then(() => {
                    setIsVerifying(false);
                })
                .catch((err) => {
                    console.error(err);
                    setErrorMsg('El enlace de recuperación es inválido o ha expirado.');
                    setIsVerifying(false);
                });
        } else {
            setErrorMsg('No se ha proporcionado un código de recuperación válido.');
            setIsVerifying(false);
        }
    }, [location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!oobCode) return;
        
        setErrorMsg('');
        setMessage('');

        if (password !== confirmPassword) {
            setErrorMsg('Las contraseñas no coinciden');
            return;
        }
        if (password.length < 6) {
            setErrorMsg('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode, password);
            setMessage('¡Tu contraseña ha sido actualizada con éxito!');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error: any) {
            console.error(error);
            setErrorMsg('Hubo un error al actualizar tu contraseña. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isVerifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin size-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                    <p className="text-slate-500 font-bold text-sm animate-pulse">Verificando código...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-zinc-950 font-sans">
            <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-3xl p-10 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-10">
                    <div className="size-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
                        <span className="material-symbols-outlined text-3xl">lock_reset</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Nueva Contraseña</h2>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium text-sm leading-relaxed px-4">Crea una nueva contraseña segura para tu cuenta de EduConect.</p>
                </div>

                {!message && !errorMsg.includes('inválido') ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block px-1" htmlFor="password">Nueva Contraseña</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] group-focus-within:text-indigo-600 transition-colors">lock</span>
                                    <input
                                        type="password"
                                        id="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block px-1" htmlFor="confirmPassword">Repetir Contraseña</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] group-focus-within:text-indigo-600 transition-colors">lock_clock</span>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                                        placeholder="Confirmar nueva contraseña"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm uppercase tracking-[0.1em] transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                            >
                                {isLoading ? (
                                    <span className="animate-spin material-symbols-outlined">progress_activity</span>
                                ) : (
                                    <>
                                        Actualizar Contraseña
                                        <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">check</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : null}

                {message && (
                    <div className="mt-6 p-5 bg-green-50 text-green-700 rounded-2xl text-sm font-medium border border-green-100 flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
                        <span className="material-symbols-outlined text-green-600 mt-0.5">check_circle</span>
                        <div className="space-y-1">
                            <p className="font-bold">¡Contraseña actualizada!</p>
                            <p className="opacity-90 leading-relaxed">{message}</p>
                            <p className="text-xs pt-2">Redirigiendo al login en unos segundos...</p>
                        </div>
                    </div>
                )}

                {errorMsg && (
                    <div className="mt-6 p-5 bg-red-50 text-red-700 rounded-2xl text-sm font-medium border border-red-100 flex items-start gap-4 animate-in shake-x duration-500">
                        <span className="material-symbols-outlined text-red-600 mt-0.5">error_outline</span>
                        <div className="space-y-1">
                            <p className="font-bold">Error en la validación</p>
                            <p className="opacity-90 leading-relaxed">{errorMsg}</p>
                            <div className="pt-4">
                                <button onClick={() => navigate('/forgot-password')} className="text-xs font-bold text-indigo-600 hover:underline uppercase tracking-widest">Solicitar nuevo enlace</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
