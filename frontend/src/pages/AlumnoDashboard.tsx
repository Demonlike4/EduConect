import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import ChatSystem from '../components/ChatSystem';
import NotificationPanel from '../components/NotificationPanel';
import { apiUrl, assetUrl } from '../lib/urls.ts';
import DashboardLayout from '../components/layout/DashboardLayout';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/SkeletonCard';
/**
 * ── INTERFACES DE DATOS ─────────────────────────────────────────────────────
 * Definición de estructuras de datos para tipado fuerte en el dashboard del alumno.
 */

// Información principal del alumno y su estado de prácticas
interface DashboardData {
    nombre: string;
    grado: string;
    estado_practicas: string; // Estados posibles: 'POSTULADO', 'ADMITIDO', 'VALIDADO', 'Sin solicitud'
    empresa?: string;
    empresa_logo?: string;
    puesto?: string;
    tutor_empresa?: string;
    tutor_centro?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    candidatura_id?: number;
}

// Entradas del Diario de Prácticas (Bitácora)
interface DiarioEntry {
    id: number;
    fecha: string;
    actividad: string;
    horas: number;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
    observaciones?: string;
}

// Datos detallados de la empresa colaboradora
interface EmpresaData {
    id: number;
    nombre: string;
    descripcion: string;
    logo: string | null;
    web: string | null;
    linkedin: string | null;
    twitter: string | null;
    instagram: string | null;
    ubicacion: string | null;
    tecnologias: string[];
    beneficios: string[];
}

// Ofertas de prácticas disponibles en el mercado
interface Oferta {
    id: number;
    titulo: string;
    empresa: string;
    descripcion: string;
    ubicacion: string;
    tags: string[];
    empresa_data: EmpresaData;
    color?: string;
    imagen?: string;
    tipo: string;
    jornada: string;
    horario: string;
}

/**
 * ── COMPONENTE: TimeProgress ────────────────────────────────────────────────
 * Visualiza el progreso temporal de las prácticas (FCT) mediante una barra.
 * Calcula el % transcurrido y los días restantes basándose en fechas de inicio y fin.
 */
const TimeProgress: React.FC<{ start: string, end: string }> = ({ start, end }) => {
    if (!start || !end) return <div className="text-sm text-zinc-500 italic">Fechas no asignadas aún</div>;

    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const now = new Date().getTime();

    const totalDuration = endDate - startDate;
    const elapsed = now - startDate;
    // Capamos el progreso entre 0 y 100
    const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return (
        <div className="w-full font-body">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tiempo Restante</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
                        {daysLeft > 0 ? `${daysLeft} Días` : 'FCT Finalizada'}
                    </p>
                </div>
                <p className="text-xs text-indigo-600 font-black">{Math.round(progress)}%</p>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden shadow-inner border border-zinc-200/50">
                <div
                    className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 h-full transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-2">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">Inicio: {new Date(start).toLocaleDateString()}</p>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">Fin: {new Date(end).toLocaleDateString()}</p>
            </div>
        </div>
    );
};

/**
 * ── COMPONENTE PRINCIPAL: AlumnoDashboard ──────────────────────────────────
 * Centro operativo para el estudiante. Permite gestionar su perfil, ver ofertas,
 * registrar actividades en el diario FCT y comunicarse con los tutores.
 */
