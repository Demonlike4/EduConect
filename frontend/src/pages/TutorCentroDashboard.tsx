// ═══════════════════════════════════════════════════════════════════════════════
// TutorCentroDashboard.tsx — Panel de control del Tutor de Centro educativo
// ═══════════════════════════════════════════════════════════════════════════════
// Rol: TUTOR_CENTRO
// Funcionalidades principales:
//   · Aprobación de solicitudes de acceso de nuevos alumnos al sistema
//   · Gestión y supervisión del alumnado asignado al centro
//   · Validación y firma digital del convenio FCT por el tutor académico
//   · Revisión del Diario de Prácticas (bitácora) de cada alumno
//   · Consulta de la red de empresas colaboradoras del centro
//   · Descarga de convenios y documentación oficial
//   · Gestión de mensajería interna con tutores de empresa
// ═══════════════════════════════════════════════════════════════════════════════

// Hooks de React para estado local y efectos secundarios
import React, { useState, useEffect } from 'react';
// useNavigate: redirige al usuario tras logout u otras acciones de navegación
import { useNavigate } from 'react-router-dom';
// axios: cliente HTTP para comunicarse con el backend Symfony
import axios from 'axios';
// useUser: contexto global con los datos del usuario autenticado y función de logout
import { useUser } from '../context/UserContext';
// ChatSystem: componente completo de mensajería interna entre roles
import ChatSystem from '../components/ChatSystem';
// SignaturePad: lienzo de firma digital (canvas) para el convenio FCT
import SignaturePad from '../components/SignaturePad';
// DashboardMetrics: tarjetas KPI del panel de resumen (alumnos, validados, empresas...)
import { DashboardMetrics } from '../components/tutor/DashboardMetrics';
// AlumnosTable: tabla de alumnado con acciones de detalle, validación y eliminación
import { AlumnosTable } from '../components/tutor/AlumnosTable';
// NotificationPanel: panel desplegable de notificaciones en tiempo real del rol
import NotificationPanel from '../components/NotificationPanel';
import { apiUrl, assetUrl } from '../lib/urls.ts';
import DashboardLayout from '../components/layout/DashboardLayout';
import { SkeletonCard } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';

// ── Interfaz: datos de un alumno asignado al tutor ─────────────────────────
// Devuelta por el endpoint POST /api/tutor/alumnos para el campo "alumnos[]"
interface AlumnoData {
    id: number;              // ID único del alumno (FK a la tabla Usuario)
    nombre: string;          // Nombre completo del alumno
    email: string;           // Correo electrónico
    grado: string;           // Ciclo formativo cursado (ej: "DAW")
    status: string;          // Estado de la candidatura FCT (PENDIENTE, ADMITIDO, VALIDADO...)
    empresa: string;         // Nombre de la empresa donde hace prácticas
    candidatura_id?: number; // ID de la candidatura FCT asociada (puede no existir aún)
    oferta_id?: number;      // ID de la oferta a la que se postuló el alumno
    horario?: string;        // Jornada elegida: 'manana' | 'tarde'
    tipoDuracion?: string;   // Duración elegida de prácticas: '1_mes' | '2_meses' | '3_meses'
    isAprobado?: boolean;    // true si el tutor ya aprobó su acceso al sistema
    foto?: string;           // Nombre del archivo de foto de perfil (uploads/fotos/)
}

// ── Interfaz: notificación de sistema para el tutor de centro ───────────────
// Devuelta por el endpoint POST /api/notificaciones
interface NotificacionData {
    id: number;       // ID único de la notificación en BD
    type: string;     // Tipo visual: 'error' | 'warning' | 'success' | 'info'
    title: string;    // Título corto de la notificación
    desc: string;     // Descripción detallada del evento
    action: string;   // Texto del botón de acción (ej: 'Validar alumno')
    icon: string;     // Código de icono Material Symbols a renderizar
    leida: boolean;   // false = no leída (punto azul parpadeante)
    date: string;     // Fecha de creación en formato ISO
}

// ── Función auxiliar: parseActivity ──────────────────────────────────────────
// Extrae la modalidad de la actividad (entre corchetes) del texto de una entrada.
// Formato esperado: "[PRESENCIAL] Aprendizaje de APIs RESTful con Symfony"
// Devuelve: { modality: 'PRESENCIAL', cleanText: 'Aprendizaje de APIs RESTful con Symfony' }
const parseActivity = (text: string) => {
    if (!text) return { modality: null, cleanText: '' };
    const modalityMatch = text.match(/\[(.*?)\]/);
    const modality = modalityMatch ? modalityMatch[1].toUpperCase() : null;
    // Elimina el prefijo de modalidad del texto para mostrarlo limpio
    const cleanText = text.replace(/\[.*?\]/, '').trim();
    return { modality, cleanText };
};

// ── Componente auxiliar: renderActivity ───────────────────────────────────────
// Renderiza una entrada del diario con su badge de modalidad (Presencial/Remoto/Urgente)
// y el texto de la actividad. Si no hay modalidad, devuelve el texto simple.
const renderActivity = (text: string) => {
    const { modality, cleanText } = parseActivity(text);

    if (!modality) return <span className="align-middle">{text}</span>;

    let icon = 'label';
    let colors = 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';

    if (modality === 'PRESENCIAL') {
        icon = 'business';
        colors = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    } else if (modality === 'REMOTO' || modality === 'TELETRABAJO' || modality === 'HÍBRIDO') {
        icon = 'home_work';
        colors = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    } else if (modality === 'URGENTE') {
        icon = 'priority_high';
        colors = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    }

    return (
        <div className="space-y-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${colors} text-[9px] font-semibold tracking-wide rounded-full border shadow-xs leading-none transition-transform hover:scale-105`}>
                <span className="material-symbols-outlined text-[14px] leading-none">{icon}</span>
                {modality}
            </span>
            <p className="text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">{cleanText}</p>
        </div>
    );
};

