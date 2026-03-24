import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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

        try {
            const res = await axios.post('http://localhost:8000/api/auth/reset-password', { token, password });
            setMessage(res.data.message);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error: any) {
            setErrorMsg(error.response?.data?.error || 'Hubo un error al procesar tu solicitud.');
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="text-center mb-8">
                    <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                        <span className="material-symbols-outlined text-3xl">lock_reset</span>
                    </div>
                    <h2 className="text-2xl font-black mb-2 dark:text-white">Nueva Contraseña</h2>
                    <p className="text-slate-500 text-sm">Crea tu nueva contraseña segura.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nueva Contraseña</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Repetir Contraseña</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            placeholder="Confirmar nueva contraseña"
                        />
                    </div>
                    
                    <button type="submit" className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-primary/30 active:scale-95">
                        Restaurar Contraseña
                    </button>
                    <button type="button" onClick={() => navigate('/login')} className="w-full py-3 bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl font-bold transition-all mt-2">
                        Cancerlar
                    </button>
                </form>

                {errorMsg && (
                    <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 flex items-center gap-2">
                        <span className="material-symbols-outlined">error</span>
                        {errorMsg}
                    </div>
                )}
                {message && (
                    <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-xl text-sm font-medium border border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 flex items-center gap-2">
                        <span className="material-symbols-outlined">check_circle</span>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