const AlumnoDashboard: React.FC = () => {
    // ── NAVEGACIÓN Y CONTEXTO ───────────────────────────────────────────────
    const navigate = useNavigate();
    const { user, login, logout } = useUser(); // Contexto global de usuario

    // ── ESTADO DE LA INTERFAZ ───────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('dashboard'); // Pestaña activa del menú lateral
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Control del sidebar en móviles
    const [loading, setLoading] = useState(true); // Estado de carga global inicial

    // ── DATOS DEL ALUMNO Y PRÁCTICAS ───────────────────────────────────────
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null); // Datos perfil/prácticas
    const [ofertas, setOfertas] = useState<Oferta[]>([]); // Lista de vacantes disponibles
    const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaData | null>(null); // Empresa en detalle (modal)

    // ── GESTIÓN DEL DIARIO (BITÁCORA) ───────────────────────────────────────
    const [diarioEntries, setDiarioEntries] = useState<DiarioEntry[]>([]); // Actividades registradas
    const [diarioStats, setDiarioStats] = useState({ totalHoras: 0, objetivoHoras: 370 }); // Progreso horas
    const [currentMonth, setCurrentMonth] = useState(new Date()); // Mes visualizado en el calendario
    const [selectedDate, setSelectedDate] = useState<string | null>(null); // Fecha seleccionada para registro
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false); // Modal de registro diario
    const [attendanceForm, setAttendanceForm] = useState({ // Formulario de actividad diaria
        modalidad: 'presencial',
        horaInicio: '08:00',
        horaFin: '15:00',
        descripcion: ''
    });

    // ── CALENDARIO FESTIVO ANDALUCÍA 2026 ───────────────────────────────────
    // Usado para bloquear el registro de actividades en días no lectivos.
    const HOLIDAYS_ANDALUCIA_2026: Record<string, { label: string, type: 'regional' | 'nacional' }> = {
        '2026-01-01': { label: 'Año Nuevo', type: 'nacional' },
        '2026-01-06': { label: 'Reyes', type: 'nacional' },
        '2026-02-28': { label: 'Día de Andalucía', type: 'regional' },
        '2026-03-30': { label: 'Lunes Santo', type: 'regional' },
        '2026-03-31': { label: 'Martes Santo', type: 'regional' },
        '2026-04-01': { label: 'Miércoles Santo', type: 'regional' },
        '2026-04-02': { label: 'Jueves Santo', type: 'nacional' },
        '2026-04-03': { label: 'Viernes Santo', type: 'nacional' },
        '2026-05-01': { label: 'Fiesta del Trabajo', type: 'nacional' },
        '2026-08-15': { label: 'Asunción', type: 'nacional' },
        '2026-10-12': { label: 'Fiesta Nacional', type: 'nacional' },
        '2026-12-06': { label: 'Constitución', type: 'nacional' },
        '2026-12-08': { label: 'Inmaculada', type: 'nacional' },
        '2026-12-25': { label: 'Navidad', type: 'nacional' },
    };

    /**
     * ── fetchDiario ─────────────────────────────────────────────────────────
     * Carga la lista completa de actividades registradas por el alumno.
     * Endpoint: POST /api/diario/alumno/list
     */
    const fetchDiario = async () => {
        if (!user?.email) return;
        try {
            const res = await axios.post(apiUrl('/api/diario/alumno/list'), { email: user.email });
            setDiarioEntries(res.data.actividades || []);
            setDiarioStats({
                totalHoras: res.data.totalHoras,
                objetivoHoras: res.data.objetivoHoras || 370
            });
        } catch (err) {
            console.error("Error cargando el diario:", err);
        }
    };

    /**
     * ── EFECTO: Carga Inicial de Datos (Dashboard) ──────────────────────────
     */
    useEffect(() => {
        const fetchDashboard = async () => {
            if (user?.email) {
                try {
                    const res = await axios.post(apiUrl('/api/alumno/dashboard'), { email: user.email });
                    setDashboardData(res.data);
                    // Actualizar foto en el contexto si el servidor devuelve una distinta
                    if (res.data.foto && res.data.foto !== user.foto) {
                        login({ ...user, foto: res.data.foto });
                    }
                } catch (err) {
                    console.error("Error cargando dashboard:", err);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, [user]);

    /**
     * ── fetchOfertas ────────────────────────────────────────────────────────
     * Recupera las vacantes de prácticas abiertas de todas las empresas.
     */
    const fetchOfertas = async () => {
        try {
            const res = await axios.get(apiUrl('/api/alumno/ofertas'));
            setOfertas(res.data.ofertas || []);
        } catch (err) {
            console.error("Error cargando ofertas:", err);
        }
    };

    /**
     * ── EFECTO: Cambio de Pestaña ───────────────────────────────────────────
     * Dispara la carga de datos específicos según la sección activa.
     */
    useEffect(() => {
        if (activeTab === 'search') fetchOfertas();
        if (activeTab === 'diario') fetchDiario();
    }, [activeTab]);

    /**
     * ── handleApply ─────────────────────────────────────────────────────────
     * Envía una solicitud formal de prácticas a una oferta específica.
     */
    const handleApply = async (ofertaId: number) => {
        if (!confirm("¿Deseas enviar tu candidatura a esta oferta de prácticas?")) return;
        try {
            await axios.post(apiUrl('/api/alumno/candidaturas/apply'), {
                email: user?.email,
                oferta_id: ofertaId
            });
            alert("¡Candidatura enviada! Podrás consultar el estado en tu panel.");
            // Refrescar datos para mostrar el estado 'POSTULADO'
            const res = await axios.post(apiUrl('/api/alumno/dashboard'), { email: user?.email });
            setDashboardData(res.data);
            setActiveTab('dashboard');
        } catch (err: any) {
            alert(err.response?.data?.error || "Error al procesar la solicitud.");
        }
    };

    // Cierre de sesión y limpieza de estado
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    /**
     * ── handleNotificationAction ────────────────────────────────────────────
     * Maneja la interacción con las notificaciones recibidas.
     * Redirige inteligentemente al usuario a la pestaña pertinente.
     */
    const handleNotificationAction = (notif: any) => {
        const txt = (notif.title + ' ' + notif.desc + ' ' + notif.action).toLowerCase();
        if (txt.includes('diario') || txt.includes('fct') || txt.includes('asistencia')) {
            setActiveTab('diario');
        } else if (txt.includes('oferta') || txt.includes('vacante') || txt.includes('mercado')) {
            setActiveTab('search');
        } else if (txt.includes('mensaje') || txt.includes('chat')) {
            setActiveTab('messages'); // Corregido de 'mensajes' a 'messages' para coincidir con el estado
        } else {
            setActiveTab('dashboard');
        }
    };

    /**
     * ── HELPERS: Visuales y Lógica de Calendario ────────────────────────────
     */

    // Obtiene la imagen de la oferta basándose en su categoría si no hay imagen propia
    const getOfferImage = (offer: Oferta): string => {
        if (offer.imagen) return assetUrl(`/uploads/ofertas/${offer.imagen}`);
        const text = `${offer.titulo} ${offer.descripcion}`.toLowerCase();
        const collections = {
            design: ['1561070791-2526d30994b5', '1558655146-d09347e92766', '1586717791821-3f44a563eb4c'],
            data: ['1551288049-bebda4e38f71', '1543286386-713bdd548da4', '1504868584819-f8e90526354c'],
            security: ['1550751827-4bd374c3f58b', '1563986768609-322da13575f3', '1510511459019-5dee997dd1db'],
            marketing: ['1460925895917-afdab827c52f', '1557838923-2985c318be48', '1432888498266-38ffec3eaf0a'],
            dev: ['1498050108023-c5249f4df085', '1461749280684-dccba630e2f6', '1517694712202-14dd9538aa97']
        };

        let selected = collections.dev;
        if (/diseño|design|photoshop|illustrator|figma|ux|ui|gráfi/.test(text)) selected = collections.design;
        else if (/dato|data|machine|ia|inteligencia|python|analytic|bi|tableau/.test(text)) selected = collections.data;
        else if (/cibersegur|cyber|redes|network|firewall|hacker|seguridad/.test(text)) selected = collections.security;
        else if (/market|seo|social|contenido|publicidad|digital|community/.test(text)) selected = collections.marketing;

        const photoId = selected[offer.id % selected.length];
        return `https://images.unsplash.com/photo-${photoId}?q=80&w=800&auto=format&fit=crop`;
    };

    // Color corporativo aleatorio/secuencial para las ofertas
    const getOfferColor = (offer: any) => {
        if (offer.color) return offer.color;
        const colors = ['#4f46e5', '#9333ea', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#d946ef', '#06b6d4'];
        return colors[offer.id % colors.length];
    };

    // Extrae la modalidad (ej: [TELETRABAJO]) del texto de actividad
    const parseActivity = (text: string) => {
        if (!text) return { modality: null, cleanText: '' };
        const modalityMatch = text.match(/\[(.*?)\]/);
        const modality = modalityMatch ? modalityMatch[1].toUpperCase() : null;
        const cleanText = text.replace(/\[.*?\]/, '').trim();
        return { modality, cleanText };
    };

    // Genera la cuadrícula de días para el calendario
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        let startDay = firstDay.getDay() - 1; // Ajuste para que la semana empiece en Lunes
        if (startDay === -1) startDay = 6;
        for (let i = 0; i < startDay; i++) days.push(null);
        for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
        return days;
    };

    /**
     * ── handleDateClick ─────────────────────────────────────────────────────
     * Gestiona la selección de un día en el calendario para registrar asistencia.
     * Bloquea el registro en festivos y precarga datos si ya existe una entrada.
     */
    const handleDateClick = (date: Date) => {
        const manualDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        // Verificación de festividad
        if (HOLIDAYS_ANDALUCIA_2026[manualDateStr]) {
            alert(`Día no laborable: ${HOLIDAYS_ANDALUCIA_2026[manualDateStr].label}`);
            return;
        }

        const existing = diarioEntries.find(e => e.fecha === manualDateStr);
        setSelectedDate(manualDateStr);

        if (existing) {
            // Si ya existe registro, cargamos el formulario para edición/consulta
            setAttendanceForm({
                modalidad: existing.actividad.toUpperCase().includes('TELETRABAJO') ? 'teletrabajo' : 'presencial',
                horaInicio: '08:00', // Valores por defecto (se podrían persistir en BD individualmente)
                horaFin: '15:00',
                descripcion: existing.actividad.split(': ').slice(1).join(': ') || existing.actividad
            });
        } else {
            // Registro nuevo: limpiar formulario
            setAttendanceForm({ modalidad: 'presencial', horaInicio: '08:00', horaFin: '15:00', descripcion: '' });
        }
        setIsAttendanceModalOpen(true);
    };

    /**
     * ── handleSaveAttendance ───────────────────────────────────────────────
     * Persiste el registro de actividad diaria en el backend.
     */
    const handleSaveAttendance = async () => {
        if (!attendanceForm.descripcion) {
            alert("Es obligatorio describir las tareas realizadas durante la jornada.");
            return;
        }

        const payload = {
            fecha: selectedDate,
            horas: 7, // Jornada estándar de FCT
            actividad: `[${attendanceForm.modalidad.toUpperCase()}] ${attendanceForm.descripcion}`,
            email: user?.email
        };

        try {
            await axios.post(apiUrl('/api/diario/alumno/create'), payload);
            setIsAttendanceModalOpen(false);
            fetchDiario(); // Recargar lista para actualizar calendario
            alert("Jornada registrada correctamente.");
        } catch (e) {
            alert("Error crítico al guardar la actividad. Inténtalo de nuevo.");
        }
    };

    /**
     * ── isWithinRange ───────────────────────────────────────────────────────
     * Comprueba si una fecha está dentro del periodo oficial de prácticas.
     */
    const isWithinRange = (date: Date) => {
        if (!dashboardData?.fecha_inicio || !dashboardData?.fecha_fin) return true;
        const d = new Date(date).setHours(0, 0, 0, 0);
        const start = new Date(dashboardData.fecha_inicio).setHours(0, 0, 0, 0);
        const end = new Date(dashboardData.fecha_fin).setHours(0, 0, 0, 0);
        return d >= start && d <= end;
    };

    // Identificadores visuales del usuario
    const displayName = dashboardData?.nombre || user?.nombre || "Estudiante";
    const displayGrade = dashboardData?.grado || user?.grado || "Grado Formativo";

    return (
        <DashboardLayout
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            sidebarWidthClass="w-80"
            sidebarClassName="bg-zinc-900 text-white"
            zIndexSidebarClass="z-[70]"
            sidebar={
                <>

                {/* Cabecera del Sidebar: Logo y Título */}
                <div className="p-8 border-b border-white/5 bg-zinc-950 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                    <div className="flex items-center gap-4">
                        <div
                            className="size-12 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 rotate-3 group-hover:rotate-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 ring-4 ring-indigo-600/10 cursor-pointer"
                            onClick={() => navigate('/')}
                        >
                            <span className="material-symbols-outlined text-white text-3xl font-light">school</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">EduConect</h1>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1.5 opacity-80 font-display text-right">Portal Alumno</p>
                        </div>
                    </div>
                </div>

                {/* Menú de Navegación Dinámico */}
                <nav className="flex-1 p-6 space-y-2 mt-4 custom-scrollbar overflow-y-auto">
                    {[
                        { id: 'dashboard', label: 'Mi Panel', icon: 'dashboard', path: '#' },
                        { id: 'search', label: 'Ver Ofertas', icon: 'search', path: '#', show: user?.isAprobado },
                        { id: 'diario', label: 'Diario FCT', icon: 'calendar_today', path: '#', show: user?.isAprobado && dashboardData?.estado_practicas === 'VALIDADO' },
                        { id: 'messages', label: 'Mensajería', icon: 'forum', path: '#', show: user?.isAprobado },
                        { id: 'profile', label: 'Mi Perfil', icon: 'person', path: '/perfil/alumno' },
                    ].filter(item => item.show !== false).map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.path !== '#') {
                                    navigate(item.path);
                                } else {
                                    setActiveTab(item.id);
                                    setIsSidebarOpen(false); // Autocierre en móviles
                                }
                            }}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group/item ${activeTab === item.id
                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white shadow-xl shadow-indigo-600/20 translate-x-1'
                                : 'text-zinc-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover/item:scale-110'}`}>
                                    {item.icon}
                                </span>
                                <span className="text-[10px] font-black tracking-widest uppercase">{item.label}</span>
                            </div>
                            <span className="material-symbols-outlined text-[18px] opacity-0 group-hover/item:opacity-30 transition-opacity">chevron_right</span>
                        </button>
                    ))}
                </nav>

                {/* Pie del Sidebar: Perfil de Usuario y Logout */}
                <div className="p-8 border-t border-white/5 bg-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-4 group/profile">
                        <div className="size-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 font-black border border-indigo-500/20 group-hover/profile:scale-110 transition-transform overflow-hidden shadow-inner">
                            {user?.foto ? (
                                <img
                                    src={assetUrl(`/uploads/fotos/${user.foto}`)}
                                    className="w-full h-full object-cover"
                                    alt="Foto Perfil"
                                />
                            ) : (
                                displayName.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white truncate uppercase tracking-tighter leading-none">{displayName}</p>
                            <p className="text-[9px] text-zinc-500 font-bold truncate uppercase tracking-widest mt-1 opacity-70">Grado: {displayGrade}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-zinc-500 hover:text-red-400 transition-colors group/logout"
                            title="Cerrar Sesión"
                        >
                            <span className="material-symbols-outlined text-xl group-hover/logout:rotate-90 transition-transform duration-500">power_settings_new</span>
                        </button>
                    </div>
                </div>
                </>
            }
            header={
                <header className="h-20 lg:h-24 bg-white/70 backdrop-blur-2xl border-b border-zinc-100 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-20 transition-all">
                    <div className="flex items-center gap-4">
                        {/* Botón Hamburguesa (Móvil) */}
                        <button
                            className="lg:hidden p-2 text-zinc-500 hover:text-indigo-600 transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <span className="material-symbols-outlined text-2xl">menu</span>
                        </button>

                        {/* Título de Sección Dinámico */}
                        <div className="flex flex-col">
                            <h2 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tighter flex items-center gap-2 lg:gap-4 uppercase">
                                <span className="material-symbols-outlined text-indigo-600 text-2xl lg:text-3xl hidden sm:block">
                                    {activeTab === 'search' ? 'travel_explore' : activeTab === 'diario' ? 'auto_stories' : activeTab === 'messages' ? 'forum' : 'space_dashboard'}
                                </span>
                                {activeTab === 'search' ? 'Mercado de Prácticas' : activeTab === 'diario' ? 'Bitácora Diario' : activeTab === 'messages' ? 'Canal Mensajes' : 'Mi Panel Educativo'}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Estado Servidor (Decorativo) */}
                        <div className="hidden xl:flex items-center gap-4 px-5 py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl shadow-sm">
                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">En Línea • 2026/27</span>
                        </div>

                        {/* Panel de Notificaciones (Dropdown Inteligente) */}
                        <div className="relative group/notif">
                            <button className="size-12 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer relative">
                                <span className="material-symbols-outlined text-[24px]">notifications</span>
                                <span className="absolute top-2 right-2 size-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white">!</span>
                            </button>

                            <div className="absolute right-0 top-full mt-4 w-[calc(100vw-2rem)] sm:w-80 lg:w-96 opacity-0 translate-y-4 pointer-events-none group-hover/notif:opacity-100 group-hover/notif:translate-y-0 group-hover/notif:pointer-events-auto transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 z-[100]">
                                <div className="bg-white rounded-[32px] shadow-2xl shadow-black/20 border border-zinc-100 overflow-hidden max-h-[500px] flex flex-col">
                                    <NotificationPanel
                                        role="ALUMNO"
                                        onActionClick={handleNotificationAction}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Píldora de Perfil (Acceso rápido) */}
                        <div className="flex items-center gap-3 p-1 bg-zinc-900 rounded-2xl shadow-lg shadow-black/10 hover:scale-[1.02] transition-transform cursor-pointer overflow-hidden group/pill">
                            <div className="size-8 lg:size-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-inner overflow-hidden">
                                {user?.foto ? (
                                    <img
                                        src={assetUrl(`/uploads/fotos/${user.foto}`)}
                                        className="w-full h-full object-cover"
                                        alt="Avatar"
                                    />
                                ) : (
                                    displayName.charAt(0)
                                )}
                            </div>
                            <div className="hidden sm:block pr-4">
                                <p className="text-[9px] lg:text-[10px] font-black text-white uppercase tracking-tighter leading-none mb-0.5">{displayName}</p>
                                <p className="text-[7px] lg:text-[8px] font-bold text-zinc-400 uppercase tracking-widest leading-none group-hover:text-indigo-400">Estudiante</p>
                            </div>
                        </div>
                    </div>
                </header>
            }
        >

                {/* ── ÁREA DE CONTENIDO DINÁMICO ───────────────────────────────────────
                    Renderizado condicional basado en la pestaña activa. */}
                <main className={`flex-1 flex flex-col min-h-0 animate-in fade-in duration-700 ${activeTab === 'messages' ? 'p-0 overflow-hidden' : 'p-4 lg:p-10 space-y-8 lg:space-y-10 custom-scrollbar pb-20'}`}>

                    {/* SECCIÓN: PANEL DE CONTROL (Dashboard) */}
                    {activeTab === 'dashboard' && (
                        !user?.isAprobado ? (
                            // Vista para alumnos pendientes de aprobación administrativa
                            <div className="flex flex-col items-center justify-center p-8 lg:p-12 text-center mt-4 lg:mt-10 bg-white rounded-[40px] border border-dashed border-zinc-300">
                                <div className="size-16 lg:size-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mb-6 lg:mb-8">
                                    <span className="material-symbols-outlined text-3xl lg:text-4xl">lock_clock</span>
                                </div>
                                <h2 className="text-2xl lg:text-3xl font-black mb-4 tracking-tight">Acceso en Revisión</h2>
                                <p className="text-zinc-500 max-w-lg mb-8 lg:mb-10 text-sm lg:text-lg font-medium leading-relaxed">
                                    Tu perfil está siendo validado por el equipo docente. Pronto podrás acceder al mercado de ofertas.
                                </p>
                            </div>
                        ) : (
                            // Vista principal del alumno aprobado
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 lg:gap-10">
                                <div className="xl:col-span-2 space-y-8 lg:space-y-10">

                                    {/* Tarjeta de Estado de Prácticas (FCT) */}
                                    <div className="bg-white rounded-[32px] p-6 lg:p-8 border border-zinc-200 shadow-xl relative overflow-hidden">
                                        <div className="relative z-10 flex flex-col items-start gap-8">
                                            <div className="w-full">
                                                <h3 className="font-black text-lg lg:text-xl mb-4 uppercase tracking-tight">Estado de mis Prácticas</h3>

                                                {dashboardData?.estado_practicas === 'VALIDADO' ? (
                                                    // Caso: El alumno ya está realizando las prácticas en una empresa
                                                    <div className="space-y-6">
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                                            {dashboardData.empresa_logo && (
                                                                <div className="size-16 lg:size-20 bg-white rounded-3xl p-3 shadow-xl border border-zinc-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                    <img
                                                                        src={assetUrl(`/uploads/logos/${dashboardData.empresa_logo}`)}
                                                                        className="w-full h-full object-contain"
                                                                        alt="Logo Empresa"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-2xl lg:text-4xl font-black tracking-tight text-zinc-900 uppercase">{dashboardData.empresa}</p>
                                                                <p className="text-indigo-600 font-semibold tracking-wide text-[10px] lg:text-sm mt-1">Puesto: {dashboardData.puesto}</p>
                                                            </div>
                                                        </div>

                                                        {/* Widget de Progreso Temporal */}
                                                        <div className="pt-6 border-t border-zinc-100">
                                                            <TimeProgress start={dashboardData.fecha_inicio || ''} end={dashboardData.fecha_fin || ''} />
                                                        </div>

                                                        {/* Acciones de acceso rápido */}
                                                        <div className="flex flex-wrap gap-4 pt-4">
                                                            <button onClick={() => setActiveTab('diario')} className="flex items-center gap-2 bg-zinc-900 text-white px-6 lg:px-8 py-3 rounded-2xl text-[9px] lg:text-[10px] font-semibold tracking-wide transition-all hover:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-95 shadow-lg shadow-black/10">
                                                                <span className="material-symbols-outlined text-[16px] lg:text-[18px]">calendar_month</span>
                                                                Gestionar Diario FCT
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Caso: El alumno aún no tiene empresa asignada
                                                    <EmptyState 
                                                        icon="work" 
                                                        title="Sin actividad" 
                                                        description="No tienes candidaturas activas en este momento." 
                                                        action={
                                                            <button
                                                                onClick={() => setActiveTab('search')}
                                                                className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white px-8 py-4 rounded-2xl text-[10px] font-black tracking-wide transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-3"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">explore</span>
                                                                Explorar Vacantes
                                                            </button>
                                                        }
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar de Notificaciones Lateral (Solo Desktop) */}
                                <div className="xl:col-span-1">
                                    <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden sticky top-28">
                                        <NotificationPanel
                                            role="ALUMNO"
                                            onActionClick={handleNotificationAction}
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    {/* SECCIÓN: DIARIO DE PRÁCTICAS (Bitácora FCT) */}
                    {activeTab === 'diario' && dashboardData?.estado_practicas !== 'VALIDADO' && (
                        // Bloqueo: El diario solo se activa tras las firmas del convenio
                        <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
                            <div className="size-20 bg-amber-500/10 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-amber-500">lock_clock</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-zinc-900 tracking-tight uppercase">Calendario Bloqueado</h3>
                                <p className="text-sm font-medium text-zinc-500 mt-3 max-w-md mx-auto leading-relaxed italic">
                                    El registro de actividades estará disponible una vez que tu tutor de centro firme y valide oficialmente tu convenio con la empresa.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'diario' && dashboardData?.estado_practicas === 'VALIDADO' && (
                        <div className="space-y-10 font-body animate-in slide-in-from-bottom-8 duration-500">

                            {/* Dashboard de Métricas FCT */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 p-8 rounded-[38px] shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                                        <span className="material-symbols-outlined text-6xl">query_stats</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <span className="size-1.5 bg-white rounded-full animate-pulse"></span>
                                        Horas Totales Aprobadas
                                    </p>
                                    <h4 className="text-5xl font-black tracking-tighter">{diarioStats.totalHoras}h</h4>
                                    <div className="mt-6 w-full bg-white/20 h-3 rounded-full overflow-hidden border border-white/10 shadow-inner">
                                        <div className="bg-white h-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: `${Math.min(100, (diarioStats.totalHoras / diarioStats.objetivoHoras) * 100)}%` }}></div>
                                    </div>
                                    <p className="text-[10px] font-black mt-4 text-indigo-100 uppercase tracking-tight opacity-70">Progreso: {Math.round((diarioStats.totalHoras / diarioStats.objetivoHoras) * 100)}% de {diarioStats.objetivoHoras}h exigidas</p>
                                </div>

                                <div className="bg-zinc-900 p-8 rounded-[38px] shadow-2xl flex items-center gap-6 group hover:bg-zinc-800 transition-colors">
                                    <div className="size-16 rounded-[22px] bg-white/10 flex items-center justify-center text-zinc-300 group-hover:scale-110 transition-transform shadow-lg"><span className="material-symbols-outlined text-3xl">pending_actions</span></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-widest">En Revisión</p>
                                        <h4 className="text-3xl font-black">{diarioEntries.filter(e => e.estado === 'PENDIENTE').length}</h4>
                                    </div>
                                </div>

                                <div className="bg-emerald-600 p-8 rounded-[38px] shadow-2xl flex items-center gap-6 group hover:bg-emerald-700 transition-colors">
                                    <div className="size-16 rounded-[22px] bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg"><span className="material-symbols-outlined text-3xl">task_alt</span></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-emerald-100 uppercase mb-1 tracking-widest">Días Validados</p>
                                        <h4 className="text-3xl font-black">{diarioEntries.filter(e => e.estado === 'APROBADO').length}</h4>
                                    </div>
                                </div>
                            </div>

                            {/* Calendario de Registro de Asistencia */}
                            <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">

                                {/* Header del Calendario */}
                                <div className="p-6 lg:p-8 bg-zinc-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 lg:gap-6">
                                        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="size-10 lg:size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:shadow-xl transition-all"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                                        <h3 className="text-lg lg:text-2xl font-black tracking-tight uppercase min-w-[150px] lg:min-w-[200px] text-center">{currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
                                        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="size-10 lg:size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:shadow-xl transition-all"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                                    </div>
                                    <div className="flex gap-4 w-full sm:w-auto">
                                        <button onClick={() => setCurrentMonth(new Date())} className="flex-1 sm:flex-none px-6 lg:px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 rounded-2xl text-[10px] font-semibold tracking-wide hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Hoy</button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto pb-4 custom-scrollbar-horizontal">
                                    <div className="min-w-[700px]">
                                        {/* Cabecera Días de Semana */}
                                        <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                                            {['Lunes', 'Martes', 'Miérc', 'Jueves', 'Viernes', 'Sábado', 'Dom'].map((d, i) => (
                                                <div key={d} className={`p-4 lg:p-5 text-center text-[9px] lg:text-[10px] font-semibold tracking-wide ${i >= 5 ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>{d}</div>
                                            ))}
                                        </div>

                                        {/* Cuadrícula de Días */}
                                        <div className="grid grid-cols-7 auto-rows-[120px] md:auto-rows-[160px]">
                                            {getDaysInMonth(currentMonth).map((day, idx) => {
                                                if (!day) return <div key={`empty-${idx}`} className="border-r border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 shadow-inner"></div>;

                                                const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                                                const holiday = HOLIDAYS_ANDALUCIA_2026[dateStr];
                                                const entry = diarioEntries.find(e => e.fecha === dateStr);
                                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                                const isToday = new Date().toDateString() === day.toDateString();
                                                const withinRange = isWithinRange(day);

                                                return (
                                                    <div
                                                        key={dateStr}
                                                        onClick={() => withinRange && !holiday && handleDateClick(day)}
                                                        className={`p-3 lg:p-5 border-r border-b border-zinc-100 dark:border-zinc-800 relative group transition-all duration-300 ${withinRange && !holiday ? 'cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5' : 'cursor-default'} ${isWeekend ? 'bg-zinc-50/70 dark:bg-zinc-800/10' : 'dark:bg-zinc-900'} ${!withinRange ? 'opacity-20 grayscale' : ''}`}
                                                    >
                                                        {/* Número del día */}
                                                        <div className="flex justify-between items-start mb-2 lg:mb-3">
                                                            <span className={`text-xs lg:text-sm font-black size-7 lg:size-8 flex items-center justify-center rounded-xl transition-all ${isToday ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30 scale-110 z-10' : 'text-zinc-400'}`}>
                                                                {day.getDate()}
                                                            </span>
                                                        </div>

                                                        {/* Contenido dinámico del día */}
                                                        <div className="mt-auto">
                                                            {holiday ? (
                                                                // Visualización de Festivo
                                                                <div className="p-2 lg:p-2.5 bg-emerald-600/10 border border-emerald-600/20 text-emerald-700 rounded-xl text-center shadow-sm">
                                                                    <p className="text-[8px] lg:text-[9px] font-semibold tracking-wideer">FESTIVO</p>
                                                                    <p className="text-[6px] lg:text-[7px] font-bold uppercase truncate mt-0.5">{holiday.label}</p>
                                                                </div>
                                                            ) : (withinRange && !isWeekend) ? (
                                                                entry ? (() => {
                                                                    // Visualización de actividad registrada
                                                                    const { modality, cleanText } = parseActivity(entry.actividad);
                                                                    const isAprobado = entry.estado === 'APROBADO';
                                                                    const colorClass = isAprobado
                                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                                                                        : 'bg-amber-500/10 border-amber-500/30 text-amber-600';

                                                                    return (
                                                                        <div className={`p-2 lg:p-3 rounded-xl lg:rounded-2xl border transition-all duration-300 group-hover:-translate-y-1 shadow-sm ${colorClass}`}>
                                                                            <div className="flex justify-between items-center mb-1 lg:mb-1.5 pb-1 border-b border-zinc-200/20">
                                                                                <span className="text-[8px] lg:text-[10px] font-semibold tracking-wide">{entry.horas}h</span>
                                                                                <span className="material-symbols-outlined text-[12px] lg:text-[14px] opacity-70">
                                                                                    {modality === 'PRESENCIAL' ? 'work' : 'home_work'}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-[7px] lg:text-[8px] font-bold leading-tight line-clamp-2 uppercase italic text-center">
                                                                                {cleanText}
                                                                            </p>
                                                                            {isAprobado && (
                                                                                <div className="absolute -top-1.5 -right-1.5 size-4 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900 shadow-lg flex items-center justify-center">
                                                                                    <span className="material-symbols-outlined text-[10px] text-white font-black">check</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })() : (
                                                                    // Día laboral sin registro aún
                                                                    <div className="p-2 lg:p-3 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl lg:rounded-2xl text-center opacity-40 group-hover:opacity-100 group-hover:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 group-hover:text-white transition-all group-hover:border-solid group-hover:scale-105 active:scale-95">
                                                                        <p className="text-[8px] lg:text-[9px] font-semibold tracking-wide">Reg. 7h</p>
                                                                    </div>
                                                                )
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>


                                {/* Leyenda del Calendario */}
                                <div className="p-8 bg-zinc-50 flex flex-wrap gap-8 items-center border-t border-zinc-100">
                                    <div className="flex items-center gap-3"><div className="size-4 bg-white border border-dashed border-zinc-300 rounded shadow-sm"></div><span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sin Actividad</span></div>
                                    <div className="flex items-center gap-3"><div className="size-4 bg-amber-500/20 border border-amber-500/40 rounded shadow-sm"></div><span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">En Revisión</span></div>
                                    <div className="flex items-center gap-3"><div className="size-4 bg-emerald-500/20 border border-emerald-500/40 rounded shadow-sm"></div><span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Validada</span></div>
                                    <div className="flex items-center gap-3"><div className="size-4 bg-emerald-600 rounded shadow-sm"></div><span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Festivo</span></div>
                                    <div className="ml-auto text-zinc-400 italic text-[10px] font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px]">info</span>
                                        * Haz clic en los días marcados con 7:00 para abrir el formulario de asistencia.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN: MERCADO DE VACANTES (Buscador de Ofertas) */}
                    {activeTab === 'search' && (
                        <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-500 pb-20">

                            {/* Grid Dinámico de Ofertas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 lg:gap-10">
                                {loading ? (
                                    <SkeletonCard count={3} />
                                ) : ofertas.length === 0 ? (
                                    <div className="col-span-1 md:col-span-2 2xl:col-span-3">
                                        <EmptyState 
                                            icon="work" 
                                            title="Sin actividad" 
                                            description="No tienes candidaturas activas en este momento." 
                                        />
                                    </div>
                                ) : (
                                    ofertas.map(offer => (
                                    <div
                                        key={offer.id}
                                        className="bg-white dark:bg-zinc-900 rounded-[44px] border border-zinc-100 dark:border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden hover:shadow-[0_40px_80px_rgba(79,70,229,0.15)] hover:-translate-y-3 transition-all duration-700 group flex flex-col relative"
                                    >
                                        {/* Cabecera Visual: Imagen y Overlays */}
                                        <div className="relative h-72 overflow-hidden">
                                            <img
                                                src={getOfferImage(offer)}
                                                alt={offer.titulo}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-in-out"
                                            />
                                            <div className="absolute inset-0 bg-linear-to-t from-zinc-900/95 via-zinc-900/30 to-transparent" />

                                            {/* Badge de Disponibilidad */}
                                            <div className="absolute top-6 left-6">
                                                <div className="px-4 py-2 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center gap-3 shadow-2xl">
                                                    <div className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                                                    <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Vacante Abierta</span>
                                                </div>
                                            </div>

                                            {/* Logo de Empresa (Miniatura flotante) */}
                                            {offer.empresa_data?.logo && (
                                                <div className="absolute top-6 right-6 size-14 bg-white rounded-2xl p-2.5 shadow-2xl border border-white/20 backdrop-blur-md flex items-center justify-center overflow-hidden group-hover:rotate-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 group-hover:scale-110">
                                                    <img
                                                        src={assetUrl(`/uploads/logos/${offer.empresa_data.logo.split('/').pop()}`)}
                                                        className="w-full h-full object-contain"
                                                        alt="Empresa Logo"
                                                    />
                                                </div>
                                            )}

                                            {/* Info Básica sobreimagen */}
                                            <div className="absolute bottom-6 left-8 right-8">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="px-3 py-1 text-white text-[9px] font-semibold tracking-wide rounded-xl shadow-lg" style={{ backgroundColor: getOfferColor(offer) }}>
                                                        {offer.tipo || 'FCT Estándar'}
                                                    </span>
                                                    <span className="text-white/80 text-[10px] font-semibold tracking-wide flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[18px]">location_on</span>
                                                        {offer.ubicacion}
                                                    </span>
                                                </div>
                                                <h3 className="font-black text-2xl lg:text-3xl text-white tracking-tighter leading-tight uppercase line-clamp-1 group-hover:text-indigo-400 transition-colors">
                                                    {offer.titulo}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Detalles y Cuerpo de la Oferta */}
                                        <div className="p-10 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-8">
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">Empresa Patrocinadora</p>
                                                    <p className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter leading-none">{offer.empresa}</p>
                                                </div>
                                                <button
                                                    onClick={() => offer.empresa_data && setSelectedEmpresa(offer.empresa_data)}
                                                    className="size-14 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer group/btn shadow-sm"
                                                    title="Ver detalles de empresa"
                                                >
                                                    <span className="material-symbols-outlined text-2xl transition-transform group-hover/btn:scale-110">corporate_fare</span>
                                                </button>
                                            </div>

                                            <p className="text-zinc-500 dark:text-zinc-400 text-[13px] leading-relaxed mb-10 line-clamp-3 font-medium uppercase italic tracking-tight">
                                                {offer.descripcion}
                                            </p>

                                            {/* Grid de especificaciones de la vacante */}
                                            <div className="grid grid-cols-2 gap-5 mb-10">
                                                <div className="p-5 rounded-[2rem] bg-indigo-50/40 dark:bg-indigo-500/5 border border-indigo-100/20 flex flex-col items-center text-center gap-3">
                                                    <div className="size-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-indigo-600">
                                                        <span className="material-symbols-outlined text-[20px]">schedule</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Horario</span>
                                                        <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-100 uppercase truncate">{offer.horario || '08:00 - 15:00'}</span>
                                                    </div>
                                                </div>
                                                <div className="p-5 rounded-[2rem] bg-purple-50/40 dark:bg-purple-500/5 border border-purple-100/20 flex flex-col items-center text-center gap-3 group/pill transition-all">
                                                    <div className="size-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-purple-600">
                                                        <span className="material-symbols-outlined text-[20px]">event_repeat</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] font-black text-purple-400 uppercase tracking-widest leading-none mb-1">Jornada</span>
                                                        <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-100 uppercase truncate">{offer.jornada || 'Presencial'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stack Tecnológico */}
                                            <div className="flex flex-wrap gap-2.5 mb-10">
                                                {(offer.tags || []).slice(0, 3).map((tech: string, i: number) => (
                                                    <span key={i} className="px-5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-black text-zinc-500 uppercase tracking-widest border border-zinc-100 dark:border-zinc-700">
                                                        {tech.trim()}
                                                    </span>
                                                ))}
                                                {(offer.tags || []).length > 3 && (
                                                    <span className="px-4 py-2 text-[10px] font-black text-zinc-300 uppercase letter-spacing-widest">+{offer.tags.length - 3}</span>
                                                )}
                                            </div>

                                            {/* Botón de Acción Principal */}
                                            <button
                                                onClick={() => handleApply(offer.id)}
                                                className="w-full h-16 bg-zinc-900 dark:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.4em] hover:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 transition-all shadow-2xl shadow-black/10 active:scale-[0.97] flex items-center justify-center gap-4 group/post"
                                            >
                                                Postular a Vacante
                                                <span className="material-symbols-outlined text-lg group-hover/post:translate-x-2 transition-transform">send</span>
                                            </button>
                                        </div>
                                    </div>
                                )))}
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN: MENSAJERÍA (Sincronización con Tutores) */}
                    {activeTab === 'messages' && (
                        <div className="h-full w-full animate-in fade-in duration-500">
                            <ChatSystem />
                        </div>
                    )}
                </main>

            {/* ── MODAL: DETALLE DE ENTIDAD COLABORADORA ────────────────────────────
                Arquitectura de cristal para visualización de perfil corporativo. */}
            {selectedEmpresa && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300 font-body">
                    <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md" onClick={() => setSelectedEmpresa(null)}></div>

                    <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90dvh] overflow-y-auto rounded-[48px] shadow-2xl relative z-10 custom-scrollbar border border-white dark:border-zinc-800 transition-all">

                        {/* Cabecera Visual con Efecto de Profundidad */}
                        <div className="h-72 relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-indigo-950 to-zinc-900 overflow-hidden rounded-t-[48px]">
                                <div className="absolute top-0 right-0 size-96 bg-indigo-500/10 rounded-full blur-[120px] -mr-32 -mt-32 animate-pulse"></div>
                                <div className="absolute bottom-0 left-0 size-96 bg-purple-500/10 rounded-full blur-[120px] -ml-32 -mb-32 animate-pulse" style={{ animationDelay: '2s' }}></div>
                                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                            </div>

                            <button
                                onClick={() => setSelectedEmpresa(null)}
                                className="absolute top-8 right-8 size-14 bg-white/5 hover:bg-white/10 backdrop-blur-2xl rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-all z-20 border border-white/5 group"
                            >
                                <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform duration-500">close</span>
                            </button>

                            {/* Logo flotante (Glassmorphism) */}
                            <div className="absolute -bottom-16 left-12 p-2 bg-white dark:bg-zinc-900 rounded-[44px] shadow-2xl z-10 border border-white dark:border-zinc-800">
                                <div className="size-36 rounded-[32px] bg-white dark:bg-zinc-800/50 flex items-center justify-center overflow-hidden shadow-inner p-1">
                                    {selectedEmpresa.logo ? (
                                        <img src={assetUrl(`/uploads/logos/${selectedEmpresa.logo.split('/').pop()}`)} className="w-full h-full object-contain" alt="Logo corporativo" />
                                    ) : (
                                        <span className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 bg-clip-text text-transparent">{selectedEmpresa.nombre.charAt(0)}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contenido Detallado */}
                        <div className="pt-24 px-12 pb-16 space-y-16">

                            {/* Bloque Identidad */}
                            <div className="space-y-6">
                                <div className="flex flex-wrap gap-4">
                                    <span className="px-4 py-2 bg-indigo-500/10 text-indigo-600 text-[10px] font-semibold tracking-wide rounded-2xl border border-indigo-500/20 flex items-center gap-2">
                                        <div className="size-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 rounded-full animate-pulse"></div> Partner Oficial FCT
                                    </span>
                                    <span className="px-4 py-2 bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold tracking-wide rounded-2xl border border-emerald-500/20 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">verified</span> Empresa Verificada
                                    </span>
                                </div>
                                <h2 className="text-6xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase leading-none">{selectedEmpresa.nombre}</h2>
                                <div className="flex flex-wrap items-center gap-8 text-zinc-400 font-black text-[10px] uppercase tracking-[0.3em]">
                                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">location_on</span> {selectedEmpresa.ubicacion}</span>
                                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">corporate_fare</span> {(selectedEmpresa as any).sector || 'Sector Tecnológico'}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-12 pt-10 border-t border-zinc-100 dark:border-zinc-800">

                                {/* Info Principal (Full Width) */}
                                <div className="space-y-12">
                                    <div className="space-y-6">
                                        <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.4em]">Sobre la organización</h4>
                                        <p className="text-xl font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed italic uppercase tracking-tight">
                                            {selectedEmpresa.descripcion || "Esta organización es líder en la integración de talento disruptivo, enfocándose en proyectos de alto impacto tecnológico y metodologías ágiles."}
                                        </p>
                                    </div>

                                    {/* Stack Tecnológico con Tags Premium */}
                                    <div className="space-y-8">
                                        <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em]">Ecosistema Tecnológico</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {(selectedEmpresa.tecnologias.length > 0 ? selectedEmpresa.tecnologias : ['React', 'TypeScript', 'Node.js', 'PostgreSQL']).map((tech, i) => (
                                                <div key={i} className="p-5 bg-zinc-50 dark:bg-zinc-800/40 rounded-[28px] border border-zinc-100 dark:border-zinc-800 flex flex-col items-center gap-3 transition-all hover:-translate-y-1 hover:border-indigo-600/30">
                                                    <span className="material-symbols-outlined text-zinc-400 text-xl font-light">code</span>
                                                    <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">{tech.trim()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: REGISTRO DE JORNADA (Formulario de Bitácora) ────────────────── */}
            {isAttendanceModalOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 lg:p-10 font-body">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xl animate-in fade-in" onClick={() => setIsAttendanceModalOpen(false)}></div>
                    <div className="relative w-full max-w-2xl bg-white rounded-[44px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 border border-zinc-100 max-h-[90dvh]">
                        {/* Cabecera Modal */}
                        <div className="p-6 sm:p-10 bg-zinc-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="size-14 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/20 rotate-3"><span className="material-symbols-outlined text-2xl font-light">edit_note</span></div>
                                <div>
                                    <h3 className="text-2xl font-semibold tracking-wideer">Bitácora de Actividad</h3>
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mt-1 opacity-80">{selectedDate}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAttendanceModalOpen(false)} className="size-12 flex items-center justify-center bg-white/10 rounded-2xl hover:bg-white/20 transition-all cursor-pointer"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        {/* Cuerpo Formulario */}
                        <div className="p-6 sm:p-10 space-y-10 overflow-y-auto custom-scrollbar">
                            {/* Modalidad de Trabajo */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] ml-2">Configuración de Jornada</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {['presencial', 'teletrabajo'].map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setAttendanceForm({ ...attendanceForm, modalidad: mode as any })}
                                            className={`py-5 rounded-3xl text-[10px] font-semibold tracking-wide border-2 transition-all flex items-center justify-center gap-3 ${attendanceForm.modalidad === mode
                                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white border-indigo-600 shadow-xl shadow-indigo-600/20'
                                                : 'bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-indigo-200'}`}
                                        >
                                            <span className="material-symbols-outlined text-lg">{mode === 'presencial' ? 'apartment' : 'home_work'}</span>
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Detalle Texto */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] ml-2">Tareas y Competencias (FCT)</label>
                                <textarea
                                    value={attendanceForm.descripcion}
                                    onChange={e => setAttendanceForm({ ...attendanceForm, descripcion: e.target.value })}
                                    className="w-full p-8 rounded-[38px] bg-zinc-50 border border-zinc-100 min-h-[180px] outline-none text-sm font-bold uppercase italic tracking-tight placeholder:text-zinc-300 focus:ring-8 focus:ring-indigo-600/5 transition-all resize-none shadow-inner"
                                    placeholder="DETALLA LAS ACTIVIDADES TECNOLÓGICAS REALIZADAS..."
                                />
                            </div>

                            {/* Info de Jornada */}
                            <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 flex items-center gap-4 text-zinc-500 italic">
                                <span className="material-symbols-outlined text-indigo-600">info_i</span>
                                <p className="text-[10px] font-semibold tracking-wide leading-relaxed">Registro automático: 7.0 horas computadas para cómputo oficial de FCT.</p>
                            </div>
                        </div>

                        {/* Footer Modal */}
                        <div className="p-6 sm:p-10 bg-zinc-50 border-t border-zinc-100 flex gap-4">
                            <button onClick={() => setIsAttendanceModalOpen(false)} className="px-10 py-5 bg-white rounded-2xl text-[10px] font-semibold tracking-wide border border-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors">Cerrar</button>
                            <button onClick={handleSaveAttendance} className="flex-1 py-5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white rounded-2xl font-semibold tracking-wide text-[10px] tracking-[0.4em] shadow-2xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all">Sincronizar Diario</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default AlumnoDashboard;