// ── Componente auxiliar: TimeProgress ────────────────────────────────────────
// Muestra el progreso temporal del período de prácticas FCT.
// Props:
//   · start: fecha de inicio del convenio (ISO string)
//   · end:   fecha de fin previsto del convenio (ISO string)
// Calcula los días restantes y el porcentaje de progreso mediante timestamps.
const TimeProgress: React.FC<{ start: string, end: string }> = ({ start, end }) => {
    // Si no hay fechas definidas (convenio aún no formalizado), mostramos un indicador inactivo
    if (!start || !end) return <div className="text-xs text-gray-400 font-bold uppercase">No activo</div>;

    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const now = new Date().getTime();

    const totalDuration = endDate - startDate; // Duración total del convenio en ms
    const elapsed = now - startDate;     // Tiempo transcurrido desde inicio
    // Progreso entre 0% (no iniciado) y 100% (finalizado)
    const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    // Días naturales que quedan hasta el fin del convenio
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return (
        <div className="flex flex-col items-center">
            <span className="text-2xl font-bold dark:text-white">{Math.max(0, daysLeft)}</span>
            <span className="text-[10px] text-gray-500 font-bold uppercase">Días</span>
            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1 rounded mt-2 overflow-hidden">
                {/* Barra de progreso temporal — se actualiza en cada render */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 h-full transition-none" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
};

// ── Función auxiliar: getOfferImage ──────────────────────────────────────────
// Obtiene una imagen de cabecera representativa para la oferta basándose en
// el texto del título/descripción o el ID de la oferta para fallback.
// Utiliza una colección curada de Unsplash por categorías.
const getOfferImage = (offer: any): string => {
    if (offer?.imagen) return assetUrl(`/uploads/ofertas/${offer.imagen}`);
    const text = `${offer?.titulo || ''} ${offer?.descripcion || ''}`.toLowerCase();
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

    const photoId = selected[(offer?.id || 0) % selected.length];
    return `https://images.unsplash.com/photo-${photoId}?q=80&w=800&auto=format&fit=crop`;
};

// ── Función auxiliar: getOfferColor ──────────────────────────────────────────
// Devuelve un color corporativo coherente para la oferta si no tiene uno definido.
const getOfferColor = (offer: any) => {
    if (offer?.color) return offer.color;
    const colors = ['#4f46e5', '#9333ea', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#d946ef', '#06b6d4'];
    return colors[(offer?.id || 0) % colors.length];
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: TutorCentroDashboard
// ═══════════════════════════════════════════════════════════════════════════════
const TutorCentroDashboard: React.FC = () => {
    // Hook de navegación para redirecciones programáticas (ej: /login tras logout)
    const navigate = useNavigate();
    // Datos del usuario autenticado (nombre, email, rol, centro) y función de cierre de sesión
    const { user, logout } = useUser();

    // ── Estado: pestaña activa del panel lateral ────────────────────────────
    // Controla qué sección se muestra en el área de contenido principal
    const [activeTab, setActiveTab] = useState<'resumen' | 'alumnos' | 'solicitudes' | 'mensajes' | 'empresas' | 'documentacion'>('resumen');

    // ── Estados: datos principales cargados desde el backend ───────────────
    const [alumnos, setAlumnos] = useState<AlumnoData[]>([]);            // Lista de alumnos asignados al tutor
    const [empresas, setEmpresas] = useState<any[]>([]);                   // Empresas colaboradoras con alumnos del centro
    const [notificaciones, setNotificaciones] = useState<NotificacionData[]>([]);    // Notificaciones del sistema para el tutor
    const [loading, setLoading] = useState(true);                        // Estado de carga inicial de datos
    const [stats, setStats] = useState({ totalEmpresas: 0, pendingValidations: 0, alumnosValidados: 0, totalAlumnos: 0 }); // KPIs del resumen

    // ── Estados: Modal de validación / firma del convenio FCT ──────────────
    const [isValModalOpen, setIsValModalOpen] = useState(false);           // Visibilidad del modal de validación
    const [alumnoToVal, setAlumnoToVal] = useState<AlumnoData | null>(null); // Alumno seleccionado para validar
    const [isSubmitting, setIsSubmitting] = useState(false);             // Bloquea el botón durante la petición HTTP
    const [valStep, setValStep] = useState(1);               // Paso del wizard: 1=Revisión info, 2=Firma digital
    const [signature, setSignature] = useState<string | null>(null); // Data URL de la firma capturada en el canvas

    // ── Estados: Modal de detalle del alumno (expediente académico) ─────────
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // Visibilidad del modal de expediente
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false); // Visibilidad del modal de detalle de oferta
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false); // Visibilidad del modal de ayuda/guía
    const [studentDetail, setStudentDetail] = useState<any>(null); // Datos detallados del alumno seleccionado
    const [detailLoading, setDetailLoading] = useState(false); // Estado de carga del detalle

    // ── Estados: Modal de empresa (perfil completo) ─────────────────────────
    const [selectedCompany, setSelectedCompany] = useState<any | null>(null); // Empresa seleccionada en la lista compacta
    const [isCompanyProfileModalOpen, setIsCompanyProfileModalOpen] = useState(false); // Visibilidad del perfil de empresa
    const [companyProfileData, setCompanyProfileData] = useState<any>(null); // Datos completos del perfil de empresa
    const [profileLoading, setProfileLoading] = useState(false); // Estado de carga del perfil de empresa

    // ── Estados del Diario de Prácticas (Bitácora) ──────────────────────────
    const [modalTab, setModalTab] = useState<'info' | 'diario'>('info'); // Pestaña activa dentro del modal de expediente
    const [diarioEntries, setDiarioEntries] = useState<any[]>([]);            // Entradas del diario del alumno seleccionado
    const [loadingDiario, setLoadingDiario] = useState(false);               // Estado de carga del diario
    const [currentMonth, setCurrentMonth] = useState(new Date());          // Mes visible en el calendario del diario
    const [bitacoraFeedback, setBitacoraFeedback] = useState<{ [key: number]: string }>({}); // Comentarios del tutor por entrada
    // Día seleccionado en el calendario → abre el modal de detalle de jornada
    const [selectedDayInfo, setSelectedDayInfo] = useState<{ day: Date; entry: any; holiday: any } | null>(null);
    // Controla si el sidebar está visible en dispositivos móviles (hamburger menu)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Nombre visible del tutor (fallback si no hay datos de perfil cargados aún)
    const displayName = user?.nombre || "Tutor Académico";
    // Centro educativo del tutor mostrado en el sidebar inferior
    const displayRole = user?.centro || "Centro Educativo";

    // ════════════════════════════════════════════════════════════════════════
    // useEffect: Carga inicial de datos al montar el componente
    // Depende de [user] → se re-ejecuta si cambia el usuario autenticado
    // Peticiones:
    //   1. POST /api/tutor/alumnos   → alumnos, empresas y KPIs del panel
    //   2. POST /api/notificaciones  → notificaciones sin leer del tutor
    // También configura un intervalo de polling cada 30s para notificaciones
    // ════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        // ── Subconsulta 1: Alumnos, empresas y estadísticas del panel ────────
        // Endpoint: POST /api/tutor/alumnos
        // Body:     { email: string }  → filtra por el tutor autenticado
        // Respuesta: { alumnos[], empresas[], stats{} }
        const fetchAlumnos = async () => {
            if (user?.email) {
                try {
                    const response = await axios.post(apiUrl('/api/tutor/alumnos'), {
                        email: user.email
                    });
                    if (response.data.alumnos) {
                        setAlumnos(response.data.alumnos);  // Lista de alumnos con sus candidaturas
                    }
                    if (response.data.empresas) {
                        setEmpresas(response.data.empresas); // Empresas vinculadas al centro
                    }
                    if (response.data.stats) {
                        setStats(response.data.stats);       // KPIs: totalAlumnos, pendingValidations...
                    }
                } catch (error) {
                    console.error("Error fetching alumnos:", error);
                } finally {
                    setLoading(false); // Siempre ocultar el spinner de carga inicial
                }
            } else {
                setLoading(false); // Si no hay email de usuario, no hay nada que cargar
            }
        };

        // ── Subconsulta 2: Notificaciones del tutor ──────────────────────────
        // Endpoint: POST /api/notificaciones
        // Body:     { email: string }  → filtra notificaciones por rol y usuario
        // Respuesta: { notificaciones[] }
        // Se llama aussi en el intervalo de polling cada 30 segundos
        const fetchNotificaciones = async () => {
            if (user?.email) {
                try {
                    const res = await axios.post(apiUrl('/api/notificaciones'), { email: user.email });
                    setNotificaciones(res.data.notificaciones || []);
                } catch (e) {
                    console.error("Error fetching notifications", e);
                }
            }
        };

        // Ejecutar ambas consultas al montar o al cambiar de usuario
        fetchAlumnos();
        fetchNotificaciones();

        // Polling de notificaciones cada 30 segundos para actualizaciones en tiempo real
        const notifInterval = setInterval(fetchNotificaciones, 30000);
        // Limpiar intervalo al desmontar el componente (evita memory leaks)
        return () => clearInterval(notifInterval);
    }, [user]);

    // ── handleReadNotification ──────────────────────────────────────────────
    // Marca una notificación como leída de forma optimista en el estado local
    // y confirma la acción en el backend.
    // Endpoint: POST /api/notificaciones/{id}/read
    const handleReadNotification = async (id: number) => {
        try {
            await axios.post(apiUrl(`/api/notificaciones/${id}/read`));
            // Actualización optimista: marca localmente como leída sin re-fetch
            setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
        } catch (e) { console.error(e); }
    };

    // ── handleLogout ────────────────────────────────────────────────────────
    // Cierra la sesión del tutor: limpia el contexto de usuario y redirige al login
    const handleLogout = () => {
        logout();           // Limpia el UserContext y el token/almacenamiento local
        navigate('/login'); // Redirige al formulario de inicio de sesión
    };

    // ── handleApproveAlumno ─────────────────────────────────────────────────
    // Aprueba el acceso de un alumno pendiente al sistema EduConect.
    // Endpoint: POST /api/tutor/alumno/{id}/approve
    // Efecto: El alumno podrá iniciar sesión en la plataforma.
    // Actualización local: marca isAprobado=true sin recargar toda la lista.
    const handleApproveAlumno = async (id: number) => {
        try {
            await axios.post(apiUrl(`/api/tutor/alumno/${id}/approve`));
            alert("Alumno aprobado correctamente. Ahora podrá iniciar sesión.");
            // Actualiza el estado local para mover el alumno fuera de pendientesStudents
            setAlumnos(prev => prev.map(a => a.id === id ? { ...a, isAprobado: true } : a));
        } catch (error) {
            console.error("Error aprobando alumno:", error);
            alert("Error al aprobar alumno.");
        }
    };

    // ── handleRemoveAlumno ──────────────────────────────────────────────────
    // Elimina a un alumno de la lista del tutor (desvinculación, no borrado de BD).
    // Endpoint: POST /api/tutor/alumno/{id}/remove
    // Requiere confirmación del usuario para evitar eliminaciones accidentales.
    // Efecto: El alumno pierde acceso y debe solicitar nuevo tutor.
    const handleRemoveAlumno = async (id: number, nombre: string) => {
        // Diálogo de confirmación nativo del navegador
        if (!confirm(`¿Estás seguro de que deseas eliminar al alumno ${nombre} de tu lista? Perderá el acceso y tendrá que solicitar nuevo tutor.`)) return;

        try {
            const res = await axios.post(apiUrl(`/api/tutor/alumno/${id}/remove`));
            if (res.data.status === 'success') {
                // Elimina al alumno del estado local para actualizar la UI sin re-fetch
                setAlumnos(prev => prev.filter(a => a.id !== id));
            }
        } catch (error) {
            console.error('Error al eliminar alumno', error);
            alert('Error al intentar eliminar a este alumno.');
        }
    };

    // ── handleNotificationAction ────────────────────────────────────────────
    // Manejador de navegación inteligente desde notificaciones.
    // Al hacer clic en una notificación del panel:
    //   1. La marca como leída en el backend
    //   2. Analiza el contenido del título + descripción + acción
    //   3. Navega a la pestaña correcta y abre el modal relevante directamente
    //
    // Casos reconocidos (basados en los títulos del CandidaturaManager.php):
    //   · "Validación Requerida" / "Validar alumno"  → pestaña Alumnos + modal validación
    //   · "Diario" / "Bitácora" / "Revisar"          → pestaña Alumnos + modal diario del alumno
    //   · "Solicitud" / "Nuevo alumno" / "Registro"  → pestaña Solicitudes
    //   · "Mensaje" / "Chat"                         → pestaña Mensajería
    //   · Cualquier otro                             → pestaña Resumen
    const handleNotificationAction = (notif: any) => {
        handleReadNotification(notif.id); // Marcar como leída inmediatamente
        // Concatenar todos los campos de texto para facilitar la detección por palabras clave
        const txt = (notif.title + ' ' + (notif.desc ?? '') + ' ' + (notif.action ?? '')).toLowerCase();

        // 🔔 CASO 1: Validación requerida → navegar a alumnos y abrir modal de validación
        // El texto del backend envía: título "Validación Requerida", acción "Validar alumno"
        if (txt.includes('validación requerida') || txt.includes('validar alumno') || txt.includes('validar convenio')) {
            setActiveTab('alumnos');
            // Intentar extraer el nombre del alumno de la descripción para abrir su modal directo
            // Formatos esperados: "El alumno NOMBRE ha sido admitido" o "alumno NOMBRE."
            const match = notif.desc?.match(/alumno (.+?) ha sido/i) || notif.desc?.match(/alumno (.+?)\./i);
            if (match && match[1]) {
                const studentName = match[1].trim();
                // Buscar el alumno en el estado local (case-insensitive, búsqueda parcial)
                const found = alumnos.find(a => a.nombre.toLowerCase().includes(studentName.toLowerCase()));
                if (found) {
                    handleOpenValModal(found); // Abrir directamente el modal de validación
                    return;
                }
            }
            return; // Si no se encontró el alumno, al menos navegar a la pestaña
        }

        // 🔔 CASO 2: Diario de prácticas → navegar al diario del alumno específico
        if (txt.includes('diario') || txt.includes('bitácora') || txt.includes('revisar')) {
            // Intentar extraer el nombre del alumno que registró la actividad
            const match = notif.desc?.match(/alumno (.*?) ha guardado/i) || notif.desc?.match(/estudiante (.*?) ha editado/i);
            if (match && match[1]) {
                const studentName = match[1].trim();
                const found = alumnos.find(a => a.nombre.toLowerCase().includes(studentName.toLowerCase()));
                if (found) {
                    setActiveTab('alumnos');
                    setModalTab('diario'); // Forzar la pestaña de diario en el modal
                    handleOpenDetailModal(found.id); // Abrir el expediente en la pestaña diario
                    return;
                }
            }
            // Fallback: navegar a alumnos aunque no se identifique al alumno concreto
            setActiveTab('alumnos');
            return;
        }

        // 🔔 CASO 3: Otras navegaciones por palabras clave
        if (txt.includes('solicitud') || txt.includes('registro') || txt.includes('nuevo alumno')) {
            setActiveTab('solicitudes'); // Nuevo alumno esperando aprobación
        } else if (txt.includes('mensaje') || txt.includes('chat')) {
            setActiveTab('mensajes');    // Mensaje recibido en el chat interno
        } else {
            setActiveTab('resumen');     // Fallback genérico: panel de resumen
        }
    };


    // ── handleOpenValModal ──────────────────────────────────────────────────
    // Prepara y abre el modal de validación del convenio FCT para un alumno.
    // Resetea el wizard al paso 1 y limpia cualquier firma anterior.
    const handleOpenValModal = (al: AlumnoData) => {
        setAlumnoToVal(al);          // Alumno cuyo convenio se va a validar
        setValStep(1);               // Empezar siempre desde el paso 1 (revisión de datos)
        setSignature(null);          // Limpiar firma anterior si la hubiera
        setIsValModalOpen(true);     // Mostrar el modal
    };

    // ── handleValidar ───────────────────────────────────────────────────────
    // Envía la validación del convenio FCT al backend con la firma digital capturada.
    // Endpoint: POST /api/tutor/candidaturas/{candidatura_id}/validar
    // Body:     { firma: string }  → Data URL base64 de la firma del tutor
    // Efecto backend:
    //   · Cambia estado de candidatura a 'VALIDADO'
    //   · Genera el PDF del convenio firmado
    //   · Notifica al alumno, tutor empresa y empresa
    // Post-submit: recarga la lista de alumnos para reflejar el nuevo estado
    const handleValidar = async () => {
        if (!alumnoToVal?.candidatura_id) return; // Guardia: debe existir candidatura
        setIsSubmitting(true); // Bloquear botón durante la petición
        try {
            await axios.post(`https://educonect.alwaysdata.net/api/tutor/candidaturas/${alumnoToVal.candidatura_id}/validar`, {
                firma: signature // Data URL de la firma capturada en el SignaturePad
            });
            alert("Prácticas validadas. El convenio ya está disponible.");
            // Cerrar y resetear el modal
            setIsValModalOpen(false);
            setValStep(1);
            setSignature(null);
            // Recargar la lista de alumnos para mostrar el nuevo estado 'VALIDADO'
            const response = await axios.post('https://educonect.alwaysdata.net/api/tutor/alumnos', { email: user?.email });
            if (response.data.alumnos) setAlumnos(response.data.alumnos);
        } catch (error: any) {
            console.error("Error validando:", error);
            // Mostrar el mensaje de error específico del backend si está disponible
            const errorMsg = error.response?.data?.error || "Error al validar prácticas";
            alert(errorMsg);
        } finally {
            setIsSubmitting(false); // Siempre desbloquear el botón
        }
    };

    // ── fetchStudentDiario ──────────────────────────────────────────────────
    // Carga las entradas del Diario de Prácticas de una candidatura específica.
    // Endpoint: GET /api/diario/tutor/candidatura/{candidaturaId}
    // Respuesta: { actividades[] } → lista de entradas ordenadas por fecha
    // Solo se llama si el alumno tiene estado 'VALIDADO' (convenio firmado).
    const fetchStudentDiario = async (candidaturaId: number) => {
        setLoadingDiario(true);
        try {
        const res = await axios.get(apiUrl(`/api/diario/tutor/candidatura/${candidaturaId}`));
            setDiarioEntries(res.data.actividades || []); // Guardar entradas del diario
        } catch (error) {
            console.error("Error fetching student diario:", error);
        } finally {
            setLoadingDiario(false);
        }
    };

    // ── handleValidarDiario ─────────────────────────────────────────────────
    // Aprueba o rechaza una entrada específica de la bitácora del alumno.
    // Endpoint: POST /api/diario/tutor/validar/{diarioId}
    // Body:     { estado: 'APROBADO' | 'RECHAZADO', observaciones: string }
    // Tras la validación, recarga el diario completo para mostrar el estado actualizado.
    const handleValidarDiario = async (diarioId: number, estado: 'APROBADO' | 'RECHAZADO') => {
        // Recuperar el comentario del tutor para esta entrada (puede estar vacío)
        const observaciones = bitacoraFeedback[diarioId] || '';
        try {
        await axios.post(apiUrl(`/api/diario/tutor/validar/${diarioId}`), {
                estado,        // 'APROBADO' o 'RECHAZADO'
                observaciones  // Feedback textual del tutor (opcional)
            });
            // Recargar el diario del alumno actual para reflejar el cambio de estado
            if (studentDetail?.candidatura?.id) {
                fetchStudentDiario(studentDetail.candidatura.id);
            }
        } catch (error) {
            alert("Error al validar actividad");
        }
    };

    // ── HOLIDAYS_ANDALUCIA_2026 ─────────────────────────────────────────────
    // Mapa de festivos oficiales de Andalucía para el curso 2025/26.
    // Clave: fecha en formato 'YYYY-MM-DD' (coincide con el formato de la BD)
    // Valor: { label: nombre del festivo, type: 'nacional' | 'regional' }
    // Usado en el calendario de la bitácora para marcar días en rojo y bloquear entradas.
    const HOLIDAYS_ANDALUCIA_2026: Record<string, { label: string, type: 'regional' | 'nacional' }> = {
        '2026-01-01': { label: 'Año Nuevo', type: 'nacional' },
        '2026-01-06': { label: 'Reyes', type: 'nacional' },
        '2026-02-28': { label: 'Día de Andalucía', type: 'regional' },
        '2026-04-02': { label: 'Jueves Santo', type: 'nacional' },
        '2026-04-03': { label: 'Viernes Santo', type: 'nacional' },
        '2026-05-01': { label: 'Fiesta del Trabajo', type: 'nacional' },
        '2026-08-15': { label: 'Asunción', type: 'nacional' },
        '2026-10-12': { label: 'Fiesta Nacional', type: 'nacional' },
        '2026-12-06': { label: 'Constitución', type: 'nacional' },
        '2026-12-08': { label: 'Inmaculada', type: 'nacional' },
        '2026-12-25': { label: 'Navidad', type: 'nacional' },
    };

    // ── getDaysInMonth ───────────────────────────────────────────────────────
    // Genera el array de días (o null para celdas vacías) para el grid del calendario.
    // Lunes como primer día de la semana (patrón europeo).
    // Devuelve: [null, null, ..., Date(día 1), Date(día 2), ..., Date(último día)]
    // Los null al inicio representan los días anteriores al primer día del mes.
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);       // Primer día del mes
        const lastDay = new Date(year, month + 1, 0);   // Último día del mes
        const days: (Date | null)[] = [];
        // getDay() devuelve 0=Dom, 1=Lun...; ajustar para que Lun=0 (índice europeo)
        let startDay = firstDay.getDay() - 1;
        if (startDay === -1) startDay = 6; // Domingo → posición 6
        // Rellenar con null las celdas vacías antes del primer día
        for (let i = 0; i < startDay; i++) days.push(null);
        // Añadir los días reales del mes como objetos Date
        for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
        return days;
    };

    // ── isWithinRange ────────────────────────────────────────────────────────
    // Determina si una fecha cae dentro del período de prácticas del alumno.
    // Si no hay fechas definidas (convenio aún no validado), devuelve true (muestra todo).
    // Usado en el calendario para desaturar días fuera del período FCT.
    const isWithinRange = (date: Date) => {
        // Si no hay fechas de convenio definidas, mostrar todos los días sin restricción
        if (!studentDetail?.candidatura?.fechaInicio || !studentDetail?.candidatura?.fechaFin) return true;
        // Normalizar a medianoche para comparación de fechas sin horas
        const d = new Date(date).setHours(0, 0, 0, 0);
        const start = new Date(studentDetail.candidatura.fechaInicio).setHours(0, 0, 0, 0);
        const end = new Date(studentDetail.candidatura.fechaFin).setHours(0, 0, 0, 0);
        return d >= start && d <= end;
    };

    // ── handleOpenDetailModal ───────────────────────────────────────────────
    // Abre el modal de expediente académico de un alumno cargando sus datos del backend.
    // Endpoint: GET /api/tutor/alumno/{alumnoId}
    // Respuesta: datos personales, candidatura, CV, habilidades, oferta...
    // Si el alumno tiene estado 'VALIDADO', también carga automáticamente su diario.
    const handleOpenDetailModal = async (alumnoId: number) => {
        setDetailLoading(true);     // Mostrar spinner de carga
        setIsDetailModalOpen(true); // Abrir el modal (con skeleton)
        setModalTab('info');        // Resetear siempre a la pestaña de información general
        setDiarioEntries([]);       // Limpiar entradas de diario de consultas anteriores
        try {
            const res = await axios.get(apiUrl(`/api/tutor/alumno/${alumnoId}`));
            setStudentDetail(res.data);
            // Solo cargar el diario si el convenio ya ha sido validado (estado VALIDADO)
            if (res.data.candidatura?.id && res.data.candidatura?.estado === 'VALIDADO') {
                fetchStudentDiario(res.data.candidatura.id);
            }
        } catch (error) {
            console.error("Error fetching student details", error);
            alert("No se pudo cargar el detalle del alumno.");
            setIsDetailModalOpen(false); // Cerrar modal si la carga falló
        } finally {
            setDetailLoading(false); // Ocultar spinner siempre
        }
    };

    // ── handleOpenCompanyModal ──────────────────────────────────────────────
    // Abre la vista de lista de alumnos de una empresa (modal compacto).
    // No realiza petición HTTP — los datos ya están en el estado empresas[].
    const handleOpenCompanyModal = (empresa: any) => {
        setSelectedCompany(empresa); // Mostrar el modal con los datos de la empresa seleccionada
    };

    // ── handleViewCompanyProfile ────────────────────────────────────────────
    // Carga y muestra el perfil completo de una empresa colaboradora.
    // Endpoint: POST /api/empresa/profile
    // Body:     { email: string }  → identificador único de la empresa
    // Respuesta: nombre, descripción, stack tecnológico, beneficios, redes sociales...
    const handleViewCompanyProfile = async (email: string) => {
        setProfileLoading(true);              // Mostrar spinner dentro del modal de perfil
        setIsCompanyProfileModalOpen(true);   // Abrir el modal antes de tener los datos
        try {
            const response = await axios.post(apiUrl('/api/empresa/profile'), { email });
            setCompanyProfileData(response.data); // Guardar datos del perfil para renderizar
        } catch (error) {
            console.error("Error fetching company profile", error);
            alert("No se pudo cargar el perfil de la empresa.");
        } finally {
            setProfileLoading(false); // Ocultar spinner siempre
        }
    };

    // ── pendingStudents ─────────────────────────────────────────────────────
    // Lista derivada de alumnos que aún NO han sido aprobados por el tutor.
    // Estos aparecen en la pestaña "Solicitudes" y en el badge del sidebar.
    const pendingStudents = alumnos.filter(a => a.isAprobado === false);

    // ════════════════════════════════════════════════════════════════════════
    // RENDER: Estructura visual del dashboard
    // Jerarquía general del layout:
    //   ┌─ div.min-h-screen (contenedor raíz)
    //   ├─ aside (sidebar fijo izquierdo, z-70)
    //   ├─ div.overlay (backdrop móvil, z-60)
    //   └─ div.main-area (lg:pl-80 para compensar el sidebar)
    //       ├─ header (barra superior sticky, z-20)
    //       └─ div.content (pestañas: resumen / solicitudes / alumnos / mensajes / empresas / docs)
    //           └─ [modales portados: validación, detalle, oferta, empresa, guía, perfil empresa]
    // ════════════════════════════════════════════════════════════════════════
    return (
        <DashboardLayout
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            sidebarWidthClass="w-80"
            sidebarClassName="bg-zinc-950 text-white"
            zIndexSidebarClass="z-[70]"
            sidebar={
                <>
                {/* Logotipo EduConect con barra de acento superior en degradado */}
                <div className="p-8 border-b border-white/5 bg-zinc-950 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 rotate-3 group-hover:rotate-0 transition-transform duration-500 ring-4 ring-indigo-600/10">
                            <span className="material-symbols-outlined text-white text-3xl font-light">school</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">EduConect</h1>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1.5 opacity-80">Portal de Tutores</p>
                        </div>
                    </div>
                </div>

                {/* Menú de navegación: cada item mapea a una pestaña del contenido principal.
            El item 'guias' abre el modal informativo en vez de cambiar pestaña.
            El badge (count) aparece en 'solicitudes' si hay alumnos pendientes. */}
                <nav className="flex-1 p-6 space-y-2 mt-4">
                    {[
                        { id: 'resumen', label: 'Resumen', icon: 'dashboard' },
                        { id: 'solicitudes', label: 'Inscripciones', icon: 'pending_actions', count: pendingStudents.length > 0 ? pendingStudents.length : null },
                        { id: 'alumnos', label: 'Alumnado', icon: 'group' },
                        { id: 'mensajes', label: 'Mensajería', icon: 'forum' },
                        { id: 'empresas', label: 'Red de Empresas', icon: 'business' },
                        { id: 'documentacion', label: 'Normativa', icon: 'gavel' },
                        { id: 'guias', label: 'Ayuda', icon: 'help_outline' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.id === 'guias') setIsGuideModalOpen(true);
                                else setActiveTab(item.id as any);
                            }}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group/item ${activeTab === item.id ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white shadow-lg shadow-indigo-600/20' : 'text-zinc-400 hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover/item:scale-110'}`}>
                                    {item.icon}
                                </span>
                                <span className="text-sm font-black tracking-tight uppercase">{item.label}</span>
                            </div>
                            {item.count ? (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeTab === item.id ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white'}`}>
                                    {item.count}
                                </span>
                            ) : (
                                <span className="material-symbols-outlined text-[18px] opacity-0 group-hover/item:opacity-30 transition-opacity">chevron_right</span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Bottom Profile */}
                <div className="p-8 border-t border-white/5 bg-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-4 group/profile cursor-pointer">
                        <div className="size-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 font-black border border-indigo-500/20 group-hover/profile:scale-110 transition-transform overflow-hidden">
                            {user?.foto ? (
                                <img src={assetUrl(`/uploads/fotos/${user.foto}`)} className="w-full h-full object-cover" alt="Perfil" />
                            ) : (
                                displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white truncate uppercase tracking-tighter leading-none">{displayName}</p>
                            <p className="text-[10px] text-zinc-500 font-bold truncate uppercase tracking-widest mt-1 opacity-70">{displayRole}</p>
                        </div>
                        <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
                            <span className="material-symbols-outlined text-xl">power_settings_new</span>
                        </button>
                    </div>
                </div>
                </>
            }
            header={
                <header className="h-20 lg:h-24 bg-white/70 backdrop-blur-2xl border-b border-zinc-100 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-20 transition-all">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-2 text-zinc-500 hover:text-indigo-600 transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <span className="material-symbols-outlined text-2xl">menu</span>
                        </button>
                        <div>
                            <h2 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tighter flex items-center gap-2 lg:gap-4 uppercase">
                                <span className="material-symbols-outlined text-indigo-600 text-2xl lg:text-3xl hidden sm:block">
                                    {activeTab === 'resumen' ? 'insights' : activeTab === 'solicitudes' ? 'how_to_reg' : activeTab === 'alumnos' ? 'supervised_user_circle' : 'chat_bubble'}
                                </span>
                                {activeTab === 'resumen' ? 'Panel' : activeTab === 'solicitudes' ? 'Inscripciones' : activeTab === 'alumnos' ? 'Alumnado' : 'Mensajería'}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden xl:flex items-center gap-4 px-5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm">
                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Servidor Activo • 2026/27</span>
                        </div>

                        {/* Notifications Dropdown */}
                        <div className="relative group/notif">
                            <button className="size-12 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer relative">
                                <span className="material-symbols-outlined text-[24px]">notifications</span>
                                {notificaciones.filter(n => !n.leida).length > 0 && (
                                    <span className="absolute top-2 right-2 size-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 border-2 border-white dark:border-zinc-800 rounded-full flex items-center justify-center text-[8px] font-black text-white">
                                        {notificaciones.filter(n => !n.leida).length}
                                    </span>
                                )}
                            </button>

                            <div className="absolute right-0 top-full mt-4 w-[calc(100vw-2rem)] sm:w-80 lg:w-96 opacity-0 translate-y-4 pointer-events-none group-hover/notif:opacity-100 group-hover/notif:translate-y-0 group-hover/notif:pointer-events-auto transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 z-[100]">
                                <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl shadow-black/20 border border-zinc-100 dark:border-zinc-800 overflow-hidden max-h-[500px] flex flex-col">
                                    <NotificationPanel
                                        role="TUTOR_CENTRO"
                                        onActionClick={handleNotificationAction}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* User Profile Pill */}
                        <div className="flex items-center gap-3 p-1 bg-zinc-900 dark:bg-white rounded-2xl shadow-lg shadow-black/10 hover:scale-[1.02] transition-transform cursor-pointer overflow-hidden">
                            <div className="size-8 lg:size-10 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-inner overflow-hidden">
                                {user?.foto ? (
                                    <img src={assetUrl(`/uploads/fotos/${user.foto}`)} className="w-full h-full object-cover" alt="Perfil" />
                                ) : (
                                    displayName.charAt(0)
                                )}
                            </div>
                            <div className="hidden sm:block pr-4">
                                <p className="text-[9px] lg:text-[10px] font-black text-white dark:text-zinc-900 uppercase tracking-tighter leading-none mb-0.5">{displayName}</p>
                                <p className="text-[7px] lg:text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none text-right">Tutor</p>
                            </div>
                        </div>
                    </div>
                </header>
            }
        >

                {/* ── BLOQUE PRINCIPAL: Contenido desplazado a la derecha del sidebar ───
            lg:pl-80 compensa el ancho fijo del sidebar (320px).
            Contiene: header sticky + área de contenido con pestañas. */}
                <div className={`flex-1 flex flex-col min-h-0 animate-in fade-in duration-700 ${activeTab === 'mensajes' ? 'p-0 overflow-hidden' : 'overflow-y-auto p-4 lg:p-8 custom-scrollbar'}`}>
                    {/* ── PESTAÑA: SOLICITUDES ──────────────────────────────────────────────
              Muestra los alumnos que aún no han sido aprobados por el tutor.
              Estos son alumnos que se registraron con el correo del centro
              pero cuyo acceso aún no ha sido validado manualmente.
              Botón principal: "Aprobar Acceso" → llama a handleApproveAlumno() */}
                    {activeTab === 'solicitudes' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded border border-[#e0e0e0] dark:border-white/10 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-white/5">
                                    <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
                                        Solicitudes Pendientes
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">Alumnos que esperan validación para entrar al sistema.</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-[10px] lg:text-xs uppercase font-semibold tracking-wider">
                                                <th className="px-4 lg:px-6 py-4">Alumno</th>
                                                <th className="hidden sm:table-cell px-4 lg:px-6 py-4">Email</th>
                                                <th className="hidden lg:table-cell px-4 lg:px-6 py-4">Grado</th>
                                                <th className="px-4 lg:px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 dark:text-zinc-200">
                                            {pendingStudents.length === 0 ? (
                                                <div className="py-20">
                                                    <EmptyState 
                                                        icon="group" 
                                                        title="Panel Vacío" 
                                                        description="Aún no hay alumnos asignados a tu tutoría." 
                                                    />
                                                </div>
                                            ) :
                                                pendingStudents.map((alu) => (
                                                    <tr key={alu.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="size-9 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center text-xs font-bold text-amber-600 dark:text-amber-400 ring-2 ring-white dark:ring-zinc-900 overflow-hidden">
                                                                    {alu.foto ? (
                                                                        <img src={assetUrl(`/uploads/fotos/${alu.foto}`)} className="w-full h-full object-cover" alt="Perfil" />
                                                                    ) : (
                                                                        alu.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <span className="font-bold text-zinc-700 dark:text-zinc-200">{alu.nombre}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">{alu.email}</td>
                                                        <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                                                            <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md text-[11px] font-medium border border-zinc-200 dark:border-zinc-700">
                                                                {alu.grado}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleApproveAlumno(alu.id)}
                                                                className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 ml-auto"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">verified</span>
                                                                Aprobar Acceso
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── PESTAÑA: RESUMEN ───────────────────────────────────────────────────
              Vista principal del dashboard con:
                · Columna izquierda (flex-1): KPIs del resumen (DashboardMetrics)
                                              + tabla de alumnos activos
                                              + panel de alertas recientes
                · Columna derecha (w-80): lista de empresas colaboradoras */}
                    {activeTab === 'resumen' && (
                        <div className="flex flex-col lg:flex-row gap-8">
                            <div className="flex-1 flex flex-col gap-8 animate-in fade-in duration-300">
                                {/* KPI Cards */}
                                <DashboardMetrics stats={stats} />

                                {/* Welcome / Quick Actions */}
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="size-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <span className="material-symbols-outlined text-[28px]">rocket_launch</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-zinc-800 dark:text-white tracking-tight">Panel de Control General</h3>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Accesos rápidos a las funciones principales de tu centro</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button onClick={() => setActiveTab('solicitudes')} className="flex items-start gap-4 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all text-left group">
                                            <div className="size-10 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 group-hover:border-transparent group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all">
                                                <span className="material-symbols-outlined text-[20px]">person_add</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">Solicitudes</h4>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Revisa y valida accesos vacantes.</p>
                                            </div>
                                        </button>
                                        <button onClick={() => setActiveTab('alumnos')} className="flex items-start gap-4 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 hover:border-emerald-200 dark:hover:border-emerald-500/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all text-left group">
                                            <div className="size-10 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 group-hover:border-transparent group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-all">
                                                <span className="material-symbols-outlined text-[20px]">groups</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">Gestión Alumnado</h4>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Supervisa expedientes activos.</p>
                                            </div>
                                        </button>
                                        <button onClick={() => setActiveTab('empresas')} className="flex items-start gap-4 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 hover:border-amber-200 dark:hover:border-amber-500/30 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition-all text-left group">
                                            <div className="size-10 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 group-hover:border-transparent group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-all">
                                                <span className="material-symbols-outlined text-[20px]">business</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">Red de Empresas</h4>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Revisa centros de trabajo.</p>
                                            </div>
                                        </button>
                                        <button onClick={() => setActiveTab('mensajes')} className="flex items-start gap-4 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 hover:border-sky-200 dark:hover:border-sky-500/30 hover:bg-sky-50/50 dark:hover:bg-sky-500/5 transition-all text-left group">
                                            <div className="size-10 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:bg-sky-100 dark:group-hover:bg-sky-500/20 group-hover:border-transparent group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-all">
                                                <span className="material-symbols-outlined text-[20px]">chat</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">Mensajería FCT</h4>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Conecta con tutores empresa.</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Alerts Sidebar */}
                            <div className="w-full lg:w-80 flex flex-col gap-6 animate-in fade-in slide-in-from-right duration-500 delay-300">
                                <div className="bg-white dark:bg-background-dark rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className="material-symbols-outlined text-amber-500">warning</span>
                                        <h3 className="font-bold dark:text-white">Alertas Recientes</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {notificaciones.filter(n => !n.leida).length === 0 ? (
                                            <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 border-2 border-dashed border-zinc-100 dark:border-zinc-800/50 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/20">
                                                <div className="size-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    <span className="material-symbols-outlined text-2xl text-zinc-300 dark:text-zinc-600">notifications_off</span>
                                                </div>
                                                <p className="text-sm font-bold">Sin alertas</p>
                                                <p className="text-xs mt-1">Has despachado todas las acciones</p>
                                            </div>
                                        ) : (
                                            notificaciones.filter(n => !n.leida).slice(0, 5).map(n => {
                                                const bgColors: Record<string, string> = {
                                                    'error': 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 group-hover:border-red-200 dark:group-hover:border-red-500/40',
                                                    'warning': 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 group-hover:border-amber-200 dark:group-hover:border-amber-500/40',
                                                    'success': 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 group-hover:border-emerald-200 dark:group-hover:border-emerald-500/40',
                                                };
                                                const textColors: Record<string, string> = {
                                                    'error': 'text-red-900 dark:text-red-400',
                                                    'warning': 'text-amber-900 dark:text-amber-400',
                                                    'success': 'text-emerald-900 dark:text-emerald-400',
                                                };
                                                const subtextColors: Record<string, string> = {
                                                    'error': 'text-red-700 dark:text-red-300/70',
                                                    'warning': 'text-amber-700 dark:text-amber-300/70',
                                                    'success': 'text-emerald-700 dark:text-emerald-300/70',
                                                };
                                                const iconColors: Record<string, string> = {
                                                    'error': 'text-red-600 dark:text-red-400',
                                                    'warning': 'text-amber-600 dark:text-amber-400',
                                                    'success': 'text-emerald-600 dark:text-emerald-400',
                                                };

                                                const isWarning = n.type === 'error' || n.type === 'warning';
                                                const isSuccess = n.type === 'success';
                                                const containerClass = `flex gap-4 p-4 rounded-xl border group transition-all cursor-pointer relative shadow-sm ${isWarning ? bgColors['error'] : isSuccess ? bgColors['success'] : 'bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-100 dark:border-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/30'
                                                    }`;

                                                return (
                                                    <div key={n.id} onClick={() => {
                                                        handleReadNotification(n.id);
                                                        if (n.title.includes('Nuevo Alumno') || n.action === 'Aprobar acceso') setActiveTab('solicitudes');
                                                        if (n.title.includes('Validación Requerida') || n.action === 'Validar alumno') setActiveTab('alumnos');
                                                        if (n.title.includes('Nueva Hoja de Diario') || n.action === 'Revisar Diario' || n.title.includes('Diario de Prácticas')) {
                                                            const match = n.desc.match(/alumno (.*?) ha guardado/i) || n.desc.match(/estudiante (.*?) ha editado/i);
                                                            if (match && match[1]) {
                                                                const studentName = match[1].trim();
                                                                const found = alumnos.find(a => a.nombre.toLowerCase().includes(studentName.toLowerCase()));
                                                                if (found) {
                                                                    setActiveTab('alumnos');
                                                                    setModalTab('diario');
                                                                    handleOpenDetailModal(found.id);
                                                                } else {
                                                                    setActiveTab('alumnos');
                                                                }
                                                            } else {
                                                                setActiveTab('alumnos');
                                                            }
                                                        }
                                                    }} className={containerClass}>
                                                        {n.leida === false && <span className="absolute top-2 right-2 size-2 bg-indigo-500 rounded-full animate-pulse"></span>}
                                                        <span className={`material-symbols-outlined text-[20px] shrink-0 ${isWarning ? iconColors['error'] : isSuccess ? iconColors['success'] : 'text-indigo-600 dark:text-indigo-400'}`}>{n.icon || 'notification_important'}</span>
                                                        <div className="pr-4">
                                                            <p className={`text-sm font-bold leading-tight mb-1 ${isWarning ? textColors['error'] : isSuccess ? textColors['success'] : 'text-indigo-900 dark:text-indigo-400'}`}>{n.title}</p>
                                                            <p className={`text-[11px] leading-relaxed line-clamp-2 ${isWarning ? subtextColors['error'] : isSuccess ? subtextColors['success'] : 'text-zinc-600 dark:text-zinc-400'}`}>{n.desc}</p>
                                                            {n.action && <button className={`text-[11px] font-bold mt-2 hover:underline ${isWarning ? iconColors['error'] : isSuccess ? iconColors['success'] : 'text-indigo-600 dark:text-indigo-400'}`}>{n.action}</button>}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <button className="w-full mt-6 text-xs font-bold text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-center border-t border-zinc-100 dark:border-zinc-800 pt-4">Ir a Historial Completado</button>
                                </div>

                                {/* Quick Tools */}
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 rounded-2xl p-6 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <h4 className="font-bold mb-2 flex items-center gap-2 tracking-tight">
                                            <span className="material-symbols-outlined text-lg">support_agent</span>
                                            Centro de Ayuda
                                        </h4>
                                        <p className="text-xs text-indigo-100 opacity-90 mb-6 leading-relaxed">Resuelve dudas sobre documentación FCT y permisos curriculares.</p>
                                        <button onClick={() => setIsGuideModalOpen(true)} className="w-full bg-white text-indigo-700 py-2.5 rounded-xl text-xs font-black shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all">
                                            Guía del Tutor
                                        </button>
                                    </div>
                                    <div className="absolute -bottom-8 -right-8 size-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                    <div className="absolute -top-12 -left-12 size-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500 delay-100"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── PESTAÑA: ALUMNADO ──────────────────────────────────────────────────
              Tabla completa de alumnos activos (isAprobado=true).
              El componente AlumnosTable recibe callbacks para:
                · onOpenDetailModal  → ver expediente del alumno
                · onOpenOfferModal   → ver detalle de la oferta de prácticas
                · onOpenValModal     → abrir wizard de firma del convenio
                · onRemoveAlumno     → desvincular alumno del tutor */}
                    {activeTab === 'alumnos' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    <SkeletonCard count={3} />
                                </div>
                            ) : alumnos.filter(a => a.isAprobado !== false).length === 0 ? (
                                <EmptyState 
                                    icon="group" 
                                    title="Panel Vacío" 
                                    description="Aún no hay alumnos asignados a tu tutoría." 
                                />
                            ) : (
                                <AlumnosTable
                                    alumnos={alumnos}
                                    loading={loading}
                                    onRemoveAlumno={handleRemoveAlumno}
                                    onOpenDetailModal={handleOpenDetailModal}
                                    onOpenOfferModal={async (id) => {
                                        await handleOpenDetailModal(id);
                                        setIsDetailModalOpen(false);
                                        setIsOfferModalOpen(true);
                                    }}
                                    onOpenValModal={handleOpenValModal}
                                />
                            )}
                        </div>
                    )}

                    {/* ── PESTAÑA: MENSAJERÍA ────────────────────────────────────────────────
              Renderiza el componente de chat interno entre roles.
              No tiene padding ni scroll porque el ChatSystem gestiona
              su propio layout 100% h-full internamente.
              El tutor puede comunicarse con tutores de empresa y alumnos. */}
                    {activeTab === 'mensajes' && (
                        <div className="h-full w-full animate-in fade-in duration-500">
                            <ChatSystem />
                        </div>
                    )}

                    {/* ── PESTAÑA: RED DE EMPRESAS ────────────────────────────────────────────
              Grid de tarjetas de empresas colaboradoras (datos de estado empresas[]).
              Cada tarjeta muestra: logo, nombre, CIF, email y nº de alumnos.
              Botón "Ver Empresa" → handleOpenCompanyModal() → modal con lista de alumnos
              Desde ese modal se puede navegar al perfil completo de la empresa. */}
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
                                    ) : empresas.map((emp, i) => (
                                        <div key={i} className="group p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-600/30 transition-all hover:shadow-xl hover:shadow-indigo-600/5">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="size-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-600 border border-slate-100 dark:border-slate-800 shadow-sm transition-transform group-hover:scale-110 overflow-hidden">
                                                    {emp.logo ? (
                                                        <img
                                                            src={assetUrl(emp.logo)}
                                                            alt={emp.nombre}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${emp.nombre}&background=6366f1&color=fff&size=200`;
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-3xl">business</span>
                                                    )}
                                                </div>
                                                <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/10 text-indigo-600 text-[10px] font-black rounded-full uppercase">
                                                    {emp.alumnosCount} {emp.alumnosCount === 1 ? 'Alumno' : 'Alumnos'}
                                                </span>
                                            </div>
                                            <h4 className="text-lg font-black dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">{emp.nombre}</h4>
                                            <p className="text-xs text-slate-400 font-semibold tracking-wide mb-4">CIF: {emp.cif}</p>

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

                                            <div className="grid grid-cols-2 gap-3 mt-6">
                                                <button
                                                    onClick={() => handleOpenCompanyModal(emp)}
                                                    className="py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                                                    <span className="material-symbols-outlined text-[16px]">groups</span>
                                                    Alumnos
                                                </button>
                                                <button
                                                    onClick={() => handleViewCompanyProfile(emp.email)}
                                                    className="py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
                                                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                    Perfil
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                    }
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── PESTAÑA: NORMATIVA Y DOCUMENTACIÓN ───────────────────────────────
              Muestra documentación oficial de FCT: normativa, guias y plantillas.
              Botón de descarga de convenio genérico disponible cuando el
              alumno tiene estado VALIDADO (el PDF ya existe en el servidor). */}
                    {activeTab === 'documentacion' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                            <div className="bg-white dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-600">description</span>
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
                                            ) :
                                                alumnos.filter(a => a.status === 'VALIDADO').map((alu) => (
                                                    <tr key={alu.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="size-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
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
                                                                    onClick={() => window.open(apiUrl(`/api/tutor/candidaturas/${alu.candidatura_id}/convenio`), '_blank')}
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
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── MODAL: VALIDACIÓN DEL CONVENIO FCT ──────────────────────────────
            Wizard de 2 pasos para que el tutor académico valide el convenio:
              · Paso 1: Revisión de datos del alumno (empresa, horario, duración)
              · Paso 2: Captura de firma digital mediante canvas (SignaturePad)
            Al completar, se llama handleValidar() que envía la firma al backend
            y cambia el estado de la candidatura a 'VALIDADO'.
            Condición de apertura: isValModalOpen=true AND alumnoToVal ≠ null */}
                {isValModalOpen && alumnoToVal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-emerald-500 to-teal-600 text-white">
                                <h3 className="text-2xl font-black flex items-center gap-3">
                                    <span className="material-symbols-outlined text-3xl">assignment_turned_in</span>
                                    {valStep === 1 ? 'Validar Proyecto' : 'Firma Digital'}
                                </h3>
                                <p className="opacity-90 text-sm mt-1">
                                    {valStep === 1 ? 'Revisa los detalles antes de generar el convenio' : 'Firma manuscrita para formalizar el acuerdo'}
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
                                        // Paso 1 → avanzar a la firma; Paso 2 → enviar validación al backend
                                        if (valStep === 1) setValStep(2);
                                        else handleValidar();
                                    }}
                                    // Deshabilitar si está procesando o si aún no hay firma en el paso 2
                                    disabled={isSubmitting || (valStep === 2 && !signature)}
                                    className="flex-2 py-3 bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Procesando...' : (valStep === 1 ? 'Siguiente paso' : 'Confirmar y Validar')}
                                    <span className="material-symbols-outlined text-[20px]">
                                        {valStep === 1 ? 'arrow_forward' : 'verified'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MODAL: EXPEDIENTE ACADÉMICO DEL ALUMNO ──────────────────────────────
            Muestra el perfil completo del alumno seleccionado en dos pestañas:
              · "Expediente General": datos personales, candidatura, habilidades, CV
              · "Diario de Prácticas": bitácora mensual con validación por entrada
            La pestaña de diario solo está habilitada si la candidatura está VALIDADO.
            Condición de apertura: isDetailModalOpen=true
            Datos: studentDetail (cargado por handleOpenDetailModal) */}
                {isDetailModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 lg:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-6xl max-h-[95vh] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-bottom-10 duration-500">
                            {detailLoading ? (
                                <div className="p-20">
                                    <SkeletonCard count={1} />
                                </div>
                            ) : studentDetail && (
                                <>
                                    {/* Header Premium */}
                                    <div className="relative p-6 lg:p-8 overflow-hidden shrink-0">
                                        {/* Background Decor */}
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                                        <div className="relative flex justify-between items-start gap-4">
                                            <div className="flex gap-4 lg:gap-8 items-center">
                                                <div className="relative group/photo">
                                                    <div className="absolute -inset-1.5 bg-linear-to-r from-indigo-600 to-purple-600 rounded-[2rem] blur opacity-20 group-hover/photo:opacity-40 transition duration-1000"></div>
                                                    <div className="relative size-28 rounded-3xl bg-white dark:bg-zinc-800 flex items-center justify-center text-indigo-600 text-4xl font-black shadow-2xl border border-white dark:border-zinc-700 overflow-hidden">
                                                        {studentDetail.foto ? (
                                                            <img src={assetUrl(`/uploads/fotos/${studentDetail.foto}`)} className="w-full h-full object-cover" alt="Perfil" />
                                                        ) : (
                                                            studentDetail.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-1">
                                                        <h3 className="text-xl lg:text-3xl font-black dark:text-white tracking-tight">{studentDetail.nombre}</h3>
                                                        <span className="px-2 py-0.5 lg:px-2.5 lg:py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] lg:text-[10px] font-semibold tracking-wide rounded-full border border-emerald-500/20">
                                                            Activo 2026/27
                                                        </span>
                                                    </div>
                                                    <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm lg:text-base uppercase tracking-wider mb-2 lg:mb-3">{studentDetail.grado}</p>
                                                    <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-zinc-500 dark:zinc-400 text-[10px] lg:text-sm">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[16px] lg:text-[18px] opacity-70">mail</span>
                                                            {studentDetail.email}
                                                        </div>
                                                        <div className="hidden min-[450px]:flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-700 pl-3 lg:pl-4 py-0.5">
                                                            <span className="material-symbols-outlined text-[16px] lg:text-[18px] opacity-70 text-indigo-500 font-icon-fill">verified_user</span>
                                                            <span className="font-bold">Verificado</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setIsDetailModalOpen(false)}
                                                className="z-10 size-10 lg:size-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center transition-all group hover:rotate-90 shrink-0"
                                            >
                                                <span className="material-symbols-outlined text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">close</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tabs polished */}
                                    <div className="px-6 lg:px-8 mt-2 lg:mt-4 flex gap-4 lg:gap-8 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                                        {/* Pestaña 1: Información general del alumno (siempre accesible) */}
                                        <button
                                            onClick={() => setModalTab('info')}
                                            className={`py-4 text-xs font-semibold tracking-wide tracking-[0.2em] relative transition-all ${modalTab === 'info' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                                        >
                                            Expediente General
                                            {modalTab === "info" && <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 dark:bg-indigo-400 rounded-t-full shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>}
                                        </button>
                                        {/* Pestaña 2: Diario de prácticas — solo accesible cuando la candidatura está VALIDADO */}
                                        <button
                                            onClick={() => studentDetail?.candidatura?.estado === 'VALIDADO' && setModalTab('diario')}
                                            title={studentDetail?.candidatura?.estado !== 'VALIDADO' ? 'Disponible cuando se genere el convenio' : ''}
                                            className={`py-4 text-xs font-semibold tracking-wide tracking-[0.2em] relative transition-all ${studentDetail?.candidatura?.estado !== "VALIDADO" ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed" : modalTab === "diario" ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"}`}
                                        >
                                            Diario de Prácticas
                                            {studentDetail?.candidatura?.estado !== "VALIDADO" && (
                                                <span className="ml-2 text-[8px] bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Sin convenio</span>
                                            )}
                                            {modalTab === "diario" && <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 dark:bg-indigo-400 rounded-t-full shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>}
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
                                        {modalTab === 'info' ? (
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                                {/* Left: Global Info & Documents */}
                                                <div className="md:col-span-5 flex flex-col gap-4 lg:gap-6">
                                                    {/* Habilidades - Estilo Moderno */}
                                                    <section className="bg-zinc-50 dark:bg-zinc-800/20 p-5 rounded-[28px] border border-zinc-100 dark:border-zinc-800/50">
                                                        <div className="flex items-center gap-3 mb-5">
                                                            <div className="size-8 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                                                                <span className="material-symbols-outlined text-[18px]">psychology</span>
                                                            </div>
                                                            <h4 className="font-black text-zinc-400 text-[10px] uppercase tracking-[0.2em]">Stack Tecnológico</h4>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {studentDetail.habilidades?.split(',').map((skill: string, i: number) => (
                                                                <span key={i} className="px-4 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 shadow-xs hover:border-indigo-500/50 hover:bg-indigo-50/10 transition-all cursor-default">
                                                                    {skill.trim()}
                                                                </span>
                                                            )) || <p className="text-[11px] text-zinc-400 italic font-medium px-2">No se han definido habilidades específicas.</p>}
                                                        </div>
                                                    </section>

                                                    {/* Documentación y Estado */}
                                                    <section className="space-y-4">
                                                        <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-200 dark:border-zinc-800 p-6 lg:p-7 space-y-6 shadow-xl relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                                                <span className="material-symbols-outlined text-7xl font-light">fact_check</span>
                                                            </div>

                                                            <div className="space-y-6 relative">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Información Contractual</p>
                                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-semibold tracking-wideer border shadow-xs ${studentDetail.candidatura?.estado === 'VALIDADO' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                                        <span className={`size-1.5 rounded-full animate-pulse ${studentDetail.candidatura?.estado === 'VALIDADO' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                                                        {studentDetail.candidatura?.estado || 'Sin Solicitud'}
                                                                    </span>
                                                                </div>

                                                                <div className="p-5 bg-zinc-50 dark:bg-zinc-800/40 rounded-3xl border border-zinc-100 dark:border-zinc-700/50">
                                                                    <p className="text-[9px] font-black text-zinc-400 uppercase mb-2">Empresa Colaboradora</p>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="size-12 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                                                            <span className="material-symbols-outlined text-2xl">business</span>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-black text-zinc-800 dark:text-white leading-tight">{studentDetail.candidatura?.empresa || 'Empresa No Asignada'}</p>
                                                                            <p className="text-[10px] text-zinc-500 font-medium">Convenio de Formación Dual</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3">
                                                                {studentDetail.cv && (
                                                                    <button
                                                                        onClick={() => window.open(assetUrl(`/uploads/cv/${studentDetail.cv}`), '_blank')}
                                                                        className="w-full flex items-center justify-between px-6 py-4 bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-semibold tracking-wide rounded-[22px] hover:bg-black dark:hover:bg-zinc-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-zinc-900/10 group"
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="size-8 bg-white/10 rounded-xl flex items-center justify-center">
                                                                                <span className="material-symbols-outlined text-white/50 group-hover:text-white transition-colors">description</span>
                                                                            </div>
                                                                            Descargar CV
                                                                        </div>
                                                                        <span className="material-symbols-outlined text-[18px] opacity-40 group-hover:opacity-100">download</span>
                                                                    </button>
                                                                )}

                                                                {studentDetail.candidatura?.estado === 'VALIDADO' && (
                                                                    <button
                                                                        onClick={() => window.open(apiUrl(`/api/tutor/candidaturas/${studentDetail.candidatura.id}/convenio`), '_blank')}
                                                                        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white text-xs font-semibold tracking-wide rounded-[22px] hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-600/30 group"
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="size-8 bg-white/10 rounded-xl flex items-center justify-center">
                                                                                <span className="material-symbols-outlined text-white">verified_user</span>
                                                                            </div>
                                                                            Anexo Formación
                                                                        </div>
                                                                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </section>
                                                </div>

                                                {/* Right: Timeline & Dashboard Stats */}
                                                <div className="md:col-span-7 flex flex-col gap-4 lg:gap-6">
                                                    <section className="bg-zinc-900 text-white p-6 lg:p-8 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col min-h-[380px] lg:min-h-[420px] justify-between group">
                                                        {/* Decorative Background */}
                                                        <div className="absolute -top-10 -right-10 size-64 bg-indigo-500/20 rounded-full blur-[80px] group-hover:bg-indigo-400/30 transition-all duration-700"></div>
                                                        <div className="absolute -bottom-10 -left-10 size-64 bg-blue-500/10 rounded-full blur-[80px]"></div>

                                                        {studentDetail.candidatura?.estado === 'VALIDADO' ? (
                                                            <>
                                                                <div className="relative">
                                                                    <div className="flex items-center gap-3 mb-4 lg:mb-6">
                                                                        <div className="size-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                                                                            <span className="material-symbols-outlined text-indigo-400">event_repeat</span>
                                                                        </div>
                                                                        <h4 className="font-black text-[11px] uppercase tracking-[0.3em] text-zinc-400">Cronograma FCT</h4>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 items-center bg-white/5 p-6 lg:p-7 rounded-[28px] border border-white/10 backdrop-blur-md">
                                                                        <div className="space-y-2">
                                                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Fecha Inicio</p>
                                                                            <div className="flex items-end gap-2">
                                                                                <span className="text-4xl font-black">{new Date(studentDetail.candidatura.fechaInicio).getDate()}</span>
                                                                                <div className="pb-1">
                                                                                    <p className="text-[10px] font-semibold tracking-wide leading-none opacity-50">{new Date(studentDetail.candidatura.fechaInicio).toLocaleDateString('es-ES', { month: 'short' })}</p>
                                                                                    <p className="text-[10px] font-black leading-none opacity-30 mt-0.5">{new Date(studentDetail.candidatura.fechaInicio).getFullYear()}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-2 sm:text-right border-t sm:border-t-0 sm:border-l border-white/10 pt-6 sm:pt-0 sm:pl-8">
                                                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Fecha Fin Prevista</p>
                                                                            <div className="flex items-end gap-2 sm:justify-end">
                                                                                <div className="pb-1 text-right">
                                                                                    <p className="text-[10px] font-semibold tracking-wide leading-none opacity-50">{new Date(studentDetail.candidatura.fechaFin).toLocaleDateString('es-ES', { month: 'short' })}</p>
                                                                                    <p className="text-[10px] font-black leading-none opacity-30 mt-0.5">{new Date(studentDetail.candidatura.fechaFin).getFullYear()}</p>
                                                                                </div>
                                                                                <span className="text-4xl font-black">{new Date(studentDetail.candidatura.fechaFin).getDate()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mt-8 lg:mt-10 space-y-3">
                                                                        <div className="flex justify-between items-end mb-2">
                                                                            <p className="text-[11px] font-semibold tracking-wide text-zinc-400">Progreso Temporal</p>
                                                                            <p className="text-[11px] font-black text-indigo-400">VÍNCULO ACTIVO</p>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <TimeProgress start={studentDetail.candidatura.fechaInicio} end={studentDetail.candidatura.fechaFin} />
                                                                        </div>
                                                                        <div className="flex justify-between pt-2">
                                                                            <p className="text-[9px] font-semibold tracking-wide text-white/30 tracking-tighter italic">Validado por Tutor Docente</p>
                                                                            <p className="text-[9px] font-semibold tracking-wide text-white/30 tracking-tighter italic">Responsable Empresa</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3 mt-6 lg:mt-8 relative">
                                                                    <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-white/5 rounded-[22px] border border-white/10 hover:bg-white/10 transition-colors">
                                                                        <div className="size-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                                            <span className="material-symbols-outlined text-[20px]">timelapse</span>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Duración</p>
                                                                            <p className="text-sm font-black text-white capitalize">{studentDetail.candidatura.tipoDuracion.replace('_', ' ')}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 p-5 bg-white/5 rounded-[24px] border border-white/10 hover:bg-white/10 transition-colors">
                                                                        <div className="size-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                                            <span className="material-symbols-outlined text-[20px]">watch_later</span>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Jornada</p>
                                                                            <p className="text-sm font-black text-white capitalize">{studentDetail.candidatura.horario}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center px-12 space-y-6">
                                                                <div className="size-24 bg-white/5 border border-white/10 rounded-[32px] flex items-center justify-center text-zinc-700">
                                                                    <span className="material-symbols-outlined text-5xl font-light">calendar_today</span>
                                                                </div>
                                                                <div>
                                                                    <h5 className="font-black text-2xl text-white tracking-tight uppercase">Planificación Pendiente</h5>
                                                                    <p className="text-xs font-medium text-zinc-400 mt-3 leading-relaxed max-w-sm mx-auto uppercase tracking-tighter opacity-70">
                                                                        El cronograma y las métricas de seguimiento se habilitarán cuando la situación administrativa del alumno sea "Validada".
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </section>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <h4 className="font-black text-zinc-400 text-[10px] uppercase tracking-[0.2em] mb-1">Bitácora de Seguimiento</h4>
                                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Registro detallado de actividades y competencias adquiridas</p>
                                                    </div>
                                                    <div className="relative group">
                                                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 blur-sm opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                                        <div className="relative px-5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-white text-xs font-black shadow-sm flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-indigo-600">analytics</span>
                                                            AVANCE FCT: {diarioEntries.filter(e => e.estado === 'APROBADO').reduce((acc, curr: any) => acc + curr.horas, 0)}h / 370h
                                                        </div>
                                                    </div>
                                                </div>

                                                {loadingDiario ? (
                                                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                                                        <span className="material-symbols-outlined animate-spin text-indigo-600 text-5xl">progress_activity</span>
                                                        <p className="text-xs font-semibold tracking-wide text-zinc-400">Sincronizando diario...</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-10">
                                                        <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col">
                                                            <div className="p-8 bg-linear-to-r from-indigo-800 via-indigo-600 to-indigo-900 text-white flex items-center justify-between">
                                                                <div className="flex items-center gap-6">
                                                                    <div className="flex items-center gap-2">
                                                                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="size-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 hover:scale-110 active:scale-90 transition-all border border-white/10 group">
                                                                            <span className="material-symbols-outlined text-lg group-hover:-translate-x-0.5 transition-transform">chevron_left</span>
                                                                        </button>
                                                                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="size-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 hover:scale-110 active:scale-90 transition-all border border-white/10 group">
                                                                            <span className="material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                                                                        </button>
                                                                    </div>
                                                                    <div>
                                                                        <h3 className="text-xl font-black tracking-tight uppercase drop-shadow-sm">{currentMonth.toLocaleDateString('es-ES', { month: 'long' })}</h3>
                                                                        <p className="text-[10px] font-semibold tracking-wide tracking-[0.2em] opacity-60 leading-none mt-1">{currentMonth.getFullYear()}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10 flex items-center gap-2">
                                                                        <div className="size-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                                                                        <span className="text-[9px] font-semibold tracking-wide leading-none">Acceso en Vivo</span>
                                                                    </div>
                                                                    <button onClick={() => setCurrentMonth(new Date())} className="px-6 py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-semibold tracking-wide hover:bg-indigo-50 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10">Hoy</button>
                                                                </div>
                                                            </div>

                                                            <div className="overflow-x-auto pb-4 custom-scrollbar-horizontal">
                                                                <div className="min-w-[700px]">
                                                                    <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                                                                        {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map(d => (
                                                                            <div key={d} className={`p-3 text-center text-[9px] font-semibold tracking-wide ${d === 'sáb' || d === 'dom' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400' : 'text-zinc-500'}`}>{d}</div>
                                                                        ))}
                                                                    </div>

                                                                    <div className="grid grid-cols-7 auto-rows-[120px] md:auto-rows-[160px]">
                                                                        {getDaysInMonth(currentMonth).map((day, idx) => {
                                                                            if (!day) return <div key={`empty-${idx}`} className="border-r border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/20"></div>;
                                                                            const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                                                                            const holiday = HOLIDAYS_ANDALUCIA_2026[dateStr];
                                                                            const entry = diarioEntries.find((e: any) => e.fecha === dateStr);
                                                                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                                                            const isToday = new Date().toDateString() === day.toDateString();
                                                                            const withinRange = isWithinRange(day);

                                                                            return (
                                                                                <div
                                                                                    key={dateStr}
                                                                                    onClick={() => {
                                                                                        setSelectedDayInfo({ day, entry, holiday });
                                                                                    }}
                                                                                    className={`p-2 md:p-4 border-r border-b border-zinc-100 dark:border-zinc-800 relative group transition-all duration-300 cursor-pointer ${isWeekend ? 'bg-zinc-50/50 dark:bg-zinc-800/20' : 'bg-white dark:bg-zinc-900'} ${!withinRange ? 'opacity-20 grayscale-[0.5]' : ''} hover:bg-zinc-50 dark:hover:bg-zinc-800/50`}
                                                                                >
                                                                                    <div className="flex justify-between items-start mb-1 md:mb-3">
                                                                                        <span className={`text-[10px] md:text-xs font-black size-6 md:size-7 flex items-center justify-center rounded-xl transition-all ${isToday ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white shadow-lg shadow-indigo-600/30' : holiday ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>{day.getDate()}</span>
                                                                                        {entry && (
                                                                                            <div className="flex gap-1">
                                                                                                <span className={`size-1.5 md:size-2 rounded-full ${entry.estado === 'APROBADO' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-bounce'}`}></span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="flex flex-col gap-1 md:gap-2">
                                                                                        {holiday ? (
                                                                                            <div className="px-1.5 py-0.5 bg-red-100 dark:bg-red-500/10 rounded-lg text-red-600 dark:text-red-400 text-[6px] md:text-[8px] font-semibold tracking-wideer truncate">
                                                                                                {holiday.label}
                                                                                            </div>
                                                                                        ) : (withinRange && !isWeekend) ? (
                                                                                            entry ? (() => {
                                                                                                const { modality, cleanText } = parseActivity(entry.actividad);
                                                                                                const isPresencial = modality === 'PRESENCIAL';
                                                                                                const colorClass = entry.estado === 'APROBADO'
                                                                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                                                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';

                                                                                                return (
                                                                                                    <div className={`p-1.5 md:p-2.5 rounded-xl md:rounded-2xl border transition-all duration-300 group-hover:-translate-y-1 shadow-sm group-hover:shadow-md ${colorClass}`}>
                                                                                                        <div className="flex justify-between items-center mb-0.5 md:mb-1.5">
                                                                                                            <span className="text-[8px] md:text-[10px] font-semibold tracking-wideer">{entry.horas}h</span>
                                                                                                            <span className="material-symbols-outlined text-[10px] md:text-[14px] opacity-60">
                                                                                                                {isPresencial ? 'business' : 'home_work'}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <p className="text-[6px] md:text-[8px] font-bold leading-tight line-clamp-1 md:line-clamp-2 opacity-80">
                                                                                                            {cleanText}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                );
                                                                                            })() : (
                                                                                                <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                                                                    <div className="size-6 md:size-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                                                                                        <span className="material-symbols-outlined text-zinc-300 text-xs md:text-sm">add_circle</span>
                                                                                                    </div>
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

                                                            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/30 flex flex-wrap gap-6 items-center border-t border-zinc-100 dark:border-zinc-800">
                                                                <div className="flex items-center gap-2"><div className="size-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div><span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Pendiente registro</span></div>
                                                                <div className="flex items-center gap-2"><div className="size-2.5 bg-amber-500 rounded-full ring-4 ring-amber-500/10"></div><span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Registrado</span></div>
                                                                <div className="flex items-center gap-2"><div className="size-2.5 bg-emerald-500 rounded-full ring-4 ring-emerald-500/10"></div><span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Validado</span></div>
                                                                <div className="flex items-center gap-2"><div className="size-2.5 bg-red-400 rounded-full"></div><span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Festivo</span></div>
                                                            </div>
                                                        </div>

                                                        {diarioEntries.length === 0 ? (
                                                            <div className="text-center py-24 bg-white dark:bg-zinc-800/20 rounded-[40px] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                                                                <div className="size-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-300">
                                                                    <span className="material-symbols-outlined text-5xl">history_edu</span>
                                                                </div>
                                                                <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Pendiente de Registro</p>
                                                                <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-2">El alumno aún no ha iniciado sesión o no ha volcado su primera actividad en la bitácora.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4 relative">
                                                                {/* Activity list refined */}
                                                                {diarioEntries.map((entry: any) => (
                                                                    <div
                                                                        key={entry.id}
                                                                        id={`entry-${entry.id}`}
                                                                        className="bg-white dark:bg-zinc-800 p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800 group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 scroll-mt-6"
                                                                    >
                                                                        <div className="flex flex-col md:flex-row justify-between gap-6">
                                                                            <div className="flex-1 space-y-4">
                                                                                <div className="flex items-center gap-4">
                                                                                    <div className="size-12 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex flex-col items-center justify-center border border-zinc-100 dark:border-zinc-800 group-hover:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 transition-colors group">
                                                                                        <span className="text-[10px] font-black text-zinc-400 uppercase leading-none group-hover:text-white/70">
                                                                                            {new Date(entry.fecha).toLocaleDateString('es-ES', { month: 'short' })}
                                                                                        </span>
                                                                                        <span className="text-lg font-black text-zinc-800 dark:text-white leading-none group-hover:text-white">
                                                                                            {new Date(entry.fecha).toLocaleDateString('es-ES', { day: '2-digit' })}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="flex items-center gap-3">
                                                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide border ${entry.estado === 'APROBADO' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                                                entry.estado === 'RECHAZADO' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                                                }`}>{entry.estado}</span>
                                                                                            <div className="flex items-center gap-1.5 text-zinc-400 font-bold border-l pl-3 ml-1 border-zinc-100 dark:border-zinc-700">
                                                                                                <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
                                                                                                <span className="text-xs">{entry.horas}h declaradas</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <p className="text-zinc-500 text-[10px] font-bold mt-1 uppercase tracking-tight opacity-50">{new Date(entry.fecha).toLocaleDateString('es-ES', { weekday: 'long' })}</p>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="pl-16">
                                                                                    <div className="text-zinc-700 dark:text-zinc-200 text-sm leading-relaxed font-medium">
                                                                                        {renderActivity(entry.actividad)}
                                                                                    </div>

                                                                                    {entry.observaciones && (
                                                                                        <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border-l-4 border-indigo-500/30">
                                                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                                                <span className="material-symbols-outlined text-indigo-500 text-[16px]">chat_bubble_outline</span>
                                                                                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Feedback del Tutor</p>
                                                                                            </div>
                                                                                            <p className="text-xs italic text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">"{entry.observaciones}"</p>
                                                                                        </div>
                                                                                    )}

                                                                                    {entry.estado === 'PENDIENTE' && (
                                                                                        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-400 bg-zinc-50 dark:bg-zinc-900/50 p-4 lg:p-6 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                                                                            <div className="relative group">
                                                                                                <textarea
                                                                                                    placeholder="Escribe aquí tu corrección o mensaje de aprobación..."
                                                                                                    value={bitacoraFeedback[entry.id] || ''}
                                                                                                    onChange={(e) => setBitacoraFeedback({ ...bitacoraFeedback, [entry.id]: e.target.value })}
                                                                                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none shadow-xs transition-all"
                                                                                                    rows={2}
                                                                                                />
                                                                                            </div>
                                                                                            <div className="flex gap-3">
                                                                                                <button
                                                                                                    onClick={() => handleValidarDiario(entry.id, 'APROBADO')}
                                                                                                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold tracking-wide rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95"
                                                                                                >
                                                                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                                                                    Validar Jornada
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => handleValidarDiario(entry.id, 'RECHAZADO')}
                                                                                                    className="px-8 py-3.5 bg-white dark:bg-zinc-800 text-red-500 border border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 text-[10px] font-semibold tracking-wide rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95"
                                                                                                >
                                                                                                    <span className="material-symbols-outlined text-sm">cancel</span>
                                                                                                    Rechazar
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Premium */}
                                    <div className="p-4 lg:p-6 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                                        <div className="hidden sm:flex items-center gap-2 text-zinc-400 text-[10px] font-semibold tracking-wide">
                                            <span className="material-symbols-outlined text-[18px]">shield</span>
                                            Protegido por Sistema EduConect
                                        </div>
                                        <button
                                            onClick={() => setIsDetailModalOpen(false)}
                                            className="w-full sm:w-auto px-6 lg:px-10 py-3 lg:py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-[10px] lg:text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Cerrar Expediente
                                        </button>
                                    </div>

                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ── MODAL: DETALLE DE LA OFERTA FCT ────────────────────────────────────
            Muestra los detalles completos de la oferta a la que el alumno se postuló:
            título del puesto, descripción, ubicación, jornada y tecnologías requeridas.
            La oferta se accede desde AlumnosTable → onOpenOfferModal:
              1. Carga datos del alumno (handleOpenDetailModal)
              2. Cierra modal de detalle y abre este modal de oferta
            Condición: isOfferModalOpen=true AND studentDetail.candidatura.oferta ≠ null */}
                {isOfferModalOpen && studentDetail?.candidatura?.oferta && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-zinc-900 rounded-[44px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-500 max-h-[90vh]">

                            {/* Cabecera Visual con Hero Image (Estilo Alumno) */}
                            <div className="relative h-72 lg:h-80 shrink-0 overflow-hidden">
                                <img
                                    src={getOfferImage(studentDetail.candidatura.oferta)}
                                    alt={studentDetail.candidatura.oferta.titulo}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-zinc-900/95 via-zinc-900/30 to-transparent" />

                                {/* Badge de Disponibilidad */}
                                <div className="absolute top-8 left-8">
                                    <div className="px-5 py-2.5 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center gap-3 shadow-2xl">
                                        <div className="size-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Vacante Abierta</span>
                                    </div>
                                </div>

                                {/* Logo de Empresa (Miniatura flotante) */}
                                {studentDetail.candidatura.empresa_logo && (
                                    <div className="absolute top-8 right-8 size-16 lg:size-20 bg-white rounded-3xl p-3 shadow-2xl border border-white/20 flex items-center justify-center overflow-hidden group-hover:rotate-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10">
                                        <img
                                            src={assetUrl(`/uploads/logos/${studentDetail.candidatura.empresa_logo}`)}
                                            className="w-full h-full object-contain"
                                            alt="Empresa Logo"
                                        />
                                    </div>
                                )}

                                {/* Info Básica sobreimagen */}
                                <div className="absolute bottom-10 left-10 right-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <span 
                                            className="px-4 py-1.5 text-white text-[10px] font-semibold tracking-wide rounded-xl shadow-lg ring-1 ring-white/20"
                                            style={{ backgroundColor: getOfferColor(studentDetail.candidatura.oferta) }}
                                        >
                                            PRÁCTICAS
                                        </span>
                                        <span className="text-white/90 text-xs font-semibold tracking-wide flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">location_on</span>
                                            {studentDetail.candidatura.oferta.ubicacion}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-4xl lg:text-5xl text-white tracking-tighter leading-tight uppercase italic drop-shadow-2xl">
                                        {studentDetail.candidatura.oferta.titulo}
                                    </h3>
                                </div>

                                {/* Botón Cerrar Flotante */}
                                <button
                                    onClick={() => setIsOfferModalOpen(false)}
                                    className="absolute top-8 right-8 size-12 rounded-2xl bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all border border-white/10 active:scale-95 z-50 backdrop-blur-md"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-10 lg:p-14 space-y-12 overflow-y-auto custom-scrollbar flex-1">
                                {/* Título y Descripción Principal */}
                                <section className="space-y-6">
                                    <div className="space-y-3">
                                        <h4 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.4em]">Empresa Patrocinadora</h4>
                                        <p className="text-3xl lg:text-5xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter leading-none italic">
                                            {studentDetail.candidatura.empresa}
                                        </p>
                                    </div>
                                    
                                    <p className="text-xl lg:text-2xl font-black text-zinc-400 dark:text-zinc-500 italic leading-relaxed uppercase tracking-tight">
                                        "{studentDetail.candidatura.oferta.descripcion}"
                                    </p>
                                </section>

                                {/* Info Grid: Ubicación y Jornada */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="p-8 rounded-[40px] bg-indigo-50/40 dark:bg-indigo-500/5 border border-indigo-100/30 flex flex-col items-center text-center gap-4 transition-all hover:bg-white dark:hover:bg-zinc-800 shadow-sm hover:shadow-xl group">
                                        <div className="size-14 rounded-2xl bg-white dark:bg-zinc-800 shadow-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-2xl">schedule</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] opacity-60">Horario</p>
                                            <p className="text-sm lg:text-base font-black text-zinc-800 dark:text-zinc-100 uppercase leading-none">{studentDetail.candidatura.horario || '08:00 - 15:00'}</p>
                                        </div>
                                    </div>
                                    <div className="p-8 rounded-[40px] bg-purple-50/40 dark:bg-purple-500/5 border border-purple-100/30 flex flex-col items-center text-center gap-4 transition-all hover:bg-white dark:hover:bg-zinc-800 shadow-sm hover:shadow-xl group">
                                        <div className="size-14 rounded-2xl bg-white dark:bg-zinc-800 shadow-xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-2xl">event_repeat</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] opacity-60">Jornada</p>
                                            <p className="text-sm lg:text-base font-black text-zinc-800 dark:text-zinc-100 uppercase leading-none">{studentDetail.candidatura.oferta.jornada || 'FCT Estándar'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Stack Tecnológico Requerido */}
                                <section className="space-y-8 pb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-zinc-400">terminal</span>
                                        <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em]">Ecosistema Tecnológico</h4>
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        {(studentDetail.candidatura.oferta.tecnologias || 'Tecnologías Varias').split(',').map((tech: string, i: number) => (
                                            <div key={i} className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-semibold tracking-wide tracking-[0.2em] shadow-xl hover:-translate-y-1 transition-all cursor-default flex items-center gap-3 border border-white/10">
                                                <div className="size-1.5 bg-indigo-500 rounded-full"></div>
                                                {tech.trim()}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MODAL: ALUMNOS EN EMPRESA ───────────────────────────────────────────
            Muestra la lista de alumnos asignados a una empresa específica.
            Permite navegar rápidamente al detalle de cada alumno.
            Condición: selectedCompany ≠ null */}
                {selectedCompany && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-3xl max-h-[80vh] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-500">
                            {/* Modal Header */}
                            <div className="p-8 lg:p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Alumnado en {selectedCompany.nombre}</h2>
                                    <p className="text-xs text-slate-500 font-semibold tracking-wide mt-1">Supervisión de prácticas por empresa</p>
                                </div>
                                <button
                                    onClick={() => setSelectedCompany(null)}
                                    className="size-10 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-0 overflow-y-auto max-h-[60vh] custom-scrollbar">
                                {alumnos.filter(a => a.empresa === selectedCompany.nombre).length === 0 ? (
                                    <div className="p-12 text-center text-slate-500">
                                        <p>No hay alumnos asignados a esta empresa actualmente.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Desktop View */}
                                        <div className="hidden sm:block">
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
                                                    {alumnos.filter(a => a.empresa === selectedCompany.nombre).map((alu) => (
                                                        <tr key={alu.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-8 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="size-8 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/10 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
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
                                                                    className="text-indigo-600 hover:text-indigo-600/80 font-bold text-xs hover:underline"
                                                                >
                                                                    Ver Ficha
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* Mobile View */}
                                        <div className="sm:hidden p-4 space-y-4">
                                            {alumnos.filter(a => a.empresa === selectedCompany.nombre).map((alu) => (
                                                <div key={alu.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-800 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-10 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/10 rounded-xl flex items-center justify-center text-xs font-bold text-indigo-600">
                                                                {alu.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm dark:text-white truncate max-w-[120px]">{alu.nombre}</p>
                                                                <p className="text-[10px] text-slate-400">{alu.email}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${alu.status === 'VALIDADO' ? 'bg-green-50 text-green-600 border-green-200' :
                                                            alu.status === 'ADMITIDO' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                                'bg-slate-50 text-slate-500 border-slate-200'
                                                            }`}>
                                                            {alu.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{alu.grado}</p>
                                                        <button
                                                            onClick={async () => {
                                                                setSelectedCompany(null);
                                                                await handleOpenDetailModal(alu.id);
                                                            }}
                                                            className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest hover:underline"
                                                        >
                                                            Ver Ficha
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end">
                                <button
                                    onClick={() => setSelectedCompany(null)}
                                    className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-xl shadow-lg hover:scale-[1.02] transition-all"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MODAL: DETALLE DE JORNADA (CELDA DEL CALENDARIO) ──────────────────
            Se abre al hacer clic en cualquier día del calendario del diario.
            Muestra tres estados posibles:
              · Festivo: mensaje de día no laborable con el nombre del festivo
              · Con entrada: horas, estado y descripción de la actividad registrada
              · Sin entrada: aviso de pendiente de registro por el alumno
            Condición: selectedDayInfo ≠ null */}
                {selectedDayInfo && (
                    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md flex justify-center items-center z-[110] p-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
                            <div className="p-10 pb-6">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="size-20 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 rounded-[28px] flex flex-col items-center justify-center text-white shadow-2xl shadow-indigo-500/40">
                                            <span className="text-xs font-semibold tracking-wide opacity-70 leading-none mb-1">
                                                {selectedDayInfo.day.toLocaleDateString('es-ES', { month: 'short' })}
                                            </span>
                                            <span className="text-3xl font-black leading-none">
                                                {selectedDayInfo.day.toLocaleDateString('es-ES', { day: '2-digit' })}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Detalle de Actividad</h3>
                                            <p className="text-zinc-500 text-sm font-bold mt-1 uppercase tracking-widest">{selectedDayInfo.day.toLocaleDateString('es-ES', { weekday: 'long' })}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedDayInfo(null)}
                                        className="size-12 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-2xl flex items-center justify-center transition-all hover:rotate-90"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                {selectedDayInfo.holiday ? (
                                    <div className="p-8 bg-red-100 dark:bg-red-500/10 rounded-[32px] border border-red-200 dark:border-red-500/20 text-center space-y-4">
                                        <span className="material-symbols-outlined text-red-500 text-5xl">event_busy</span>
                                        <div>
                                            <p className="text-red-600 dark:text-red-400 font-black text-xl uppercase tracking-tight italic">
                                                Día Festivo: {selectedDayInfo.holiday.label}
                                            </p>
                                            <p className="text-red-700/60 dark:text-red-400/60 text-xs font-bold mt-2 uppercase tracking-widest">No se requiere registro de actividad oficial</p>
                                        </div>
                                    </div>
                                ) : selectedDayInfo.entry ? (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Horas Totales</p>
                                                <p className="text-2xl font-black text-zinc-900 dark:text-white">{selectedDayInfo.entry.horas}h <span className="text-sm font-bold text-indigo-500">Laboradas</span></p>
                                            </div>
                                            <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Estado Fichaje</p>
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide ${selectedDayInfo.entry.estado === 'APROBADO' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                                    }`}>
                                                    {selectedDayInfo.entry.estado}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Descripción de la Jornada</label>
                                            <div className="p-6 bg-zinc-50 dark:bg-zinc-950 rounded-[28px] border border-zinc-100 dark:border-zinc-800">
                                                <p className="text-zinc-700 dark:text-zinc-200 text-sm leading-relaxed font-medium italic">
                                                    "{selectedDayInfo.entry.actividad}"
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/10">
                                            <div className="size-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-500">
                                                <span className="material-symbols-outlined text-[20px]">psychology</span>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Modalidad</p>
                                                <p className="text-xs font-bold text-zinc-900 dark:text-white uppercase">Presencial / Teletrabajo Registrado</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-10 bg-zinc-50 dark:bg-zinc-800/50 rounded-[32px] border border-dashed border-zinc-300 dark:border-zinc-700 text-center space-y-4">
                                        <div className="size-16 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                                            <span className="material-symbols-outlined text-4xl">event_note</span>
                                        </div>
                                        <div>
                                            <p className="text-zinc-500 dark:text-zinc-400 font-bold text-sm">No hay registro para este día</p>
                                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-2">{selectedDayInfo.day.getDay() === 0 || selectedDayInfo.day.getDay() === 6 ? 'Fin de semana' : 'Pendiente de volcar por el alumno'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-8 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                                <button
                                    onClick={() => setSelectedDayInfo(null)}
                                    className="px-10 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-xs font-semibold tracking-wide hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
                                >
                                    Cerrar Detalle
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MODAL: GUÍA DEL TUTOR DE CENTRO ─────────────────────────────────────
            Modal informativo con las instrucciones de uso del panel.
            Accesible desde el item "Ayuda" del sidebar o el botón "Guía del Tutor"
            del widget de Centro de Ayuda en la pestaña Resumen.
            Contiene 3 secciones: Validar solicitudes, Firmar convenios, Supervisar diario.
            Condición: isGuideModalOpen=true */}
                {isGuideModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-background-dark rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30">
                                <div>
                                    <div className="flex items-center gap-2 text-white/80 text-sm font-bold mb-2 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-[18px]">menu_book</span>
                                        Manual Oficial
                                    </div>
                                    <h2 className="text-3xl font-black text-white tracking-tight">Guía del Tutor de Centro</h2>
                                </div>
                                <button
                                    onClick={() => setIsGuideModalOpen(false)}
                                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                                        <span className="material-symbols-outlined text-indigo-500">app_registration</span>
                                        1. Validar Solicitudes
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                        Los nuevos alumnos de tu centro que se registran en la plataforma aparecerán primero en la pestaña "Solicitudes". Es tu responsabilidad verificar su identidad y grado, para luego pulsar en <strong>Aprobar Acceso</strong>. Sin este paso, los estudiantes no podrán iniciar sesión.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                                        <span className="material-symbols-outlined text-emerald-500">checklist</span>
                                        2. Firmar Convenios (Validación de Expediente)
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                        Una vez un alumno es seleccionado por una Empresa para hacer prácticas, el estado de su expediente pasa a <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs">Pte. Validación</span>.
                                        Desde la tabla de alumnado, haz clic en <strong>Validar</strong> para realizar la firma digital del Anexo de Prácticas, lo cual formaliza oficialmente el convenio con la empresa.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                                        <span className="material-symbols-outlined text-sky-500">visibility</span>
                                        3. Supervisión de Diario (Bitácora)
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                        Puedes pulsar "Ver Ficha" en cualquier alumno con estado <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs">Validado</span> para revisar las anotaciones periódicas que suben. Podrás leer su diario de actividades de la empresa y asegurar que cumplen con el plan de desarrollo curricular.
                                    </p>
                                </div>

                                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                                    <h4 className="font-bold text-indigo-900 dark:text-indigo-400 mb-2">Importante sobre la Privacidad</h4>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-300/80 leading-relaxed">
                                        Toda validación de acceso y documentación queda registrada y sellada bajo la normativa de protección de datos actual. Solo los datos del alumno vinculados con la FCT son expuestos hacia el Tutor Empresa asociado.
                                    </p>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end">
                                <button
                                    onClick={() => setIsGuideModalOpen(false)}
                                    className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-xl shadow-lg hover:scale-[1.02] transition-all"
                                >
                                    Entendido, cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* ── MODAL: PERFIL COMPLETO DE EMPRESA COLABORADORA ──────────────────────
            Modal de mayor z-index ([120]) para superponer al modal de lista de alumnos.
            Cargado por handleViewCompanyProfile() → POST /api/empresa/profile
            Muestra: logo, nombre, email, ubicación, web, descripción,
                     stack tecnológico, beneficios y enlaces a RRSS.
            Condición: isCompanyProfileModalOpen=true AND companyProfileData ≠ null */}
                {isCompanyProfileModalOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-500">
                            {profileLoading ? (
                                <div className="p-20 flex flex-col items-center justify-center gap-4">
                                    <div className="size-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-500 font-semibold tracking-wide text-[10px]">Cargando perfil corporativo...</p>
                                </div>
                            ) : companyProfileData && (
                                <>
                                    <div className="relative p-8 lg:p-12 overflow-hidden shrink-0 bg-slate-50 dark:bg-slate-800/30">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                                        <div className="relative flex justify-between items-start">
                                            <div className="flex gap-8 items-center">
                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                                    <div className="size-24 lg:size-32 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden relative flex items-center justify-center">
                                                        {companyProfileData.logo ? (
                                                            <img
                                                                src={`https://educonect.alwaysdata.net${companyProfileData.logo}`}
                                                                alt={companyProfileData.nombre}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + companyProfileData.nombre + '&background=6366f1&color=fff';
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-4xl text-slate-300">business</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                            {companyProfileData.nombre}
                                                        </h2>
                                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-semibold tracking-wide">Verificada</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 text-slate-500 dark:text-slate-400">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold">
                                                            <span className="material-symbols-outlined text-[18px] text-indigo-500">mail</span>
                                                            {companyProfileData.email}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs font-bold">
                                                            <span className="material-symbols-outlined text-[18px] text-indigo-500">location_on</span>
                                                            {companyProfileData.ubicacion || 'Ubicación no especificada'}
                                                        </div>
                                                        {companyProfileData.web && (
                                                            <a href={companyProfileData.web} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">
                                                                <span className="material-symbols-outlined text-[18px]">language</span>
                                                                Sitio Web
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setIsCompanyProfileModalOpen(false)}
                                                className="size-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:rotate-90 hover:shadow-lg shadow-slate-200/50"
                                            >
                                                <span className="material-symbols-outlined">close</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                                            <div className="md:col-span-12 space-y-12">
                                                <section>
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="size-8 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                                                            <span className="material-symbols-outlined text-[18px]">info</span>
                                                        </div>
                                                        <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Sobre la Empresa</h4>
                                                    </div>
                                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg font-medium italic">
                                                        {companyProfileData.descripcion || 'Esta empresa colaboradora no ha proporcionado una descripción pública todavía.'}
                                                    </p>
                                                </section>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                                                    <section>
                                                        <div className="flex items-center gap-3 mb-6">
                                                            <div className="size-8 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
                                                                <span className="material-symbols-outlined text-[18px]">terminal</span>
                                                            </div>
                                                            <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Stack Tecnológico</h4>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {companyProfileData.tecnologias?.length > 0 ? companyProfileData.tecnologias.map((tech: string, i: number) => (
                                                                <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                    {tech.trim()}
                                                                </span>
                                                            )) : <p className="text-slate-400 text-sm font-medium italic">Generalista</p>}
                                                        </div>
                                                    </section>

                                                    <section>
                                                        <div className="flex items-center gap-3 mb-6">
                                                            <div className="size-8 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                                                                <span className="material-symbols-outlined text-[18px]">card_giftcard</span>
                                                            </div>
                                                            <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Beneficios y Cultura</h4>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {companyProfileData.beneficios?.length > 0 ? companyProfileData.beneficios.map((ben: string, i: number) => (
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

                                    <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                                        <div className="flex gap-4">
                                            {companyProfileData.linkedin && (
                                                <a href={companyProfileData.linkedin} target="_blank" rel="noopener noreferrer" className="size-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:text-[#0077b5] transition-colors">
                                                    <i className="fa-brands fa-linkedin-in"></i>
                                                </a>
                                            )}
                                            {companyProfileData.twitter && (
                                                <a href={companyProfileData.twitter} target="_blank" rel="noopener noreferrer" className="size-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:text-black dark:hover:text-white transition-colors">
                                                    <i className="fa-brands fa-x-twitter"></i>
                                                </a>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setIsCompanyProfileModalOpen(false)}
                                            className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-semibold tracking-wide hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
                                        >
                                            Cerrar Perfil
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
        </DashboardLayout>
    );
};

export default TutorCentroDashboard;