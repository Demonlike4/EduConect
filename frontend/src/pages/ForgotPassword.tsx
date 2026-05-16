import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [lastRequestTime, setLastRequestTime] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setIsSuccess(false);

        try {
            // Set language to Spanish
            auth.languageCode = 'es';
            
            // Configure redirection to our custom reset page
            const actionCodeSettings = {
                url: `${window.location.origin}/restaurar-password`,
                handleCodeInApp: true,
            };

            await sendPasswordResetEmail(auth, email, actionCodeSettings);
            setEmail('');
            setIsSuccess(true);
            setLastRequestTime(new Date().toLocaleTimeString());
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/user-not-found') {
                setError('No existe ninguna cuenta vinculada a este correo.');
            } else if (err.code === 'auth/invalid-email') {
                setError('El formato del correo electrónico no es válido.');
            } else {
                setError('Hubo un error al procesar tu solicitud. Inténtalo de nuevo más tarde.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-3xl p-10 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-10">
                    <div className="size-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
                        <span className="material-symbols-outlined text-3xl">key</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Recuperar Contraseña</h2>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium text-sm leading-relaxed px-4">Introduce tu correo corporativo y te enviaremos un enlace seguro para restaurar tu clave.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2 px-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider" htmlFor="email">Email Corporativo</label>
                        </div>
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] group-focus-within:text-indigo-600 transition-colors">mail</span>
                            <input
                                type="email"
                                id="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                                placeholder="nombre@centro.com"
                            />
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
                                    Enviar Enlace de Recuperación
                                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">send</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="text-center pt-2">
                        <Link 
                            to="/login" 
                            className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                            Volver al Login
                        </Link>
                    </div>
                </form>

                {isSuccess && (
                    <div className="mt-8 p-5 bg-green-50 text-green-700 rounded-2xl text-sm font-medium border border-green-100 flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
                        <span className="material-symbols-outlined text-green-600 mt-0.5">check_circle</span>
                        <div className="space-y-1">
                            <p className="font-bold">¡Enlace enviado a las {lastRequestTime}!</p>
                            <p className="opacity-90 leading-relaxed">Si el correo existe en nuestra base de datos, recibirás un enlace en unos minutos. Revisa tu carpeta de spam.</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-8 p-5 bg-red-50 text-red-700 rounded-2xl text-sm font-medium border border-red-100 flex items-start gap-4 animate-in shake-x duration-500">
                        <span className="material-symbols-outlined text-red-600 mt-0.5">error_outline</span>
                        <div className="space-y-1">
                            <p className="font-bold">Hubo un problema</p>
                            <p className="opacity-90 leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
