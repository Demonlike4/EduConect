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
                    const res = await axios.post('http://localhost:8000/api/notificaciones', { email: user.email });
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
            await axios.post(`http://localhost:8000/api/notificaciones/${notif.id}/read`);
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
        <div className="bg-white dark:bg-gray-800 p-6 rounded border border-[#e0e0e0] dark:border-white/10 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
                <span className="material-symbols-outlined text-amber-600 text-[22px]">notifications</span>
                <h3 className="text-lg font-bold dark:text-white uppercase tracking-tight">Notificaciones</h3>
            </div>
            
            <div className="flex flex-col gap-4 flex-1">
                {loading ? (
                    <div className="text-center py-10 text-slate-400">
                        <span className="material-symbols-outlined animate-spin text-3xl mb-2">progress_activity</span>
                        <p className="text-sm font-bold">Cargando alertas...</p>
                    </div>
                ) : notifications.filter(n => !n.leida).length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex-1">
                        <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600">notifications_paused</span>
                        </div>
                        <p className="text-slate-500 font-bold dark:text-slate-400 text-sm">No tienes alertas pendientes</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Te avisaremos cuando haya novedades en tus procesos.</p>
                    </div>
                ) : (
                    notifications.filter(n => !n.leida).map((notif) => {
                        const styles = getStylesByType(notif.type);
                        return (
                            <div key={notif.id} className={`p-3 rounded border ${styles.bg} ${styles.border} flex flex-col`}>
                                <div className="flex items-start gap-3">
                                    <span className={`material-symbols-outlined ${styles.iconColor} text-[20px]`}>
                                        {notif.icon || 'notifications'}
                                    </span>
                                    <div className="flex-1">
                                        <h4 className={`font-bold text-sm leading-tight mb-1 ${styles.titleColor}`}>
                                            {notif.title}
                                        </h4>
                                        <p className={`text-xs leading-snug mb-2 ${styles.descColor}`}>
                                            {notif.desc}
                                        </p>
                                        <button 
                                            onClick={() => markAsRead(notif)}
                                            className="text-xs font-bold text-primary hover:underline"
                                        >
                                            {notif.action || 'Aceptar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 text-center">
                <button className="text-xs font-medium text-gray-400 hover:text-primary transition-none">
                    Ver historial
                </button>
            </div>
        </div>
    );
};

export default NotificationPanel;
