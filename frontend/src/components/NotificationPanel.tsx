import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';

interface NotificationPanelProps {
    role: 'ALUMNO' | 'EMPRESA' | 'TUTOR_CENTRO' | 'TUTOR_EMPRESA';
    onActionClick?: (notif: AppNotification) => void;
}

interface AppNotification {
    id: number;
    type: string;
    title: string;
    desc: string;
    action: string;
    icon: string;
    leida: boolean;
    date: string;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ role, onActionClick }) => {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (user?.email) {
                try {
                    const res = await axios.post('https://educonect.alwaysdata.net/api/notificaciones', { email: user.email });
                    setNotifications(res.data.notificaciones || []);
                } catch (err) {
                    console.error("Error fetching notifications:", err);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchNotifications();
        
        // Polling every 30 seconds for new notifications
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user, role]);

    const markAsRead = async (notif: AppNotification) => {
        try {
            await axios.post(`https://educonect.alwaysdata.net/api/notificaciones/${notif.id}/read`);
            setNotifications(prev => prev.filter(n => n.id !== notif.id));
            if (onActionClick) {
                onActionClick(notif);
            }
        } catch (err) {
            console.error(err);
        }
    };


    const getStylesByType = (type: string) => {
        switch (type) {
            case 'danger':
                return {
                    bg: 'bg-red-50 dark:bg-red-900/10',
                    border: 'border-red-100 dark:border-red-900/30',
                    iconColor: 'text-red-600 dark:text-red-500',
                    titleColor: 'text-red-800 dark:text-red-400',
                    descColor: 'text-red-600 dark:text-red-300',
                    actionColor: 'text-red-700 dark:text-red-400'
                };
            case 'success':
                return {
                    bg: 'bg-emerald-50 dark:bg-emerald-900/10',
                    border: 'border-emerald-100 dark:border-emerald-900/30',
                    iconColor: 'text-emerald-700 dark:text-emerald-500',
                    titleColor: 'text-emerald-800 dark:text-emerald-400',
                    descColor: 'text-emerald-600 dark:text-emerald-300',
                    actionColor: 'text-emerald-700 dark:text-emerald-400'
                };
            case 'neutral':
            default:
                return {
                    bg: 'bg-slate-50 dark:bg-slate-800/40',
                    border: 'border-slate-100 dark:border-slate-800',
                    iconColor: 'text-slate-500',
                    titleColor: 'text-slate-800 dark:text-white',
                    descColor: 'text-slate-500 dark:text-slate-400',
                    actionColor: 'text-slate-500 dark:text-slate-400'
                };
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800 flex flex-col shadow-xl">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="size-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-600 text-[22px]">notifications</span>
                </div>
                <div>
                    <h3 className="text-lg font-black dark:text-white uppercase tracking-tight leading-none">Notificaciones</h3>
                    <p className="text-[10px] text-zinc-400 font-semibold tracking-wide mt-1">Alertas en tiempo real</p>
                </div>
            </div>
            
            <div className="flex flex-col gap-4">
                {loading ? (
                    <div className="text-center py-12 text-zinc-400">
                        <span className="material-symbols-outlined animate-spin text-3xl mb-3 text-indigo-600/30">progress_activity</span>
                        <p className="text-[10px] font-semibold tracking-wide">Sincronizando...</p>
                    </div>
                ) : notifications.filter(n => !n.leida).length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-10 text-center bg-zinc-50 dark:bg-zinc-800/10 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        <div className="size-16 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mb-5 shadow-sm">
                            <span className="material-symbols-outlined text-3xl text-zinc-200 dark:text-zinc-600">notifications_paused</span>
                        </div>
                        <p className="text-zinc-900 font-black dark:text-white text-sm uppercase tracking-tight">Sin alertas pendientes</p>
                        <p className="text-[10px] text-zinc-400 mt-2 font-semibold tracking-wide max-w-[180px]">Te avisaremos cuando haya novedades en tus procesos.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.filter(n => !n.leida).map((notif) => {
                            const styles = getStylesByType(notif.type);
                            return (
                                <div key={notif.id} className={`p-4 rounded-2xl border transition-all duration-300 hover:shadow-md ${styles.bg} ${styles.border} flex flex-col`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`size-8 rounded-lg ${styles.bg} border ${styles.border} flex items-center justify-center shrink-0 shadow-sm`}>
                                            <span className={`material-symbols-outlined ${styles.iconColor} text-[18px]`}>
                                                {notif.icon || 'notifications'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-black text-xs uppercase tracking-tight mb-1 truncate ${styles.titleColor}`}>
                                                {notif.title}
                                            </h4>
                                            <p className={`text-[11px] font-medium leading-relaxed mb-3 ${styles.descColor}`}>
                                                {notif.desc}
                                            </p>
                                            <button 
                                                onClick={() => markAsRead(notif)}
                                                className="text-[9px] font-semibold tracking-wide text-indigo-600 hover:text-indigo-700 underline underline-offset-4 decoration-2"
                                            >
                                                {notif.action || 'Aceptar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <div className="mt-8 pt-5 border-t border-zinc-100 dark:border-zinc-800 text-center">
                <button className="text-[10px] font-black text-zinc-300 hover:text-indigo-600 uppercase tracking-widest transition-colors flex items-center gap-2 justify-center mx-auto">
                    Historial de Actividad
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
            </div>
        </div>
    );
};

export default NotificationPanel;
