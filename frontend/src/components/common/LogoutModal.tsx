import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose }) => {
    const { logout } = useUser();
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleConfirmLogout = () => {
        logout();
        navigate('/login');
    };

    const handleGoHome = () => {
        onClose();
        navigate('/');
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 lg:p-10 font-body">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-zinc-100 dark:border-zinc-800">
                <div className="p-8 pb-6 flex flex-col items-center text-center">
                    <div className="size-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-3xl">power_settings_new</span>
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">¿Cerrar Sesión?</h3>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Estás a punto de salir de tu cuenta. ¿Qué deseas hacer?
                    </p>
                </div>

                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
                    <button 
                        onClick={handleConfirmLogout} 
                        className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95 flex justify-center items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        Sí, cerrar sesión
                    </button>
                    
                    <button 
                        onClick={handleGoHome} 
                        className="w-full py-4 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-zinc-200 dark:border-zinc-700 active:scale-95 flex justify-center items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">home</span>
                        Volver al Home
                    </button>
                    
                    <button 
                        onClick={onClose} 
                        className="w-full py-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold uppercase tracking-widest transition-colors mt-2"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
