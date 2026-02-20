import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import ChatSystem from '../components/ChatSystem';
import axios from 'axios';
import SignaturePad from '../components/SignaturePad';

interface AlumnoAsignado {
    id: number;
    nombre: string;
    email: string;
    grado: string;
    centro: string;
    candidatura: {
        id: number;
        estado: string;
        fechaInicio: string;
        fechaFin: string;
        horario: string;
        tipoDuracion: string;
    };
}

const CircularTimer: React.FC<{ start: string, end: string }> = ({ start, end }) => {
    if (!start || !end) return <div className="text-sm text-slate-500 font-bold uppercase tracking-widest text-[10px]">Sin fechas</div>;

    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const now = new Date().getTime();

    const totalDuration = endDate - startDate;
    const elapsed = now - startDate;

    let progress = 0;
    if (totalDuration > 0) {
        progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    }

    const timeLeft = endDate - now;
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const dashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative size-32 flex items-center justify-center">
                <svg className="transform -rotate-90 size-32">
                    <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                    <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className={`text-primary transition-all duration-1000 ease-out`} strokeDasharray={circumference} strokeDashoffset={dashoffset} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black dark:text-white">{Math.max(0, daysLeft)}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Días</span>
                </div>
            </div>
        </div>
    );
};

const TutorEmpresaDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useUser();
    const [activeTab, setActiveTab] = useState<'resumen' | 'alumnos' | 'mensajes'>('resumen');
    const [alumnos, setAlumnos] = useState<AlumnoAsignado[]>([]);
    const [loading, setLoading] = useState(true);

    // Detail Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [studentDetail, setStudentDetail] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Signature Modal State
    const [isValModalOpen, setIsValModalOpen] = useState(false);
    const [candidaturaToSign, setCandidaturaToSign] = useState<AlumnoAsignado | null>(null);
    const [valStep, setValStep] = useState(1);
    const [signature, setSignature] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Diario / Bitácora State
    const [modalTab, setModalTab] = useState<'info' | 'diario'>('info');
    const [diarioEntries, setDiarioEntries] = useState<any[]>([]);
    const [loadingDiario, setLoadingDiario] = useState(false);
    const [bitacoraFeedback, setBitacoraFeedback] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (user?.email) {
                try {
                    const response = await axios.post('http://localhost:8000/api/tutor-empresa/dashboard', {
                        email: user.email
                    });
                    setAlumnos(response.data.alumnos || []);
                } catch (error) {
                    console.error("Error fetching tutor dashboard data:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchDashboardData();
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const fetchStudentDiario = async (candidaturaId: number) => {
        setLoadingDiario(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/diario/tutor/candidatura/${candidaturaId}`);
            setDiarioEntries(res.data.actividades || []);
        } catch (error) {
            console.error("Error fetching student diario:", error);
        } finally {
            setLoadingDiario(false);
        }
    };

    const handleValidarDiario = async (diarioId: number, estado: 'APROBADO' | 'RECHAZADO') => {
        const observaciones = bitacoraFeedback[diarioId] || '';
        try {
            await axios.post(`http://localhost:8000/api/diario/tutor/validar/${diarioId}`, {
                estado,
                observaciones
            });
            if (studentDetail?.candidatura?.id) {
                fetchStudentDiario(studentDetail.candidatura.id);
            }
        } catch (error) {
            alert("Error al validar actividad");
        }
    };

    const handleOpenDetailModal = async (id: number) => {
        setDetailLoading(true);
        setIsDetailModalOpen(true);
        setModalTab('info');
        setDiarioEntries([]);
        try {
            const response = await axios.get(`http://localhost:8000/api/tutor/alumno/${id}`);
            setStudentDetail(response.data);
            if (response.data.candidatura?.id && response.data.candidatura?.estado === 'VALIDADO') {
                fetchStudentDiario(response.data.candidatura.id);
            }
        } catch (error) {
            console.error("Error fetching student details:", error);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleOpenSignModal = (al: AlumnoAsignado) => {
        setCandidaturaToSign(al);
        setValStep(1);
        setSignature(null);
        setIsValModalOpen(true);
    };

    const handleSign = async () => {
        if (!candidaturaToSign?.candidatura.id) return;
        setIsSubmitting(true);
        try {
            await axios.post(`http://localhost:8000/api/tutor-empresa/candidaturas/${candidaturaToSign.candidatura.id}/firmar`, {
                firma: signature
            });
            alert("Convenio firmado correctamente. El proceso ha finalizado.");
            setIsValModalOpen(false);

            // Refresh data
            const response = await axios.post('http://localhost:8000/api/tutor-empresa/dashboard', {
                email: user?.email
            });
            setAlumnos(response.data.alumnos || []);
        } catch (error: any) {
            console.error("Error signing:", error);
            alert(error.response?.data?.error || "Error al firmar el convenio");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-display transition-colors duration-300">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 relative z-20">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
                    <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined font-black">supervisor_account</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-black dark:text-white">EduConect</h1>
                        <p className="text-[10px] text-primary font-black uppercase tracking-wider">Tutor Empresa</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-4">
                    <button
                        onClick={() => setActiveTab('resumen')}
                        className={`flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'resumen' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">dashboard</span>
                        <span className="text-sm">Resumen</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('alumnos')}
                        className={`flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'alumnos' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">person</span>
                        <span className="text-sm">Alumnos</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('mensajes')}
                        className={`flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'mensajes' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">forum</span>
                        <span className="text-sm">Mensajes</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-4">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                            {user?.nombre?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black dark:text-white truncate">{user?.nombre}</p>
                            <p className="text-[10px] text-slate-500 font-bold truncate tracking-tight">{user?.empresa || 'Empresa Colaboradora'}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all group">
                        <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">logout</span>
                        <span className="text-xs font-black uppercase tracking-wider">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0B111A]">
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 sticky top-0 z-10 flex items-center justify-between transition-colors duration-300">
                    <div>
                        <h2 className="text-xl font-black dark:text-white">
                            {activeTab === 'resumen' && 'Panel de Tutoría'}
                            {activeTab === 'alumnos' && 'Gestión de Alumnos'}
                            {activeTab === 'mensajes' && 'Centro de Mensajería'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                            {activeTab === 'resumen' && 'Vista general del seguimiento de alumnos'}
                            {activeTab === 'alumnos' && 'Tus alumnos asignados en la empresa'}
                            {activeTab === 'mensajes' && 'Canales de comunicación directos'}
                        </p>
                    </div>
                </header>

                <div className="p-8 h-full overflow-y-auto custom-scrollbar">
                    {activeTab === 'resumen' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="material-symbols-outlined text-primary bg-primary/10 p-3 rounded-2xl">person_check</span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Tus Alumnos</p>
                                    <h3 className="text-4xl font-black dark:text-white mt-1">{alumnos.length}</h3>
                                </div>
                                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="material-symbols-outlined text-emerald-500 bg-emerald-500/10 p-3 rounded-2xl">task_alt</span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Validados</p>
                                    <h3 className="text-4xl font-black dark:text-white mt-1">{alumnos.filter(a => a.candidatura.estado === 'VALIDADO').length}</h3>
                                </div>
                                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="material-symbols-outlined text-amber-500 bg-amber-500/10 p-3 rounded-2xl">history</span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Pendientes</p>
                                    <h3 className="text-4xl font-black dark:text-white mt-1">{alumnos.filter(a => a.candidatura.estado !== 'VALIDADO').length}</h3>
                                </div>
                            </div>

                            {/* Fast List Preview */}
                            <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <h3 className="font-black text-lg dark:text-white">Últimos Seguimientos</h3>
                                    <button onClick={() => setActiveTab('alumnos')} className="text-primary text-xs font-black uppercase tracking-wider hover:underline">Ver todos</button>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        {alumnos.length === 0 ? (
                                            <p className="text-center py-4 text-slate-500 font-bold">Sin alumnos asignados.</p>
                                        ) : (
                                            alumnos.slice(0, 3).map(al => (
                                                <div key={al.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                                            {al.nombre.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold dark:text-white">{al.nombre}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{al.grado}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${al.candidatura.estado === 'VALIDADO' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                                        }`}>
                                                        {al.candidatura.estado}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'alumnos' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-200 dark:border-slate-800">
                                    <h3 className="text-xl font-black dark:text-white">Tus Alumnos en Prácticas</h3>
                                    <p className="text-sm text-slate-500 mt-1">Listado de alumnos bajo tu tutorización laboral</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-xs uppercase font-black tracking-widest">
                                                <th className="px-8 py-5">Identidad</th>
                                                <th className="px-8 py-5">Grado / Centro</th>
                                                <th className="px-8 py-5">Horario / Jornada</th>
                                                <th className="px-8 py-5">Estado</th>
                                                <th className="px-8 py-5 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 dark:text-slate-200">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-20">
                                                        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                                                    </td>
                                                </tr>
                                            ) : alumnos.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-20 text-slate-500 font-bold">
                                                        No tienes alumnos asignados actualmente.
                                                    </td>
                                                </tr>
                                            ) : (
                                                alumnos.map((row) => (
                                                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-xs font-black shadow-sm group-hover:scale-110 transition-transform">
                                                                    {row.nombre.substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm dark:text-white group-hover:text-primary transition-colors">{row.nombre}</p>
                                                                    <p className="text-xs text-slate-500 font-medium">{row.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <p className="text-xs font-black dark:text-slate-200 uppercase tracking-tighter truncate max-w-[200px]">{row.grado}</p>
                                                            <p className="text-[10px] text-primary font-bold mt-1 uppercase opacity-70 italic">{row.centro}</p>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
                                                                <span className="text-[11px] font-bold capitalize">{row.candidatura.horario}</span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{row.candidatura.tipoDuracion}</span>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-tighter shadow-sm ${row.candidatura.estado === 'VALIDADO' ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                                                                row.candidatura.estado === 'ADMITIDO' ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-slate-400 text-white'
                                                                }`}>
                                                                {row.candidatura.estado}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            {row.candidatura.estado === 'PENDIENTE_FIRMA_EMPRESA' ? (
                                                                <button
                                                                    onClick={() => handleOpenSignModal(row)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">edit_document</span>
                                                                    Firmar
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleOpenDetailModal(row.id)}
                                                                    className="text-primary hover:text-primary/70 text-xs font-black uppercase tracking-widest transition-all p-2 bg-primary/5 hover:bg-primary/20 rounded-xl"
                                                                >
                                                                    Ver Expediente
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'mensajes' && (
                        <div className="h-[calc(100vh-12rem)] animate-in fade-in duration-500">
                            <ChatSystem />
                        </div>
                    )}
                </div>
            </main>

            {/* Expansión del Expediente del Alumno (Modal) */}
            {isDetailModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setIsDetailModalOpen(false)}></div>
                    <div className="relative w-full max-w-5xl max-h-full overflow-hidden bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/20 flex flex-col animate-in zoom-in-95 duration-400">
                        {detailLoading ? (
                            <div className="p-20 flex flex-col items-center justify-center gap-6">
                                <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Abriendo expediente...</p>
                            </div>
                        ) : studentDetail && (
                            <>
                                {/* Modal Header */}
                                <div className="p-8 pb-4 relative flex items-start justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="size-24 bg-primary/10 rounded-4xl flex items-center justify-center text-primary shadow-inner">
                                            <span className="material-symbols-outlined text-5xl">account_circle</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-3xl font-black dark:text-white tracking-tight">{studentDetail.nombre}</h3>
                                                <span className="px-4 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full uppercase tracking-widest">Activo</span>
                                            </div>
                                            <p className="text-slate-500 font-bold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">school</span>
                                                {studentDetail.grado}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsDetailModalOpen(false)} className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center group">
                                        <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform">close</span>
                                    </button>
                                </div>

                                {/* Content Tabs / Cards */}
                                <div className="px-8 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex gap-8 shrink-0">
                                    <button
                                        onClick={() => setModalTab('info')}
                                        className={`py-3 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${modalTab === 'info' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Información General
                                        {modalTab === 'info' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>}
                                    </button>
                                    <button
                                        onClick={() => setModalTab('diario')}
                                        className={`py-3 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${modalTab === 'diario' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Bitácora de Actividades
                                        {modalTab === 'diario' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                                    {modalTab === 'info' ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                                            {/* Profile Card */}
                                            <div className="lg:col-span-2 space-y-8">
                                                <div className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-lg">psychology</span>
                                                        Habilidades y Tecnologías
                                                    </h4>
                                                    <div className="flex flex-wrap gap-3">
                                                        {studentDetail.habilidades?.split(',').map((skill: string, i: number) => (
                                                            <span key={i} className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black rounded-2xl shadow-sm hover:border-primary/50 transition-colors">
                                                                {skill.trim()}
                                                            </span>
                                                        )) || <p className="text-slate-400 italic text-sm">No especificadas</p>}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                                        <div className="size-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-primary shadow-inner">
                                                            <span className="material-symbols-outlined">alternate_email</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Académico</p>
                                                            <p className="text-sm font-bold dark:text-white truncate">{studentDetail.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                                        <div className="size-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-primary shadow-inner">
                                                            <span className="material-symbols-outlined">corporate_fare</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Centro Educativo</p>
                                                            <p className="text-sm font-bold dark:text-white truncate">{studentDetail.centro}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Internship Progress Detail */}
                                                {studentDetail.candidatura && (
                                                    <div className="p-8 bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] text-white shadow-2xl shadow-primary/10 border border-white/5 overflow-hidden relative group">
                                                        <div className="absolute top-0 right-0 size-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                                                        <div className="relative flex items-center justify-between gap-8">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="material-symbols-outlined text-primary">analytics</span>
                                                                    <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Expediente FCT</h4>
                                                                </div>
                                                                <h3 className="text-2xl font-black mb-1">Seguimiento de Progreso</h3>
                                                                <p className="text-slate-400 text-sm font-bold mb-6 italic">Empresa: {studentDetail.candidatura.empresa}</p>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                                                                        <p className="text-[10px] font-black text-primary uppercase mb-1">Horario</p>
                                                                        <p className="text-sm font-black capitalize">{studentDetail.candidatura.horario}</p>
                                                                    </div>
                                                                    <div className="p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                                                                        <p className="text-[10px] font-black text-primary uppercase mb-1">Duración</p>
                                                                        <p className="text-sm font-black uppercase">{studentDetail.candidatura.tipoDuracion}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Circular Progress Indicator */}
                                                            <div className="flex flex-col items-center">
                                                                <CircularTimer start={studentDetail.candidatura.fechaInicio} end={studentDetail.candidatura.fechaFin} />
                                                                <div className="mt-4 text-center">
                                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Consumido</p>
                                                                    <p className="text-xs font-black text-primary mt-1">Sincronizado</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Sidebar - Actions & Docs */}
                                            <div className="space-y-6">
                                                <div className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Documentación</h4>
                                                    <div className="space-y-3">
                                                        <button
                                                            onClick={() => studentDetail.cv && window.open(`http://localhost:8000/uploads/cv/${studentDetail.cv}`, '_blank')}
                                                            className={`w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-primary transition-all ${!studentDetail.cv ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="material-symbols-outlined text-primary">picture_as_pdf</span>
                                                                <span className="text-xs font-bold dark:text-white">Curriculum Vitae</span>
                                                            </div>
                                                            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                                                        </button>
                                                        <button
                                                            onClick={() => studentDetail.candidatura?.id && window.open(`http://localhost:8000/api/tutor/candidaturas/${studentDetail.candidatura.id}/convenio`, '_blank')}
                                                            className={`w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-emerald-500 transition-all ${studentDetail.candidatura?.estado !== 'VALIDADO' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="material-symbols-outlined text-emerald-500">verified_user</span>
                                                                <span className="text-xs font-bold dark:text-white">Convenio Firmado</span>
                                                            </div>
                                                            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-all">
                                                                {studentDetail.candidatura?.estado === 'VALIDADO' ? 'download' : 'lock'}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-8 bg-primary/5 rounded-4xl border border-primary/10">
                                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Notas de Seguimiento</h4>
                                                    <textarea
                                                        className="w-full h-32 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                                        placeholder="Escribe aquí observaciones sobre el progreso del alumno..."
                                                    ></textarea>
                                                    <button className="w-full mt-4 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                                        Guardar Notas
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 space-y-6 animate-in fade-in duration-300">
                                            <div className="flex justify-between items-center mb-6">
                                                <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Registro de Actividades Diarias</h4>
                                                <div className="px-3 py-1 bg-emerald-500/10 rounded-lg text-emerald-500 text-xs font-bold border border-emerald-500/20">
                                                    Horas Aprobadas: {diarioEntries.filter(e => e.estado === 'APROBADO').reduce((acc, curr: any) => acc + curr.horas, 0)}h
                                                </div>
                                            </div>

                                            {loadingDiario ? (
                                                <div className="flex items-center justify-center py-20">
                                                    <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                                                </div>
                                            ) : diarioEntries.length === 0 ? (
                                                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">history_edu</span>
                                                    <p className="text-sm font-bold text-slate-500">No hay actividades registradas.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {diarioEntries.map((entry: any) => (
                                                        <div key={entry.id} className="bg-white dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 group shadow-sm transition-all hover:border-emerald-500/30">
                                                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <span className="text-sm font-black dark:text-white uppercase tracking-tighter">
                                                                            {new Date(entry.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${entry.estado === 'APROBADO' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                                entry.estado === 'RECHAZADO' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                            }`}>{entry.estado}</span>
                                                                        <span className="text-[10px] font-bold text-slate-400">{entry.horas}h</span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{entry.actividad}</p>

                                                                    {entry.estado === 'PENDIENTE' && (
                                                                        <div className="mt-4 space-y-3">
                                                                            <textarea
                                                                                placeholder="Añadir observaciones..."
                                                                                value={bitacoraFeedback[entry.id] || ''}
                                                                                onChange={(e) => setBitacoraFeedback({ ...bitacoraFeedback, [entry.id]: e.target.value })}
                                                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                                                                rows={2}
                                                                            ></textarea>
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    onClick={() => handleValidarDiario(entry.id, 'APROBADO')}
                                                                                    className="flex-1 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                                                                >
                                                                                    Visto Bueno
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleValidarDiario(entry.id, 'RECHAZADO')}
                                                                                    className="flex-1 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                                                                >
                                                                                    Corregir
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {entry.observaciones && (
                                                                        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-l-4 border-emerald-500">
                                                                            <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Feedback Tutor Empresa</p>
                                                                            <p className="text-xs italic dark:text-slate-400">"{entry.observaciones}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 flex justify-end gap-4">
                                    <button
                                        onClick={() => setIsDetailModalOpen(false)}
                                        className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:opacity-90 active:scale-95 transition-all"
                                    >
                                        Cerrar Expediente
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {/* Signing Modal */}
            {isValModalOpen && candidaturaToSign && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-400">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-emerald-500 to-teal-600 text-white">
                            <h3 className="text-2xl font-black flex items-center gap-3">
                                <span className="material-symbols-outlined text-3xl">assignment_turned_in</span>
                                {valStep === 1 ? 'Revisión Convenio' : 'Firma del Tutor'}
                            </h3>
                            <p className="opacity-90 text-sm mt-1 font-medium">
                                {valStep === 1 ? 'Confirma los detalles antes de plasmar tu firma' : 'Dibuja tu firma en el recuadro inferior'}
                            </p>
                        </div>

                        <div className="p-8 space-y-6">
                            {valStep === 1 ? (
                                <>
                                    <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alumno</p>
                                            <p className="font-bold text-sm dark:text-white">{candidaturaToSign.nombre}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Centro</p>
                                            <p className="font-bold text-sm dark:text-white">{candidaturaToSign.centro}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duración</p>
                                            <p className="font-bold text-sm dark:text-white uppercase">{candidaturaToSign.candidatura.tipoDuracion}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horario</p>
                                            <p className="font-bold text-sm dark:text-white capitalize">{candidaturaToSign.candidatura.horario}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                        <span className="material-symbols-outlined text-blue-500">info</span>
                                        <p className="text-[11px] text-slate-500 font-medium">Este convenio ya ha sido validado y firmado por el tutor académico del centro.</p>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/30">
                                        <SignaturePad onSave={(data) => setSignature(data)} onClear={() => setSignature(null)} />
                                    </div>
                                    {!signature && (
                                        <p className="text-[10px] text-center text-amber-500 font-black uppercase tracking-widest animate-pulse">
                                            Debes realizar tu firma para continuar
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 flex gap-3">
                            <button
                                onClick={() => setIsValModalOpen(false)}
                                className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-100 transition-all border border-slate-200 dark:border-slate-700"
                            >
                                Cancelar
                            </button>
                            {valStep === 1 ? (
                                <button
                                    onClick={() => setValStep(2)}
                                    className="flex-3 py-4 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Ir a Firmar
                                </button>
                            ) : (
                                <button
                                    disabled={!signature || isSubmitting}
                                    onClick={handleSign}
                                    className="flex-3 py-4 bg-emerald-500 disabled:bg-slate-300 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                            Procesando...
                                        </>
                                    ) : (
                                        'Finalizar y Validar'
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TutorEmpresaDashboard;
