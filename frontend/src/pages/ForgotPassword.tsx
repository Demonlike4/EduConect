import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [devToken, setDevToken] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:8000/api/auth/forgot-password', { email });
            setMessage(res.data.message);
            if (res.data.dev_mode_token) {
                setDevToken(res.data.dev_mode_link); // just to show on screen for this dev scenario
            }
        } catch (error) {
            setMessage('Hubo un error al procesar tu solicitud.');
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="text-center mb-8">
                    <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                        <span className="material-symbols-outlined text-3xl">key</span>
                    </div>
                    <h2 className="text-2xl font-black mb-2 dark:text-white">Recuperar Contraseña</h2>
                    <p className="text-slate-500 text-sm">Introduce tu correo y te enviaremos un enlace.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Correo Electrónico</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            placeholder="tu@email.com"
                        />
                    </div>
                    
                    <button type="submit" className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-primary/30 active:scale-95">
                        Enviar Enlace
                    </button>
                    <button type="button" onClick={() => navigate('/login')} className="w-full py-3 bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl font-bold transition-all mt-2">
                        Volver al Login
                    </button>
                </form>

                {message && (
                    <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-xl text-sm font-medium border border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 text-center">
                        {message}
                        {devToken && (
                            <div className="mt-4 break-words">
                                <span className="font-bold block mb-1">¡Modo Local! Aquí tienes el enlace directo (email no configurado en entorno de pruebas):</span>
                                <a href={devToken} className="text-blue-500 underline text-xs">{devToken}</a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
