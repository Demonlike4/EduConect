import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import ChatSystem from '../components/ChatSystem';

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

const CircularTimer: React.FC<{ start: string, end: string }> = ({ start, end }) => {
    if (!start || !end) return <div className="text-sm text-slate-500">Fechas no disponibles</div>;

    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const now = new Date().getTime();

    const totalDuration = endDate - startDate;
    const timeLeft = endDate - now;

    // Normalize progress (0 to 100)
    let progress = 100;
    if (totalDuration > 0) {
        progress = Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100));
    }

    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const dashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative size-40 flex items-center justify-center">
                <svg className="transform -rotate-90 size-40">
                    <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                    <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" className={`text-primary transition-all duration-1000 ease-out`} strokeDasharray={circumference} strokeDashoffset={dashoffset} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black dark:text-white">{Math.max(0, daysLeft)}</span>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Días</span>
                </div>
            </div>
            <div className="text-center mt-4 space-y-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tiempo Restante</p>
                <p className="text-xs text-slate-500">{start} - {end}</p>
            </div>
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
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-[#111318] dark:text-slate-100 font-display transition-colors duration-300">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-white dark:bg-slate-900 border-r border-[#dbdfe6] dark:border-slate-800 flex flex-col shrink-0 transition-colors duration-300">
                <div className="p-6 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-2xl font-bold">school</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-tight dark:text-white">EduPrácticas</h1>
                        <p className="text-xs text-[#616f89] dark:text-slate-400 font-medium uppercase tracking-wider">Connect</p>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '#' },
                        { id: 'search', label: 'Buscar Ofertas', icon: 'search', path: '#' },
                        { id: 'diario', label: 'Diario de Prácticas', icon: 'auto_stories', path: '#', show: dashboardData?.estado_practicas === 'VALIDADO' },
                        { id: 'messages', label: 'Mensajes', icon: 'forum', path: '#' },
                        { id: 'profile', label: 'Mi Perfil', icon: 'person', path: '/perfil/alumno' },
                    ].filter(i => i.show !== false).map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.path !== '#') {
                                    navigate(item.path);
                                } else {
                                    setActiveTab(item.id);
                                }
                            }}
                            className={`flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === item.id
                                ? 'bg-primary/5 text-primary border-r-4 border-primary'
                                : 'text-[#616f89] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-primary'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[22px] ${activeTab === item.id ? 'font-bold' : ''}`}>
                                {item.icon}
                            </span>
                            <span className={`text-sm ${activeTab === item.id ? 'font-bold' : 'font-medium'}`}>
                                {item.label}
                            </span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-[#dbdfe6] dark:border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-white/5 text-[#616f89] dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-sm font-bold transition-all"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Bar */}
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-[#dbdfe6] dark:border-slate-800 flex items-center justify-between px-8 shrink-0 transition-colors duration-300">
                    <h2 className="text-xl font-bold dark:text-white capitalize">
                        {activeTab === 'search' ? 'Ofertas Disponibles' :
                            activeTab === 'diario' ? 'Diario de Prácticas' : 'Mi Dashboard'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold leading-none dark:text-white group-hover:text-primary transition-colors">{displayName}</p>
                                <p className="text-[10px] text-[#616f89] dark:text-slate-400 mt-1 uppercase font-bold tracking-tighter">{displayGrade}</p>
                            </div>
                            <div className="size-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {displayName.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 p-6 shadow-sm overflow-hidden relative">
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
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                                    {dashboardData?.estado_practicas === 'VALIDADO' && dashboardData.fecha_inicio && dashboardData.fecha_fin ? (
                                        <CircularTimer start={dashboardData.fecha_inicio} end={dashboardData.fecha_fin} />
                                    ) : (
                                        <div className="text-center text-slate-400">
                                            <span className="material-symbols-outlined text-6xl mb-2 opacity-20">timer_off</span>
                                            <p className="text-sm">El contador se activará<br />cuando valides tus prácticas.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
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
