import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../lib/api';
import { useUser } from '../context/UserContext';
import Logo from '../components/common/Logo';
import ChatSystem from '../components/ChatSystem';
import NotificationPanel from '../components/NotificationPanel';
import { assetUrl } from '../lib/urls.ts';
import DashboardLayout from '../components/layout/DashboardLayout';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/SkeletonCard';
import LogoutModal from '../components/common/LogoutModal';
import { CompanyLogo } from '../components/common/CompanyLogo';
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
    isAprobado?: boolean; // Sincronizado desde el backend en cada carga
    is_aprobado?: boolean;
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
    if (!start || !end) return <div className="text-sm text-slate-400 italic">Fechas no asignadas aún</div>;

    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const now = new Date().getTime();

    if (now < startDate) {
        return (
            <div className="w-full">
                <div className="flex justify-between items-end mb-3">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estado</p>
                        <p className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-800 uppercase tracking-tighter">Prácticas por comenzar</p>
                    </div>
                </div>
                <div className="w-full bg-indigo-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full w-0" />
                </div>
                <div className="flex justify-between mt-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Inicio: {new Date(start).toLocaleDateString('es-ES')}</p>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Fin: {new Date(end).toLocaleDateString('es-ES')}</p>
                </div>
            </div>
        );
    }

    const totalDuration = endDate - startDate;
    const elapsed = now - startDate;
    const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return (
        <div className="w-full">
            {/* Fila superior: etiqueta + días + porcentaje */}
            <div className="flex justify-between items-end mb-3">
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Tiempo Restante
                    </p>
                    <p className="text-2xl lg:text-3xl font-bold text-slate-800">
                        {daysLeft > 0 ? `${daysLeft} Días` : 'FCT Finalizada'}
                    </p>
                </div>
                {/* Porcentaje con el mismo tono que la barra */}
                <span className="text-sm font-bold text-indigo-600">
                    {Math.round(progress)}%
                </span>
            </div>

            {/* Barra de progreso moderna */}
            <div className="w-full bg-indigo-100 h-1.5 rounded-full overflow-hidden">
                <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Metadatos de fechas */}
            <div className="flex justify-between mt-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Inicio: {new Date(start).toLocaleDateString('es-ES')}
                </p>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Fin: {new Date(end).toLocaleDateString('es-ES')}
                </p>
            </div>
        </div>
    );
};

