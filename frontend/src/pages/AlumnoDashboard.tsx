import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import ChatSystem from '../components/ChatSystem';
import NotificationPanel from '../components/NotificationPanel';

interface DashboardData {
    nombre: string;
    grado: string;
    estado_practicas: string; // 'POSTULADO', 'ADMITIDO', 'VALIDADO', 'Sin solicitud'
    empresa?: string;
    puesto?: string;
    tutor_empresa?: string;
    tutor_centro?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    candidatura_id?: number;
}

interface DiarioEntry {
    id: number;
    fecha: string;
    actividad: string;
    horas: number;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
    observaciones?: string;
}

interface Oferta {
    id: number;
    titulo: string;
    empresa: string;
    descripcion: string;
    ubicacion: string;
    tags: string[];
}

const TimeProgress: React.FC<{ start: string, end: string }> = ({ start, end }) => {
    if (!start || !end) return <div className="text-sm text-gray-500">Fechas no disponibles</div>;

    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const now = new Date().getTime();

    const totalDuration = endDate - startDate;
    const elapsed = now - startDate;
    const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return (
        <div className="w-full">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Tiempo Restante</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">{Math.max(0, daysLeft)} Días</p>
                </div>
                <p className="text-xs text-gray-500 font-bold">{Math.round(progress)}%</p>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded overflow-hidden">
                <div 
                    className="bg-primary h-full transition-none" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">{start} al {end}</p>
        </div>
    );
};

const AlumnoDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useUser();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [ofertas, setOfertas] = useState<Oferta[]>([]);
    const [loading, setLoading] = useState(true);

    const [diarioEntries, setDiarioEntries] = useState<DiarioEntry[]>([]);
    const [newDiario, setNewDiario] = useState({ fecha: new Date().toISOString().split('T')[0], actividad: '', horas: 8 });
    const [diarioStats, setDiarioStats] = useState({ totalHoras: 0, objetivoHoras: 370 });

    const fetchDiario = async () => {
        if (user?.email) {
            try {
                const res = await axios.post('http://localhost:8000/api/diario/alumno/list', { email: user.email });
                setDiarioEntries(res.data.actividades || []);
                setDiarioStats({ totalHoras: res.data.totalHoras, objetivoHoras: res.data.objetivoHoras });
            } catch (err) {
                console.error("Error fetching diario", err);
            }
        }
    };

    useEffect(() => {
        const fetchDashboard = async () => {
            if (user?.email) {
                try {
                    const res = await axios.post('http://localhost:8000/api/alumno/dashboard', { email: user.email });
                    setDashboardData(res.data);
                } catch (err) {
                    console.error("Error fetching dashboard", err);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, [user]);

    const fetchOfertas = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/alumno/ofertas');
            setOfertas(res.data.ofertas || []);
        } catch (err) {
            console.error("Error fetching ofertas", err);
        }
    };

    useEffect(() => {
        if (activeTab === 'search') {
            fetchOfertas();
        }
        if (activeTab === 'diario') {
            fetchDiario();
        }
    }, [activeTab]);

    const handleApply = async (ofertaId: number) => {
        if (!confirm("¿Enviar tu candidatura a esta oferta?")) return;
        try {
            await axios.post('http://localhost:8000/api/alumno/candidaturas/apply', {
                email: user?.email,
                oferta_id: ofertaId
            });
            alert("Candidatura enviada con éxito.");
            const res = await axios.post('http://localhost:8000/api/alumno/dashboard', { email: user?.email });
            setDashboardData(res.data);
            setActiveTab('dashboard');
        } catch (err: any) {
            alert(err.response?.data?.error || "Error al aplicar");
        }
    };

    const handleSaveDiario = async () => {
        if (!newDiario.actividad || newDiario.horas <= 0) {
            alert("Por favor, completa la actividad y las horas.");
            return;
        }
        try {
            await axios.post('http://localhost:8000/api/diario/alumno/create', {
                email: user?.email,
                ...newDiario
            });
            setNewDiario({ ...newDiario, actividad: '', horas: 8 });
            alert("Actividad registrada correctamente");
            fetchDiario();
        } catch (err: any) {
            alert(err.response?.data?.error || "Error al guardar actividad");
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const displayName = dashboardData?.nombre || user?.nombre || "Estudiante";
    const displayGrade = dashboardData?.grado || user?.grado || "Grado";

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-background-dark text-gray-900 dark:text-gray-100">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-white dark:bg-gray-800 border-r border-[#e0e0e0] dark:border-white/10 flex flex-col shrink-0">
                <div className="p-6 border-b border-[#e0e0e0] dark:border-white/10 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="flex items-center gap-2">
                        <div className="bg-primary p-2 rounded text-white">
                            <span className="material-symbols-outlined text-xl">school</span>
                        </div>
                        <h1 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-tight">EduConect</h1>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {[
                        { id: 'dashboard', label: 'Mi Panel', icon: 'dashboard', path: '#' },
                        { id: 'search', label: 'Ver Ofertas', icon: 'search', path: '#', show: user?.isAprobado },
                        { id: 'diario', label: 'Diario de FCT', icon: 'description', path: '#', show: user?.isAprobado && dashboardData?.estado_practicas === 'VALIDADO' },
                        { id: 'messages', label: 'Mensajes', icon: 'chat', path: '#', show: user?.isAprobado },
                        { id: 'profile', label: 'Mi Perfil', icon: 'person', path: '/perfil/alumno' },
                    ].filter(i => i.show !== false).map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.path !== '#') navigate(item.path);
                                else setActiveTab(item.id);
                            }}
                            className={`flex w-full items-center gap-3 px-4 py-2 rounded text-sm font-medium ${activeTab === item.id
                                ? 'bg-primary text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">
                                {item.icon}
                            </span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-[#e0e0e0] dark:border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-2 px-4 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm font-bold transition-none"
                    >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Bar */}
                <header className="h-16 bg-white dark:bg-gray-800 border-b border-[#e0e0e0] dark:border-white/10 flex items-center justify-between px-8 shrink-0 z-10">
                    <h2 className="text-xl font-bold dark:text-white">
                        {activeTab === 'search' ? 'Ofertas Disponibles' :
                            activeTab === 'diario' ? 'Diario' : 'Mi Portal'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-gray-800 dark:text-white leading-none">{displayName}</p>
                                <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">{displayGrade}</p>
                            </div>
                            <div className="size-8 rounded bg-primary text-white flex items-center justify-center font-bold text-sm">
                                {displayName.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        !user?.isAprobado ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center mt-10 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 animate-in fade-in zoom-in duration-500">
                                <span className="material-symbols-outlined text-7xl text-amber-500 mb-6 drop-shadow-lg">lock_clock</span>
                                <h2 className="text-3xl font-black mb-4 text-slate-800 dark:text-white">Acceso Limitado</h2>
                                <p className="text-slate-500 dark:text-slate-400 max-w-lg mb-10 text-lg leading-relaxed">
                                    Tu cuenta no tiene un tutor de centro asignado o ha sido revocada. Para poder usar EduPrácticas Connect necesitas tener un tutor que apruebe tu usuario.<br/><br/>
                                    Si has sido eliminado por error o ya no quieres formar parte del sistema, puedes borrar tu cuenta permanentemente.
                                </p>
                                <button
                                    onClick={async () => {
                                        if (confirm("¿Estás completamente seguro de querer borrar tu cuenta? Esta acción es irreversible y eliminará todos tus datos.")) {
                                            try {
                                                await axios.post('http://localhost:8000/api/alumno/account/delete', { email: user?.email });
                                                alert("Cuenta eliminada con éxito.");
                                                logout();
                                                navigate('/');
                                            } catch (e) {
                                                alert("Error al intentar borrar la cuenta.");
                                            }
                                        }
                                    }}
                                    className="bg-red-50 text-red-600 border border-red-100 dark:border-red-500/20 dark:bg-red-500/10 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white px-8 py-4 rounded-xl font-black transition-all flex items-center gap-3 shadow-lg shadow-red-500/10 hover:shadow-red-500/30 hover:scale-105 active:scale-95 group"
                                >
                                    <span className="material-symbols-outlined group-hover:animate-bounce">delete_forever</span>
                                    Borrar mi cuenta permanentemente
                                </button>
                            </div>
                        ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white dark:bg-gray-800 rounded border border-[#e0e0e0] dark:border-white/10 p-6">
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg dark:text-white mb-2">Estado de tus Prácticas</h3>
                                            {dashboardData?.estado_practicas === 'VALIDADO' ? (
                                                <div className="space-y-4">
                                                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200 uppercase tracking-wide">
                                                        Activas (Validado)
                                                    </span>
                                                    <div>
                                                        <p className="text-2xl font-black text-slate-800 dark:text-white">{dashboardData.empresa}</p>
                                                        <p className="text-sm text-slate-500">{dashboardData.puesto}</p>
                                                    </div>
                                                    <div className="flex gap-4 mt-4">
                                                        <button
                                                            onClick={() => window.open(`http://localhost:8000/api/tutor/candidaturas/${dashboardData.candidatura_id}/convenio`, '_blank')}
                                                            className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">description</span>
                                                            Descargar Convenio (PDF)
                                                        </button>
                                                        <button
                                                            onClick={() => setActiveTab('diario')}
                                                            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">auto_stories</span>
                                                            Ir al Diario
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : dashboardData?.estado_practicas === 'PENDIENTE_FIRMA_EMPRESA' ? (
                                                <div className="space-y-4">
                                                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200 uppercase tracking-wide">
                                                        Centro Validado (Firma Empresa Pendiente)
                                                    </span>
                                                    <p className="text-sm text-slate-500 mt-2">Tu tutor de centro ha validado el convenio.</p>
                                                    <p className="text-xs text-slate-400">Esperando firma final del tutor de <span className="font-bold text-slate-700 dark:text-white">{dashboardData.empresa}</span>.</p>
                                                </div>
                                            ) : dashboardData?.estado_practicas === 'ADMITIDO' ? (
                                                <div className="space-y-4">
                                                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200 uppercase tracking-wide">
                                                        Admitido (Pendiente Validación)
                                                    </span>
                                                    <p className="text-sm text-slate-500 mt-2">Has sido admitido en <span className="font-bold text-slate-700 dark:text-white">{dashboardData.empresa}</span>.</p>
                                                    <p className="text-xs text-slate-400">Esperando validación de tu tutor de centro para generar el convenio.</p>
                                                </div>
                                            ) : dashboardData?.estado_practicas === 'POSTULADO' ? (
                                                <div className="space-y-4">
                                                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200 uppercase tracking-wide">
                                                        Postulado
                                                    </span>
                                                    <p className="text-sm text-slate-500 mt-2">Esperando respuesta de <span className="font-bold text-slate-700 dark:text-white">{dashboardData.empresa}</span>.</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-slate-500 mb-4">No tienes prácticas asignadas actualmente.</p>
                                                    <button onClick={() => setActiveTab('search')} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold">Buscar Ofertas</button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="size-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-3xl text-slate-400">
                                                {dashboardData?.estado_practicas === 'VALIDADO' ? 'check_circle' :
                                                    dashboardData?.estado_practicas === 'PENDIENTE_FIRMA_EMPRESA' ? 'task_alt' :
                                                        dashboardData?.estado_practicas === 'ADMITIDO' ? 'task_alt' : 'pending'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {(dashboardData?.estado_practicas === 'ADMITIDO' || dashboardData?.estado_practicas === 'VALIDADO') && (
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 p-6 shadow-sm">
                                        <h3 className="font-bold text-lg dark:text-white mb-4">Tutorización Asignada</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800">
                                                <div className="size-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">TE</div>
                                                <div>
                                                    <p className="text-xs font-bold text-blue-600 uppercase">Tutor Empresa</p>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{dashboardData.tutor_empresa || "Pendiente"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800">
                                                <div className="size-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">TC</div>
                                                <div>
                                                    <p className="text-xs font-bold text-purple-600 uppercase">Tutor Centro</p>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{dashboardData.tutor_centro || "Pendiente"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <NotificationPanel role="ALUMNO" />
                                <div className="bg-white dark:bg-gray-800 rounded border border-[#e0e0e0] dark:border-white/10 p-6 flex flex-col items-center justify-center min-h-[200px]">
                                    {dashboardData?.estado_practicas === 'VALIDADO' && dashboardData.fecha_inicio && dashboardData.fecha_fin ? (
                                        <TimeProgress start={dashboardData.fecha_inicio} end={dashboardData.fecha_fin} />
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <span className="material-symbols-outlined text-4xl mb-2">timer_off</span>
                                            <p className="text-xs">Cronograma no activo</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        )
                    )}

                    {/* DIARIO TAB */}
                    {activeTab === 'diario' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Horas Aprobadas</p>
                                    <h4 className="text-3xl font-black text-primary">{diarioStats.totalHoras}h</h4>
                                    <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-primary h-full transition-all duration-1000"
                                            style={{ width: `${Math.min(100, (diarioStats.totalHoras / diarioStats.objetivoHoras) * 100)}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tighter">Objetivo: {diarioStats.objetivoHoras}h</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="size-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                        <span className="material-symbols-outlined">pending_actions</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pendientes</p>
                                        <h4 className="text-2xl font-black dark:text-white">{diarioEntries.filter(e => e.estado === 'PENDIENTE').length}</h4>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                        <span className="material-symbols-outlined">check_circle</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Aprobadas</p>
                                        <h4 className="text-2xl font-black dark:text-white">{diarioEntries.filter(e => e.estado === 'APROBADO').length}</h4>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1">
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm sticky top-8">
                                        <h3 className="font-bold text-lg dark:text-white mb-6 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">add_circle</span>
                                            Registrar Actividad
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                                                <input
                                                    type="date"
                                                    value={newDiario.fecha}
                                                    onChange={e => setNewDiario({ ...newDiario, fecha: e.target.value })}
                                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horas</label>
                                                <input
                                                    type="number"
                                                    value={newDiario.horas}
                                                    onChange={e => setNewDiario({ ...newDiario, horas: parseFloat(e.target.value) || 0 })}
                                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white outline-none"
                                                    min="0.5"
                                                    max="24"
                                                    step="0.5"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción de la Actividad</label>
                                                <textarea
                                                    placeholder="Describe lo que has hecho hoy..."
                                                    value={newDiario.actividad}
                                                    onChange={e => setNewDiario({ ...newDiario, actividad: e.target.value })}
                                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white outline-none h-32 resize-none"
                                                ></textarea>
                                            </div>
                                            <button
                                                onClick={handleSaveDiario}
                                                className="w-full py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                                            >
                                                Cargar en Diario
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-2 space-y-4">
                                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-slate-400">history</span>
                                        Historial de Bitácoras
                                    </h3>
                                    {diarioEntries.length === 0 ? (
                                        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-[#dbdfe6] dark:border-slate-800">
                                            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">description</span>
                                            <p className="text-slate-500 font-bold">Aún no has registrado ninguna actividad.</p>
                                        </div>
                                    ) : (
                                        diarioEntries.map((entry) => (
                                            <div key={entry.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm group hover:border-primary/50 transition-all">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-black dark:text-white">{new Date(entry.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${entry.estado === 'APROBADO' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                    entry.estado === 'RECHAZADO' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                }`}>{entry.estado}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">{entry.horas} horas registradas</p>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{entry.actividad}</p>

                                                {entry.observaciones && (
                                                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border-l-4 border-red-500">
                                                        <p className="text-[10px] font-black text-red-500 uppercase mb-1">Feedback del Tutor</p>
                                                        <p className="text-xs italic dark:text-slate-400">"{entry.observaciones}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SEARCH OFFERS TAB */}
                    {activeTab === 'search' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <h3 className="font-bold text-lg dark:text-white">Ofertas Disponibles</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {ofertas.length === 0 ? (
                                    <p className="col-span-2 text-center text-slate-500 py-10">No hay ofertas disponibles en este momento.</p>
                                ) : (
                                    ofertas.map((offer) => (
                                        <div key={offer.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm hover:border-primary transition-all group relative">
                                            <h4 className="font-bold text-lg mb-1 dark:text-white group-hover:text-primary transition-colors">{offer.titulo}</h4>
                                            <p className="text-sm font-bold text-slate-500 mb-2">{offer.empresa}</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{offer.descripcion}</p>
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {offer.tags?.map(tag => (
                                                    <span key={tag} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{tag}</span>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => handleApply(offer.id)}
                                                className="w-full bg-primary text-white py-2 rounded-lg font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                                            >
                                                Postular
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* MESSAGES TAB */}
                    {activeTab === 'messages' && (
                        <div className="h-[calc(100vh-12rem)] animate-in fade-in duration-500">
                            <ChatSystem />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AlumnoDashboard;
