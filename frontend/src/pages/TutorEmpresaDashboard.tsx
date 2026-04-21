// ============================================================
// DASHBOARD DEL TUTOR DE EMPRESA – EduConect
// ============================================================
// Este componente es el panel principal para el rol de "Tutor
// de Empresa". Muestra la lista de alumnos asignados en
// prácticas, permite ver su expediente detallado, revisar y
// validar su diario de actividades, y firmar el convenio FCT
// cuando el Tutor de Centro lo ha validado previamente.
//
// Flujo general de estados de candidatura que afectan a este rol:
//   ADMITIDO  →  PENDIENTE_FIRMA_EMPRESA  →  VALIDADO
//
// El Tutor de Empresa solo interviene para firmar el convenio
// cuando el estado es PENDIENTE_FIRMA_EMPRESA.
// ============================================================

// ── Imports de React y React Router ─────────────────────────
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Context global del usuario autenticado ──────────────────
import { useUser } from '../context/UserContext';

// ── Componentes internos reutilizables ──────────────────────
import ChatSystem from '../components/ChatSystem';           // Sistema de mensajería entre roles
import NotificationPanel from '../components/NotificationPanel'; // Panel de alertas en tiempo real
import SignaturePad from '../components/SignaturePad';       // Lienzo para firma digital

// ── Cliente HTTP ────────────────────────────────────────────
import axios from 'axios';
import { assetUrl } from '../lib/urls.ts';
import DashboardLayout from '../components/layout/DashboardLayout';

// ============================================================
// TIPO: AlumnoAsignado
// ============================================================
// Representa la estructura de datos de un alumno que tiene
// asignado a este Tutor de Empresa en su candidatura FCT.
// El objeto `candidatura` contiene el estado del proceso y
// las fechas de prácticas una vez que el convenio es firmado.
// ============================================================
interface AlumnoAsignado {
    id: number;           // ID del User del alumno
    nombre: string;       // Nombre completo
    email: string;        // Correo electrónico
    grado: string;        // Ciclo formativo / grado
    centro: string;       // Centro educativo de origen
    foto?: string;        // Nombre del archivo de foto de perfil (opcional)
    candidatura: {
        id: number;       // ID de la candidatura en BD
        estado: string;   // Estado actual: ADMITIDO | PENDIENTE_FIRMA_EMPRESA | VALIDADO
        fechaInicio: string; // Fecha de inicio de prácticas (formato 'YYYY-MM-DD')
        fechaFin: string;    // Fecha de fin de prácticas
        horario: string;     // Descripción del horario (mañana, tarde, rotativo...)
        tipoDuracion: string;// Duración del convenio: 1_mes | 2_meses | 3_meses
    };
}

// ============================================================
// CONSTANTE: HOLIDAYS_ANDALUCIA_2026
// ============================================================
// Diccionario de festivos oficiales de Andalucía para 2026.
// Se usa en el calendario del diario de prácticas para marcar
// en rojo los días no laborables y excluirlos del conteo de
// horas de asistencia del alumno.
// Clave: 'YYYY-MM-DD' | Valor: { label: string }
// ============================================================
const HOLIDAYS_ANDALUCIA_2026: { [key: string]: { label: string } } = {
    '2026-01-01': { label: 'Año Nuevo' },
    '2026-01-06': { label: 'Epifanía del Señor' },
    '2026-02-28': { label: 'Día de Andalucía' },
    '2026-04-02': { label: 'Jueves Santo' },
    '2026-04-03': { label: 'Viernes Santo' },
    '2026-05-01': { label: 'Fiesta del Trabajo' },
    '2026-08-15': { label: 'Asunción de la Virgen' },
    '2026-10-12': { label: 'Fiesta Nacional de España' },
    '2026-11-01': { label: 'Todos los Santos' },
    '2026-12-06': { label: 'Día de la Constitución' },
    '2026-12-08': { label: 'Inmaculada Concepción' },
    '2026-12-25': { label: 'Natividad del Señor' },
};