const DashboardTabPanel = ({ 
    dashboardData, 
    user, 
    setActiveTab, 
    handleNotificationAction 
}: { 
    dashboardData: DashboardData | null, 
    user: any, 
    setActiveTab: (tab: string) => void,
    handleNotificationAction: (notif: any) => void
}) => {
    const isAprobado = dashboardData?.is_aprobado ?? dashboardData?.isAprobado ?? user?.is_aprobado ?? user?.isAprobado;

    // ESTADO 1: BLOQUEO POR REVISIÓN
    const pendingValidationCard = !isAprobado && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[24px] p-5 mb-8 flex flex-col sm:flex-row items-center gap-5 shadow-sm animate-in fade-in zoom-in-95 duration-500">
            <div className="size-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
                <span className="material-symbols-outlined text-2xl">lock_clock</span>
            </div>
            <div className="text-center sm:text-left">
                <h2 className="text-amber-700 font-black tracking-tight text-lg lg:text-xl uppercase">Acceso en Revisión</h2>
                <p className="text-amber-700/80 text-xs sm:text-sm font-semibold mt-1">
                    Tu acceso está limitado hasta que el tutor de centro valide tu perfil.
                </p>
            </div>
        </div>
    );

    // ESTADO 2 Y FALLBACK
    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-8">
                {pendingValidationCard}
                {dashboardData?.estado_practicas === 'VALIDADO' ? (
                    // ESTADO 2: ALUMNO VALIDADO Y CONVENIO ACTIVO (RESUMEN FCT)
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        {/* a) Cabecera de estado: Banner verde */}
                        <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-400/5 backdrop-blur-md border border-emerald-500/20 rounded-[28px] p-6 flex items-center gap-5 shadow-sm">
                            <div className="size-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                                <span className="material-symbols-outlined text-2xl">verified</span>
                            </div>
                            <div>
                                <h2 className="text-emerald-700 font-black tracking-tight text-xl uppercase">Alumno Validado - FCT Activa</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* b) Tarjeta de Datos Personales y Académicos */}
                            <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">person</span> Datos del Alumno
                                    </h3>
                                    <p className="text-2xl xl:text-3xl font-black text-zinc-900 tracking-tighter line-clamp-2">{user?.nombre}</p>
                                    <p className="text-xs font-bold text-indigo-500/80 uppercase tracking-widest mt-2">{dashboardData?.grado || user?.grado}</p>
                                </div>
                            </div>

                            {/* c) Tarjeta de Asignación Empresarial */}
                            <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">business_center</span> Asignación Empresarial
                                </h3>
                                
                                <div className="flex items-center gap-5 mb-6">
                                    {dashboardData?.empresa_logo && (
                                        <CompanyLogo
                                            logoPath={assetUrl(`/uploads/logos/${String(dashboardData.empresa_logo).split('/').pop() || ''}`)}
                                            companyName={dashboardData.empresa || ''}
                                        />
                                    )}
                                    <div>
                                        <p className="text-xl font-black text-zinc-900 uppercase tracking-tight">{dashboardData?.empresa}</p>
                                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">{dashboardData?.puesto}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-zinc-200/50">
                                    <TimeProgress start={dashboardData?.fecha_inicio || ''} end={dashboardData?.fecha_fin || ''} />
                                </div>
                            </div>
                        </div>

                        {/* d) Call to Action (CTA) */}
                        <button 
                            onClick={() => setActiveTab('diario')} 
                            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all duration-300 rounded-[24px] h-16 text-xs font-black tracking-[0.2em]"
                        >
                            <span className="material-symbols-outlined text-xl">edit_calendar</span>
                            Comenzar a Fichar / Ir al Diario
                        </button>
                    </div>
                ) : (
                    // Fallback: Validado pero sin FCT Activa
                    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8">
                        <EmptyState
                            icon="work"
                            title="Sin actividad"
                            description="No tienes candidaturas activas en este momento."
                            action={
                                <button
                                    onClick={() => setActiveTab('search')}
                                    className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all duration-300 rounded-2xl h-12 px-8 text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-3 mt-4"
                                >
                                    <span className="material-symbols-outlined text-sm">explore</span>
                                    Explorar Vacantes
                                </button>
                            }
                        />
                    </div>
                )}
            </div>

            {/* Sidebar de Notificaciones Lateral (Solo Desktop) */}
            <div className="xl:col-span-4">
                <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-[32px] border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden sticky top-28">
                    <NotificationPanel
                        role="ALUMNO"
                        onActionClick={handleNotificationAction}
                    />
                </div>
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
    const { user, login } = useUser(); // Contexto global de usuario

    // ── ESTADO DE LA INTERFAZ ───────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('dashboard'); // Pestaña activa del menú lateral
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Control del sidebar en móviles
    const [loading, setLoading] = useState(true); // Estado de carga global inicial
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ── DATOS DEL ALUMNO Y PRÁCTICAS ───────────────────────────────────────
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null); // Datos perfil/prácticas
    const [ofertas, setOfertas] = useState<Oferta[]>([]); // Lista de vacantes disponibles
    const [ofertasSearch, setOfertasSearch] = useState(''); // Búsqueda de ofertas por nombre/empresa
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
    const fetchDiario = async (signal?: AbortSignal) => {
        if (!user?.email) return;
        try {
            const res = await api.post('/diario/alumno/list', { email: user.email }, { signal });
            setDiarioEntries(res.data.actividades || []);
            setDiarioStats({
                totalHoras: res.data.totalHoras,
                objetivoHoras: res.data.objetivoHoras || 370
            });
        } catch (err) {
            if (!axios.isCancel(err)) {
                console.error("Error cargando el diario:", err);
            }
        }
    };

    /**
     * ── EFECTO: Carga Inicial de Datos (Dashboard) ──────────────────────────
     */
    useEffect(() => {
        const controller = new AbortController();
        const fetchDashboard = async () => {
            if (!user?.email) return; // Guarda de seguridad
            try {
                const res = await api.post('/alumno/dashboard', { email: user.email }, { signal: controller.signal });
                const mappedData = {
                    ...res.data,
                    empresa_logo: res.data.empresa_logo ?? res.data.empresa_data?.logo ?? res.data.logo ?? null
                };
                setDashboardData(mappedData);
                // Sincronización del estado de aprobación y perfil (foto) en el contexto global
                if (user) {
                    const hasFotoChanged = res.data.foto && res.data.foto !== user.foto;
                    const backendAprobado = res.data.is_aprobado ?? res.data.isAprobado;
                    const hasApprovalChanged = backendAprobado !== undefined && backendAprobado !== user.isAprobado;

                    if (hasFotoChanged || hasApprovalChanged) {
                        const currentToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token') || '';
                        login({ 
                            ...user, 
                            foto: res.data.foto || user.foto,
                            isAprobado: backendAprobado !== undefined ? backendAprobado : user.isAprobado 
                        }, currentToken);
                    }
                }
            } catch (err: any) {
                if (!axios.isCancel(err)) {
                    console.error("Error cargando dashboard:", err);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();

        // Si el alumno aún no está aprobado, polleamos cada 30s para detectar el cambio de estado
        let pollInterval: any;
        if (user && !user.isAprobado) {
            pollInterval = setInterval(fetchDashboard, 30000);
        }

        return () => {
            controller.abort();
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [user]);

    /**
     * ── fetchOfertas ────────────────────────────────────────────────────────
     * Recupera las vacantes de prácticas abiertas de todas las empresas.
     */
    useEffect(() => {
        const controller = new AbortController();
        if (activeTab === 'search') {
            const fetchOfertas = async () => {
                try {
                    const res = await api.get('/alumno/ofertas', { signal: controller.signal });
                    setOfertas(res.data.ofertas || []);
                } catch (err) {
                    if (!axios.isCancel(err)) {
                        console.error("Error cargando ofertas:", err);
                    }
                }
            };
            fetchOfertas();
        }
        if (activeTab === 'diario') fetchDiario(controller.signal);
        return () => controller.abort();
    }, [activeTab]);

    /**
     * ── handleApply ─────────────────────────────────────────────────────────
     * Envía una solicitud formal de prácticas a una oferta específica.
     */
    const handleApply = async (ofertaId: number) => {
        if (!confirm("¿Deseas enviar tu candidatura a esta oferta de prácticas?")) return;
        try {
            await api.post('/alumno/candidaturas/apply', {
                email: user?.email,
                oferta_id: ofertaId
            });
            alert("¡Candidatura enviada! Podrás consultar el estado en tu panel.");
            // Refrescar datos para mostrar el estado 'POSTULADO'
            const res = await api.post('/alumno/dashboard', { email: user?.email });
            setDashboardData(res.data);
            setActiveTab('dashboard');
        } catch (err: any) {
            alert(err.response?.data?.error || "Error al procesar la solicitud.");
        }
    };

    // Cierre de sesión y limpieza de estado
    const handleLogout = () => {
        setIsLogoutModalOpen(true);
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
            await api.post('/diario/alumno/create', payload);
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
            sidebar={
                <>

                    {/* Cabecera del Sidebar: Logo y Título */}
                    <div className="p-6 lg:p-8 border-b border-white/5 bg-zinc-950 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                        <div className="flex items-center gap-4">
                            <Logo variant="white" showTagline tagline="Portal Alumno" />
                        </div>
                    </div>

                    {/* Menú de Navegación Dinámico */}
                    <nav className="flex-1 p-6 space-y-2 mt-4 custom-scrollbar overflow-y-auto">
                        {[
                            { id: 'dashboard', label: 'Mi Panel', icon: 'dashboard', path: '#' },
                            { id: 'search', label: 'Ver Ofertas', icon: 'search', path: '#', show: user?.isAprobado && dashboardData?.estado_practicas !== 'VALIDADO' },
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
                                    }
                                    setIsSidebarOpen(false); // Autocierre en móviles para todas las opciones
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
                    <div className="p-6 lg:p-8 border-t border-white/5 bg-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-4 group/profile">
                            <div className="size-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 font-black border border-indigo-500/20 group-hover/profile:scale-110 transition-transform overflow-hidden shadow-inner">
                                {user?.foto ? (
                                    <img
                                        src={assetUrl(`/uploads/fotos/${user.foto}`)}
                                        className="w-full h-full object-cover"
                                        alt="Foto Perfil"
                                        loading="lazy"
                                        width="48"
                                        height="48"
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
                                aria-label="Cerrar sesión"
                            >
                                <span className="material-symbols-outlined text-xl group-hover/logout:rotate-90 transition-transform duration-500">power_settings_new</span>
                            </button>
                        </div>
                    </div>
                </>
            }
            header={
                <header className="py-4 lg:py-0 h-auto lg:h-24 bg-white lg:bg-white/70 lg:backdrop-blur-2xl border-b border-zinc-100 flex items-center justify-between px-4 lg:px-12 relative lg:sticky top-0 z-20 transition-all">
                    <div className="flex items-center gap-2 lg:gap-4 min-w-0">
                        {/* Botón Hamburguesa (Móvil) */}
                        <button
                            className="lg:hidden p-2 text-zinc-500 hover:text-indigo-600 transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Abrir menú lateral"
                        >
                            <span className="material-symbols-outlined text-2xl">menu</span>
                        </button>

                        {/* Título de Sección Dinámico */}
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-lg lg:text-2xl font-black text-zinc-900 tracking-tighter flex items-center gap-2 lg:gap-4 uppercase truncate">
                                <span className="material-symbols-outlined text-indigo-600 text-xl lg:text-3xl hidden sm:block">
                                    {activeTab === 'search' ? 'travel_explore' : activeTab === 'diario' ? 'auto_stories' : activeTab === 'messages' ? 'forum' : 'space_dashboard'}
                                </span>
                                <span className="truncate">
                                    {activeTab === 'search' ? 'Mercado' : activeTab === 'diario' ? 'Bitácora' : activeTab === 'messages' ? 'Mensajes' : 'Mi Panel'}
                                </span>
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-6 shrink-0">
                        {/* Estado Servidor (Decorativo) */}
                        <div className="hidden xl:flex items-center gap-4 px-5 py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl shadow-sm">
                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">En Línea • 2026/27</span>
                        </div>

                        {/* Panel de Notificaciones (Dropdown Inteligente) */}
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                className="size-10 lg:size-12 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer relative"
                                aria-label="Ver notificaciones"
                            >
                                <span className="material-symbols-outlined text-[20px] lg:text-[24px]">notifications</span>
                                <span className="absolute top-1.5 right-1.5 lg:top-2 lg:right-2 size-4 bg-gradient-to-r from-indigo-600 to-indigo-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white">!</span>
                            </button>

                            <div className={`fixed left-4 right-4 top-[80px] sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-4 w-auto sm:w-80 lg:w-96 transition-all duration-300 z-[100] ${isNotifOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
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
                                        loading="lazy"
                                        width="40"
                                        height="40"
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
            <main className={`flex-1 flex flex-col min-h-0 w-full max-w-full overflow-x-hidden animate-in fade-in duration-700 ${activeTab === 'messages' ? 'p-0' : 'p-4 md:p-6 lg:p-10 space-y-6 lg:space-y-10 custom-scrollbar pb-20'}`}>

                {/* SECCIÓN: PANEL DE CONTROL (Dashboard) */}
                {activeTab === 'dashboard' && (
                    <DashboardTabPanel 
                        dashboardData={dashboardData} 
                        user={user} 
                        setActiveTab={setActiveTab} 
                        handleNotificationAction={handleNotificationAction} 
                    />
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8 text-white">
                            <div className="col-span-2 md:col-span-1 bg-gradient-to-r from-indigo-600 to-indigo-500 p-4 lg:p-8 rounded-[24px] lg:rounded-[38px] shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 lg:p-8 opacity-10">
                                    <span className="material-symbols-outlined text-3xl lg:text-6xl">query_stats</span>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-[7px] lg:text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-1 lg:mb-2 flex items-center gap-1.5">
                                        <span className="size-1 bg-white rounded-full animate-pulse"></span>
                                        Horas Aprobadas
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <h4 className="text-2xl lg:text-5xl font-black tracking-tighter">{diarioStats.totalHoras}h</h4>
                                        <p className="text-[7px] lg:text-[10px] font-black text-indigo-100/70 uppercase tracking-tight">/ {diarioStats.objetivoHoras}h</p>
                                    </div>
                                    <div className="mt-2 lg:mt-6 w-full bg-white/20 h-1.5 lg:h-3 rounded-full overflow-hidden border border-white/10 shadow-inner">
                                        <div className="bg-white h-full transition-all duration-1000" style={{ width: `${Math.min(100, (diarioStats.totalHoras / diarioStats.objetivoHoras) * 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-1 bg-zinc-900 p-4 lg:p-8 rounded-[24px] lg:rounded-[38px] shadow-xl flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 lg:gap-6">
                                <div className="size-8 lg:size-16 rounded-xl lg:rounded-[22px] bg-white/10 flex items-center justify-center text-zinc-300 shadow-lg"><span className="material-symbols-outlined text-base lg:text-3xl">pending_actions</span></div>
                                <div className="text-center sm:text-left">
                                    <p className="text-[6px] lg:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Revisión</p>
                                    <h4 className="text-lg lg:text-3xl font-black leading-none">{diarioEntries.filter(e => e.estado === 'PENDIENTE').length}</h4>
                                </div>
                            </div>

                            <div className="col-span-1 bg-emerald-600 p-4 lg:p-8 rounded-[24px] lg:rounded-[38px] shadow-xl flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 lg:gap-6">
                                <div className="size-8 lg:size-16 rounded-xl lg:rounded-[22px] bg-white/10 flex items-center justify-center text-white shadow-lg"><span className="material-symbols-outlined text-base lg:text-3xl">task_alt</span></div>
                                <div className="text-center sm:text-left">
                                    <p className="text-[6px] lg:text-[10px] font-bold text-emerald-100 uppercase tracking-widest">Validados</p>
                                    <h4 className="text-lg lg:text-3xl font-black leading-none">{diarioEntries.filter(e => e.estado === 'APROBADO').length}</h4>
                                </div>
                            </div>
                        </div>

                        {/* Calendario de Asistencia */}
                        <div className="bg-white/40 backdrop-blur-xl rounded-[40px] border border-white/50 shadow-2xl overflow-hidden flex flex-col">

                            {/* Header del Calendario — gradiente suave indigo→violet */}
                            <div className="p-4 lg:p-8 bg-gradient-to-r from-indigo-500 to-violet-500 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2 lg:gap-6 w-full sm:w-auto justify-between sm:justify-start bg-black/10 p-2 lg:p-0 rounded-2xl lg:bg-transparent">
                                    <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="size-8 lg:size-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                                    <h3 className="text-sm lg:text-2xl font-black tracking-tight uppercase text-center min-w-[100px] lg:min-w-[200px]">{currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
                                    <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="size-8 lg:size-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                                </div>
                                <button onClick={() => setCurrentMonth(new Date())} className="w-full sm:w-auto px-6 py-2 lg:py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-bold tracking-widest uppercase transition-all active:scale-95">Hoy</button>
                            </div>

                            <div className="w-full">
                                <div className="w-full overflow-hidden">
                                    {/* Cabecera Días de Semana */}
                                    <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                                        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((d, i) => (
                                            <div key={d} className={`p-2 lg:p-5 text-center text-[7px] lg:text-[10px] font-black tracking-[0.15em] lg:tracking-widest ${i >= 5 ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>
                                                <span className="hidden lg:inline">{d}</span>
                                                <span className="lg:hidden">{d === 'Miércoles' ? 'X' : d.charAt(0)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Cuadrícula de Días */}
                                    <div className="grid grid-cols-7 auto-rows-[minmax(80px,auto)] lg:auto-rows-[160px]">
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
                                                    className={`p-1.5 lg:p-5 border-r border-b border-zinc-100 dark:border-zinc-800 relative group transition-all duration-300 ${withinRange && !holiday ? 'cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5' : 'cursor-default'} ${isWeekend ? 'bg-zinc-50/70 dark:bg-zinc-800/10' : 'dark:bg-zinc-900'} ${!withinRange ? 'opacity-20 grayscale' : ''}`}
                                                >
                                                    {/* Número del día */}
                                                    <div className="flex justify-between items-start mb-1 lg:mb-3">
                                                        <span className={`text-[10px] lg:text-sm font-black size-5 lg:size-8 flex items-center justify-center rounded-lg transition-all ${isToday ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 z-10' : 'text-zinc-400'}`}>
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
                                                                    <div className={`p-1 lg:p-3 rounded-md lg:rounded-2xl border transition-all duration-300 group-hover:-translate-y-1 shadow-sm ${colorClass}`}>
                                                                        <div className="flex justify-center lg:justify-between items-center mb-0 lg:mb-1.5 pb-0 lg:pb-1 border-b border-zinc-200/20">
                                                                            <span className="text-[6px] lg:text-[10px] font-black tracking-tighter sm:tracking-wide">{entry.horas}h</span>
                                                                            <span className="material-symbols-outlined text-[8px] lg:text-[14px] opacity-70 hidden sm:block">
                                                                                {modality === 'PRESENCIAL' ? 'work' : 'home_work'}
                                                                            </span>
                                                                        </div>
                                                                        <p className="hidden lg:block text-[8px] font-bold leading-[1.1] line-clamp-2 uppercase italic text-center">
                                                                            {cleanText}
                                                                        </p>
                                                                        {isAprobado && (
                                                                            <div className="absolute -top-0.5 -right-0.5 lg:-top-1.5 lg:-right-1.5 size-2.5 lg:size-4 bg-emerald-500 rounded-full border border-white dark:border-zinc-900 shadow-lg flex items-center justify-center">
                                                                                <span className="material-symbols-outlined text-[5px] lg:text-[10px] text-white font-black">check</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })() : (
                                                                // Día laboral sin registro aún
                                                                <div className="p-1 lg:p-3 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md lg:rounded-2xl text-center opacity-60 group-hover:opacity-100 group-hover:bg-gradient-to-r from-indigo-600 to-indigo-500 group-hover:text-white transition-all">
                                                                    <p className="text-[5px] lg:text-[9px] font-black uppercase tracking-tighter text-slate-600 group-hover:text-white">REG 7H</p>
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


                            {/* Leyenda del Calendario — fondo oscuro para máximo contraste */}
                            <div className="p-5 lg:p-8 bg-slate-800 flex flex-wrap gap-4 lg:gap-8 items-center border-t border-slate-700">
                                <div className="flex items-center gap-3"><div className="size-3 lg:size-4 bg-white/20 border border-dashed border-white/40 rounded shadow-sm"></div><span className="text-[9px] lg:text-[10px] font-black text-slate-200 uppercase tracking-widest">Sin Registro</span></div>
                                <div className="flex items-center gap-3"><div className="size-3 lg:size-4 bg-amber-400/40 border border-amber-400/60 rounded shadow-sm"></div><span className="text-[9px] lg:text-[10px] font-black text-slate-200 uppercase tracking-widest">En Revisión</span></div>
                                <div className="flex items-center gap-3"><div className="size-3 lg:size-4 bg-emerald-400/40 border border-emerald-400/60 rounded shadow-sm"></div><span className="text-[9px] lg:text-[10px] font-black text-slate-200 uppercase tracking-widest">Validada</span></div>
                                <div className="flex items-center gap-3"><div className="size-3 lg:size-4 bg-emerald-500 rounded shadow-sm"></div><span className="text-[9px] lg:text-[10px] font-black text-slate-200 uppercase tracking-widest">Festivo</span></div>
                                <div className="w-full lg:w-auto lg:ml-auto text-slate-400 italic text-[9px] lg:text-[10px] font-bold flex items-center gap-2 pt-2 lg:pt-0">
                                    <span className="material-symbols-outlined text-[14px] lg:text-[16px]">info</span>
                                    * Haz clic en los días con Reg. 7h para registrar asistencia.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECCIÓN: MERCADO DE VACANTES (Buscador de Ofertas) */}
                {activeTab === 'search' && dashboardData?.estado_practicas === 'VALIDADO' && (
                    <div className="flex flex-col items-center justify-center py-24 text-center gap-6 animate-in fade-in duration-500">
                        <div className="size-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-emerald-500">verified</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-zinc-900 tracking-tight uppercase">Convenio Firmado</h3>
                            <p className="text-sm font-medium text-zinc-500 mt-3 max-w-md mx-auto leading-relaxed italic">
                                Tu convenio de prácticas ya ha sido firmado y está en vigor. El mercado de ofertas ya no está disponible para ti.
                            </p>
                        </div>
                        <button
                            onClick={() => setActiveTab('diario')}
                            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.02] transition-all"
                        >
                            Ir a mi Diario FCT
                        </button>
                    </div>
                )}
                {activeTab === 'search' && dashboardData?.estado_practicas !== 'VALIDADO' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-500 pb-20">

                        {/* ── BUSCADOR PREMIUM ─────────────────────────────────────── */}
                        <div className="relative group">
                            {/* Glow effect */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[28px] opacity-0 group-focus-within:opacity-20 blur transition-all duration-500" />
                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[24px] shadow-lg shadow-black/5 overflow-hidden transition-all duration-300 group-focus-within:border-indigo-300 dark:group-focus-within:border-indigo-700 group-focus-within:shadow-xl group-focus-within:shadow-indigo-500/10">
                                {/* Icono búsqueda */}
                                <div className="flex items-center justify-center pl-6 shrink-0">
                                    <span className="material-symbols-outlined text-zinc-300 dark:text-zinc-600 group-focus-within:text-indigo-500 transition-colors duration-300 text-[24px]">search</span>
                                </div>
                                <input
                                    id="ofertas-search"
                                    type="text"
                                    value={ofertasSearch}
                                    onChange={e => setOfertasSearch(e.target.value)}
                                    placeholder="Buscar por empresa o nombre de oferta…"
                                    className="flex-1 px-5 py-5 lg:py-6 bg-transparent text-sm font-bold text-zinc-800 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 outline-none uppercase tracking-tight"
                                />
                                {/* Contador de resultados */}
                                {ofertasSearch && (
                                    <div className="flex items-center gap-3 pr-3">
                                        <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-100 dark:border-indigo-500/20 whitespace-nowrap">
                                            {ofertas.filter(o =>
                                                o.titulo.toLowerCase().includes(ofertasSearch.toLowerCase()) ||
                                                o.empresa.toLowerCase().includes(ofertasSearch.toLowerCase())
                                            ).length} resultados
                                        </span>
                                        <button
                                            onClick={() => setOfertasSearch('')}
                                            className="size-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                            title="Limpiar búsqueda"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    </div>
                                )}
                                {/* Atajo de teclado visual */}
                                {!ofertasSearch && (
                                    <div className="hidden lg:flex items-center gap-1 pr-6">
                                        <kbd className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[10px] font-mono text-zinc-400">empresa</kbd>
                                        <span className="text-zinc-300 text-[10px]">/</span>
                                        <kbd className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[10px] font-mono text-zinc-400">oferta</kbd>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Grid Dinámico de Ofertas */}
                        {(() => {
                            const filteredOfertas = ofertasSearch.trim()
                                ? ofertas.filter(o =>
                                    o.titulo.toLowerCase().includes(ofertasSearch.toLowerCase()) ||
                                    o.empresa.toLowerCase().includes(ofertasSearch.toLowerCase())
                                )
                                : ofertas;

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 lg:gap-10">
                                    {loading ? (
                                        <SkeletonCard count={3} />
                                    ) : filteredOfertas.length === 0 ? (
                                        <div className="col-span-1 md:col-span-2 2xl:col-span-3">
                                            <EmptyState
                                                icon={ofertasSearch ? 'search_off' : 'work'}
                                                title={ofertasSearch ? 'Sin resultados' : 'Sin actividad'}
                                                description={ofertasSearch
                                                    ? `No hay ofertas que coincidan con "${ofertasSearch}". Prueba con otro término.`
                                                    : 'No tienes candidaturas activas en este momento.'
                                                }
                                            />
                                        </div>
                                    ) : (
                                        filteredOfertas.map(offer => (
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
                                                        <div className="absolute top-6 right-6 group-hover:rotate-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 group-hover:scale-110">
                                                            <CompanyLogo
                                                                logoPath={assetUrl(`/uploads/logos/${String(offer.empresa_data.logo).split('/').pop() || ''}`)}
                                                                companyName={offer.empresa || ''}
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
                                                <div className="p-6 lg:p-10 flex-1 flex flex-col">
                                                    <div className="flex justify-between items-start mb-8">
                                                        <div className="space-y-1.5">
                                                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">Empresa Patrocinadora</p>
                                                            <p className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter leading-none">{offer.empresa}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                if (offer.empresa_data) setSelectedEmpresa(offer.empresa_data);
                                                            }}
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
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5 mb-10">
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
                                        ))
                                    )}
                                </div>
                            );
                        })()}
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
                Diseño alineado con TutorCentroDashboard: fondo claro, cabecera slate, badges y pills. */}
            {selectedEmpresa && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-500">

                        {/* Cabecera: Logo + Nombre + Badges */}
                        <div className="relative p-6 lg:p-12 overflow-hidden shrink-0 bg-slate-50 dark:bg-slate-800/30">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                            <div className="relative flex justify-between items-start">
                                <div className="flex gap-8 items-center">
                                    <CompanyLogo
                                        logoPath={assetUrl(`/uploads/logos/${String(selectedEmpresa.logo).split('/').pop() || ''}`)}
                                        companyName={selectedEmpresa.nombre || ''}
                                    />
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                {selectedEmpresa.nombre}
                                            </h2>
                                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-semibold tracking-wide">Verificada</span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-1.5 text-xs font-bold">
                                                <span className="material-symbols-outlined text-[18px] text-indigo-500">mail</span>
                                                {(selectedEmpresa as any).email || 'Contacto no disponible'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold">
                                                <span className="material-symbols-outlined text-[18px] text-indigo-500">location_on</span>
                                                {selectedEmpresa.ubicacion || 'Ubicación no especificada'}
                                            </div>
                                            {(selectedEmpresa as any).web && (
                                                <a href={(selectedEmpresa as any).web} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">
                                                    <span className="material-symbols-outlined text-[18px]">language</span>
                                                    Sitio Web
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedEmpresa(null)}
                                    className="size-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:rotate-90 hover:shadow-lg"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Cuerpo: Descripción + Stack + Beneficios */}
                        <div className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                                <div className="md:col-span-12 space-y-12">

                                    {/* Sobre la empresa */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="size-8 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                                                <span className="material-symbols-outlined text-[18px]">info</span>
                                            </div>
                                            <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Sobre la Empresa</h4>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg font-medium italic">
                                            {selectedEmpresa.descripcion || 'Esta empresa colaboradora no ha proporcionado una descripción pública todavía.'}
                                        </p>
                                    </section>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                                        {/* Stack Tecnológico */}
                                        <section>
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="size-8 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
                                                    <span className="material-symbols-outlined text-[18px]">terminal</span>
                                                </div>
                                                <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Stack Tecnológico</h4>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedEmpresa.tecnologias?.length > 0 ? selectedEmpresa.tecnologias.map((tech: string, i: number) => (
                                                    <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        {tech.trim()}
                                                    </span>
                                                )) : <p className="text-slate-400 text-sm font-medium italic">Generalista</p>}
                                            </div>
                                        </section>

                                        {/* Beneficios */}
                                        <section>
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="size-8 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                                                    <span className="material-symbols-outlined text-[18px]">card_giftcard</span>
                                                </div>
                                                <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Beneficios y Cultura</h4>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedEmpresa.beneficios?.length > 0 ? selectedEmpresa.beneficios.map((ben: string, i: number) => (
                                                    <span key={i} className="px-4 py-2 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold border border-emerald-500/10">
                                                        {ben.trim()}
                                                    </span>
                                                )) : <p className="text-slate-400 text-sm font-medium italic">Formación Continua</p>}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                            <div className="flex gap-4">
                                {(selectedEmpresa as any).linkedin && (
                                    <a href={(selectedEmpresa as any).linkedin} target="_blank" rel="noopener noreferrer" className="size-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:text-[#0077b5] transition-colors">
                                        <i className="fa-brands fa-linkedin-in"></i>
                                    </a>
                                )}
                                {(selectedEmpresa as any).twitter && (
                                    <a href={(selectedEmpresa as any).twitter} target="_blank" rel="noopener noreferrer" className="size-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:text-black dark:hover:text-white transition-colors">
                                        <i className="fa-brands fa-x-twitter"></i>
                                    </a>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedEmpresa(null)}
                                className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-semibold tracking-wide hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
                            >
                                Cerrar Perfil
                            </button>
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
                        <div className="p-4 sm:p-6 lg:p-10 bg-zinc-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                        <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-10 overflow-y-auto custom-scrollbar">
                            {/* Modalidad de Trabajo */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] ml-2">Configuración de Jornada</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {['presencial', 'teletrabajo'].map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setAttendanceForm({ ...attendanceForm, modalidad: mode as 'presencial' | 'teletrabajo' })}
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
                                    className="w-full p-4 sm:p-6 lg:p-8 rounded-[38px] bg-zinc-50 border border-zinc-100 min-h-[180px] outline-none text-sm font-bold uppercase italic tracking-tight placeholder:text-zinc-300 focus:ring-8 focus:ring-indigo-600/5 transition-all resize-none shadow-inner"
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
                        <div className="p-4 sm:p-6 lg:p-10 bg-zinc-50 border-t border-zinc-100 flex flex-col sm:flex-row gap-4">
                            <button onClick={() => setIsAttendanceModalOpen(false)} className="px-10 py-5 bg-white rounded-2xl text-[10px] font-semibold tracking-wide border border-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors">Cerrar</button>
                            <button onClick={handleSaveAttendance} className="flex-1 py-5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white rounded-2xl font-semibold tracking-wide text-[10px] tracking-[0.4em] shadow-2xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all">Sincronizar Diario</button>
                        </div>
                    </div>
                </div>
            )}

            <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} />
        </DashboardLayout>
    );
};

export default AlumnoDashboard;
