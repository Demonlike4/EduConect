import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import ChatSystem from '../components/ChatSystem';
import SignaturePad from '../components/SignaturePad';

interface AlumnoData {
    id: number;
    nombre: string;
    email: string;
    grado: string;
    status: string;
    empresa: string;
    candidatura_id?: number;
    oferta_id?: number;
    horario?: string;
    tipoDuracion?: string;
    isAprobado?: boolean;
}

interface NotificacionData {
    id: number;
    type: string;
    title: string;
    desc: string;
    action: string;
    icon: string;
    leida: boolean;
    date: string;
}

const CircularTimer: React.FC<{ start: string, end: string }> = ({ start, end }) => {
    if (!start || !end) return <div className="text-sm text-slate-500">Fechas no disponibles</div>;

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

const TutorCentroDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useUser();
    const [activeTab, setActiveTab] = useState<'resumen' | 'alumnos' | 'solicitudes' | 'mensajes' | 'empresas' | 'documentacion' | 'reportes'>('resumen');
    const [alumnos, setAlumnos] = useState<AlumnoData[]>([]);
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [notificaciones, setNotificaciones] = useState<NotificacionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalEmpresas: 0, pendingValidations: 0, alumnosValidados: 0, totalAlumnos: 0 });
    const [isValModalOpen, setIsValModalOpen] = useState(false);
    const [alumnoToVal, setAlumnoToVal] = useState<AlumnoData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [valStep, setValStep] = useState(1);
    const [signature, setSignature] = useState<string | null>(null);

    // Detail Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [studentDetail, setStudentDetail] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Company Modal State
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

    // Diario / Bitácora State
    const [modalTab, setModalTab] = useState<'info' | 'diario'>('info');
    const [diarioEntries, setDiarioEntries] = useState<any[]>([]);
    const [loadingDiario, setLoadingDiario] = useState(false);
    const [bitacoraFeedback, setBitacoraFeedback] = useState<{ [key: number]: string }>({});

    const displayName = user?.nombre || "Tutor Académico";
    const displayRole = user?.centro || "Centro Educativo";

    useEffect(() => {
        const fetchAlumnos = async () => {
            if (user?.email) {
                try {
                    const response = await axios.post('http://localhost:8000/api/tutor/alumnos', {
                        email: user.email
                    });
                    if (response.data.alumnos) {
                        setAlumnos(response.data.alumnos);
                    }
                    if (response.data.empresas) {
                        setEmpresas(response.data.empresas);
                    }
                    if (response.data.stats) {
                        setStats(response.data.stats);
                    }
                } catch (error) {
                    console.error("Error fetching alumnos:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        const fetchNotificaciones = async () => {
            if (user?.email) {
                try {
                    const res = await axios.post('http://localhost:8000/api/notificaciones', { email: user.email });
                    setNotificaciones(res.data.notificaciones || []);
                } catch (e) {
                    console.error("Error fetching notifications", e);
                }
            }
        };

        fetchAlumnos();
        fetchNotificaciones();

        const notifInterval = setInterval(fetchNotificaciones, 30000);
        return () => clearInterval(notifInterval);
    }, [user]);

    const handleReadNotification = async (id: number) => {
        try {
            await axios.post(`http://localhost:8000/api/notificaciones/${id}/read`);
            setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
        } catch (e) { console.error(e); }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleApproveAlumno = async (id: number) => {
        try {
            await axios.post(`http://localhost:8000/api/tutor/alumno/${id}/approve`);
            alert("Alumno aprobado correctamente. Ahora podrá iniciar sesión.");
            setAlumnos(prev => prev.map(a => a.id === id ? { ...a, isAprobado: true } : a));
        } catch (error) {
            console.error("Error aprobando alumno:", error);
            alert("Error al aprobar alumno.");
        }
    };

    const handleRemoveAlumno = async (id: number, nombre: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar al alumno ${nombre} de tu lista? Perderá el acceso y tendrá que solicitar nuevo tutor.`)) return;

        try {
            const res = await axios.post(`http://localhost:8000/api/tutor/alumno/${id}/remove`);
            if (res.data.status === 'success') {
                setAlumnos(prev => prev.filter(a => a.id !== id));
            }
        } catch (error) {
            console.error('Error al eliminar alumno', error);
            alert('Error al intentar eliminar a este alumno.');
        }
    };

    const handleOpenValModal = (al: AlumnoData) => {
        setAlumnoToVal(al);
        setValStep(1);
        setSignature(null);
        setIsValModalOpen(true);
    };

    const handleValidar = async () => {
        if (!alumnoToVal?.candidatura_id) return;
        setIsSubmitting(true);
        try {
            await axios.post(`http://localhost:8000/api/tutor/candidaturas/${alumnoToVal.candidatura_id}/validar`, {
                firma: signature
            });
            alert("Prácticas validadas. El convenio ya está disponible.");
            setIsValModalOpen(false);
            setValStep(1);
            setSignature(null);
            const response = await axios.post('http://localhost:8000/api/tutor/alumnos', { email: user?.email });
            if (response.data.alumnos) setAlumnos(response.data.alumnos);
        } catch (error: any) {
            console.error("Error validando:", error);
            const errorMsg = error.response?.data?.error || "Error al validar prácticas";
            alert(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
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

    const handleOpenDetailModal = async (alumnoId: number) => {
        setDetailLoading(true);
        setIsDetailModalOpen(true);
        setModalTab('info');
        setDiarioEntries([]);
        try {
            const res = await axios.get(`http://localhost:8000/api/tutor/alumno/${alumnoId}`);
            setStudentDetail(res.data);
            if (res.data.candidatura?.id && res.data.candidatura?.estado === 'VALIDADO') {
                fetchStudentDiario(res.data.candidatura.id);
            }
        } catch (error) {
            console.error("Error fetching student details", error);
            alert("No se pudo cargar el detalle del alumno.");
            setIsDetailModalOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleOpenCompanyModal = (empresaName: string) => {
        setSelectedCompany(empresaName);
    };

    const pendingStudents = alumnos.filter(a => a.isAprobado === false);
    const approvedStudents = alumnos.filter(a => a.isAprobado !== false);

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display transition-colors duration-300">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-background-dark border-r border-slate-200 dark:border-slate-800 flex flex-col transition-colors duration-300">
                <div className="p-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-2xl">school</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold leading-tight dark:text-white">EduPrácticas</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Connect Panel</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {[
                        { id: 'resumen', label: 'Resumen', icon: 'dashboard', path: '#' },
                        { id: 'solicitudes', label: 'Solicitudes', icon: 'person_add', path: '#', badge: pendingStudents.length > 0 ? pendingStudents.length : null },
                        { id: 'alumnos', label: 'Alumnos', icon: 'group', path: '#' },
                        { id: 'mensajes', label: 'Mensajes', icon: 'forum', path: '#' },
                        { id: 'empresas', label: 'Empresas', icon: 'corporate_fare', path: '#' },
                        { id: 'documentacion', label: 'Documentación', icon: 'description', path: '#' },
                        { id: 'reportes', label: 'Reportes', icon: 'assessment', path: '#' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.path && item.path !== '#') {
                                    navigate(item.path);
                                } else {
                                    setActiveTab(item.id as any);
                                }
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group ${activeTab === item.id
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                <span className="text-sm">{item.label}</span>
                            </div>
                            {item.badge && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg shadow-red-500/30">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                        <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-primary font-bold overflow-hidden">
                            {displayName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate dark:text-white group-hover:text-primary transition-colors">{displayName}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{displayRole}</p>
                        </div>
                        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark">
                <header className="h-16 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 transition-colors duration-300">
                    <h2 className="text-lg font-bold dark:text-white">Panel de Gestión - {user?.centro || 'Vista General'}</h2>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                            <input
                                className="pl-10 pr-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-background-dark text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent w-64 outline-none transition-all placeholder:text-slate-400"
                                placeholder="Buscar alumnos o empresas..."
                                type="text"
                            />
                        </div>
                        <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative transition-colors">
                            <span className="material-symbols-outlined">notifications</span>
                            {notificaciones.filter(n => !n.leida).length > 0 && (
                                <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-background-dark"></span>
                            )}
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* SOLICITUDES TAB */}
                    {activeTab === 'solicitudes' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                            <div className="bg-white dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">person_add</span>
                                        Solicitudes de Acceso Pendientes
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Alumnos que se han registrado seleccionándote como tutor y esperan aprobación.</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                                                <th className="px-6 py-4">Alumno</th>
                                                <th className="px-6 py-4">Email</th>
                                                <th className="px-6 py-4">Grado</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 dark:text-slate-200">
                                            {pendingStudents.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="text-center py-12 text-slate-500">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <span className="material-symbols-outlined text-4xl opacity-20">check_circle</span>
                                                            <p>No tienes solicitudes pendientes.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                pendingStudents.map((alu) => (
                                                    <tr key={alu.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{alu.nombre}</td>
                                                        <td className="px-6 py-4 text-sm text-slate-500">{alu.email}</td>
                                                        <td className="px-6 py-4 text-sm text-slate-500">{alu.grado}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleApproveAlumno(alu.id)}
                                                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 ml-auto"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">check</span>
                                                                Aprobar Acceso
                                                            </button>
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

                    {/* RESUMEN / ALUMNOS TAB */}
                    {(activeTab === 'resumen' || activeTab === 'alumnos') && (
                        <div className="flex flex-col lg:flex-row gap-8">
                            <div className="flex-1 flex flex-col gap-8">
                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom duration-500 delay-100">
                                    {[
                                        { label: 'Alumnos Validados', value: stats.alumnosValidados.toString(), change: `de ${stats.totalAlumnos} totales`, icon: 'person_check', color: 'green', primaryColor: 'primary' },
                                        { label: 'Empresas Activas', value: stats.totalEmpresas.toString(), change: 'Estable', icon: 'domain', color: 'slate', primaryColor: 'primary' },
                                        { label: 'Validaciones Pendientes', value: stats.pendingValidations.toString(), change: '+Active', icon: 'priority_high', color: 'red', primaryColor: 'amber' },
                                    ].map((kpi, index) => (
                                        <div key={index} className="bg-white dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className={`material-symbols-outlined text-${kpi.primaryColor === 'amber' ? 'amber-600' : 'primary'} bg-${kpi.primaryColor === 'amber' ? 'amber-50 dark:bg-amber-500/10' : 'primary/10'} p-2 rounded-lg`}>{kpi.icon}</span>
                                                <span className={`text-xs font-semibold px-2 py-1 rounded ${kpi.color === 'green' ? 'text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400' :
                                                    kpi.color === 'red' ? 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400' :
                                                        'text-slate-500 bg-slate-50 dark:text-slate-400 dark:bg-slate-800'
                                                    }`}>{kpi.change}</span>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{kpi.label}</p>
                                            <h3 className="text-3xl font-bold dark:text-white">{kpi.value}</h3>
                                        </div>
                                    ))}
                                </div>

                                {/* Assignments Table */}
                                <div className="bg-white dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom duration-500 delay-200">
                                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <h3 className="font-bold text-lg dark:text-white">Gestión de Alumnos del Centro</h3>
                                        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
                                            <span className="material-symbols-outlined text-[18px]">add</span>
                                            Nueva Asignación
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                                                    <th className="px-6 py-4">Alumno</th>
                                                    <th className="px-6 py-4">Grado</th>
                                                    <th className="px-6 py-4">Empresa Asignada</th>
                                                    <th className="px-6 py-4">Estado</th>
                                                    <th className="px-6 py-4 text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 dark:text-slate-200">
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-8 text-slate-500">
                                                            <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                                                        </td>
                                                    </tr>
                                                ) : approvedStudents.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-8 text-slate-500">
                                                            No hay alumnos activos registrados.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    approvedStudents.map((row) => (
                                                        <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="size-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                                                                        {row.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium dark:text-white">{row.nombre}</p>
                                                                        <p className="text-xs text-slate-400">{row.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={row.grado}>
                                                                {row.grado}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                                {row.empresa}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${row.status === 'VALIDADO' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' :
                                                                    row.status === 'PENDIENTE_FIRMA_EMPRESA' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
                                                                        row.status === 'Finalizada' ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600' :
                                                                            'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                                                    }`}>{row.status === 'PENDIENTE_FIRMA_EMPRESA' ? 'Firma Empresa Pendiente' : row.status}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex justify-end items-center gap-2">
                                                                    <button
                                                                        onClick={() => handleRemoveAlumno(row.id, row.nombre)}
                                                                        className="flex items-center justify-center p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-all group"
                                                                        title="Eliminar Alumno"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[20px]">person_remove</span>
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleOpenDetailModal(row.id)}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-primary hover:text-white dark:hover:bg-primary transition-all group"
                                                                        title="Ver Expediente"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                                        Detalles
                                                                    </button>

                                                                    {row.oferta_id && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                await handleOpenDetailModal(row.id);
                                                                                setIsDetailModalOpen(false);
                                                                                setIsOfferModalOpen(true);
                                                                            }}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all"
                                                                            title="Ver Oferta de Empresa"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[16px]">work</span>
                                                                            Oferta
                                                                        </button>
                                                                    )}

                                                                    {row.status === 'ADMITIDO' && row.candidatura_id && (
                                                                        <button
                                                                            onClick={() => handleOpenValModal(row)}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[16px]">verified</span>
                                                                            Validar
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                                        <button className="text-sm text-slate-500 hover:text-primary font-medium transition-colors">Ver todos los alumnos ({alumnos.length})</button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Alerts Sidebar */}
                            <div className="w-full lg:w-80 flex flex-col gap-6 animate-in fade-in slide-in-from-right duration-500 delay-300">
                                <div className="bg-white dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className="material-symbols-outlined text-amber-500">warning</span>
                                        <h3 className="font-bold dark:text-white">Alertas Recientes</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {notificaciones.filter(n => !n.leida).length === 0 ? (
                                            <div className="p-6 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                                <span className="material-symbols-outlined text-3xl opacity-50 mb-2">notifications_off</span>
                                                <p className="text-xs font-bold">Sin alertas pendientes</p>
                                            </div>
                                        ) : (
                                            notificaciones.filter(n => !n.leida).slice(0, 5).map(n => {
                                                const bgColors = {
                                                    'error': 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 group-hover:border-red-200 dark:group-hover:border-red-500/40',
                                                    'warning': 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 group-hover:border-amber-200 dark:group-hover:border-amber-500/40',
                                                    'success': 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 group-hover:border-emerald-200 dark:group-hover:border-emerald-500/40',
                                                };
                                                const textColors = {
                                                    'error': 'text-red-900 dark:text-red-400',
                                                    'warning': 'text-amber-900 dark:text-amber-400',
                                                    'success': 'text-emerald-900 dark:text-emerald-400',
                                                };
                                                const subtextColors = {
                                                    'error': 'text-red-700 dark:text-red-300/70',
                                                    'warning': 'text-amber-700 dark:text-amber-300/70',
                                                    'success': 'text-emerald-700 dark:text-emerald-300/70',
                                                };
                                                const iconColors = {
                                                    'error': 'text-red-600 dark:text-red-400',
                                                    'warning': 'text-amber-600 dark:text-amber-400',
                                                    'success': 'text-emerald-600 dark:text-emerald-400',
                                                };
                                                
                                                const isWarning = n.type === 'error' || n.type === 'warning';
                                                const isSuccess = n.type === 'success';
                                                
                                                const containerClass = `flex gap-4 p-3 rounded-lg border group transition-all cursor-pointer relative ${
                                                    isWarning ? bgColors['error'] : isSuccess ? bgColors['success'] : 'bg-primary/5 border-primary/10 hover:border-primary/30'
                                                }`;
                                                
                                                return (
                                                    <div key={n.id} onClick={() => {
                                                        handleReadNotification(n.id);
                                                        if (n.title.includes('Nuevo Alumno')) setActiveTab('solicitudes');
                                                    }} className={containerClass}>
                                                        {n.leida === false && <span className="absolute top-2 right-2 size-2 bg-primary rounded-full animate-pulse"></span>}
                                                        <span className={`material-symbols-outlined text-[20px] shrink-0 ${isWarning ? iconColors['error'] : isSuccess ? iconColors['success'] : 'text-primary'}`}>{n.icon || 'notification_important'}</span>
                                                        <div className="pr-4">
                                                            <p className={`text-xs font-bold ${isWarning ? textColors['error'] : isSuccess ? textColors['success'] : 'text-primary'}`}>{n.title}</p>
                                                            <p className={`text-[11px] mt-1 line-clamp-2 ${isWarning ? subtextColors['error'] : isSuccess ? subtextColors['success'] : 'text-slate-600 dark:text-slate-400'}`}>{n.desc}</p>
                                                            {n.action && <button className={`text-[11px] font-bold mt-2 hover:underline ${isWarning ? iconColors['error'] : isSuccess ? iconColors['success'] : 'text-primary'}`}>{n.action}</button>}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <button className="w-full mt-6 text-xs text-slate-400 hover:text-primary transition-colors text-center border-t border-slate-100 dark:border-slate-800 pt-4">Historial de alertas</button>
                                </div>

                                {/* Quick Tools */}
                                <div className="bg-primary rounded-xl p-6 text-white shadow-lg shadow-primary/25 relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <h4 className="font-bold mb-2">Ayuda del Tutor</h4>
                                        <p className="text-xs text-primary-100 opacity-80 mb-4 leading-relaxed">¿Necesitas ayuda con la documentación ministerial? Consulta nuestra guía rápida.</p>
                                        <button className="w-full bg-white text-primary py-2 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm">
                                            Ver Documentación Oficial
                                        </button>
                                    </div>
                                    {/* Decorative elements */}
                                    <div className="absolute top-[-20%] right-[-20%] size-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MENSAJES TAB */}
                    {activeTab === 'mensajes' && (
                        <div className="h-[calc(100vh-12rem)] animate-in fade-in duration-500">
                            <ChatSystem />
                        </div>
                    )}

                    {/* EMPRESAS TAB */}
                    {activeTab === 'empresas' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                            <div className="bg-white dark:bg-background-dark rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-xl font-black dark:text-white">Empresas Colaboradoras</h3>
                                    <p className="text-sm text-slate-500 mt-1">Empresas con alumnos asignados de tu centro educativo</p>
                                </div>
                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {empresas.length === 0 ? (
                                        <div className="col-span-3 py-20 text-center">
                                            <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-800 mb-4">corporate_fare</span>
                                            <p className="text-slate-500 font-bold">No hay empresas con alumnos asignados actualmente.</p>
                                        </div>
                                    ) : (
                                        empresas.map((emp, i) => (
                                            <div key={i} className="group p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="size-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                                                        <span className="material-symbols-outlined text-3xl">business</span>
                                                    </div>
                                                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase">
                                                        {emp.alumnosCount} {emp.alumnosCount === 1 ? 'Alumno' : 'Alumnos'}
                                                    </span>
                                                </div>
                                                <h4 className="text-lg font-black dark:text-white mb-1 group-hover:text-primary transition-colors">{emp.nombre}</h4>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">CIF: {emp.cif}</p>

                                                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                                                        <span className="material-symbols-outlined text-sm">mail</span>
                                                        <span className="text-xs font-medium truncate">{emp.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                                                        <span className="material-symbols-outlined text-sm">location_on</span>
                                                        <span className="text-xs font-medium">Ubicación principal</span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleOpenCompanyModal(emp.nombre)}
                                                    className="w-full mt-6 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-primary hover:text-white hover:border-primary transition-all">
                                                    Ver Empresa
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DOCUMENTACION TAB */}
                    {activeTab === 'documentacion' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                            <div className="bg-white dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">description</span>
                                        Documentación y Convenios
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Gestión de convenios generados para alumnos con prácticas validadas.</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                                                <th className="px-6 py-4">Alumno</th>
                                                <th className="px-6 py-4">Empresa</th>
                                                <th className="px-6 py-4">Convenio</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 dark:text-slate-200">
                                            {alumnos.filter(a => a.status === 'VALIDADO').length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="text-center py-12 text-slate-500">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <span className="material-symbols-outlined text-4xl opacity-20">folder_off</span>
                                                            <p>No hay convenios generados aún.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                alumnos.filter(a => a.status === 'VALIDADO').map((alu) => (
                                                    <tr key={alu.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="size-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                                                                    {alu.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium dark:text-white">{alu.nombre}</p>
                                                                    <p className="text-xs text-slate-400">{alu.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                            {alu.empresa || 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                                <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                                                                <span>Convenio_Practicas.pdf</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {alu.candidatura_id ? (
                                                                <button
                                                                    onClick={() => window.open(`http://localhost:8000/api/tutor/candidaturas/${alu.candidatura_id}/convenio`, '_blank')}
                                                                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ml-auto"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                                                    Descargar
                                                                </button>
                                                            ) : (
                                                                <span className="text-sm text-slate-400 italic">No disponible</span>
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
                </div>

                {/* MODAL DE VALIDACIÓN */}
                {isValModalOpen && alumnoToVal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-emerald-500 to-teal-600 text-white">
                                <h3 className="text-2xl font-black flex items-center gap-3">
                                    <span className="material-symbols-outlined text-3xl">assignment_turned_in</span>
                                    {valStep === 1 ? 'Validar Proyecto' : 'Firma Digital'}
                                </h3>
                                <p className="opacity-90 text-sm mt-1">
                                    {valStep === 1 ? 'Revisa los detalles antes de generar el convenio' : 'Firma para formalizar el acuerdo'}
                                </p>
                            </div>

                            <div className="p-8 space-y-6">
                                {valStep === 1 ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estudiante</p>
                                                <p className="font-bold dark:text-white">{alumnoToVal.nombre}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa</p>
                                                <p className="font-bold dark:text-white">{alumnoToVal.empresa}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duración Elegida</p>
                                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                                                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                                                    {alumnoToVal.tipoDuracion === '1_mes' ? '1 Mes' :
                                                        alumnoToVal.tipoDuracion === '2_meses' ? '2 Meses' : '3 Meses'}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horario y Turno</p>
                                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                                    {alumnoToVal.horario === 'manana' ? 'Mañana (08:00 - 15:00)' : 'Tarde (15:00 - 22:00)'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2 italic">
                                                <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">info</span>
                                                Al confirmar, pasarás a la pantalla de firma digital para formalizar el convenio.
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm font-bold dark:text-white">Firma del Tutor Académico:</p>
                                        <SignaturePad onSave={(url) => setSignature(url)} />
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                                <button
                                    onClick={() => {
                                        if (valStep === 2) setValStep(1);
                                        else setIsValModalOpen(false);
                                    }}
                                    className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                >
                                    {valStep === 2 ? 'Volver' : 'Cancelar'}
                                </button>
                                <button
                                    onClick={() => {
                                        if (valStep === 1) setValStep(2);
                                        else handleValidar();
                                    }}
                                    disabled={isSubmitting || (valStep === 2 && !signature)}
                                    className="flex-2 py-3 bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Procesando...' : (valStep === 1 ? 'Siguiente step' : 'Confirmar y Validar')}
                                    <span className="material-symbols-outlined text-[20px]">
                                        {valStep === 1 ? 'arrow_forward' : 'verified'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE DETALLE DEL ALUMNO */}
                {isDetailModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-bottom-10 duration-500">
                            {detailLoading ? (
                                <div className="p-20 flex flex-col items-center justify-center gap-4">
                                    <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-500 font-bold">Cargando expediente académico...</p>
                                </div>
                            ) : studentDetail && (
                                <>
                                    {/* Header */}
                                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex gap-6 items-center">
                                            <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black shadow-inner">
                                                {studentDetail.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black dark:text-white leading-tight">{studentDetail.nombre}</h3>
                                                <p className="text-primary font-bold text-sm uppercase tracking-wider">{studentDetail.grado}</p>
                                                <div className="flex items-center gap-2 mt-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                                                    <span className="material-symbols-outlined text-[16px]">mail</span>
                                                    {studentDetail.email}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsDetailModalOpen(false)} className="size-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </div>

                                    {/* Content Scrollable */}
                                    <div className="px-8 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex gap-8">
                                        <button
                                            onClick={() => setModalTab('info')}
                                            className={`py-3 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${modalTab === 'info' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Expediente General
                                            {modalTab === 'info' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>}
                                        </button>
                                        <button
                                            onClick={() => setModalTab('diario')}
                                            className={`py-3 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${modalTab === 'diario' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Diario de Prácticas
                                            {modalTab === 'diario' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>}
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                        {modalTab === 'info' ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                                                {/* Left: Info & Skills */}
                                                <div className="space-y-8">
                                                    <section className="space-y-4">
                                                        <h4 className="flex items-center gap-2 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Habilidades y Tecnologías</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {studentDetail.habilidades?.split(',').map((skill: string, i: number) => (
                                                                <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700">
                                                                    {skill.trim()}
                                                                </span>
                                                            )) || <p className="text-xs text-slate-400 italic">No se han definido habilidades específicas.</p>}
                                                        </div>
                                                    </section>

                                                    <section className="space-y-3">
                                                        <h4 className="flex items-center gap-2 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Expediente FCT</h4>
                                                        <div className="bg-white dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-slate-500 dark:text-slate-400">Estado Actual:</span>
                                                                <span className={`font-bold ${studentDetail.candidatura?.estado === 'VALIDADO' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                                    {studentDetail.candidatura?.estado || 'Sin Solicitud'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-slate-500 dark:text-slate-400">Empresa:</span>
                                                                <span className="font-bold dark:text-white">{studentDetail.candidatura?.empresa || 'N/A'}</span>
                                                            </div>
                                                            {studentDetail.cv && (
                                                                <button
                                                                    onClick={() => window.open(`http://localhost:8000/uploads/cv/${studentDetail.cv}`, '_blank')}
                                                                    className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                                                    Descargar CV (PDF)
                                                                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                                                </button>
                                                            )}
                                                            {studentDetail.candidatura?.estado === 'VALIDADO' && (
                                                                <button
                                                                    onClick={() => window.open(`http://localhost:8000/api/tutor/candidaturas/${studentDetail.candidatura.id}/convenio`, '_blank')}
                                                                    className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">description</span>
                                                                    Descargar Convenio (PDF)
                                                                    <span className="material-symbols-outlined text-[14px]">verified</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </section>
                                                </div>

                                                {/* Right: Calendar / Progress */}
                                                <div className="space-y-6">
                                                    <h4 className="flex items-center gap-2 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Calendario de Prácticas</h4>

                                                    {studentDetail.candidatura?.estado === 'VALIDADO' ? (
                                                        <div className="bg-slate-50 dark:bg-slate-800/20 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                                                            {/* Reusing Circular Timer Logic visually */}
                                                            <div className="flex items-center gap-8 mb-6">
                                                                <div className="text-center">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase">Inicio</p>
                                                                    <p className="font-bold dark:text-white">{studentDetail.candidatura.fechaInicio}</p>
                                                                </div>
                                                                <div className="size-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                                                                <div className="text-center">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase">Fin</p>
                                                                    <p className="font-bold dark:text-white">{studentDetail.candidatura.fechaFin}</p>
                                                                </div>
                                                            </div>

                                                            {/* Mini Circular Progress */}
                                                            <CircularTimer start={studentDetail.candidatura.fechaInicio} end={studentDetail.candidatura.fechaFin} />

                                                            <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Horario</p>
                                                                    <p className="text-xs font-bold dark:text-white capitalize">{studentDetail.candidatura.horario}</p>
                                                                </div>
                                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Duración</p>
                                                                    <p className="text-xs font-bold dark:text-white">{studentDetail.candidatura.tipoDuracion.replace('_', ' ')}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                                                            <span className="material-symbols-outlined text-4xl mb-2 opacity-20">event_busy</span>
                                                            <p className="text-xs font-bold text-center px-8">El calendario se activará una vez las prácticas sean validadas.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 animate-in fade-in duration-300">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Bitácora de Actividades Realizadas</h4>
                                                    <div className="px-3 py-1 bg-primary/10 rounded-lg text-primary text-xs font-bold">
                                                        Total: {diarioEntries.filter(e => e.estado === 'APROBADO').reduce((acc, curr: any) => acc + curr.horas, 0)}h / 370h
                                                    </div>
                                                </div>

                                                {loadingDiario ? (
                                                    <div className="flex items-center justify-center py-20">
                                                        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                                                    </div>
                                                ) : diarioEntries.length === 0 ? (
                                                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                                        <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">history_edu</span>
                                                        <p className="text-sm font-bold text-slate-500">El alumno aún no ha registrado actividades.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {diarioEntries.map((entry: any) => (
                                                            <div key={entry.id} className="bg-white dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 group shadow-sm">
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
                                                                        <p className="text-sm text-slate-600 dark:text-slate-300">{entry.actividad}</p>

                                                                        {entry.estado === 'PENDIENTE' && (
                                                                            <div className="mt-4 space-y-3">
                                                                                <textarea
                                                                                    placeholder="Añadir observaciones o feedback..."
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
                                                                                        Aprobar
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleValidarDiario(entry.id, 'RECHAZADO')}
                                                                                        className="flex-1 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                                                                    >
                                                                                        Rechazar
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {entry.observaciones && (
                                                                            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-l-4 border-slate-300 dark:border-slate-700">
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Observaciones del Tutor</p>
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

                                    {/* Footer */}
                                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end">
                                        <button
                                            onClick={() => setIsDetailModalOpen(false)}
                                            className="px-8 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs rounded-2xl shadow-xl hover:scale-[1.02] transition-all"
                                        >
                                            Cerrar Expediente
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL DE DETALLE DE LA OFERTA */}
                {isOfferModalOpen && studentDetail?.candidatura?.oferta && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-blue-600 to-indigo-700 text-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-black flex items-center gap-3">
                                            <span className="material-symbols-outlined text-3xl">campaign</span>
                                            Detalle de la Oferta
                                        </h3>
                                        <p className="opacity-90 text-sm mt-1">Empresa: {studentDetail.candidatura.empresa}</p>
                                    </div>
                                    <button onClick={() => setIsOfferModalOpen(false)} className="size-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors">
                                        <span className="material-symbols-outlined text-white">close</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                                <section>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título del Puesto</h4>
                                    <h3 className="text-xl font-bold dark:text-white">{studentDetail.candidatura.oferta.titulo}</h3>
                                </section>

                                <section>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed overflow-y-auto">
                                        {studentDetail.candidatura.oferta.descripcion}
                                    </p>
                                </section>

                                <div className="grid grid-cols-2 gap-6">
                                    <section>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ubicación</h4>
                                        <div className="flex items-center gap-2 text-sm font-bold dark:text-white">
                                            <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                                            {studentDetail.candidatura.oferta.ubicacion}
                                        </div>
                                    </section>
                                    <section>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jornada</h4>
                                        <div className="flex items-center gap-2 text-sm font-bold dark:text-white">
                                            <span className="material-symbols-outlined text-primary text-lg">work</span>
                                            {studentDetail.candidatura.oferta.jornada}
                                        </div>
                                    </section>
                                </div>

                                <section>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tecnologías Requeridas</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {studentDetail.candidatura.oferta.tecnologias?.split(',').map((tech: string, i: number) => (
                                            <span key={i} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black border border-blue-100 dark:border-blue-500/20">
                                                {tech.trim()}
                                            </span>
                                        )) || <p className="text-xs text-slate-400 italic">No especificadas</p>}
                                    </div>
                                </section>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={() => setIsOfferModalOpen(false)}
                                    className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl hover:opacity-90 transition-all"
                                >
                                    Cerrar Detalles
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* MODAL DE EMPRESA (LISTA DE ALUMNOS) */}
                {selectedCompany && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black dark:text-white flex items-center gap-3">
                                        <span className="material-symbols-outlined text-primary text-3xl">business</span>
                                        {selectedCompany}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Listado de alumnos asignados</p>
                                </div>
                                <button
                                    onClick={() => setSelectedCompany(null)}
                                    className="size-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-0 overflow-y-auto max-h-[60vh]">
                                {alumnos.filter(a => a.empresa === selectedCompany).length === 0 ? (
                                    <div className="p-12 text-center text-slate-500">
                                        <p>No hay alumnos asignados a esta empresa actualmente.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                                            <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                                                <th className="px-8 py-4">Alumno</th>
                                                <th className="px-8 py-4">Grado</th>
                                                <th className="px-8 py-4">Estado</th>
                                                <th className="px-8 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 dark:text-slate-200">
                                            {alumnos.filter(a => a.empresa === selectedCompany).map((alu) => (
                                                <tr key={alu.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-8 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                                                                {alu.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm dark:text-white">{alu.nombre}</p>
                                                                <p className="text-xs text-slate-400">{alu.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4 text-sm text-slate-500">{alu.grado}</td>
                                                    <td className="px-8 py-4">
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${alu.status === 'VALIDADO' ? 'bg-green-50 text-green-600 border-green-200' :
                                                            alu.status === 'ADMITIDO' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                                'bg-slate-50 text-slate-500 border-slate-200'
                                                            }`}>
                                                            {alu.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <button
                                                            onClick={async () => {
                                                                setSelectedCompany(null);
                                                                await handleOpenDetailModal(alu.id);
                                                            }}
                                                            className="text-primary hover:text-primary/80 font-bold text-xs hover:underline"
                                                        >
                                                            Ver Ficha
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end">
                                <button
                                    onClick={() => setSelectedCompany(null)}
                                    className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-lg hover:scale-[1.02] transition-all"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TutorCentroDashboard;