// ============================================================
// COMPONENTE: TimeProgress
// ============================================================
// Muestra de forma visual el progreso temporal de las prácticas
// de un alumno entre su fecha de inicio y su fecha de fin.
// Calcula los días restantes y el porcentaje completado para
// renderizar una barra de progreso animada.
//
// Props:
//   start: string → Fecha de inicio en formato ISO 'YYYY-MM-DD'
//   end: string   → Fecha de fin en formato ISO 'YYYY-MM-DD'
// ============================================================
const TimeProgress: React.FC<{ start: string, end: string }> = ({ start, end }) => {
    // Si no hay fechas definidas, no hay convenio activo todavía
    if (!start || !end) return <div className="text-xs text-zinc-400 font-bold uppercase">No activo</div>;

    // Convertimos las fechas a timestamps en milisegundos
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const now = new Date().getTime();

    // Calculamos la duración total y el tiempo transcurrido
    const totalDuration = endDate - startDate;
    const elapsed = now - startDate;

    // Porcentaje de avance temporal, acotado entre 0 y 100
    const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));

    // Días naturales que faltan para terminar las prácticas
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return (
        <div className="flex flex-col items-center">
            {/* Días restantes en grande */}
            <span className="text-4xl font-black dark:text-white">{Math.max(0, daysLeft)}</span>
            <span className="text-[10px] text-zinc-500 font-semibold tracking-wide tracking-[0.3em]">Días Restantes</span>

            {/* Barra de progreso animada */}
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-4 overflow-hidden border border-white/5">
                <div
                    className="bg-indigo-500 h-full rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};

// ============================================================
// FUNCIÓN: parseActivity
// ============================================================
// Analiza el texto de una actividad del diario del alumno.
// El alumno puede registrar una modalidad entre corchetes al
// inicio del texto: "[PRESENCIAL] Desarrollo de API REST..."
//
// Retorna:
//   modality: string | null → La modalidad en mayúsculas (PRESENCIAL, REMOTO, etc.)
//   cleanText: string       → El texto limpio sin la etiqueta de modalidad
// ============================================================
const parseActivity = (text: string) => {
    if (!text) return { modality: null, cleanText: '' };

    // Buscamos el patrón [MODALIDAD] al inicio del texto
    const modalityMatch = text.match(/\[(.*?)\]/);
    const modality = modalityMatch ? modalityMatch[1].toUpperCase() : null;

    // Eliminamos la etiqueta de modalidad del texto para mostrarlo limpio
    const cleanText = text.replace(/\[.*?\]/, '').trim();

    return { modality, cleanText };
};

// ============================================================
// FUNCIÓN: renderActivity
// ============================================================
// Renderiza visualmente una entrada del diario con su modalidad
// coloreada (si la tiene) y el texto descriptivo de la actividad.
// Se usa dentro de la lista de actividades del modal de expediente.
//
// Colores por modalidad:
//   PRESENCIAL → azul        (trabajo en oficina)
//   REMOTO / TELETRABAJO / HÍBRIDO → verde (trabajo remoto)
//   URGENTE → rojo           (tarea de alta prioridad)
//   Sin modalidad → indigo   (genérico)
// ============================================================
const renderActivity = (text: string) => {
    const { modality, cleanText } = parseActivity(text);

    // Si no hay modalidad, mostramos el texto tal cual
    if (!modality) return <span className="align-middle">{text}</span>;

    // Configuramos el icono y los colores según la modalidad detectada
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
            {/* Etiqueta de modalidad coloreada */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${colors} text-[9px] font-semibold tracking-wide rounded-full border shadow-xs leading-none transition-transform hover:scale-105`}>
                <span className="material-symbols-outlined text-[14px] leading-none">{icon}</span>
                {modality}
            </span>
            {/* Descripción limpia de la actividad */}
            <p className="text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">{cleanText}</p>
        </div>
    );
};

// ============================================================
// COMPONENTE PRINCIPAL: TutorEmpresaDashboard
// ============================================================
// Panel de control exclusivo para el rol TUTOR_EMPRESA.
// Contiene tres secciones principales navegables vía sidebar:
//   1. "resumen"  → KPIs y vista rápida de últimos seguimientos
//   2. "alumnos"  → Tabla completa de alumnos asignados
//   3. "mensajes" → Sistema de chat interno
//
// Modales adicionales:
//   A. Modal de expediente → Detalles académicos + diario FCT
//   B. Modal de firma      → Firma digital del convenio FCT
// ============================================================
const TutorEmpresaDashboard: React.FC = () => {

    // ── React Router: para navegar programáticamente ─────────
    const navigate = useNavigate();

    // ── Contexto del usuario autenticado ────────────────────
    // `user` contiene email, nombre, foto, empresa, rol, etc.
    // `logout` limpia la sesión y redirige al login
    const { user, logout } = useUser();

    // ── Estado: pestaña activa del sidebar ──────────────────
    // Controla qué contenido principal se muestra en <main>
    const [activeTab, setActiveTab] = useState<'resumen' | 'alumnos' | 'mensajes'>('resumen');

    // ── Estado: lista de alumnos asignados a este tutor ─────
    // Se carga desde la API al montar el componente
    const [alumnos, setAlumnos] = useState<AlumnoAsignado[]>([]);

    // ── Estado: indica si los datos iniciales están cargando ─
    const [loading, setLoading] = useState(true);

    // ── Estados del modal de EXPEDIENTE del alumno ───────────
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);  // Visibilidad del modal
    const [studentDetail, setStudentDetail] = useState<any>(null);       // Datos completos del alumno seleccionado
    const [detailLoading, setDetailLoading] = useState(false);           // Loading interno del modal

    // ── Estados del modal de FIRMA del convenio ──────────────
    const [isValModalOpen, setIsValModalOpen] = useState(false);        // Visibilidad del modal de firma
    const [candidaturaToSign, setCandidaturaToSign] = useState<AlumnoAsignado | null>(null); // Alumno cuyo convenio se va a firmar
    const [valStep, setValStep] = useState(1);                          // Paso actual: 1=revisión, 2=firma
    const [signature, setSignature] = useState<string | null>(null);    // Datos de la firma (base64 PNG del canvas)
    const [isSubmitting, setIsSubmitting] = useState(false);            // Evita doble envío mientras procesa

    // ── Estados del contenido del modal de expediente ────────
    const [modalTab, setModalTab] = useState<'info' | 'diario'>('info'); // Subpestaña activa dentro del modal
    const [diarioEntries, setDiarioEntries] = useState<any[]>([]);       // Actividades del diario del alumno
    const [loadingDiario, setLoadingDiario] = useState(false);           // Loading del diario de actividades

    // ── Estados del calendario del diario ───────────────────
    const [currentMonth, setCurrentMonth] = useState(new Date());        // Mes que se muestra en el calendario
    const [bitacoraFeedback, setBitacoraFeedback] = useState<{ [key: number]: string }>({}); // Comentarios del tutor por entrada de diario
    const [_selectedDayInfo, setSelectedDayInfo] = useState<{ day: Date; entry: any; holiday: any } | null>(null); // Día seleccionado en el calendario (reservado para futuro popover de detalle)

    // ── Estado: sidebar visible en móvil ────────────────────
    // En escritorio el sidebar es siempre visible (lg:translate-x-0)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // ============================================================
    // FUNCIÓN: getDaysInMonth
    // ============================================================
    // Genera el array de días del mes para renderizar el calendario
    // en formato de cuadrícula. Añade `null` al principio para
    // alinear el primer día de mes con el día de la semana correcto
    // (semana comenzando en lunes, estilo europeo).
    //
    // ej: si el 1 de mayo es miércoles → [null, null, Date(1), Date(2)...]
    // ============================================================
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();

        // getDay() devuelve 0=domingo, 1=lunes... Ajustamos para lunes=0
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate(); // Último día del mes

        const days = [];
        const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Domingo → offset 6 (va al final de semana)

        // Rellenamos con nulls para las celdas vacías del inicio
        for (let i = 0; i < startOffset; i++) days.push(null);

        // Añadimos cada día del mes como objeto Date
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

        return days;
    };

    // ============================================================
    // FUNCIÓN: isWithinRange
    // ============================================================
    // Comprueba si una fecha concreta está dentro del período de
    // prácticas del alumno seleccionado (entre fechaInicio y fechaFin).
    // Se usa en el calendario para oscurecer días fuera del convenio.
    // ============================================================
    const isWithinRange = (date: Date) => {
        // Si no hay fechas de convenio, ningún día está en rango
        if (!studentDetail?.candidatura?.fechaInicio || !studentDetail?.candidatura?.fechaFin) return false;

        const start = new Date(studentDetail.candidatura.fechaInicio);
        const end = new Date(studentDetail.candidatura.fechaFin);

        return date >= start && date <= end;
    };

    // ============================================================
    // EFECTO: Carga inicial de datos del dashboard
    // ============================================================
    // Se ejecuta al montar el componente y cada vez que cambia
    // el usuario autenticado. Solicita al backend la lista de
    // alumnos asignados a este tutor de empresa.
    //
    // Endpoint: POST /api/tutor-empresa/dashboard
    // Body:     { email: string }
    // Respuesta: { alumnos: AlumnoAsignado[] }
    // ============================================================
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (user?.email) {
                try {
                    const response = await axios.post('https://educonect.alwaysdata.net/api/tutor-empresa/dashboard', {
                        email: user.email
                    });
                    // Actualizamos el estado con los alumnos asignados
                    setAlumnos(response.data.alumnos || []);
                } catch (error) {
                    console.error("Error fetching tutor dashboard data:", error);
                } finally {
                    // Siempre desactivamos el loading aunque haya error
                    setLoading(false);
                }
            }
        };
        fetchDashboardData();
    }, [user]); // Redispara si el usuario cambia (ej: cambio de cuenta)

    // ============================================================
    // FUNCIÓN: handleNotificationAction
    // ============================================================
    // Callback que se ejecuta cuando el usuario hace clic en el
    // botón de acción de una notificación del panel.
    //
    // Analiza el contenido de la notificación (título + descripción
    // + texto de acción) y navega a la sección correspondiente,
    // abriendo el modal pertinente si es necesario.
    //
    // Casos gestionados:
    //   1. "Firma Pendiente" / "Firmar convenio"
    //      → Navega a "Tus Alumnos" y abre el modal de firma
    //        del alumno con candidatura PENDIENTE_FIRMA_EMPRESA
    //   2. "Diario" / "Bitácora" / "Revisar"
    //      → Navega a "Tus Alumnos" y abre el expediente
    //        con la pestaña de Diario de Prácticas activa
    //   3. Cualquier otro
    //      → Navega al Panel Resumen por defecto
    // ============================================================
    const handleNotificationAction = (notif: any) => {
        // Normalizamos todo el texto a minúsculas para comparar fácilmente
        const txt = (notif.title + ' ' + (notif.desc ?? '') + ' ' + (notif.action ?? '')).toLowerCase();

        // ── CASO 1: Notificación de convenio pendiente de firma ───
        // El Tutor de Centro ha validado la candidatura y el convenio
        // requiere ahora la firma del Tutor de Empresa.
        if (txt.includes('firma pendiente') || txt.includes('firmar convenio') || txt.includes('firma') && txt.includes('convenio')) {
            setActiveTab('alumnos');

            // Intentamos extraer el nombre del alumno del mensaje:
            // "El Centro Educativo ha validado el convenio de NOMBRE. Requiere tu firma final."
            const match = notif.desc?.match(/convenio de (.+?)\./i);
            const studentName = match ? match[1].trim() : null;

            // Buscamos al alumno en nuestra lista que esté pendiente de firma
            // y cuyo nombre coincida con el extraído (si lo hay)
            const pendingAlumno = alumnos.find(a =>
                a.candidatura?.estado === 'PENDIENTE_FIRMA_EMPRESA' &&
                (!studentName || a.nombre.toLowerCase().includes(studentName.toLowerCase()))
            );

            // Si encontramos al alumno, abrimos directamente su modal de firma
            if (pendingAlumno) {
                handleOpenSignModal(pendingAlumno);
            }
            return;
        }

        // ── CASO 2: Notificación de nueva actividad en el diario ──
        // El alumno ha registrado una actividad en su bitácora
        // y espera que el tutor la valide.
        if (txt.includes('diario') || txt.includes('bit\u00e1cora') || txt.includes('revisar')) {
            // Intentamos extraer el nombre del alumno del mensaje:
            // "El alumno NOMBRE ha guardado una nueva actividad..."
            const match = notif.desc?.match(/alumno (.*?) ha guardado/i) || notif.desc?.match(/estudiante (.*?) ha editado/i);

            if (match && match[1]) {
                const studentName = match[1].trim();
                // Buscamos al alumno en nuestra lista por nombre
                const found = alumnos.find(a => a.nombre.toLowerCase().includes(studentName.toLowerCase()));

                if (found) {
                    // Abrimos el modal del alumno directamente en la pestaña de Diario
                    setActiveTab('alumnos');
                    setModalTab('diario');
                    handleOpenDetailModal(found.id);
                } else {
                    // Si no encontramos al alumno, al menos vamos a la sección de alumnos
                    setActiveTab('alumnos');
                }
            } else {
                // Si no podemos extraer el nombre, vamos a la sección de alumnos
                setActiveTab('alumnos');
            }
            return;
        }

        // ── CASO DEFAULT: Cualquier otra notificación ─────────────
        // Devolvemos al usuario al panel de resumen general
        setActiveTab('resumen');
    };

    // ============================================================
    // FUNCIÓN: handleLogout
    // ============================================================
    // Cierra la sesión del usuario usando el contexto global
    // y redirige a la página de inicio de sesión.
    // ============================================================
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // ============================================================
    // FUNCIÓN: fetchStudentDiario
    // ============================================================
    // Carga las entradas del diario de prácticas de un alumno
    // específico desde la API.
    //
    // Endpoint: GET /api/diario/tutor/candidatura/{id}
    // Respuesta: { actividades: DiarioEntry[] }
    //
    // Se llama:
    //   - Al abrir el modal de expediente (si el convenio está VALIDADO)
    //   - Al cambiar a la pestaña "Diario" dentro del modal
    // ============================================================
    const fetchStudentDiario = async (candidaturaId: number) => {
        setLoadingDiario(true);
        try {
            const res = await axios.get(`https://educonect.alwaysdata.net/api/diario/tutor/candidatura/${candidaturaId}`);
            // Guardamos el array de actividades en el estado
            setDiarioEntries(res.data.actividades || []);
        } catch (error) {
            console.error("Error fetching student diario:", error);
        } finally {
            setLoadingDiario(false);
        }
    };

    // ============================================================
    // FUNCIÓN: handleValidarDiario
    // ============================================================
    // Aprueba o rechaza una entrada específica del diario del alumno.
    // Envía la decisión junto con el comentario/feedback opcional
    // que el tutor haya escrito en el textarea de la entrada.
    //
    // Endpoint: POST /api/diario/tutor/validar/{id}
    // Body:     { estado: 'APROBADO'|'RECHAZADO', observaciones: string }
    //
    // Tras validar, recarga el diario completo para reflejar el cambio.
    //
    // Parámetros:
    //   diarioId: número de la entrada a validar
    //   estado:   'APROBADO' o 'RECHAZADO'
    // ============================================================
    const handleValidarDiario = async (diarioId: number, estado: 'APROBADO' | 'RECHAZADO') => {
        // Recogemos el comentario del tutor para esa entrada (si existe)
        const observaciones = bitacoraFeedback[diarioId] || '';
        try {
            await axios.post(`https://educonect.alwaysdata.net/api/diario/tutor/validar/${diarioId}`, {
                estado,
                observaciones
            });

            // Recargamos el diario tras la validación para ver el estado actualizado
            if (studentDetail?.candidatura?.id) {
                fetchStudentDiario(studentDetail.candidatura.id);
            }
        } catch (error) {
            alert("Error al validar actividad");
        }
    };

    // ============================================================
    // FUNCIÓN: handleOpenDetailModal
    // ============================================================
    // Abre el modal de expediente completo de un alumno.
    // Resetea todos los estados del modal y hace la petición
    // a la API para obtener los datos detallados del alumno.
    //
    // Endpoint: GET /api/tutor/alumno/{id}
    // Respuesta: objeto con datos completos del alumno y candidatura
    //
    // Si el alumno ya tiene el convenio VALIDADO, también carga
    // automáticamente su diario de prácticas.
    //
    // Parámetros:
    //   id: ID del usuario del alumno
    // ============================================================
    const handleOpenDetailModal = async (id: number) => {
        // Preparamos el estado del modal antes de mostrar datos
        setDetailLoading(true);
        setIsDetailModalOpen(true);
        setModalTab('info');         // Siempre empezamos en la pestaña de Expediente
        setDiarioEntries([]);        // Limpiamos entradas anteriores
        setCurrentMonth(new Date()); // Resetear calendario al mes actual
        setSelectedDayInfo(null);    // Limpiar día seleccionado anterior

        try {
            const response = await axios.get(`https://educonect.alwaysdata.net/api/tutor/alumno/${id}`);
            setStudentDetail(response.data);

            // Solo cargamos el diario si el convenio ya está VALIDADO
            // (de lo contrario la sección del diario no se puede ver)
            if (response.data.candidatura?.id && response.data.candidatura?.estado === 'VALIDADO') {
                fetchStudentDiario(response.data.candidatura.id);
            }
        } catch (error) {
            console.error("Error fetching student details:", error);
        } finally {
            setDetailLoading(false);
        }
    };

    // ============================================================
    // FUNCIÓN: handleOpenSignModal
    // ============================================================
    // Abre el modal de firma del convenio FCT para un alumno
    // concreto. Resetea el paso del wizard (paso 1 = revisión)
    // y limpia cualquier firma previa del canvas.
    //
    // Parámetros:
    //   al: objeto AlumnoAsignado cuyo convenio se va a firmar
    // ============================================================
    const handleOpenSignModal = (al: AlumnoAsignado) => {
        setCandidaturaToSign(al);  // Guardamos el alumno cuyo convenio firmamos
        setValStep(1);             // Empezamos siempre en el paso de revisión
        setSignature(null);        // Limpiamos firma anterior del canvas
        setIsValModalOpen(true);   // Mostramos el modal
    };

    // ============================================================
    // FUNCIÓN: handleSign
    // ============================================================
    // Envía la firma digital del convenio al backend.
    // Solo se puede ejecutar si hay una firma capturada en el canvas
    // (validado por el estado `disabled` del botón).
    //
    // Endpoint: POST /api/tutor-empresa/candidaturas/{id}/firmar
    // Body:     { firma: string } → base64 PNG de la firma
    //
    // Al completarse:
    //   1. Muestra alerta de éxito
    //   2. Cierra el modal
    //   3. Recarga la lista de alumnos para reflejar el nuevo estado
    //      (la candidatura pasa a VALIDADO tras ambas firmas)
    // ============================================================
    const handleSign = async () => {
        // Protección: no continuamos si no hay candidatura ni firma
        if (!candidaturaToSign?.candidatura.id) return;

        setIsSubmitting(true); // Bloquea el botón para evitar doble envío
        try {
            await axios.post(`https://educonect.alwaysdata.net/api/tutor-empresa/candidaturas/${candidaturaToSign.candidatura.id}/firmar`, {
                firma: signature  // Enviamos la firma como string base64
            });

            alert("Convenio firmado correctamente. El proceso ha finalizado.");
            setIsValModalOpen(false);

            // Recargamos la lista de alumnos para que el estado se actualice
            // (la candidatura ahora debería estar en VALIDADO)
            const response = await axios.post('https://educonect.alwaysdata.net/api/tutor-empresa/dashboard', {
                email: user?.email
            });
            setAlumnos(response.data.alumnos || []);
        } catch (error: any) {
            console.error("Error signing:", error);
            alert(error.response?.data?.error || "Error al firmar el convenio");
        } finally {
            setIsSubmitting(false); // Reactivamos el botón en cualquier caso
        }
    };

    // ============================================================
    // RENDER PRINCIPAL
    // ============================================================
    return (
        <DashboardLayout
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            sidebarWidthClass="w-80"
            sidebarClassName="bg-zinc-950 text-white"
            zIndexSidebarClass="z-[70]"
            sidebar={
                <>

                {/* ── Logo / Identidad de la app ──────────────────── */}
                <div className="p-8 border-b border-white/5 bg-zinc-950 relative overflow-hidden">
                    {/* Línea de color en la parte superior como acento visual */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                    <div className="flex items-center gap-4">
                        {/* Icono de la app – al hacer clic navega al inicio */}
                        <div
                            className="size-12 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 rotate-3 group-hover:rotate-0 transition-transform duration-500 ring-4 ring-indigo-600/10 cursor-pointer"
                            onClick={() => navigate('/')}
                        >
                            <span className="material-symbols-outlined text-white text-3xl font-light">account_balance</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">EduConect</h1>
                            {/* Subtítulo que identifica el rol del panel */}
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1.5 opacity-80 font-display">Tutor Empresa</p>
                        </div>
                    </div>
                </div>

                {/* ── Menú de navegación del sidebar ──────────────── */}
                <nav className="flex-1 p-6 space-y-2 mt-4">
                    <p className="px-4 py-2 text-[9px] font-black text-indigo-300/30 uppercase tracking-[0.3em] mb-2">Monitorización</p>

                    {/* Generamos los botones de navegación dinámicamente */}
                    {[
                        { id: 'resumen', label: 'Panel Resumen', icon: 'speed' },
                        // Mostramos el número de alumnos asignados como badge
                        { id: 'alumnos', label: 'Tus Alumnos', icon: 'group_add', count: alumnos.length },
                        { id: 'mensajes', label: 'Centro Mensajes', icon: 'chat_bubble' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            // El botón activo se destaca con fondo indigo y desplazamiento horizontal
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group/item ${activeTab === item.id
                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white shadow-xl shadow-indigo-600/20 translate-x-1'
                                : 'text-zinc-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Icono del item de navegación */}
                                <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover/item:scale-110'}`}>
                                    {item.icon}
                                </span>
                                <span className="text-sm font-black tracking-tight uppercase tracking-widest">{item.label}</span>
                            </div>
                            {/* Badge numérico (ej: número de alumnos) o flecha en hover */}
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

                {/* ── Perfil del tutor en la parte inferior ────────── */}
                <div className="p-8 border-t border-white/5 bg-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-4 group/profile cursor-pointer">
                        {/* Avatar: foto de perfil o inicial del nombre */}
                        <div className="size-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 font-black border border-indigo-500/20 group-hover/profile:scale-110 transition-transform overflow-hidden">
                            {user?.foto ? (
                                <img src={assetUrl(`/uploads/fotos/${user.foto}`)} className="w-full h-full object-cover" alt="Perfil" />
                            ) : (
                                user?.nombre?.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            {/* Nombre y empresa del tutor */}
                            <p className="text-sm font-black text-white truncate uppercase tracking-tighter leading-none">{user?.nombre}</p>
                            <p className="text-[10px] text-zinc-500 font-bold truncate uppercase tracking-widest mt-1 opacity-70">{user?.empresa || 'Entidad Colaboradora'}</p>
                        </div>
                        {/* Botón de cierre de sesión */}
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
                        {/* Botón hamburguesa – solo visible en móvil */}
                        <button
                            className="lg:hidden p-2 text-zinc-500 hover:text-indigo-600 transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <span className="material-symbols-outlined text-2xl">menu</span>
                        </button>

                        {/* Título dinámico que cambia según la pestaña activa */}
                        <div>
                            <h2 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tighter flex items-center gap-2 lg:gap-4 uppercase">
                                <span className="material-symbols-outlined text-indigo-600 text-2xl lg:text-3xl hidden sm:block">
                                    {/* Icono correspondiente a la pestaña actual */}
                                    {activeTab === 'resumen' ? 'insights' : activeTab === 'alumnos' ? 'supervised_user_circle' : 'chat_bubble'}
                                </span>
                                {/* Texto del título de la pestaña actual */}
                                {activeTab === 'resumen' ? 'Seguimiento' : activeTab === 'alumnos' ? 'Estudiantes' : 'Mensajería'}
                            </h2>
                        </div>
                    </div>

                    {/* Controles del lado derecho del header */}
                    <div className="flex items-center gap-6">
                        {/* Indicador de sincronización (solo en resoluciones grandes) */}
                        <div className="hidden xl:flex items-center gap-4 px-5 py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl shadow-sm">
                            {/* Punto verde animado = estado en tiempo real */}
                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sincronizado • 2026/27</span>
                        </div>

                        {/* ── Dropdown de notificaciones ────────────────
                            Se muestra al hacer hover sobre el icono de campana.
                            Renderiza el panel de notificaciones en tiempo real
                            filtrando solo las del rol TUTOR_EMPRESA. */}
                        <div className="relative group/notif">
                            {/* Botón campana con indicador de notificaciones pendientes */}
                            <button className="size-12 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer relative">
                                <span className="material-symbols-outlined text-[24px]">notifications</span>
                                {/* Bolita de alerta */}
                                <span className="absolute top-2 right-2 size-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white">
                                    !
                                </span>
                            </button>
                            {/* Panel desplegable de notificaciones – visible en hover */}
                            <div className="absolute right-0 top-full mt-4 w-96 opacity-0 translate-y-4 pointer-events-none group-hover/notif:opacity-100 group-hover/notif:translate-y-0 group-hover/notif:pointer-events-auto transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 z-[100]">
                                <div className="bg-white rounded-[32px] shadow-2xl shadow-black/20 border border-zinc-100 overflow-hidden max-h-[500px] flex flex-col">
                                    <NotificationPanel
                                        role="TUTOR_EMPRESA"
                                        onActionClick={handleNotificationAction} // Navega según el tipo de notificación
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Pastilla de perfil del usuario ───────────
                            Muestra foto/inicial y nombre del tutor autenticado */}
                        <div className="flex items-center gap-3 p-1 bg-zinc-900 rounded-2xl shadow-lg shadow-black/10 hover:scale-[1.02] transition-transform cursor-pointer overflow-hidden">
                            <div className="size-8 lg:size-10 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-inner overflow-hidden">
                                {user?.foto ? (
                                    <img src={`https://educonect.alwaysdata.net/uploads/fotos/${user.foto}`} className="w-full h-full object-cover" alt="Perfil" />
                                ) : (
                                    user?.nombre?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="hidden sm:block pr-4">
                                <p className="text-[9px] lg:text-[10px] font-black text-white uppercase tracking-tighter leading-none mb-0.5">{user?.nombre}</p>
                                <p className="text-[7px] lg:text-[8px] font-bold text-zinc-400 uppercase tracking-widest leading-none text-right">Mentor</p>
                            </div>
                        </div>
                    </div>
                </header>
            }
        >

                {/* ════════════════════════════════════════════════════
                    CONTENIDO PRINCIPAL (<main>)
                    El contenido varía según la pestaña activa.
                    En mensajes no tiene padding ni scroll propio
                    para que el chat ocupe toda la altura disponible.
                    ════════════════════════════════════════════════════ */}
                <main className={`flex-1 flex flex-col min-h-0 animate-in fade-in duration-700 bg-zinc-50/50 ${activeTab === 'mensajes' ? 'p-0 overflow-hidden' : 'overflow-y-auto p-4 lg:p-12 custom-scrollbar'}`}>

                    {/* ══════════════════════════════════════════════
                        TAB: PANEL RESUMEN
                        Muestra KPIs (total alumnos, validados, pendientes),
                        una vista previa de los últimos seguimientos
                        y el panel de notificaciones en tiempo real.
                        ══════════════════════════════════════════════ */}
                    {activeTab === 'resumen' && (
                        <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
                            <div className="flex-1 space-y-8">

                                {/* ── KPIs: 3 tarjetas de métricas ─── */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                    {/* KPI 1: Total de alumnos asignados */}
                                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="material-symbols-outlined text-indigo-600 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/10 p-3 rounded-2xl">person_check</span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Tus Alumnos</p>
                                        <h3 className="text-4xl font-black dark:text-white mt-1">{alumnos.length}</h3>
                                    </div>

                                    {/* KPI 2: Alumnos con convenio VALIDADO (ambas firmas completadas) */}
                                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="material-symbols-outlined text-emerald-500 bg-emerald-500/10 p-3 rounded-2xl">task_alt</span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Validados</p>
                                        <h3 className="text-4xl font-black dark:text-white mt-1">{alumnos.filter(a => a.candidatura.estado === 'VALIDADO').length}</h3>
                                    </div>

                                    {/* KPI 3: Alumnos que aún no tienen convenio VALIDADO */}
                                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="material-symbols-outlined text-amber-500 bg-amber-500/10 p-3 rounded-2xl">history</span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Pendientes</p>
                                        <h3 className="text-4xl font-black dark:text-white mt-1">{alumnos.filter(a => a.candidatura.estado !== 'VALIDADO').length}</h3>
                                    </div>
                                </div>

                                {/* ── Preview de últimos seguimientos ─ */}
                                {/* Lista rápida con los 3 primeros alumnos para vista rápida */}
                                <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <h3 className="font-black text-lg dark:text-white">Últimos Seguimientos</h3>
                                        {/* Enlace a la lista completa de alumnos */}
                                        <button onClick={() => setActiveTab('alumnos')} className="text-indigo-600 text-xs font-semibold tracking-wide tracking-wider hover:underline">Ver todos</button>
                                    </div>
                                    <div className="p-6">
                                        <div className="space-y-4">
                                            {alumnos.length === 0 ? (
                                                <p className="text-center py-4 text-slate-500 font-bold">Sin alumnos asignados.</p>
                                            ) : (
                                                // Mostramos máximo 3 alumnos en el resumen
                                                alumnos.slice(0, 3).map((al, idx) => (
                                                    <div key={`${al.id}-${idx}`} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                        <div className="flex items-center gap-4">
                                                            {/* Avatar del alumno */}
                                                            <div className="size-10 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/10 flex items-center justify-center text-indigo-600 font-black text-xs overflow-hidden">
                                                                {al.foto ? (
                                                                    <img src={`https://educonect.alwaysdata.net/uploads/fotos/${al.foto}`} className="w-full h-full object-cover" alt="Perfil" />
                                                                ) : (
                                                                    al.nombre.substring(0, 2).toUpperCase()
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold dark:text-white">{al.nombre}</p>
                                                                <p className="text-[10px] text-slate-500 font-semibold tracking-wideer">{al.grado}</p>
                                                            </div>
                                                        </div>
                                                        {/* Badge de estado de la candidatura */}
                                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-semibold tracking-wide ${al.candidatura.estado === 'VALIDADO' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
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

                            {/* ── Panel de Notificaciones lateral ──── */}
                            {/* En el resumen, las notificaciones se muestran como columna lateral */}
                            <div className="w-full lg:w-96 shrink-0">
                                <NotificationPanel role="TUTOR_EMPRESA" onActionClick={handleNotificationAction} />
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════
                        TAB: TUS ALUMNOS
                        Tabla completa de todos los alumnos asignados.
                        Para cada uno se puede:
                          - Abrir el expediente ("Ver")
                          - Firmar el convenio si está PENDIENTE_FIRMA_EMPRESA
                        ══════════════════════════════════════════════ */}
                    {activeTab === 'alumnos' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-200 dark:border-slate-800">
                                    <h3 className="text-xl font-black dark:text-white">Tus Alumnos en Prácticas</h3>
                                    <p className="text-sm text-slate-500 mt-1">Listado de alumnos bajo tu tutorización laboral</p>
                                </div>

                                {/* Tabla de alumnos con scroll horizontal en móvil */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-[10px] lg:text-xs uppercase font-black tracking-widest">
                                                <th className="px-4 lg:px-8 py-5">Identidad</th>
                                                <th className="hidden sm:table-cell px-4 lg:px-8 py-5">Grado / Centro</th>
                                                <th className="hidden lg:table-cell px-4 lg:px-8 py-5">Horario / Jornada</th>
                                                <th className="px-4 lg:px-8 py-5">Estado</th>
                                                <th className="px-4 lg:px-8 py-5 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 dark:text-slate-200">
                                            {loading ? (
                                                /* Estado de carga inicial */
                                                <tr>
                                                    <td colSpan={5} className="text-center py-20">
                                                        <span className="material-symbols-outlined animate-spin text-4xl text-indigo-600">progress_activity</span>
                                                    </td>
                                                </tr>
                                            ) : alumnos.length === 0 ? (
                                                /* Estado vacío: no hay alumnos asignados */
                                                <tr>
                                                    <td colSpan={5} className="text-center py-20 text-slate-500 font-bold">
                                                        No tienes alumnos asignados actualmente.
                                                    </td>
                                                </tr>
                                            ) : (
                                                /* Fila de cada alumno */
                                                alumnos.map((row, idx) => (
                                                    <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">

                                                        {/* Columna: Identidad (avatar + nombre + email) */}
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="size-10 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/10 rounded-xl flex items-center justify-center text-indigo-600 text-xs font-black shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
                                                                    {row.foto ? (
                                                                        <img src={`https://educonect.alwaysdata.net/uploads/fotos/${row.foto}`} className="w-full h-full object-cover" alt="Perfil" />
                                                                    ) : (
                                                                        row.nombre.substring(0, 2).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm dark:text-white group-hover:text-indigo-600 transition-colors">{row.nombre}</p>
                                                                    <p className="text-xs text-slate-500 font-medium">{row.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Columna: Grado y centro (oculta en xs) */}
                                                        <td className="hidden sm:table-cell px-8 py-6">
                                                            <p className="text-xs font-black dark:text-slate-200 uppercase tracking-tighter truncate max-w-[200px]">{row.grado}</p>
                                                            <p className="text-[10px] text-indigo-600 font-bold mt-1 uppercase opacity-70 italic">{row.centro}</p>
                                                        </td>

                                                        {/* Columna: Horario y duración del convenio (solo desktop) */}
                                                        <td className="hidden lg:table-cell px-8 py-6">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
                                                                <span className="text-[11px] font-bold capitalize">{row.candidatura.horario}</span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{row.candidatura.tipoDuracion}</span>
                                                        </td>

                                                        {/* Columna: Badge de estado de la candidatura
                                                            Verde = VALIDADO | Ámbar = ADMITIDO | Gris = otros */}
                                                        <td className="px-8 py-6">
                                                            <span className={`px-2 lg:px-4 py-1.5 rounded-2xl text-[8px] lg:text-[10px] font-semibold tracking-wideer shadow-sm ${row.candidatura.estado === 'VALIDADO' ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                                                                row.candidatura.estado === 'ADMITIDO' ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-slate-400 text-white'
                                                                }`}>
                                                                {row.candidatura.estado}
                                                            </span>
                                                        </td>

                                                        {/* Columna: Botón de acción contextual
                                                            - Si está PENDIENTE_FIRMA_EMPRESA → botón "Firmar"
                                                            - Si está en otro estado → botón "Ver" (expediente) */}
                                                        <td className="px-4 lg:px-8 py-6 text-right">
                                                            {row.candidatura.estado === 'PENDIENTE_FIRMA_EMPRESA' ? (
                                                                /* Botón de firma del convenio */
                                                                <button
                                                                    onClick={() => handleOpenSignModal(row)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-[9px] lg:text-[10px] font-semibold tracking-wide rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 ml-auto"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px] lg:text-[16px]">edit_document</span>
                                                                    Firmar
                                                                </button>
                                                            ) : (
                                                                /* Botón de ver expediente */
                                                                <button
                                                                    onClick={() => handleOpenDetailModal(row.id)}
                                                                    className="text-indigo-600 hover:text-indigo-600/70 text-[9px] lg:text-xs font-semibold tracking-wide transition-all p-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/5 hover:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/20 rounded-xl"
                                                                >
                                                                    Ver
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

                    {/* ══════════════════════════════════════════════
                        TAB: MENSAJERÍA
                        Integra el componente ChatSystem que gestiona
                        los canales de comunicación entre el tutor,
                        los alumnos y el tutor de centro.
                        Sin padding para que ocupe toda la altura.
                        ══════════════════════════════════════════════ */}
                    {activeTab === 'mensajes' && (
                        <div className="h-full w-full animate-in fade-in duration-500">
                            <ChatSystem />
                        </div>
                    )}
                </main>

                {/* ════════════════════════════════════════════════════
                    MODAL A: EXPEDIENTE DEL ALUMNO (Premium)
                    ════════════════════════════════════════════════════
                    Modal a pantalla completa que muestra toda la
                    información académica y de prácticas de un alumno.
                    Se divide en dos pestañas:
                      - "Expediente General": habilidades, fechas FCT,
                         documentos (CV y convenio PDF)
                      - "Diario de Prácticas": calendario mensual con
                         las actividades registradas + lista detallada
                         con acciones de validación (aprobar/rechazar)
                    Solo accesible cuando el convenio está VALIDADO.
                    ════════════════════════════════════════════════════ */}
                {isDetailModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 lg:p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-zinc-950 rounded-[40px] w-full max-w-6xl max-h-[95vh] shadow-2xl overflow-hidden border border-white/20 dark:border-zinc-800 flex flex-col animate-in slide-in-from-bottom-10 duration-500">

                            {/* Estado de carga del expediente */}
                            {detailLoading ? (
                                <div className="p-20 flex flex-col items-center justify-center gap-4">
                                    <div className="size-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-500 font-semibold tracking-wide text-xs">Cargando expediente académico...</p>
                                </div>
                            ) : studentDetail && (
                                <>
                                    {/* ── Cabecera del modal: foto + nombre + info básica ─── */}
                                    <div className="relative p-6 lg:p-10 overflow-hidden shrink-0 border-b border-zinc-100 dark:border-zinc-800/50">
                                        {/* Decoraciones de fondo (blobs de color) */}
                                        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] animate-pulse"></div>
                                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px]"></div>

                                        <div className="relative flex justify-between items-center gap-6">
                                            <div className="flex gap-6 lg:gap-8 items-center min-w-0">
                                                {/* Avatar del alumno con efecto glow */}
                                                <div className="relative group/photo shrink-0">
                                                    <div className="absolute -inset-2 bg-linear-to-r from-indigo-600 to-purple-600 rounded-[2.5rem] blur opacity-20 group-hover/photo:opacity-50 transition duration-1000 animate-pulse"></div>
                                                    <div className="relative size-20 lg:size-28 rounded-[2rem] bg-white dark:bg-zinc-800 flex items-center justify-center text-indigo-600 text-3xl lg:text-4xl font-black shadow-2xl border border-white/50 dark:border-zinc-700 overflow-hidden">
                                                        {studentDetail.foto ? (
                                                            <img src={`https://educonect.alwaysdata.net/uploads/fotos/${studentDetail.foto}`} className="w-full h-full object-cover" alt="Perfil" />
                                                        ) : (
                                                            // Iniciales del alumno si no tiene foto
                                                            <span className="opacity-80 tracking-tighter">{studentDetail.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Nombre, grado y datos de contacto */}
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 lg:gap-4 mb-1">
                                                        <h3 className="text-2xl lg:text-4xl font-black dark:text-white tracking-tighter truncate uppercase leading-none">{studentDetail.nombre}</h3>
                                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] lg:text-[10px] font-semibold tracking-wide rounded-full border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
                                                            Activo 2026/27
                                                        </span>
                                                    </div>
                                                    <p className="text-indigo-600 dark:text-indigo-400 font-black text-xs lg:text-sm uppercase tracking-[0.2em] mb-3 opacity-90 truncate max-w-xl">{studentDetail.grado}</p>
                                                    <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-zinc-500 dark:text-zinc-400 text-[11px] lg:text-xs">
                                                        {/* Email del alumno */}
                                                        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-zinc-100 dark:border-zinc-700/50">
                                                            <span className="material-symbols-outlined text-[16px] lg:text-[18px] opacity-70 text-indigo-500">mail</span>
                                                            <span className="font-bold tracking-tight">{studentDetail.email}</span>
                                                        </div>
                                                        {/* Indicador de usuario verificado */}
                                                        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/5 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-500/10">
                                                            <span className="material-symbols-outlined text-[16px] lg:text-[18px] text-indigo-500 font-bold">verified_user</span>
                                                            <span className="font-semibold tracking-wide text-[9px] lg:text-[10px] text-indigo-600 dark:text-indigo-400">Verificado</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Botón de cierre del modal con animación de rotación */}
                                            <button
                                                onClick={() => setIsDetailModalOpen(false)}
                                                className="shrink-0 size-12 lg:size-14 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center transition-all group hover:rotate-90 border border-zinc-100 dark:border-zinc-700/50 shadow-sm"
                                            >
                                                <span className="material-symbols-outlined text-zinc-400 group-hover:text-red-500 transition-colors text-2xl">close</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* ── Pestañas del modal: Expediente / Diario ────────── */}
                                    <div className="px-6 lg:px-10 flex gap-6 lg:gap-10 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md">
                                        {/* Pestaña "Expediente General" – siempre accesible */}
                                        <button
                                            onClick={() => setModalTab('info')}
                                            className={`py-5 text-[10px] lg:text-xs font-semibold tracking-wide tracking-[0.25em] relative transition-all ${modalTab === 'info' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                                        >
                                            Expediente General
                                            {/* Línea inferior indicadora de pestaña activa */}
                                            {modalTab === 'info' && <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 dark:bg-indigo-400 rounded-t-full shadow-[0_0_12px_rgba(79,70,229,0.5)]"></div>}
                                        </button>

                                        {/* Pestaña "Diario de Prácticas"
                                            – accesible siempre desde el modal de TutorEmpresa
                                              (la restricción de convenio no se aplica aquí,
                                               los datos ya son del alumno cargado) */}
                                        <button
                                            onClick={() => setModalTab('diario')}
                                            className={`py-5 text-[10px] lg:text-xs font-semibold tracking-wide tracking-[0.25em] relative transition-all ${modalTab === 'diario' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                                        >
                                            Diario de Prácticas
                                            {modalTab === 'diario' && <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 dark:bg-indigo-400 rounded-t-full shadow-[0_0_12px_rgba(79,70,229,0.5)]"></div>}
                                        </button>
                                    </div>

                                    {/* ── Contenido scrollable del modal ──────────────────── */}
                                    <div className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-950/20">

                                        {/* ┌─ SUBPESTAÑA: EXPEDIENTE GENERAL ───────────────────
                                            Muestra en dos columnas:
                                              Izquierda (5/12): habilidades, info académica, docs
                                              Derecha (7/12): cronograma FCT con fechas y progreso
                                            ─────────────────────────────────────────────────── */}
                                        {modalTab === 'info' ? (
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10 animate-in fade-in slide-in-from-bottom-6 duration-700 mt-2">

                                                {/* COLUMNA IZQUIERDA: Datos académicos y documentos */}
                                                <div className="md:col-span-5 flex flex-col gap-6 lg:gap-8">

                                                    {/* Sección: Stack Tecnológico / Habilidades */}
                                                    <section className="bg-white dark:bg-zinc-900 p-6 lg:p-8 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-6">
                                                            <div className="size-9 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                                                                <span className="material-symbols-outlined text-[18px]">psychology</span>
                                                            </div>
                                                            <h4 className="font-black text-zinc-400 text-[10px] uppercase tracking-[0.25em]">Stack Tecnológico</h4>
                                                        </div>
                                                        {/* Chips de habilidades extraídas de la cadena separada por comas */}
                                                        <div className="flex flex-wrap gap-2.5">
                                                            {studentDetail.habilidades?.split(',').map((skill: string, i: number) => (
                                                                <span key={i} className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl text-[11px] font-black border border-zinc-200 dark:border-zinc-700 shadow-xs hover:border-indigo-500/50 hover:bg-white dark:hover:bg-zinc-700 transition-all cursor-default uppercase tracking-tight">
                                                                    {skill.trim()}
                                                                </span>
                                                            )) || <p className="text-[11px] text-zinc-400 italic font-medium px-2 uppercase tracking-widest opacity-60">Competencias no detalladas</p>}
                                                        </div>
                                                    </section>

                                                    {/* Sección: Tarjetas de Centro y Empresa */}
                                                    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {/* Tarjeta: Centro educativo */}
                                                        <div className="p-5 bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-4 group/card hover:border-indigo-500/30 transition-all">
                                                            <div className="size-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100/50 dark:border-indigo-500/20 shadow-sm group-hover/card:scale-110 transition-transform">
                                                                <span className="material-symbols-outlined text-[20px]">school</span>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-0.5">Centro</p>
                                                                <p className="text-[11px] lg:text-xs font-black dark:text-white truncate uppercase tracking-tighter">{studentDetail.centro}</p>
                                                            </div>
                                                        </div>

                                                        {/* Tarjeta: Empresa donde hace prácticas */}
                                                        <div className="p-5 bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-4 group/card hover:border-indigo-500/30 transition-all">
                                                            <div className="size-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100/50 dark:border-indigo-500/20 shadow-sm group-hover/card:scale-110 transition-transform">
                                                                <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-0.5">Empresa</p>
                                                                <p className="text-[11px] lg:text-xs font-black dark:text-white truncate uppercase tracking-tighter">{studentDetail.candidatura?.empresa || 'Gestión Activa'}</p>
                                                            </div>
                                                        </div>
                                                    </section>

                                                    {/* Sección: Documentación oficial (CV + Convenio PDF) */}
                                                    <section className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 p-8 space-y-6 shadow-sm overflow-hidden relative">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.25em]">Documentación Oficial</p>
                                                            <span className="material-symbols-outlined text-zinc-300 text-lg">folder_open</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {/* Botón de descarga del CV (solo si tiene CV subido) */}
                                                            {studentDetail.cv && (
                                                                <button
                                                                    onClick={() => window.open(`https://educonect.alwaysdata.net/uploads/cv/${studentDetail.cv}`, '_blank')}
                                                                    className="w-full flex items-center justify-between px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-[22px] group hover:border-indigo-500 hover:bg-white dark:hover:bg-zinc-700 transition-all font-black text-xs uppercase tracking-tighter"
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="size-8 bg-white dark:bg-zinc-900 rounded-lg flex items-center justify-center shadow-sm border border-zinc-100 dark:border-zinc-700">
                                                                            <span className="material-symbols-outlined text-indigo-600 text-lg">description</span>
                                                                        </div>
                                                                        Curriculum Vitae
                                                                    </div>
                                                                    <span className="material-symbols-outlined text-zinc-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all">arrow_forward</span>
                                                                </button>
                                                            )}

                                                            {/* Botón de descarga del convenio PDF
                                                                Solo disponible cuando el estado es VALIDADO
                                                                (ambas firmas completadas) */}
                                                            {studentDetail.candidatura?.estado === 'VALIDADO' && (
                                                                <button
                                                                    onClick={() => window.open(`https://educonect.alwaysdata.net/api/tutor/candidaturas/${studentDetail.candidatura.id}/convenio`, '_blank')}
                                                                    className="w-full flex items-center justify-between px-6 py-4 bg-emerald-500/5 border border-emerald-500/10 rounded-[22px] group hover:border-emerald-500 hover:bg-white dark:hover:bg-emerald-500/10 transition-all font-black text-[10px] uppercase tracking-[0.2em] text-emerald-600"
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="size-8 bg-white dark:bg-zinc-900 rounded-lg flex items-center justify-center shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                                                                            <span className="material-symbols-outlined text-lg">verified_user</span>
                                                                        </div>
                                                                        Anexo FCT
                                                                    </div>
                                                                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">download</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </section>
                                                </div>

                                                {/* COLUMNA DERECHA: Cronograma FCT y estadísticas */}
                                                <div className="md:col-span-7 flex flex-col gap-6 lg:gap-8">
                                                    {/* Tarjeta oscura con el cronograma de prácticas */}
                                                    <section className="bg-zinc-900 text-white p-8 lg:p-10 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col min-h-[420px] lg:min-h-[460px] justify-between group">
                                                        {/* Blobs decorativos de fondo */}
                                                        <div className="absolute -top-10 -right-10 size-80 bg-indigo-500/20 rounded-full blur-[100px] group-hover:bg-indigo-400/30 transition-all duration-700"></div>
                                                        <div className="absolute -bottom-10 -left-10 size-64 bg-purple-500/10 rounded-full blur-[80px]"></div>

                                                        {/* Si el convenio está VALIDADO: mostramos fechas y progreso */}
                                                        {studentDetail.candidatura?.estado === 'VALIDADO' ? (
                                                            <>
                                                                {/* Fechas de inicio y fin de prácticas */}
                                                                <div className="relative">
                                                                    <div className="flex items-center gap-3 mb-8">
                                                                        <div className="size-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                                                                            <span className="material-symbols-outlined text-indigo-400">event_repeat</span>
                                                                        </div>
                                                                        <h4 className="font-black text-[11px] uppercase tracking-[0.3em] text-zinc-400">Cronograma FCT</h4>
                                                                    </div>

                                                                    {/* Grid de fecha inicio / fecha fin */}
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center bg-white/5 p-8 rounded-[32px] border border-white/10">
                                                                        <div className="space-y-2">
                                                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Inicio Prácticas</p>
                                                                            <div className="flex items-end gap-2">
                                                                                <span className="text-4xl font-black">{new Date(studentDetail.candidatura.fechaInicio).getDate()}</span>
                                                                                <div className="pb-1">
                                                                                    <p className="text-[10px] font-semibold tracking-wide leading-none opacity-50">{new Date(studentDetail.candidatura.fechaInicio).toLocaleDateString('es-ES', { month: 'short' })}</p>
                                                                                    <p className="text-[10px] font-black leading-none opacity-30 mt-0.5">{new Date(studentDetail.candidatura.fechaInicio).getFullYear()}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-2 sm:text-right border-t sm:border-t-0 sm:border-l border-white/10 pt-6 sm:pt-0 sm:pl-8">
                                                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Finalización</p>
                                                                            <div className="flex items-end gap-2 sm:justify-end">
                                                                                <div className="pb-1 text-right">
                                                                                    <p className="text-[10px] font-semibold tracking-wide leading-none opacity-50">{new Date(studentDetail.candidatura.fechaFin).toLocaleDateString('es-ES', { month: 'short' })}</p>
                                                                                    <p className="text-[10px] font-black leading-none opacity-30 mt-0.5">{new Date(studentDetail.candidatura.fechaFin).getFullYear()}</p>
                                                                                </div>
                                                                                <span className="text-4xl font-black">{new Date(studentDetail.candidatura.fechaFin).getDate()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Componente TimeProgress: barra de días restantes */}
                                                                <div className="relative mt-8 space-y-4">
                                                                    <div className="flex justify-between items-end mb-2">
                                                                        <p className="text-[11px] font-semibold tracking-wide text-zinc-400">Asistencia Horas</p>
                                                                        <p className="text-[11px] font-black text-indigo-400">VÍNCULO ACTIVO</p>
                                                                    </div>
                                                                    <div className="relative">
                                                                        <TimeProgress start={studentDetail.candidatura.fechaInicio} end={studentDetail.candidatura.fechaFin} />
                                                                    </div>
                                                                </div>

                                                                {/* Datos adicionales: horario y duración */}
                                                                <div className="grid grid-cols-2 gap-4 mt-8 relative">
                                                                    <div className="flex items-center gap-4 p-5 bg-white/5 rounded-[24px] border border-white/10">
                                                                        <div className="size-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                                            <span className="material-symbols-outlined text-[20px]">timelapse</span>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Horario</p>
                                                                            <p className="text-sm font-black text-white capitalize">{studentDetail.candidatura.horario}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 p-5 bg-white/5 rounded-[24px] border border-white/10">
                                                                        <div className="size-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                                            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Duración</p>
                                                                            <p className="text-sm font-black text-white uppercase">{studentDetail.candidatura.tipoDuracion?.replace('_', ' ')}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            /* Si el convenio NO está validado: mensaje de espera */
                                                            <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center px-12 space-y-6">
                                                                <div className="size-20 bg-white/5 border border-white/10 rounded-[30px] flex items-center justify-center text-zinc-700">
                                                                    <span className="material-symbols-outlined text-4xl">calendar_today</span>
                                                                </div>
                                                                <div>
                                                                    <h5 className="font-black text-xl text-white tracking-tight uppercase">Esperando Validación</h5>
                                                                    <p className="text-[11px] font-medium text-zinc-400 mt-2 leading-relaxed opacity-60 uppercase tracking-widest">El cronograma se activará cuando la candidatura sea formalizada.</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </section>
                                                </div>
                                            </div>

                                        ) : (
                                            /* ┌─ SUBPESTAÑA: DIARIO DE PRÁCTICAS ──────────────────
                                               Muestra el calendario mensual del alumno con
                                               un indicador de color por día según si hay o no
                                               actividad registrada. Debajo aparece la lista
                                               detallada de cada actividad con:
                                                 - Estado (PENDIENTE / APROBADO / RECHAZADO)
                                                 - Texto de la actividad con modalidad
                                                 - Área de feedback + botones de validación
                                               ─────────────────────────────────────────────────── */
                                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">

                                                {/* Encabezado: título + contador de progreso de horas */}
                                                <div className="flex justify-between items-end gap-4">
                                                    <div>
                                                        <h4 className="font-black text-zinc-400 text-[10px] uppercase tracking-[0.25em] mb-1">Bitácora de Seguimiento</h4>
                                                        <p className="text-zinc-500 dark:text-zinc-400 text-[11px] lg:text-xs">Registro detallado de actividades laborales y competencias</p>
                                                    </div>
                                                    {/* Contador de horas aprobadas respecto al objetivo */}
                                                    <div className="relative group shrink-0">
                                                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 blur-sm opacity-10 group-hover:opacity-30 transition-opacity"></div>
                                                        <div className="relative px-5 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white text-[11px] font-black shadow-sm flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-indigo-600 text-lg">analytics</span>
                                                            {/* Suma de horas de entradas aprobadas / objetivo total */}
                                                            <span className="tracking-tighter uppercase">PROGRESO: {diarioEntries.filter(e => e.estado === 'APROBADO').reduce((acc, curr: any) => acc + curr.horas, 0)}h / 370h</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Estado de carga del diario */}
                                                {loadingDiario ? (
                                                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                                                        <span className="material-symbols-outlined animate-spin text-indigo-600 text-5xl">progress_activity</span>
                                                        <p className="text-xs font-semibold tracking-wide text-zinc-400">Sincronizando diario...</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-10">

                                                        {/* ── CALENDARIO GRID ──────────────────────
                                                            Cuadrícula de 7 columnas (lun-dom) con
                                                            todos los días del mes actual.
                                                            Cada celda se colorea según:
                                                              - Festivo → badge rojo
                                                              - Con actividad → azul/verde según estado
                                                              - Sin actividad → placeholder (+)
                                                              - Fuera del período → opacidad reducida */}
                                                        <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col">
                                                            {/* Header del calendario: navegación de meses */}
                                                            <div className="p-6 lg:p-8 bg-linear-to-r from-indigo-800 via-indigo-600 to-indigo-900 text-white flex items-center justify-between">
                                                                <div className="flex items-center gap-6">
                                                                    <div className="flex items-center gap-2">
                                                                        {/* Botón mes anterior */}
                                                                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="size-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 hover:scale-110 active:scale-90 transition-all border border-white/10 group">
                                                                            <span className="material-symbols-outlined text-base group-hover:-translate-x-0.5 transition-transform">chevron_left</span>
                                                                        </button>
                                                                        {/* Botón mes siguiente */}
                                                                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="size-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 hover:scale-110 active:scale-90 transition-all border border-white/10 group">
                                                                            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">chevron_right</span>
                                                                        </button>
                                                                    </div>
                                                                    <div>
                                                                        {/* Nombre del mes y año actuales */}
                                                                        <h3 className="text-xl font-black tracking-tight uppercase drop-shadow-sm">{currentMonth.toLocaleDateString('es-ES', { month: 'long' })}</h3>
                                                                        <p className="text-[10px] font-semibold tracking-wide tracking-[0.2em] opacity-60 leading-none mt-1">{currentMonth.getFullYear()}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    {/* Indicador de acceso en vivo */}
                                                                    <div className="hidden sm:flex px-3 py-1 bg-white/10 rounded-full border border-white/10 items-center gap-2">
                                                                        <div className="size-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                                                                        <span className="text-[9px] font-semibold tracking-wide leading-none">Acceso en Vivo</span>
                                                                    </div>
                                                                    {/* Botón para volver al mes actual */}
                                                                    <button onClick={() => setCurrentMonth(new Date())} className="px-5 py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-semibold tracking-wide hover:bg-indigo-50 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10">Hoy</button>
                                                                </div>
                                                            </div>

                                                            {/* Fila de nombres de días de la semana */}
                                                            <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                                                                {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map(d => (
                                                                    <div key={d} className="p-3 text-center text-[9px] font-semibold tracking-wide text-zinc-500">{d}</div>
                                                                ))}
                                                            </div>

                                                            {/* Celdas del calendario (7 columnas × n semanas) */}
                                                            <div className="grid grid-cols-7 auto-rows-[110px] lg:auto-rows-[125px]">
                                                                {getDaysInMonth(currentMonth).map((day, idx) => {
                                                                    // Celda vacía (antes del día 1 del mes)
                                                                    if (!day) return <div key={`empty-${idx}`} className="border-r border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/20"></div>;

                                                                    // Formateamos la fecha como 'YYYY-MM-DD' para comparar
                                                                    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

                                                                    const holiday = HOLIDAYS_ANDALUCIA_2026[dateStr];             // Festivo en esta fecha
                                                                    const entry = diarioEntries.find((e: any) => e.fecha === dateStr); // Actividad registrada en esta fecha
                                                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;    // Sábado o domingo
                                                                    const isToday = new Date().toDateString() === day.toDateString(); // ¿Es el día de hoy?
                                                                    const withinRange = isWithinRange(day);                        // ¿Está en el período de prácticas?

                                                                    return (
                                                                        <div
                                                                            key={dateStr}
                                                                            onClick={() => {
                                                                                // Al hacer clic en un día, actualizamos el día seleccionado
                                                                                setSelectedDayInfo({ day, entry, holiday });
                                                                                // Si hay una actividad, hacemos scroll hasta su entrada en la lista
                                                                                if (entry) {
                                                                                    const el = document.getElementById(`entry-${entry.id}`);
                                                                                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                                                                                }
                                                                            }}
                                                                            className={`p-3 lg:p-4 border-r border-b border-zinc-100 dark:border-zinc-800 relative group transition-all duration-300 cursor-pointer ${isWeekend ? 'bg-zinc-50/50 dark:bg-zinc-800/20' : 'bg-white dark:bg-zinc-900'} ${!withinRange ? 'opacity-20' : ''} hover:bg-zinc-50 dark:hover:bg-zinc-800/50`}
                                                                        >
                                                                            <div className="flex justify-between items-start mb-2 lg:mb-3">
                                                                                {/* Número del día con estilo especial si es hoy o festivo */}
                                                                                <span className={`text-[10px] lg:text-xs font-black size-6 lg:size-7 flex items-center justify-center rounded-xl transition-all ${isToday ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white shadow-lg shadow-indigo-600/30' : holiday ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>{day.getDate()}</span>
                                                                                {/* Indicador de actividad registrada */}
                                                                                {entry && (
                                                                                    <div className="flex gap-1">
                                                                                        <span className={`size-2 rounded-full ${entry.estado === 'APROBADO' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-bounce'}`}></span>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Contenido de la celda según el tipo de día */}
                                                                            <div className="flex flex-col gap-1.5 lg:gap-2">
                                                                                {holiday ? (
                                                                                    /* Festivo: badge rojo con nombre del festivo */
                                                                                    <div className="px-2 py-0.5 bg-red-100 dark:bg-red-500/10 rounded-lg text-red-600 dark:text-red-400 text-[7px] lg:text-[8px] font-semibold tracking-wideer truncate">
                                                                                        {holiday.label}
                                                                                    </div>
                                                                                ) : (withinRange && !isWeekend) ? (
                                                                                    entry ? (() => {
                                                                                        /* Día con actividad registrada: mini-tarjeta de resumen */
                                                                                        const { modality, cleanText } = parseActivity(entry.actividad);
                                                                                        const isPresencial = modality === 'PRESENCIAL';
                                                                                        // Color según estado de validación
                                                                                        const colorClass = entry.estado === 'APROBADO'
                                                                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                                                            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';

                                                                                        return (
                                                                                            <div className={`p-2 lg:p-2.5 rounded-xl lg:rounded-2xl border transition-all duration-300 group-hover:-translate-y-1 shadow-sm group-hover:shadow-md ${colorClass}`}>
                                                                                                <div className="flex justify-between items-center mb-1 lg:mb-1.5">
                                                                                                    <span className="text-[10px] font-semibold tracking-wideer">{entry.horas}h</span>
                                                                                                    <span className="material-symbols-outlined text-[14px] opacity-60">
                                                                                                        {/* Icono según modalidad de trabajo */}
                                                                                                        {isPresencial ? 'business' : 'home_work'}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <p className="text-[7px] lg:text-[8px] font-bold leading-tight line-clamp-2 opacity-80">
                                                                                                    {cleanText}
                                                                                                </p>
                                                                                            </div>
                                                                                        );
                                                                                    })() : (
                                                                                        /* Día sin actividad: icono "+" en hover para invitar a registrar */
                                                                                        <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                                                            <span className="material-symbols-outlined text-zinc-200 dark:text-zinc-700 text-lg">add_circle</span>
                                                                                        </div>
                                                                                    )
                                                                                ) : null /* Fines de semana y días fuera de rango: celda vacía */}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* ── LISTA DE ACTIVIDADES CON VALIDACIÓN ──
                                                            Lista de todas las entradas del diario del
                                                            alumno. Para cada entrada PENDIENTE, el
                                                            tutor puede:
                                                              - Escribir un feedback/comentario
                                                              - Aprobar la actividad
                                                              - Solicitar revisión (rechazar)
                                                            Las entradas ya validadas muestran el
                                                            feedback que el tutor dejó. */}
                                                        <div className="space-y-4">
                                                            {diarioEntries.length === 0 ? (
                                                                /* Estado vacío: el alumno no ha registrado nada */
                                                                <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-800/20 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                                                                    <p className="text-sm font-bold text-zinc-500">Sin actividades registradas.</p>
                                                                </div>
                                                            ) : (
                                                                diarioEntries.map((entry: any) => (
                                                                    /* Tarjeta de actividad del diario */
                                                                    <div
                                                                        key={entry.id}
                                                                        id={`entry-${entry.id}`} // ID para hacer scroll desde el calendario
                                                                        className="bg-white dark:bg-zinc-900/40 p-6 lg:p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800 group hover:shadow-2xl hover:border-indigo-500/30 transition-all scroll-mt-6 relative overflow-hidden"
                                                                    >
                                                                        {/* Decoración de fondo */}
                                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>

                                                                        <div className="relative flex flex-col md:flex-row justify-between gap-6">
                                                                            <div className="flex-1">
                                                                                {/* Cabecera de la actividad: fecha + estado + horas */}
                                                                                <div className="flex items-center gap-5 mb-6">
                                                                                    {/* Calendario mini con el día de la actividad */}
                                                                                    <div className="size-14 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex flex-col items-center justify-center border border-zinc-100 dark:border-zinc-700 shadow-sm group-hover:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 group-hover:scale-110 group-hover:rotate-3">
                                                                                        <span className="text-[10px] font-black text-zinc-400 uppercase leading-none group-hover:text-white/70 tracking-tighter">{new Date(entry.fecha).toLocaleDateString('es-ES', { month: 'short' })}</span>
                                                                                        <span className="text-xl font-black text-zinc-800 dark:text-white leading-none group-hover:text-white mt-1">{new Date(entry.fecha).getDate()}</span>
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <div className="flex flex-wrap items-center gap-3 mb-1.5">
                                                                                            {/* Badge de estado: APROBADO (verde) / RECHAZADO (rojo) / PENDIENTE (ámbar animado) */}
                                                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-semibold tracking-wide border border-current transition-colors ${entry.estado === 'APROBADO' ? 'bg-emerald-500/10 text-emerald-500' : entry.estado === 'RECHAZADO' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500 animate-pulse'}`}>
                                                                                                {entry.estado}
                                                                                            </span>
                                                                                            {/* Horas registradas en esta jornada */}
                                                                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 dark:bg-zinc-800 rounded-full border border-zinc-100 dark:border-zinc-700">
                                                                                                <span className="material-symbols-outlined text-[14px] text-zinc-400">schedule</span>
                                                                                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{entry.horas}h registradas</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        {/* Nombre del día de la semana */}
                                                                                        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">{new Date(entry.fecha).toLocaleDateString('es-ES', { weekday: 'long' })}</p>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Texto de la actividad renderizado con modalidad */}
                                                                                <div className="text-sm dark:text-zinc-200 leading-relaxed font-medium pl-2 border-l-2 border-zinc-100 dark:border-zinc-800 ml-7 mb-4">
                                                                                    {renderActivity(entry.actividad)}
                                                                                </div>

                                                                                {/* Área de validación: solo visible si la actividad está PENDIENTE */}
                                                                                {entry.estado === 'PENDIENTE' && (
                                                                                    <div className="mt-8 ml-0 lg:ml-7 bg-indigo-50/30 dark:bg-indigo-500/5 p-6 rounded-[28px] border border-indigo-100 dark:border-indigo-500/10 space-y-5">
                                                                                        <div className="flex items-center gap-2 mb-1">
                                                                                            <span className="material-symbols-outlined text-indigo-500 text-lg">rate_review</span>
                                                                                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Validación de Actividad</p>
                                                                                        </div>

                                                                                        {/* Textarea para el comentario/feedback del tutor */}
                                                                                        <textarea
                                                                                            placeholder="Escribe un comentario o feedback para el alumno..."
                                                                                            value={bitacoraFeedback[entry.id] || ''}
                                                                                            onChange={(e) => setBitacoraFeedback({ ...bitacoraFeedback, [entry.id]: e.target.value })}
                                                                                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none shadow-sm transition-all min-h-[100px]"
                                                                                        ></textarea>

                                                                                        {/* Botones de decisión: Aprobar / Solicitar Revisión */}
                                                                                        <div className="flex flex-col sm:flex-row gap-3">
                                                                                            <button
                                                                                                onClick={() => handleValidarDiario(entry.id, 'APROBADO')}
                                                                                                className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white text-[10px] font-semibold tracking-wide tracking-[0.2em] rounded-xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3 group/btn"
                                                                                            >
                                                                                                <span className="material-symbols-outlined text-[20px] group-hover/btn:rotate-12 transition-transform">verified</span>
                                                                                                Aprobar Actividad
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleValidarDiario(entry.id, 'RECHAZADO')}
                                                                                                className="flex-1 py-3.5 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold tracking-wide tracking-[0.2em] rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all border border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-3"
                                                                                            >
                                                                                                <span className="material-symbols-outlined text-[20px]">block</span>
                                                                                                Solicitar Revisión
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {/* Feedback previo del tutor (si existe y la actividad ya fue validada) */}
                                                                                {entry.observaciones && (
                                                                                    <div className="mt-6 ml-0 lg:ml-7 p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border-l-[3px] border-indigo-500/50 flex gap-4">
                                                                                        <span className="material-symbols-outlined text-indigo-500/50 text-base shrink-0">chat_bubble</span>
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Tu Feedback</p>
                                                                                            <p className="text-xs italic text-zinc-600 dark:text-zinc-300">"{entry.observaciones}"</p>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Footer del modal de expediente ──────────────────
                                        Muestra un enlace de soporte y el botón de cierre */}
                                    <div className="p-8 border-t border-zinc-100 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                                        <div className="flex items-center gap-2 group/help cursor-pointer">
                                            <span className="material-symbols-outlined text-indigo-500 group-hover:scale-110 transition-transform font-bold">contact_support</span>
                                            <span className="text-[10px] font-semibold tracking-wide text-zinc-400 group-hover:text-indigo-600 transition-colors">Ayuda • Soporte Técnico</span>
                                        </div>
                                        <button
                                            onClick={() => setIsDetailModalOpen(false)}
                                            className="w-full sm:w-auto px-10 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold tracking-wide tracking-[0.2em] rounded-[22px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 dark:shadow-white/5"
                                        >
                                            Cerrar Expediente
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════════
                    MODAL B: FIRMA DEL CONVENIO FCT (Wizard de 2 pasos)
                    ════════════════════════════════════════════════════
                    Pequeño modal centrado con dos pasos:

                    PASO 1 – Revisión del convenio:
                      Muestra los datos del alumno y centro, y un aviso
                      informativo sobre el compromiso que implica firmar.
                      Botón: "Ir a Firmar" → avanza al paso 2

                    PASO 2 – Firma digital:
                      Lienzo de firma (SignaturePad) donde el tutor
                      dibuja su firma con el ratón/dedo.
                      Botón: "Finalizar y Validar" (deshabilitado si no hay firma)
                              → llama a handleSign() que envía la firma al backend

                    Solo se abre cuando:
                      - `isValModalOpen` es true
                      - `candidaturaToSign` tiene datos del alumno
                    ════════════════════════════════════════════════════ */}
                {isValModalOpen && candidaturaToSign && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-400">

                            {/* Cabecera del modal con degradado verde */}
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-emerald-500 to-teal-600 text-white">
                                <h3 className="text-2xl font-black flex items-center gap-3">
                                    <span className="material-symbols-outlined text-3xl">assignment_turned_in</span>
                                    {/* Título cambia según el paso actual */}
                                    {valStep === 1 ? 'Revisión Convenio' : 'Firma del Tutor'}
                                </h3>
                                <p className="opacity-90 text-sm mt-1 font-medium">
                                    {valStep === 1 ? 'Confirma los detalles antes de plasmar tu firma' : 'Dibuja tu firma en el recuadro inferior'}
                                </p>
                            </div>

                            {/* Cuerpo del modal */}
                            <div className="p-8 space-y-6">
                                {valStep === 1 ? (
                                    <>
                                        {/* PASO 1: Grid de datos del alumno para revisión */}
                                        <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alumno</p>
                                                <p className="font-bold text-sm dark:text-white">{candidaturaToSign.nombre}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Centro</p>
                                                <p className="font-bold text-sm dark:text-white">{candidaturaToSign.centro}</p>
                                            </div>
                                        </div>

                                        {/* Aviso informativo sobre el compromiso de la firma */}
                                        <div className="space-y-3">
                                            <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 flex items-start gap-3">
                                                <span className="material-symbols-outlined text-indigo-500 mt-0.5">info</span>
                                                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                                                    Al validar este convenio, confirmas que el plan de formación es adecuado y te comprometes a tutorizar al alumno durante su estancia.
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* PASO 2: Canvas de firma digital */
                                    <div className="space-y-4">
                                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/30">
                                            {/* SignaturePad captura la firma y la devuelve como base64 PNG */}
                                            <SignaturePad onSave={(data) => setSignature(data)} onClear={() => setSignature(null)} />
                                        </div>
                                        {/* Mensaje de advertencia si no hay firma aún */}
                                        {!signature && (
                                            <p className="text-[10px] text-center text-amber-500 font-semibold tracking-wide animate-pulse">
                                                Debes realizar tu firma para continuar
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer del modal con botones de acción */}
                            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 flex gap-3">
                                {/* Botón cancelar: cierra el modal sin firmar */}
                                <button
                                    onClick={() => setIsValModalOpen(false)}
                                    className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-100 transition-all border border-slate-200 dark:border-slate-700"
                                >
                                    Cancelar
                                </button>

                                {valStep === 1 ? (
                                    /* PASO 1: Botón para avanzar al lienzo de firma */
                                    <button
                                        onClick={() => setValStep(2)}
                                        className="flex-3 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        Ir a Firmar
                                    </button>
                                ) : (
                                    /* PASO 2: Botón de envío final de la firma
                                       Deshabilitado si no hay firma o si está procesando */
                                    <button
                                        disabled={!signature || isSubmitting}
                                        onClick={handleSign}
                                        className="flex-3 py-4 bg-emerald-500 disabled:bg-slate-300 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            /* Estado de carga: spinner mientras se procesa */
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
        </DashboardLayout>
    );
};

// Exportamos el componente para usarlo en el Router de la app
export default TutorEmpresaDashboard;
