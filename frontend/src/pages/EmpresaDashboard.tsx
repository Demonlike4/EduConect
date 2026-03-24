import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NotificationPanel from '../components/NotificationPanel';
import { useUser } from '../context/UserContext';


interface Oferta {
    id: number;
    titulo: string;
    tipo: string;
    tecnologias: string;
    descripcion: string;
    estado: string;
}

interface Candidato {
    id: number;
    nombre: string;
    email: string;
    puesto: string;
    estado: string;
    habilidades?: string;
    cv?: string;
    centro?: string;
    grado?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
}

interface Tutor {
    id: number;
    nombre: string;
    email: string;
    isAprobado: boolean;
}

const TimeProgress = ({ start, end }: { start: string, end: string }) => {
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const now = new Date().getTime();

    const totalDuration = endDate - startDate;
    const timeLeft = endDate - now;
    const progress = Math.max(0, Math.min(100, (1 - (timeLeft / totalDuration)) * 100));
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

    return (
        <div className="flex flex-col items-center">
            <span className="text-2xl font-bold dark:text-white">{daysLeft > 0 ? daysLeft : 0}</span>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Días Restantes</p>
            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1 rounded mt-2 overflow-hidden">
                <div className="bg-primary h-full transition-none" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
};

const EmpresaDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useUser();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'ofertas' | 'candidatos' | 'nueva_oferta' | 'tutores'>('dashboard');
    const [ofertas, setOfertas] = useState<Oferta[]>([]);
    const [candidatos, setCandidatos] = useState<Candidato[]>([]);
    const [tutores, setTutores] = useState<Tutor[]>([]);
    const [loading, setLoading] = useState(true);
    const [empresaName, setEmpresaName] = useState('Mi Empresa');
    const [selectedCandidato, setSelectedCandidato] = useState<Candidato | null>(null);

    // Modal state for validation
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionData, setActionData] = useState({
        candidaturaId: 0,
        tipoDuracion: '1_mes',
        horario: 'manana'
    });

    // Form state
    const [newOffer, setNewOffer] = useState({
        titulo: '',
        tipo: 'Prácticas',
        tecnologias: '',
        descripcion: '',
        ubicacion: '',
        jornada: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (user?.email) {
                try {
                    // Execute all requests in parallel for better performance
                    const [offersRes, candidatesRes, tutorsRes] = await Promise.all([
                        axios.post('http://localhost:8000/api/empresa/ofertas', { email: user.email }),
                        axios.post('http://localhost:8000/api/empresa/candidatos', { email: user.email }),
                        axios.post('http://localhost:8000/api/empresa/tutores/list', { email: user.email })
                    ]);

                    // Process Offers
                    setOfertas(offersRes.data.ofertas || []);
                    if (offersRes.data.empresa) setEmpresaName(offersRes.data.empresa);

                    // Process Candidates
                    if (candidatesRes.data && candidatesRes.data.candidatos) {
                        setCandidatos(candidatesRes.data.candidatos);
                    }

                    // Process Tutors
                    if (tutorsRes.data && tutorsRes.data.tutores) {
                        setTutores(tutorsRes.data.tutores);
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleCreateOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        if (!user?.email) {
            alert("Sesión no válida. Por favor, vuelve a iniciar sesión.");
            setSubmitting(false);
            return;
        }

        try {
            await axios.post('http://localhost:8000/api/empresa/ofertas/create', {
                email: user.email,
                ...newOffer
            });
            alert("Oferta creada con éxito");
            setActiveTab('ofertas');
            // Refresh
            const offersRes = await axios.post('http://localhost:8000/api/empresa/ofertas', { email: user?.email });
            setOfertas(offersRes.data.ofertas || []);
        } catch (error) {
            console.error(error);
            alert("Error al crear oferta");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCandidatoAction = async (id: number, status: string) => {
        if (status === 'ADMITIDO') {
            setActionData({ ...actionData, candidaturaId: id });
            setIsActionModalOpen(true);
            return;
        }

        if (!confirm(`¿Seguro que deseas rechazar este candidato?`)) return;

        try {
            await axios.post('http://localhost:8000/api/empresa/candidatos/action', {
                email: user?.email,
                candidatura_id: id,
                action: status
            });
            alert(`Candidato rechazado`);
            // Refresh
            const candidatesRes = await axios.post('http://localhost:8000/api/empresa/candidatos', { email: user?.email });
            setCandidatos(candidatesRes.data.candidatos || []);
            if (selectedCandidato?.id === id) {
                const updated = candidatesRes.data.candidatos.find((c: any) => c.id === id);
                setSelectedCandidato(updated || null);
            }
        } catch (error) {
            console.error(error);
            alert("Error al procesar candidato");
        }
    };

    const confirmAdmitir = async () => {
        try {
            await axios.post('http://localhost:8000/api/empresa/candidatos/action', {
                email: user?.email,
                candidatura_id: actionData.candidaturaId,
                action: 'ADMITIDO',
                tipoDuracion: actionData.tipoDuracion,
                horario: actionData.horario
            });
            alert(`Alumno admitido correctamente. El calendario ha sido configurado.`);
            setIsActionModalOpen(false);
            // Refresh
            const candidatesRes = await axios.post('http://localhost:8000/api/empresa/candidatos', { email: user?.email });
            setCandidatos(candidatesRes.data.candidatos || []);
            if (selectedCandidato?.id === actionData.candidaturaId) {
                const updated = candidatesRes.data.candidatos.find((c: any) => c.id === actionData.candidaturaId);
                setSelectedCandidato(updated || null);
            }
        } catch (error) {
            console.error(error);
            alert("Error al admitir alumno");
        }
    };

    const handleAprobarTutor = async (tutorId: number) => {
        try {
            await axios.post(`http://localhost:8000/api/empresa/tutores/${tutorId}/aprobar`, {
                email: user?.email
            });
            alert("Tutor aprobado correctamente");
            setTutores(prev => prev.map(t => t.id === tutorId ? { ...t, isAprobado: true } : t));
        } catch (error) {
            console.error(error);
            alert("Error al aprobar tutor");
        }
    };

    const pendingCandidates = useMemo(() => candidatos.filter(c => c.estado === 'POSTULADO'), [candidatos]);
    const validatedCandidatos = useMemo(() => candidatos.filter(c => c.estado === 'VALIDADO' || c.estado === 'ADMITIDO'), [candidatos]);

    const pendingTutors = useMemo(() => tutores.filter(t => !t.isAprobado), [tutores]);
    const activeTutors = useMemo(() => tutores.filter(t => t.isAprobado), [tutores]);
    const activeOffers = useMemo(() => ofertas.filter(o => o.estado === 'Activa'), [ofertas]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>;

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-background-dark text-gray-900 dark:text-gray-100">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-white dark:bg-gray-800 border-r border-[#e0e0e0] dark:border-white/10 flex flex-col shrink-0">
                <div className="p-6 border-b border-[#e0e0e0] dark:border-white/10 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="flex items-center gap-2">
                        <div className="bg-primary p-2 rounded text-white shadow-sm">
                            <span className="material-symbols-outlined text-xl">corporate_fare</span>
                        </div>
                        <h1 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-tight">EduConect</h1>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <button onClick={() => setActiveTab('dashboard')} className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <span className="material-symbols-outlined text-[20px]">dashboard</span>
                        <span className="text-sm">Dashboard</span>
                    </button>
                    <button onClick={() => setActiveTab('ofertas')} className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'ofertas' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <span className="material-symbols-outlined text-[20px]">list_alt</span>
                        <span className="text-sm">Mis Ofertas ({ofertas.length})</span>
                    </button>
                    <button onClick={() => setActiveTab('candidatos')} className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'candidatos' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <span className="material-symbols-outlined text-[20px]">group</span>
                        <span className="text-sm">Candidatos ({pendingCandidates.length})</span>
                    </button>
                    <button onClick={() => setActiveTab('nueva_oferta')} className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'nueva_oferta' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        <span className="text-sm">Publicar Oferta</span>
                    </button>
                    <button onClick={() => setActiveTab('tutores')} className={`flex w-full items-center gap-3 px-3 py-2 rounded text-sm font-medium ${activeTab === 'tutores' ? 'bg-primary text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                        <span className="material-symbols-outlined text-[20px]">supervisor_account</span>
                        <span>Tutores {pendingTutors.length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] size-4 rounded-full flex items-center justify-center font-bold">{pendingTutors.length}</span>}</span>
                    </button>

                </nav>
                <div className="p-4 border-t border-[#e0e0e0] dark:border-white/10">
                    <button onClick={handleLogout} className="flex w-full items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-none">
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        <span className="text-sm font-bold">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-background-dark">
                <header className="h-16 bg-white dark:bg-gray-800 border-b border-[#e0e0e0] dark:border-white/10 flex items-center justify-between px-8">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-bold dark:text-white uppercase tracking-tight">{activeTab.replace('_', ' ')}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 px-4 py-1.5 rounded border border-[#e0e0e0] dark:border-white/5">
                            <div className="text-right">
                                <p className="text-xs font-bold dark:text-white">{empresaName}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Cuentas Empresa</p>
                            </div>
                            <div className="size-8 rounded bg-primary text-white flex items-center justify-center font-bold text-sm">
                                {empresaName.substring(0, 2).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { label: 'Candidatos Nuevos', value: pendingCandidates.length, icon: 'person_add', color: 'blue' },
                                        { label: 'Ofertas Activas', value: activeOffers.length, icon: 'campaign', color: 'green' },
                                        { label: 'Prácticas en Vigor', value: validatedCandidatos.length, icon: 'contract_edit', color: 'purple' },
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <span className={`material-symbols-outlined text-${stat.color}-500 bg-${stat.color}-50 dark:bg-${stat.color}-500/10 p-3 rounded-xl mb-4`}>{stat.icon}</span>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                                            <h3 className="text-2xl font-bold dark:text-white mt-1">{stat.value}</h3>
                                        </div>
                                    ))}
                                </section>

                                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                        <h3 className="font-bold dark:text-white">Seguimiento de Prácticas</h3>
                                    </div>
                                    <div className="p-0 overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                                    <th className="px-6 py-4">Alumno</th>
                                                    <th className="px-6 py-4">Puesto</th>
                                                    <th className="px-6 py-4">Estado</th>
                                                    <th className="px-6 py-4 text-right">Detalles</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {validatedCandidatos.map((c) => (
                                                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div>
                                                                <p className="text-sm font-bold dark:text-white">{c.nombre}</p>
                                                                <p className="text-[10px] text-slate-400">{c.email}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{c.puesto}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.estado === 'VALIDADO' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                                                                {c.estado}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => { setSelectedCandidato(c); setActiveTab('candidatos'); }}
                                                                className="text-primary hover:underline text-xs font-bold"
                                                            >
                                                                Ver Progreso
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {validatedCandidatos.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="text-center py-12 text-slate-400 text-sm italic">No hay prácticas activas actualmente.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </div>

                            <div className="space-y-8">
                                <NotificationPanel 
                                    role="EMPRESA" 
                                    onActionClick={(notif) => {
                                        if (notif.title.includes('Nueva Candidatura')) {
                                            setActiveTab('candidatos');
                                        }
                                    }}
                                />
                                <section className="bg-linear-to-br from-primary to-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <h4 className="text-lg font-bold mb-2">Potencia tu Talento 🚀</h4>
                                        <p className="text-xs text-white/80 mb-6 leading-relaxed">Sigue publicando nuevas ofertas para atraer a los mejores estudiantes de la región.</p>
                                        <button
                                            onClick={() => setActiveTab('nueva_oferta')}
                                            className="w-full bg-white text-primary py-3 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all shadow-lg"
                                        >
                                            Crear Nueva Vacante
                                        </button>
                                    </div>
                                    <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-white/10 text-[120px] group-hover:scale-110 transition-transform duration-700">rocket_launch</span>
                                </section>

                                <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h4 className="font-bold dark:text-white mb-4">Ayuda y Soporte</h4>
                                    <div className="space-y-3">
                                        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border border-slate-50 dark:border-slate-800">
                                            <span className="material-symbols-outlined text-primary">description</span>
                                            <div>
                                                <p className="text-xs font-bold dark:text-white">Guía de Convenios</p>
                                                <p className="text-[10px] text-slate-400">Procesos legales paso a paso</p>
                                            </div>
                                        </button>
                                        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border border-slate-50 dark:border-slate-800">
                                            <span className="material-symbols-outlined text-primary">support_agent</span>
                                            <div>
                                                <p className="text-xs font-bold dark:text-white">Contactar con Centro</p>
                                                <p className="text-[10px] text-slate-400">Resuelve dudas con los tutores</p>
                                            </div>
                                        </button>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {/* MIS OFERTAS TAB */}
                    {activeTab === 'ofertas' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {ofertas.map((o) => (
                                <div key={o.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:border-primary/40 transition-all group">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="px-2 py-0.5 rounded-lg bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/10">{o.tipo}</span>
                                            <span className={`material-symbols-outlined text-lg ${o.estado === 'Activa' ? 'text-green-500' : 'text-slate-300'}`}>check_circle</span>
                                        </div>
                                        <h3 className="font-bold text-lg dark:text-white mb-2 leading-tight group-hover:text-primary transition-colors">{o.titulo}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">{o.descripcion}</p>
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {o.tecnologias?.split(',').map((tag, i) => (
                                                <span key={i} className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 text-[9px] font-bold text-slate-500 dark:text-slate-400">{tag.trim()}</span>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-4">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Estado: {o.estado}</span>
                                            <button className="text-primary text-xs font-bold hover:underline">Gestionar Oferta</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {ofertas.length === 0 && (
                                <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
                                    <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 block">post_add</span>
                                    <p className="text-slate-500 font-medium">No has publicado ninguna oferta todavía.</p>
                                    <button onClick={() => setActiveTab('nueva_oferta')} className="mt-4 text-primary font-bold hover:underline italic">Empieza hoy mismo</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CANDIDATOS TAB */}
                    {activeTab === 'candidatos' && (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-fit">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Listado de Alumnos</h4>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
                                    {candidatos.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelectedCandidato(c)}
                                            className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedCandidato?.id === c.id ? 'bg-primary/5 border-r-4 border-r-primary' : ''}`}
                                        >
                                            <p className={`text-sm font-bold ${selectedCandidato?.id === c.id ? 'text-primary' : 'dark:text-white'}`}>{c.nombre}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{c.puesto}</p>
                                            <span className={`inline-block mt-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${c.estado === 'VALIDADO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{c.estado}</span>
                                        </button>
                                    ))}
                                    {candidatos.length === 0 && (
                                        <div className="p-8 text-center text-xs text-slate-400">Sin candidatos</div>
                                    )}
                                </div>
                            </div>

                            <div className="lg:col-span-3">
                                {selectedCandidato ? (
                                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in zoom-in duration-300">
                                        <div className="p-8 border-b border-slate-200 dark:border-slate-800">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="flex items-center gap-5">
                                                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                                                        {selectedCandidato.nombre.substring(0, 1)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-bold dark:text-white leading-tight">{selectedCandidato.nombre}</h3>
                                                        <p className="text-slate-500 font-medium">Candidato para: <span className="text-primary">{selectedCandidato.puesto}</span></p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    {selectedCandidato.estado === 'POSTULADO' && (
                                                        <>
                                                            <button onClick={() => handleCandidatoAction(selectedCandidato.id, 'RECHAZADO')} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Rechazar</button>
                                                            <button onClick={() => handleCandidatoAction(selectedCandidato.id, 'ADMITIDO')} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">Admitir Alumno</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    <h4 className="font-bold dark:text-white mb-4 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-primary text-xl">contact_mail</span>
                                                        Información del Candidato
                                                    </h4>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-500">Email:</span>
                                                            <span className="font-bold dark:text-white">{selectedCandidato.email}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-500">Grado:</span>
                                                            <span className="font-bold dark:text-white text-right">{selectedCandidato.grado || 'No especificado'}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-500">Centro:</span>
                                                            <span className="font-bold dark:text-white text-right">{selectedCandidato.centro || 'No especificado'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    <h4 className="font-bold dark:text-white mb-4">Habilidades</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedCandidato.habilidades?.split(',').map((skill, i) => (
                                                            <span key={i} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold rounded-lg dark:text-slate-300">
                                                                {skill.trim()}
                                                            </span>
                                                        )) || <p className="text-xs text-slate-400 italic">No especificadas</p>}
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    <h4 className="font-bold dark:text-white mb-4">Estado del Proceso</h4>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-3 rounded-full ${selectedCandidato.estado === 'VALIDADO' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></div>
                                                        <p className="text-sm font-bold dark:text-white">{selectedCandidato.estado}</p>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-2">
                                                        {selectedCandidato.estado === 'POSTULADO' ? 'Revisa su perfil y decide si encaja en el puesto.' :
                                                            selectedCandidato.estado === 'ADMITIDO' ? 'Esperando validación del tutor del centro educativo.' :
                                                                'Convenio activo. El alumno ya puede iniciar sus prácticas.'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center justify-center border-l border-slate-100 dark:border-slate-800 md:pl-8">
                                                {selectedCandidato.estado === 'VALIDADO' ? (
                                                    <TimeProgress start={selectedCandidato.fecha_inicio!} end={selectedCandidato.fecha_fin!} />
                                                ) : (
                                                    <div className="py-8 text-slate-400 text-sm text-center">
                                                        <span className="material-symbols-outlined text-[60px] mb-4 block opacity-30">pending_actions</span>
                                                        <p className="font-black uppercase tracking-widest text-[10px]">Esperando Validación</p>
                                                    </div>
                                                )}

                                                <div className="text-xs text-slate-400 text-center mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl w-full">
                                                    <p className="flex justify-between mb-1"><span>Inicio:</span> <span className="font-bold">{selectedCandidato.fecha_inicio || 'Pendiente'}</span></p>
                                                    <p className="flex justify-between text-primary"><span>Fin:</span> <span className="font-bold">{selectedCandidato.fecha_fin || 'Pendiente'}</span></p>
                                                </div>

                                                <button
                                                    onClick={() => selectedCandidato.cv && window.open(`http://localhost:8000/uploads/cv/${selectedCandidato.cv}`, '_blank')}
                                                    disabled={!selectedCandidato.cv}
                                                    className="w-full mt-6 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                                    Descargar CV
                                                </button>

                                                {selectedCandidato.estado === 'VALIDADO' && (
                                                    <button
                                                        onClick={() => window.open(`http://localhost:8000/api/tutor/candidaturas/${selectedCandidato.id}/convenio`, '_blank')}
                                                        className="w-full mt-3 py-3 px-4 bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">description</span>
                                                        Descargar Convenio
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[500px] bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 opacity-60">
                                        <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">person_search</span>
                                        <p className="text-slate-500 font-medium tracking-wide">Selecciona un candidato para ver su perfil</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* NUEVA OFERTA TAB */}
                    {activeTab === 'nueva_oferta' && (
                        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-500">
                            <div className="p-8 bg-linear-to-r from-primary to-blue-600 text-white">
                                <h3 className="text-2xl font-bold">Publicar Nueva Oferta</h3>
                                <p className="text-white/80 text-sm mt-1">Completa los campos para atraer al mejor talento</p>
                            </div>
                            <form onSubmit={handleCreateOffer} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Título del Puesto</label>
                                        <input
                                            required
                                            value={newOffer.titulo}
                                            onChange={(e) => setNewOffer({ ...newOffer, titulo: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                            placeholder="Ej: Desarrollador Frontend React"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tecnologías (separadas por coma)</label>
                                        <input
                                            required
                                            value={newOffer.tecnologias}
                                            onChange={(e) => setNewOffer({ ...newOffer, tecnologias: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                            placeholder="React, TypeScript, Tailwind"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Descripción detallada</label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={newOffer.descripcion}
                                        onChange={(e) => setNewOffer({ ...newOffer, descripcion: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                                        placeholder="Describe las tareas, requisitos y qué ofrece tu empresa..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Ubicación</label>
                                        <input
                                            required
                                            value={newOffer.ubicacion}
                                            onChange={(e) => setNewOffer({ ...newOffer, ubicacion: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                            placeholder="Madrid / Remoto"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Jornada</label>
                                        <select
                                            value={newOffer.jornada}
                                            onChange={(e) => setNewOffer({ ...newOffer, jornada: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                        >
                                            <option value="">Selecciona una opción</option>
                                            <option value="Completa">Mañana (9:00 - 14:00)</option>
                                            <option value="Parcial">Tarde (15:00 - 20:00)</option>
                                            <option value="Flexible">Híbrida/Flexible</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                                >
                                    {submitting ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">send</span>}
                                    {submitting ? 'Publicando...' : 'Publicar esta Oferta'}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'tutores' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Pendientes */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-black dark:text-white">Validación de Tutores</h3>
                                        <p className="text-sm text-slate-400 mt-1">Nuevos tutores que se han unido a tu empresa</p>
                                    </div>
                                    <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
                                        Pendientes ({pendingTutors.length})
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 px-8">
                                    {pendingTutors.map((t) => (
                                        <div key={t.id} className="py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary text-lg font-black group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                                                    {t.nombre.substring(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-black dark:text-white group-hover:text-primary transition-colors">{t.nombre}</p>
                                                    <p className="text-xs text-slate-400 font-medium">{t.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button className="px-5 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors">Denegar</button>
                                                <button
                                                    onClick={() => handleAprobarTutor(t.id)}
                                                    className="px-8 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95"
                                                >
                                                    Aprobar Acceso
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {pendingTutors.length === 0 && (
                                        <div className="py-20 text-center opacity-40">
                                            <span className="material-symbols-outlined text-6xl mb-4 block text-slate-300">verified</span>
                                            <p className="text-sm font-black uppercase tracking-[0.2em]">No hay solicitudes pendientes</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Validados */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                                    <div>
                                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">Tutores Activos</h3>
                                        <p className="text-sm text-slate-400 mt-1">Equipo de tutorización validado en {empresaName}</p>
                                    </div>
                                    <span className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
                                        Activos ({activeTutors.length})
                                    </span>
                                </div>
                                <div className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {activeTutors.map((t) => (
                                            <div key={t.id} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-4xl border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4">
                                                    <span className="material-symbols-outlined text-emerald-500 text-xl">verified</span>
                                                </div>
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="size-16 rounded-3xl bg-white dark:bg-slate-900 flex items-center justify-center text-primary text-xl font-black shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                                        {t.nombre.substring(0, 1).toUpperCase()}
                                                    </div>
                                                    <h4 className="font-black dark:text-white leading-tight">{t.nombre}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 mb-4">{t.email}</p>

                                                    <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                                                        <button className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl transition-all">Ver Actividad</button>
                                                        <button className="px-3 py-2 text-slate-400 hover:text-red-500 transition-colors">
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {activeTutors.length === 0 && (
                                        <div className="py-20 text-center opacity-40">
                                            <p className="text-sm font-black uppercase tracking-[0.2em]">No hay tutores activos todavía</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}


                </div>
            </main>

            {/* MODAL PARA VALIDACIÓN DE CALENDARIO */}
            {isActionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-2xl font-black dark:text-white flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-3xl">calendar_month</span>
                                Configurar Prácticas
                            </h3>
                            <p className="text-slate-500 mt-2">Define los detalles del período de formación antes de admitir al alumno.</p>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* DURACIÓN */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Duración de las prácticas</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setActionData({ ...actionData, tipoDuracion: '1_mes' })}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${actionData.tipoDuracion === '1_mes' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                                    >
                                        <span className="material-symbols-outlined mb-1">event</span>
                                        <span className="font-bold">1 Mes</span>
                                    </button>
                                    <button
                                        onClick={() => setActionData({ ...actionData, tipoDuracion: '2_meses' })}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${actionData.tipoDuracion === '2_meses' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                                    >
                                        <span className="material-symbols-outlined mb-1">calendar_month</span>
                                        <span className="font-bold">2 Meses</span>
                                    </button>
                                </div>
                            </div>

                            {/* HORARIO */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Horario de jornada (8h total)</label>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setActionData({ ...actionData, horario: 'manana' })}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${actionData.horario === 'manana' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined">light_mode</span>
                                            <div className="text-left">
                                                <p className="font-bold">Turno de Mañana</p>
                                                <p className="text-[10px] opacity-70 italic">8:00 - 17:00 (1h de descanso)</p>
                                            </div>
                                        </div>
                                        {actionData.horario === 'manana' && <span className="material-symbols-outlined">check_circle</span>}
                                    </button>

                                    <button
                                        onClick={() => setActionData({ ...actionData, horario: 'tarde' })}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${actionData.horario === 'tarde' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined">dark_mode</span>
                                            <div className="text-left">
                                                <p className="font-bold">Turno de Tarde</p>
                                                <p className="text-[10px] opacity-70 italic">14:00 - 23:00 (1h de descanso)</p>
                                            </div>
                                        </div>
                                        {actionData.horario === 'tarde' && <span className="material-symbols-outlined">check_circle</span>}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
                            <button
                                onClick={() => setIsActionModalOpen(false)}
                                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmAdmitir}
                                className="flex-2 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                            >
                                Confirmar y Admitir
                                <span className="material-symbols-outlined text-[20px]">send</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmpresaDashboard;
