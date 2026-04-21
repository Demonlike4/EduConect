import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NotificationPanel from '../components/NotificationPanel';
import { useUser } from '../context/UserContext';
import { apiUrl, assetUrl } from '../lib/urls.ts';
import DashboardLayout from '../components/layout/DashboardLayout';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/SkeletonCard';

interface Oferta {
    id: number;
    titulo: string;
    tipo: string;
    tecnologias: string;
    descripcion: string;
    estado: string;
    ubicacion?: string;
    jornada?: string;
    horario?: string;
    color?: string;
    imagen?: string;
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
    foto?: string | null;
}

interface Tutor {
    id: number;
    nombre: string;
    email: string;
    isAprobado: boolean;
}

interface EmpresaProfile {
    nombre: string;
    cif: string;
    descripcion: string;
    logo: string | null;
    web: string | null;
    linkedin: string | null;
    twitter: string | null;
    instagram: string | null;
    ubicacion: string | null;
    tecnologias: string[];
    beneficios: string[];
    email: string;
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
        <div className="flex flex-col items-center w-full px-6">
            <span className="text-4xl font-black text-white tracking-tighter mb-1">{daysLeft > 0 ? daysLeft : 0}</span>
            <p className="text-[10px] font-semibold tracking-wide tracking-[0.2em] text-indigo-300 opacity-80 mb-6">Días de Formación Restantes</p>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 relative">
                <div
                    className="bg-gradient-to-r from-indigo-500 to-indigo-300 h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};

const EmpresaDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useUser();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'ofertas' | 'candidatos' | 'nueva_oferta' | 'tutores' | 'perfil'>('dashboard');
    const [ofertas, setOfertas] = useState<Oferta[]>([]);
    const [candidatos, setCandidatos] = useState<Candidato[]>([]);
    const [tutores, setTutores] = useState<Tutor[]>([]);
    const [loading, setLoading] = useState(true);
    const [empresaName, setEmpresaName] = useState('Mi Empresa');
    const [selectedCandidato, setSelectedCandidato] = useState<Candidato | null>(null);
    const [profile, setProfile] = useState<EmpresaProfile | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [newTech, setNewTech] = useState('');
    const [newBenefit, setNewBenefit] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal state for validation
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionData, setActionData] = useState({
        candidaturaId: 0,
        tipoDuracion: '1_mes',
        horario: 'manana',
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Form state
    const [newOffer, setNewOffer] = useState({
        titulo: '',
        tipo: 'Prácticas',
        tecnologias: '',
        descripcion: '',
        ubicacion: '',
        jornada: 'Completa',
        horario: '08:00 - 15:00',
        color: '#6366f1',
        imagen: ''
    });
    const [editingOfertaId, setEditingOfertaId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const performanceStats = useMemo(() => {
        if (!profile) return [
            { label: 'Visibilidad Academia', value: '0k pts', progress: 0, color: 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30' },
            { label: 'Tasa de Conversión', value: '0%', progress: 0, color: 'bg-emerald-500' },
            { label: 'Retención Talento', value: '0%', progress: 0, color: 'bg-amber-500' }
        ];

        // 1. Visibilidad (Profile Completion score)
        const fields = [
            profile.descripcion, profile.logo, profile.web,
            profile.linkedin, profile.twitter, profile.instagram,
            profile.ubicacion, profile.tecnologias.length > 0,
            profile.beneficios.length > 0
        ];
        const completedCount = fields.filter(f => !!f).length;
        const visibilityProgress = Math.round((completedCount / fields.length) * 100);
        // Base points for profile + bonus for each offer and candidate
        const visibilityPts = (completedCount * 450) + (ofertas.length * 150) + (candidatos.length * 50);

        // 2. Conversion (Admitted / Total Candidates)
        const totalCandidates = candidatos.length;
        const admittedCandidates = candidatos.filter(c => c.estado === 'ADMITIDO' || c.estado === 'VALIDADO').length;
        const conversionRate = totalCandidates > 0 ? Math.round((admittedCandidates / totalCandidates) * 100) : 0;

        // 3. Retention (Simulated logic based on non-rejected applications)
        const rejectedCandidates = candidatos.filter(c => c.estado === 'RECHAZADO').length;
        const retentionRate = totalCandidates > 0
            ? Math.round(((totalCandidates - rejectedCandidates) / totalCandidates) * 100)
            : 98; // Default to 98% for new companies to look premium

        return [
            { label: 'Visibilidad Academia', value: `${(visibilityPts / 1000).toFixed(1)}k pts`, progress: visibilityProgress, color: 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30' },
            { label: 'Tasa de Conversión', value: `${conversionRate}%`, progress: conversionRate, color: 'bg-emerald-500' },
            { label: 'Retención Talento', value: `${retentionRate}%`, progress: retentionRate, color: 'bg-amber-500' }
        ];
    }, [profile, ofertas, candidatos]);

    useEffect(() => {
        const fetchData = async () => {
            if (user?.email) {
                try {
                    // Execute all requests in parallel for better performance
                    const [offersRes, candidatesRes, tutorsRes, profileRes] = await Promise.all([
                        axios.post(apiUrl('/api/empresa/ofertas'), { email: user.email }),
                        axios.post(apiUrl('/api/empresa/candidatos'), { email: user.email }),
                        axios.post(apiUrl('/api/empresa/tutores/list'), { email: user.email }),
                        axios.post(apiUrl('/api/empresa/profile'), { email: user.email })
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

                    // Process Profile
                    if (profileRes.data) {
                        setProfile(profileRes.data);
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

    const handleProfileUpdate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!user?.email || !profile) return;
        setSubmitting(true);
        try {
            const res = await axios.post(apiUrl('/api/empresa/profile/update'), {
                ...profile
            });
            alert(res.data.message || "Perfil actualizado correctamente");
            setIsEditingProfile(false);
        } catch (error) {
            console.error("Error updating profile", error);
            alert("Error al actualizar perfil");
        } finally {
            setSubmitting(false);
        }
    };

    const addTech = () => {
        if (newTech.trim() && profile) {
            if (!profile.tecnologias.includes(newTech.trim())) {
                setProfile({ ...profile, tecnologias: [...profile.tecnologias, newTech.trim()] });
            }
            setNewTech('');
        }
    };

    const removeTech = (tech: string) => {
        if (profile) {
            setProfile({ ...profile, tecnologias: profile.tecnologias.filter(t => t !== tech) });
        }
    };

    const addBenefit = () => {
        if (newBenefit.trim() && profile) {
            if (!profile.beneficios.includes(newBenefit.trim())) {
                setProfile({ ...profile, beneficios: [...profile.beneficios, newBenefit.trim()] });
            }
            setNewBenefit('');
        }
    };

    const removeBenefit = (benefit: string) => {
        if (profile) {
            setProfile({ ...profile, beneficios: profile.beneficios.filter(b => b !== benefit) });
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.email) return;

        const formData = new FormData();
        formData.append('logo', file);
        formData.append('email', user.email);

        setSubmitting(true);
        try {
            const res = await axios.post(apiUrl('/api/empresa/profile/logo-upload'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.logo && profile) {
                setProfile({ ...profile, logo: assetUrl(res.data.logo) });
                alert("Logo actualizado correctamente");
            }
        } catch (error) {
            console.error("Error uploading logo", error);
            alert("Error al subir el logo");
        } finally {
            setSubmitting(false);
        }
    };

    const handleOfferImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('imagen', file);

        setSubmitting(true);
        try {
            const res = await axios.post(apiUrl('/api/empresa/ofertas/upload-image'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setNewOffer(prev => ({ ...prev, imagen: res.data.filename }));
        } catch (error) {
            console.error('Error uploading offer image:', error);
            alert('Error al subir la imagen');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleEditOffer = (oferta: Oferta) => {
        setEditingOfertaId(oferta.id);
        setNewOffer({
            titulo: oferta.titulo,
            tipo: oferta.tipo,
            tecnologias: oferta.tecnologias,
            descripcion: oferta.descripcion,
            ubicacion: oferta.ubicacion || '',
            jornada: oferta.jornada || 'Completa',
            horario: oferta.horario || '08:00 - 15:00',
            color: oferta.color || '#6366f1',
            imagen: oferta.imagen || ''
        });
        setActiveTab('nueva_oferta');
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
            if (editingOfertaId) {
                // UPDATE existing offer
                await axios.post(apiUrl(`/api/empresa/ofertas/${editingOfertaId}/update`), {
                    email: user.email,
                    ...newOffer
                });
                alert('Oferta actualizada con éxito');
            } else {
                // CREATE new offer
                await axios.post(apiUrl('/api/empresa/ofertas/create'), {
                    email: user.email,
                    ...newOffer
                });
                alert('Oferta creada con éxito');
            }
            // Reset & refresh
            setEditingOfertaId(null);
            setNewOffer({ titulo: '', tipo: 'Prácticas', tecnologias: '', descripcion: '', ubicacion: '', jornada: 'Completa', horario: '08:00 - 15:00', color: '#6366f1', imagen: '' });
            setActiveTab('ofertas');
            const offersRes = await axios.post(apiUrl('/api/empresa/ofertas'), { email: user?.email });
            setOfertas(offersRes.data.ofertas || []);
        } catch (error) {
            console.error(error);
            alert('Error al guardar la oferta');
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
            await axios.post(apiUrl('/api/empresa/candidatos/action'), {
                email: user?.email,
                candidatura_id: id,
                action: status
            });
            alert(`Candidato rechazado`);
            // Refresh
            const candidatesRes = await axios.post(apiUrl('/api/empresa/candidatos'), { email: user?.email });
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
            await axios.post(apiUrl('/api/empresa/candidatos/action'), {
                email: user?.email,
                candidatura_id: actionData.candidaturaId,
                action: 'ADMITIDO',
                tipoDuracion: actionData.tipoDuracion,
                horario: actionData.horario
            });
            alert(`Alumno admitido correctamente. El calendario ha sido configurado.`);
            setIsActionModalOpen(false);
            // Refresh
            const candidatesRes = await axios.post(apiUrl('/api/empresa/candidatos'), { email: user?.email });
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
            await axios.post(apiUrl(`/api/empresa/tutores/${tutorId}/aprobar`), {
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

    return (
        <DashboardLayout
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            sidebarWidthClass="w-80"
            sidebarClassName="bg-zinc-950 text-white"
            zIndexSidebarClass="z-[70]"
            sidebar={
                <>
                {/* Logo Section */}
                <div className="p-8 border-b border-white/5 bg-zinc-950 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 rotate-3 group-hover:rotate-0 transition-transform duration-500 ring-4 ring-indigo-600/10 cursor-pointer" onClick={() => navigate('/')}>
                            <span className="material-symbols-outlined text-white text-3xl font-light">corporate_fare</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">EduConect</h1>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1.5 opacity-80 font-display">Portal Empresa</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-6 space-y-2 mt-4">
                    <p className="px-4 py-2 text-[9px] font-black text-indigo-300/30 uppercase tracking-[0.3em] mb-2">Monitorización</p>
                    {[
                        { id: 'dashboard', label: 'Estadísticas', icon: 'analytics' },
                        { id: 'ofertas', label: 'Vacantes FCT', icon: 'format_list_bulleted', count: ofertas.length },
                        { id: 'candidatos', label: 'Candidaturas', icon: 'badge', count: pendingCandidates.length },
                        { id: 'nueva_oferta', label: 'Nueva Oferta', icon: 'add_card' },
                        { id: 'tutores', label: 'Gestión Tutores', icon: 'assignment_ind', count: pendingTutors.length },
                        { id: 'perfil', label: 'Perfil Empresa', icon: 'business_center' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            //@ts-ignore
                            //@ts-ignore
                            onClick={() => {
                                setActiveTab(item.id as any);
                                setIsSidebarOpen(false);
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
                                <span className="text-sm font-black tracking-tight uppercase tracking-widest">{item.label}</span>
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
                    <div className="flex items-center gap-3 p-1.5 pr-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group">
                        <div className="size-10 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-inner overflow-hidden border border-white/10 group-hover:scale-105 transition-transform duration-500">
                            {profile?.logo ? (
                                <img src={profile.logo} className="w-full h-full object-cover" alt="Perfil Corporativo" />
                            ) : user?.foto ? (
                                <img src={assetUrl(`/uploads/fotos/${user.foto}`)} className="w-full h-full object-cover" alt="Perfil" />
                            ) : (
                                empresaName.substring(0, 2).toUpperCase()
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-white truncate uppercase tracking-tighter leading-none mb-0.5">{empresaName}</p>
                            <p className="text-[8px] font-bold text-zinc-500 truncate uppercase tracking-widest leading-none">Portal Corporativo</p>
                        </div>
                        <button onClick={handleLogout} className="text-zinc-500 hover:text-red-400 transition-colors p-1">
                            <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                        </button>
                    </div>
                </div>
                </>
            }
            header={
                <header className="h-20 lg:h-24 flex items-center justify-between px-6 lg:px-12 shrink-0 z-10 sticky top-0" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 1px 20px rgba(99,102,241,0.06)' }}>
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-2 text-zinc-500 hover:text-indigo-600 transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <span className="material-symbols-outlined text-2xl">menu</span>
                        </button>
                        <div>
                            <h2 className="text-sm lg:text-base font-black text-zinc-900 tracking-tight uppercase leading-none">
                                {activeTab === 'dashboard' ? 'Estadísticas' :
                                    activeTab === 'ofertas' ? 'Vacantes' :
                                        activeTab === 'candidatos' ? 'Candidaturas' :
                                            activeTab === 'nueva_oferta' ? (editingOfertaId ? 'Editar' : 'Nueva') :
                                                activeTab === 'perfil' ? 'Empresa' : 'Equipo'}
                            </h2>
                            <p className="hidden xs:block text-[8px] lg:text-[10px] text-zinc-400 font-medium mt-0.5">
                                {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden xl:flex items-center gap-4 px-5 py-2 bg-zinc-50 border border-zinc-100 rounded-2xl shadow-sm">
                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Canal Corporativo • 2026/27</span>
                        </div>

                        {/* Notifications Dropdown */}
                        <div className="relative group/notif">
                            <button className="size-10 bg-white border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-500 hover:text-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer relative">
                                <span className="material-symbols-outlined text-[20px]">notifications</span>
                                <span className="absolute top-1 right-1 size-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-black text-white">
                                    !
                                </span>
                            </button>

                            <div className="absolute right-0 top-full mt-4 w-96 opacity-0 translate-y-4 pointer-events-none group-hover/notif:opacity-100 group-hover/notif:translate-y-0 group-hover/notif:pointer-events-auto transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 z-[100]">
                                <div className="bg-white rounded-[32px] shadow-2xl shadow-black/20 border border-zinc-100 overflow-hidden max-h-[500px] flex flex-col">
                                    <NotificationPanel
                                        role="EMPRESA"
                                        onActionClick={(notif) => {
                                            const txt = (notif.title + ' ' + notif.desc + ' ' + notif.action).toLowerCase();
                                            if (txt.includes('candidato') || txt.includes('postulación') || txt.includes('inscrito')) {
                                                setActiveTab('candidatos');
                                            } else if (txt.includes('oferta') || txt.includes('vacante')) {
                                                setActiveTab('ofertas');
                                            } else if (txt.includes('tutor') || txt.includes('validar')) {
                                                setActiveTab('tutores');
                                            } else {
                                                setActiveTab('dashboard');
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* User Profile Pill */}
                        <div className="flex items-center gap-3 p-1 pr-4 bg-zinc-900 rounded-xl shadow-lg shadow-black/10 hover:scale-[1.02] transition-transform cursor-pointer">
                            <div className="size-8 bg-linear-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-inner overflow-hidden">
                                {profile?.logo ? (
                                    <img src={profile.logo} className="w-full h-full object-cover" alt="Perfil Corporativo" />
                                ) : user?.foto ? (
                                    <img src={assetUrl(`/uploads/fotos/${user.foto}`)} className="w-full h-full object-cover" alt="Perfil" />
                                ) : (
                                    empresaName.substring(0, 1).toUpperCase()
                                )}
                            </div>
                            <div className="hidden lg:block text-left">
                                <p className="text-[9px] font-black text-white uppercase tracking-tighter leading-none mb-0.5">{empresaName}</p>
                                <p className="text-[7px] font-bold text-zinc-400 uppercase tracking-widest leading-none text-right">Admin Empresa</p>
                            </div>
                        </div>
                    </div>
                </header>
            }
        >

                <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 custom-scrollbar">
                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 lg:gap-10 items-start">
                            <div className="xl:col-span-2 space-y-8 lg:space-y-10">
                                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { label: 'Candidatos Nuevos', value: pendingCandidates.length, icon: 'person_add', color: 'indigo' },
                                        { label: 'Ofertas Activas', value: activeOffers.length, icon: 'campaign', color: 'emerald' },
                                        { label: 'Prácticas en Vigor', value: validatedCandidatos.length, icon: 'contract_edit', color: 'amber' },
                                    ].map((stat, i) => {
                                        const gradients = [
                                            'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                            'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                        ];
                                        return (
                                            <div key={i} className="relative overflow-hidden rounded-[24px] p-6 text-white shadow-xl hover:-translate-y-0.5 transition-all duration-300" style={{ background: gradients[i] }}>
                                                <div className="absolute top-0 right-0 size-28 rounded-full opacity-20 -mr-10 -mt-10" style={{ background: 'rgba(255,255,255,0.3)' }} />
                                                <div className="absolute bottom-0 left-0 size-20 rounded-full opacity-10 -ml-8 -mb-8" style={{ background: 'rgba(255,255,255,0.3)' }} />
                                                <div className="relative z-10">
                                                    <span className="material-symbols-outlined text-white/70 text-2xl">{stat.icon}</span>
                                                    <h3 className="text-4xl font-black tracking-tighter mt-2 mb-1">{stat.value}</h3>
                                                    <p className="text-[10px] font-semibold tracking-wide text-white/70">{stat.label}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </section>

                                <section className="rounded-[24px] overflow-hidden shadow-xl" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.9)' }}>
                                    <div className="px-8 py-5 border-b flex justify-between items-center" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                                        <h3 className="font-black text-lg text-zinc-900 tracking-tight">Evolución de Formación</h3>
                                        <div className="px-3 py-1.5 rounded-xl text-[9px] font-black text-indigo-600 uppercase tracking-widest" style={{ background: 'rgba(99,102,241,0.08)' }}>Convenios Activos</div>
                                    </div>
                                    <div className="p-0 overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-zinc-50 dark:bg-zinc-800/30 text-[9px] lg:text-[10px] uppercase font-black text-zinc-400 tracking-widest border-b border-zinc-100 dark:border-zinc-800">
                                                    <th className="px-4 lg:px-8 py-4 lg:py-5">Estudiante</th>
                                                    <th className="hidden sm:table-cell px-4 lg:px-8 py-4 lg:py-5">Puesto</th>
                                                    <th className="px-4 lg:px-8 py-4 lg:py-5">Estado</th>
                                                    <th className="px-4 lg:px-8 py-4 lg:py-5 text-right">Ver</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                {validatedCandidatos.map((c) => (
                                                    <React.Fragment key={c.id}>
                                                        <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all border-b border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
                                                            <td className="px-8 py-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="size-9 rounded-xl bg-linear-to-br from-indigo-50 to-white dark:from-zinc-800 dark:to-zinc-900 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-indigo-600 font-black text-xs shadow-sm group-hover:scale-105 transition-transform">
                                                                        {c.nombre.substring(0, 1).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">{c.nombre}</p>
                                                                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{c.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">{c.puesto}</p>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${c.estado === 'ADMITIDO'
                                                                        ? 'bg-emerald-500/10 text-emerald-600'
                                                                        : 'bg-amber-500/10 text-amber-600'
                                                                    }`}>
                                                                    <span className={`size-1.5 rounded-full ${c.estado === 'ADMITIDO' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                                    {c.estado === 'ADMITIDO' ? 'EN FORMACIÓN' : c.estado}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-5 text-right">
                                                                <button
                                                                    onClick={() => { setSelectedCandidato(c); setActiveTab('candidatos'); }}
                                                                    className="size-9 rounded-xl inline-flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700 transition-all shadow-hover"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">visibility</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        {c.fecha_inicio && c.fecha_fin && (
                                                            <tr className="bg-zinc-50/30 dark:bg-zinc-900/10 border-b border-zinc-100/50 dark:border-zinc-800/50">
                                                                <td colSpan={4} className="px-8 py-4">
                                                                    <div className="flex items-center gap-6">
                                                                        <div className="flex-1">
                                                                            <TimeProgress start={c.fecha_inicio} end={c.fecha_fin} />
                                                                        </div>
                                                                        <div className="flex items-center gap-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                                                            <span>Inicio: {new Date(c.fecha_inicio).toLocaleDateString()}</span>
                                                                            <span className="size-1 rounded-full bg-zinc-300"></span>
                                                                            <span>Fin: {new Date(c.fecha_fin).toLocaleDateString()}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                                {validatedCandidatos.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="text-center py-32 px-10">
                                                            <div className="flex flex-col items-center justify-center space-y-4 opacity-40 group">
                                                                <div className="size-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                                                    <span className="material-symbols-outlined text-3xl text-zinc-300">group_off</span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">Sin procesos activos</p>
                                                                    <p className="text-[10px] text-zinc-400 font-semibold tracking-wide mt-1">Valida candidaturas para comenzar el seguimiento</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </div>

                            <div className="xl:col-span-1 space-y-8 lg:sticky lg:top-10 max-h-fit lg:max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar pb-10">
                                <NotificationPanel
                                    role="EMPRESA"
                                    onActionClick={(notif) => {
                                        const action = (notif.action || '').toLowerCase();
                                        if (action.includes('candidat')) {
                                            setActiveTab('candidatos');
                                        } else if (action.includes('oferta') || action.includes('vacante')) {
                                            setActiveTab('ofertas');
                                        } else if (action.includes('tutor')) {
                                            setActiveTab('tutores');
                                        }
                                    }}
                                />

                                <section className="bg-linear-to-br from-indigo-600 to-indigo-800 p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 size-48 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                                    <div className="relative z-10">
                                        <h4 className="text-2xl font-black mb-4 tracking-tight">Captación de Talento FCT 🚀</h4>
                                        <p className="text-sm text-indigo-100/70 mb-10 leading-relaxed font-medium">Amplía tu equipo publicando nuevas vacantes para los grados formativos de la región.</p>
                                        <button
                                            onClick={() => setActiveTab('nueva_oferta')}
                                            className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10"
                                        >
                                            Crear Nueva Vacante
                                        </button>
                                    </div>
                                    <span className="material-symbols-outlined absolute -bottom-10 -right-10 text-white/5 text-[180px] group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700">rocket_launch</span>
                                </section>

                                <section className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
                                    <h4 className="font-black text-lg dark:text-white mb-6 uppercase tracking-tight flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-600">help_center</span>
                                        Recursos Corporativos
                                    </h4>
                                    <div className="space-y-3">
                                        {[
                                            { title: 'Guía de Convenios', desc: 'Marco legal y procesos FCT', icon: 'description' },
                                            { title: 'Soporte con el Centro', desc: 'Contacto directo con tutores', icon: 'support_agent' }
                                        ].map((tool, i) => (
                                            <button key={i} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-left border border-zinc-50 dark:border-zinc-800 group">
                                                <div className="size-10 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 border border-zinc-100 dark:border-zinc-700 shadow-xs transition-colors">
                                                    <span className="material-symbols-outlined text-xl">{tool.icon}</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black dark:text-white uppercase tracking-tight">{tool.title}</p>
                                                    <p className="text-[10px] text-zinc-400 mt-1 font-bold">{tool.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {/* MIS OFERTAS TAB */}
                    {activeTab === 'ofertas' && (() => {
                        const getOfferImage = (oferta: Oferta): string => {
                            if (oferta.imagen) return assetUrl(`/uploads/ofertas/${oferta.imagen}`);
                            const text = `${oferta.titulo} ${oferta.tecnologias}`.toLowerCase();
                            const collections: any = {
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

                            const photoId = selected[oferta.id % selected.length];
                            return `https://images.unsplash.com/photo-${photoId}?q=80&w=800&auto=format&fit=crop`;
                        };

                        return (
                            <div className="space-y-6 pb-10">
                                {/* Header bar */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total publicadas</p>
                                        <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">{ofertas.length} <span className="text-zinc-300 text-xl">vacantes</span></p>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('nueva_oferta')}
                                        className="flex items-center gap-2 h-11 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white text-[10px] font-semibold tracking-wide rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
                                    >
                                        <span className="material-symbols-outlined text-base">add</span>
                                        Nueva Vacante
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {loading ? (
                                        <SkeletonCard count={3} />
                                    ) : ofertas.length === 0 ? (
                                        <div className="col-span-1 md:col-span-2 xl:col-span-3">
                                            <EmptyState 
                                                icon="folder_open" 
                                                title="Aún no hay ofertas" 
                                                description="Crea tu primera oferta de prácticas para atraer talento." 
                                                action={
                                                    <button
                                                        onClick={() => setActiveTab('nueva_oferta')}
                                                        className="flex items-center gap-2 h-11 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white text-[10px] font-semibold tracking-wide rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg hover:-translate-y-1"
                                                    >
                                                        <span className="material-symbols-outlined text-base">add</span>
                                                        Nueva Vacante
                                                    </button>
                                                }
                                            />
                                        </div>
                                    ) : (
                                        ofertas.map((o) => (
                                        <div
                                            key={o.id}
                                            className="bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col"
                                        >
                                            {/* Image header */}
                                            <div className="relative h-44 overflow-hidden">
                                                <img
                                                    src={getOfferImage(o)}
                                                    alt={o.titulo}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                {/* Gradient overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                                {/* Status badge top-right */}
                                                <div className="absolute top-4 right-4">
                                                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-semibold tracking-wide backdrop-blur-sm border ${o.estado === 'Activa' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-zinc-500/20 border-zinc-500/30 text-zinc-300'}`}>
                                                        <span className={`size-1.5 rounded-full ${o.estado === 'Activa' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'}`} />
                                                        {o.estado}
                                                    </span>
                                                </div>
                                                {/* Type badge bottom-left */}
                                                <div className="absolute bottom-4 left-4">
                                                    <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white text-[9px] font-semibold tracking-wide rounded-lg shadow-lg">
                                                        {o.tipo}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Card body */}
                                            <div className="p-6 flex-1 flex flex-col">
                                                <h3 className="font-black text-xl dark:text-white tracking-tight group-hover:text-indigo-600 transition-colors leading-tight mb-2">
                                                    {o.titulo}
                                                </h3>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed line-clamp-2 mb-4">
                                                    {o.descripcion}
                                                </p>

                                                {/* Tech tags */}
                                                <div className="flex flex-wrap gap-1.5 mt-auto">
                                                    {o.tecnologias?.split(',').slice(0, 4).map((tag, i) => (
                                                        <span key={i} className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">
                                                            {tag.trim()}
                                                        </span>
                                                    ))}
                                                    {(o.tecnologias?.split(',').length ?? 0) > 4 && (
                                                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-[9px] font-black text-indigo-500 uppercase tracking-tight">
                                                            +{(o.tecnologias?.split(',').length ?? 0) - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-zinc-400">
                                                    <span className="material-symbols-outlined text-base">group</span>
                                                    <span className="text-[10px] font-semibold tracking-wide">
                                                        {(o as any).candidatos ?? 0} candidatos
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleEditOffer(o)}
                                                    className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-indigo-600 text-[9px] font-semibold tracking-wide hover:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 hover:text-white hover:border-indigo-600 transition-all shadow-xs"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                    Gestionar
                                                </button>
                                            </div>
                                        </div>
                                    )))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* CANDIDATOS TAB */}
                    {activeTab === 'candidatos' && (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 pb-10">
                            <div className="lg:col-span-1 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden h-fit sticky top-24">
                                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                                    <h4 className="text-[10px] font-semibold tracking-wide text-zinc-400">Cantera de Jóvenes</h4>
                                </div>
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[600px] overflow-y-auto custom-scrollbar">
                                    {candidatos.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelectedCandidato(c)}
                                            className={`w-full text-left p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all relative group flex flex-col justify-center border-l-4 ${selectedCandidato?.id === c.id
                                                    ? 'bg-indigo-50/40 dark:bg-indigo-900/10 border-indigo-600'
                                                    : 'border-transparent'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <p className={`text-sm font-black tracking-tight ${selectedCandidato?.id === c.id ? 'text-indigo-600' : 'text-zinc-900 dark:text-white'}`}>{c.nombre}</p>
                                                <span className={`px-2 py-0.5 rounded-lg text-[7px] font-semibold tracking-wide ${c.estado === 'VALIDADO' ? 'bg-emerald-500/10 text-emerald-600' :
                                                        c.estado === 'POSTULADO' ? 'bg-amber-500/10 text-amber-600' :
                                                            'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                                    }`}>{c.estado}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase truncate">{c.puesto}</p>
                                        </button>
                                    ))}
                                    {candidatos.length === 0 && (
                                        <div className="p-10 text-center text-xs font-bold text-zinc-200 uppercase tracking-widest italic opacity-40">Buscador sin resultados</div>
                                    )}
                                </div>
                            </div>

                            <div className="lg:col-span-3">
                                {selectedCandidato ? (
                                    <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl rounded-[40px] border border-white dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                                        <div className="p-10 border-b border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 size-64 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="size-24 rounded-[32px] bg-linear-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-4xl font-black shadow-2xl shadow-indigo-600/30 ring-4 ring-indigo-50 dark:ring-indigo-900/20 overflow-hidden">
                                                        {selectedCandidato.foto ? (
                                                            <img src={assetUrl(`/uploads/fotos/${selectedCandidato.foto}`)} className="w-full h-full object-cover" alt={selectedCandidato.nombre} />
                                                        ) : (
                                                            selectedCandidato.nombre.substring(0, 1).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">{selectedCandidato.nombre}</h3>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <p className="text-indigo-600 font-semibold tracking-wide text-[10px] tracking-widest">Postulación para {selectedCandidato.puesto}</p>
                                                            <span className="size-1 rounded-full bg-zinc-300"></span>
                                                            <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest leading-none flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-sm">schedule</span>
                                                                Recibida hoy
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-4">
                                                    {selectedCandidato.estado === 'POSTULADO' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleCandidatoAction(selectedCandidato.id, 'RECHAZADO')}
                                                                className="h-12 px-6 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-400 font-extrabold text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all border border-zinc-100 dark:border-zinc-700"
                                                            >
                                                                Descartar Perfil
                                                            </button>
                                                            <button
                                                                onClick={() => handleCandidatoAction(selectedCandidato.id, 'ADMITIDO')}
                                                                className="h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white font-extrabold text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                                                            >
                                                                Validar Candidato
                                                                <span className="material-symbols-outlined text-[18px]">verified</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-10 space-y-8">
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-zinc-900 dark:text-white">
                                                <div className="lg:col-span-2 space-y-8">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <section className="p-8 rounded-[32px] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 group hover:border-indigo-600/20 transition-all">
                                                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Información Académica</h4>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Grado Formativo</p>
                                                                    <p className="text-base font-black tracking-tight">{selectedCandidato.grado || 'Desarrollo de Aplicaciones Web'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Centro Educativo</p>
                                                                    <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{selectedCandidato.centro || 'I.E.S. Politécnico Regional'}</p>
                                                                </div>
                                                            </div>
                                                        </section>

                                                        <section className="p-8 rounded-[32px] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 group hover:border-indigo-600/20 transition-all">
                                                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Capacidades Técnicas</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {(selectedCandidato.habilidades || 'React, Node, SQL, Docker, Git').split(',').map((skill, i) => (
                                                                    <span key={i} className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">{skill.trim()}</span>
                                                                ))}
                                                            </div>
                                                        </section>
                                                    </div>

                                                    <section className="p-8 rounded-[32px] bg-zinc-900 text-white shadow-2xl relative overflow-hidden group">
                                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #818cf8 0%, transparent 60%)' }} />
                                                        <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
                                                            <div>
                                                                <h4 className="text-lg font-black tracking-tight mb-2">Situación Operativa</h4>
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`size-3 rounded-full ${selectedCandidato.estado === 'VALIDADO' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
                                                                    <p className="text-sm text-zinc-400 font-semibold tracking-wide leading-none">{selectedCandidato.estado}</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-indigo-200/60 font-medium max-w-md mt-4">
                                                                {selectedCandidato.estado === 'POSTULADO' ? 'Evaluación inicial del perfil en curso por el equipo corporativo.' :
                                                                    selectedCandidato.estado === 'ADMITIDO' ? 'Candidato aceptado. Pendiente de firma de convenio educativo.' :
                                                                        'Período formativo activo según el convenio de colaboración vigente.'}
                                                            </p>
                                                        </div>
                                                        <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-white/5 text-[120px] group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700">insights</span>
                                                    </section>
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="p-8 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center group hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer aspect-square">
                                                        <div className="size-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 transition-colors mb-4 ring-8 ring-zinc-50/50 dark:ring-zinc-800/50" onClick={() => selectedCandidato.cv && window.open(assetUrl(`/uploads/cv/${selectedCandidato.cv}`), '_blank')}>
                                                            <span className="material-symbols-outlined text-4xl">contact_page</span>
                                                        </div>
                                                        <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest mb-1">Expediente CV</h4>
                                                        <p className="text-[10px] text-zinc-400 font-bold uppercase">{selectedCandidato.cv ? 'Descargar PDF' : 'No disponible'}</p>
                                                    </div>

                                                    <div className="p-8 rounded-[32px] bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50">
                                                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Aviso de Tutoría</h4>
                                                        <p className="text-[11px] text-indigo-700/70 dark:text-indigo-300/70 font-bold leading-relaxed">
                                                            Este alumno tiene un tutor de centro ya asignado para la coordinación de la FCT.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[500px] bg-white dark:bg-zinc-900 rounded-[40px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 opacity-40">
                                        <span className="material-symbols-outlined text-8xl text-zinc-100 dark:text-zinc-800 mb-6 drop-shadow-sm">person_search</span>
                                        <p className="text-zinc-400 font-semibold tracking-wide tracking-[0.2em] text-sm">Visor de Candidaturas Desactivado</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* NUEVA OFERTA TAB */}
                    {activeTab === 'nueva_oferta' && (
                        <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden pb-10">
                            <div className="p-10 bg-linear-to-r from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-300 text-white dark:text-zinc-900 flex justify-between items-start">
                                <div>
                                    <h3 className="text-4xl font-black tracking-tighter">
                                        {editingOfertaId ? 'Editar Vacante' : 'Nueva Vacante FCT'}
                                    </h3>
                                    <p className="text-sm font-medium opacity-60 mt-2">
                                        {editingOfertaId ? 'Modifica los campos que desees y guarda los cambios.' : 'Atrae al perfil que tu empresa necesita para crecer'}
                                    </p>
                                </div>
                                {editingOfertaId && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditingOfertaId(null); setNewOffer({ titulo: '', tipo: 'Prácticas', tecnologias: '', descripcion: '', ubicacion: '', jornada: 'Completa', horario: '08:00 - 15:00', color: '#6366f1', imagen: '' }); setActiveTab('ofertas'); }}
                                        className="mt-1 text-white/60 hover:text-white text-[10px] font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-base">close</span>
                                        Cancelar
                                    </button>
                                )}
                            </div>
                            <form onSubmit={handleCreateOffer} className="p-10 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Título Profesional</label>
                                        <input
                                            required
                                            value={newOffer.titulo}
                                            onChange={(e) => setNewOffer({ ...newOffer, titulo: e.target.value })}
                                            className="w-full h-14 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl px-6 font-bold dark:text-white outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all"
                                            placeholder="Backend / Cloud Engineering"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Skills Requeridas</label>
                                        <input
                                            required
                                            value={newOffer.tecnologias}
                                            onChange={(e) => setNewOffer({ ...newOffer, tecnologias: e.target.value })}
                                            className="w-full h-14 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl px-6 font-bold dark:text-white outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all"
                                            placeholder="Docker, Kubernetes, Go"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Descripción del Proyecto</label>
                                    <textarea
                                        required
                                        rows={5}
                                        value={newOffer.descripcion}
                                        onChange={(e) => setNewOffer({ ...newOffer, descripcion: e.target.value })}
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-[32px] p-8 font-medium dark:text-white outline-none h-48 focus:ring-4 focus:ring-indigo-600/10 transition-all"
                                        placeholder="Detalla los objetivos del periodo de formación..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Lugar de Trabajo</label>
                                        <input
                                            required
                                            value={newOffer.ubicacion}
                                            onChange={(e) => setNewOffer({ ...newOffer, ubicacion: e.target.value })}
                                            className="w-full h-14 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl px-6 font-bold dark:text-white outline-none"
                                            placeholder="Sede Central / Híbrido"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Modalidad de Jornada</label>
                                        <select
                                            value={newOffer.jornada}
                                            onChange={(e) => setNewOffer({ ...newOffer, jornada: e.target.value })}
                                            className="w-full h-14 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl px-6 font-bold dark:text-white outline-none focus:ring-4 focus:ring-indigo-600/10"
                                        >
                                            <option value="Completa">Jornada Completa</option>
                                            <option value="Parcial">Media Jornada</option>
                                            <option value="Flexible">Horario Flexible</option>
                                            <option value="Híbrida">Jornada Híbrida</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Horario Específico</label>
                                        <input
                                            required
                                            type="text"
                                            value={newOffer.horario}
                                            onChange={(e) => setNewOffer({ ...newOffer, horario: e.target.value })}
                                            className="w-full h-14 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl px-6 font-bold dark:text-white outline-none"
                                            placeholder="Ej: 08:00 - 15:00 o Turno Rotativo"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Color de Identidad</label>
                                        <div className="flex gap-4 items-center h-14 bg-zinc-50 dark:bg-zinc-800 rounded-2xl px-6">
                                            <input
                                                type="color"
                                                value={newOffer.color}
                                                onChange={(e) => setNewOffer({ ...newOffer, color: e.target.value })}
                                                className="size-8 rounded-lg cursor-pointer bg-transparent border-none"
                                            />
                                            <span className="text-[10px] font-black dark:text-white uppercase tracking-widest">{newOffer.color}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Imagen de Portada (Opcional)</label>
                                    <div className="flex gap-4">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleOfferImageUpload}
                                            accept="image/*"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl px-8 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all border-2 border-dashed border-zinc-200 dark:border-zinc-700 group/img"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="material-symbols-outlined text-zinc-400 group-hover/img:text-indigo-600 transition-colors">add_photo_alternate</span>
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                    {newOffer.imagen ? 'Imagen Cargada' : 'Subir Portada Personalizada'}
                                                </span>
                                            </div>
                                            {newOffer.imagen && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Activo</span>
                                                    <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full h-16 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-4"
                                >
                                    {submitting ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">{editingOfertaId ? 'save' : 'rocket'}</span>}
                                    {submitting ? (editingOfertaId ? 'Guardando cambios...' : 'Emitiendo Vacante...') : (editingOfertaId ? 'Guardar Cambios' : 'Lanzar Oferta al Sistema')}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'tutores' && (
                        <div className="space-y-12 pb-10">
                            {/* Pendientes */}
                            <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden animate-in fade-in duration-500">
                                <div className="p-10 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-zinc-50/30 dark:bg-zinc-800/20">
                                    <div>
                                        <h3 className="text-2xl font-black dark:text-white tracking-tight">Validación de Tutores</h3>
                                        <p className="text-sm font-medium text-zinc-500 mt-1 uppercase tracking-widest text-[10px]">Solicitudes de acceso pendientes de revisión</p>
                                    </div>
                                    <span className="bg-amber-500 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest animate-pulse shadow-lg shadow-amber-500/20">
                                        Action Required ({pendingTutors.length})
                                    </span>
                                </div>
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 px-10">
                                    {pendingTutors.map((t) => (
                                        <div key={t.id} className="py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
                                            <div className="flex items-center gap-6">
                                                <div className="size-16 rounded-[24px] bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-indigo-600 text-2xl font-black group-hover:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-sm">
                                                    {t.nombre.substring(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-lg font-black dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight">{t.nombre}</p>
                                                    <p className="text-xs font-bold text-zinc-400 mt-0.5">{t.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button className="h-12 px-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-red-500 transition-colors">Rechazar</button>
                                                <button
                                                    onClick={() => handleAprobarTutor(t.id)}
                                                    className="h-12 px-10 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white text-[10px] font-semibold tracking-wide rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"
                                                >
                                                    Habilitar Tutor
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {pendingTutors.length === 0 && (
                                        <div className="py-24 text-center">
                                            <div className="size-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-zinc-300">
                                                <span className="material-symbols-outlined text-4xl">verified_user</span>
                                            </div>
                                            <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em]">Cola de peticiones procesada</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Validados */}
                            <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                                <div className="p-10 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-900 dark:bg-zinc-100">
                                    <h3 className="text-xl font-black text-white dark:text-zinc-900 tracking-tight uppercase">Tutores Autorizados</h3>
                                    <div className="bg-white/10 dark:bg-black/10 px-4 py-2 rounded-xl text-[10px] font-black text-white/50 dark:text-black/50 uppercase tracking-widest">
                                        Total: {activeTutors.length}
                                    </div>
                                </div>
                                <div className="p-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {activeTutors.map((t) => (
                                            <div key={t.id} className="p-8 bg-zinc-50 dark:bg-zinc-800/40 rounded-[32px] border border-zinc-100 dark:border-zinc-800 hover:border-indigo-600/30 transition-all group relative">
                                                <div className="absolute top-0 right-0 p-6">
                                                    <span className="material-symbols-outlined text-emerald-500 p-1.5 bg-emerald-500/10 rounded-lg">verified</span>
                                                </div>
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="size-20 rounded-[28px] bg-white dark:bg-zinc-900 flex items-center justify-center text-indigo-600 text-2xl font-black shadow-xl border border-zinc-100 dark:border-zinc-700 group-hover:scale-110 transition-transform mb-6">
                                                        {t.nombre.substring(0, 1).toUpperCase()}
                                                    </div>
                                                    <h4 className="text-xl font-black dark:text-white tracking-tight">{t.nombre}</h4>
                                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2 px-3 py-1 bg-white dark:bg-zinc-900 rounded-lg shadow-xs">{t.email}</p>

                                                    <div className="w-full mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-700 flex gap-4">
                                                        <button className="flex-1 h-12 text-[10px] font-semibold tracking-wide text-indigo-600 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-700 hover:shadow-lg transition-all">Reportes</button>
                                                        <button className="size-12 bg-white dark:bg-zinc-900 text-zinc-400 hover:text-red-500 rounded-xl border border-zinc-100 dark:border-zinc-700 flex items-center justify-center hover:shadow-lg transition-all">
                                                            <span className="material-symbols-outlined text-xl">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {activeTutors.length === 0 && (
                                        <div className="py-24 text-center opacity-30">
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">No se registran tutores autorizados</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'perfil' && (
                        !profile ? (
                            <div className="flex flex-col items-center justify-center h-[600px] opacity-50">
                                <span className="material-symbols-outlined text-6xl animate-spin mb-4 text-indigo-600">progress_activity</span>
                                <p className="font-semibold tracking-wide text-xs">Cargando Perfil Corporativo...</p>
                            </div>
                        ) : (
                            <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
                                {/* Profile Header Visual Card */}
                                <div className="relative p-1 bg-gradient-to-tr from-zinc-800 to-zinc-950 rounded-[40px] shadow-2xl">
                                    <div className="bg-white dark:bg-zinc-900 rounded-[38px] p-10 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 size-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                        <div className="flex flex-col md:flex-row items-center gap-10">
                                            <div
                                                onClick={() => isEditingProfile && fileInputRef.current?.click()}
                                                className={`size-40 rounded-[32px] bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-5xl border-8 border-white dark:border-zinc-800 shadow-xl relative overflow-hidden shrink-0 group ${isEditingProfile ? 'cursor-pointer hover:border-indigo-600 transition-all' : ''}`}
                                            >
                                                {profile.logo ? (
                                                    <img src={profile.logo} className="w-full h-full object-cover" alt="Logo" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-zinc-200 text-6xl font-light">business</span>
                                                )}

                                                {isEditingProfile && (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white">
                                                        <span className="material-symbols-outlined text-3xl mb-2">add_a_photo</span>
                                                        <span className="text-[8px] font-semibold tracking-wide">Cambiar Foto</span>
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                />
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                                                    <div>
                                                        <h3 className="text-4xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">{profile.nombre}</h3>
                                                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                                            <span className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                                <span className="material-symbols-outlined text-sm">location_on</span>
                                                                {profile.ubicacion || 'Ubicación no especificada'}
                                                            </span>
                                                            <span className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                                <span className="material-symbols-outlined text-sm">badge</span>
                                                                CIF: {profile.cif}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {!isEditingProfile ? (
                                                            <button
                                                                onClick={() => setIsEditingProfile(true)}
                                                                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                                                Configurar Perfil
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleProfileUpdate()}
                                                                disabled={submitting}
                                                                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                                                            >
                                                                {submitting ? <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
                                                                {submitting ? 'Guardando...' : 'Guardar Cambios'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold max-w-2xl bg-zinc-50 dark:bg-zinc-800/40 p-6 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 italic">
                                                    "{profile.descripcion || 'Define aquí la misión y visión de tu empresa para atraer al mejor talento.'}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    {/* SECCIÓN PRINCIPAL */}
                                    <div className="lg:col-span-2 space-y-10">
                                        {/* Tech Stack */}
                                        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-10 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden relative">
                                            <div className="flex items-center justify-between mb-10">
                                                <h4 className="font-black text-2xl dark:text-white flex items-center gap-4">
                                                    <div className="size-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600">
                                                        <span className="material-symbols-outlined text-2xl">terminal</span>
                                                    </div>
                                                    Ecosistema Tecnológico
                                                </h4>
                                            </div>

                                            <div className="flex flex-wrap gap-4 mb-10">
                                                {profile.tecnologias.map((tech) => (
                                                    <div key={tech} className={`bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-2 pl-5 rounded-2xl flex items-center gap-4 transition-all ${isEditingProfile ? 'hover:border-red-500/30' : ''}`}>
                                                        <span className="text-[11px] font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-[0.1em]">{tech}</span>
                                                        {isEditingProfile && (
                                                            <button
                                                                onClick={() => removeTech(tech)}
                                                                className="size-8 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-300 hover:bg-red-500 hover:text-white transition-all shadow-xs border border-zinc-100 dark:border-zinc-800"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">close</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {profile.tecnologias.length === 0 && (
                                                    <p className="text-zinc-300 dark:text-zinc-600 text-sm italic font-bold py-6 uppercase tracking-widest">No se han definido capas tecnológicas todavía...</p>
                                                )}
                                            </div>

                                            {isEditingProfile && (
                                                <div className="flex gap-4 bg-zinc-50 dark:bg-zinc-800/30 p-2.5 rounded-[28px] border border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-bottom-2 duration-300">
                                                    <input
                                                        type="text"
                                                        value={newTech}
                                                        onChange={(e) => setNewTech(e.target.value)}
                                                        className="flex-1 bg-transparent border-none px-6 py-4 text-sm font-bold outline-none placeholder:text-zinc-400 placeholder:font-semibold tracking-wide"
                                                        placeholder="AÑADIR STACK (EJ: DOCKER, KUBERNETES...)"
                                                        onKeyDown={(e) => e.key === 'Enter' && addTech()}
                                                    />
                                                    <button onClick={addTech} className="bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white px-8 py-4 rounded-2xl text-[10px] font-semibold tracking-wide hover:scale-105 active:scale-95 transition-all">Añadir</button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Beneficios */}
                                        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-10 border border-zinc-200 dark:border-zinc-800 shadow-xl">
                                            <h4 className="font-black text-2xl dark:text-white flex items-center gap-4 mb-10">
                                                <div className="size-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
                                                    <span className="material-symbols-outlined text-2xl">loyalty</span>
                                                </div>
                                                Cultura & Beneficios
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                                                {profile.beneficios.map((benefit) => (
                                                    <div key={benefit} className="flex items-center gap-5 p-5 bg-zinc-50 dark:bg-zinc-800/40 rounded-3xl border border-zinc-100 dark:border-zinc-800 transition-all hover:border-emerald-500/20 group hover:shadow-lg hover:shadow-emerald-500/5">
                                                        <div className="size-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-emerald-500 shadow-sm">
                                                            <span className="material-symbols-outlined text-xl font-black">verified</span>
                                                        </div>
                                                        <span className="flex-1 text-xs font-black text-zinc-600 dark:text-zinc-400 tracking-wide uppercase">{benefit}</span>
                                                        {isEditingProfile && (
                                                            <button
                                                                onClick={() => removeBenefit(benefit)}
                                                                className="size-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-300 hover:text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            {isEditingProfile && (
                                                <div className="flex gap-4 bg-zinc-50 dark:bg-zinc-800/30 p-2.5 rounded-[28px] border border-zinc-100 dark:border-zinc-800">
                                                    <input
                                                        type="text"
                                                        value={newBenefit}
                                                        onChange={(e) => setNewBenefit(e.target.value)}
                                                        className="flex-1 bg-transparent border-none px-6 py-4 text-sm font-bold outline-none placeholder:text-zinc-400 placeholder:font-semibold tracking-wide"
                                                        placeholder="AÑADIR BENEFICIO (EJ: SEGURO MÉDICO...)"
                                                        onKeyDown={(e) => e.key === 'Enter' && addBenefit()}
                                                    />
                                                    <button onClick={addBenefit} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl text-[10px] font-semibold tracking-wide hover:scale-105 active:scale-95 transition-all">Añadir</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* SIDEBAR PERFIL */}
                                    <div className="space-y-10">
                                        {/* Links y Contacto */}
                                        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-8">
                                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4">Canales Digitales</h4>
                                            <div className="space-y-5">
                                                {[
                                                    { id: 'web', icon: 'language', label: 'Web Site', value: profile.web, color: 'text-indigo-600' },
                                                    { id: 'linkedin', icon: 'groups', label: 'Company Profile', value: profile.linkedin, color: 'text-blue-600' },
                                                    { id: 'twitter', icon: 'alternate_email', label: 'Twitter / X', value: profile.twitter, color: 'text-zinc-900 dark:text-white' }
                                                ].map((link) => (
                                                    <div key={link.id} className="space-y-3">
                                                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">{link.label}</label>
                                                        {!isEditingProfile ? (
                                                            <a
                                                                href={link.value || '#'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${link.value
                                                                        ? 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-900 dark:text-white border-zinc-100 dark:border-zinc-800 hover:border-indigo-600/30 hover:shadow-lg'
                                                                        : 'bg-zinc-100 dark:bg-zinc-950/50 text-zinc-300 border-zinc-100 dark:border-zinc-800 pointer-events-none opacity-40'
                                                                    }`}
                                                            >
                                                                <span className={`material-symbols-outlined text-xl ${link.value ? link.color : ''}`}>{link.icon}</span>
                                                                <span className="text-[11px] font-semibold tracking-wide truncate tracking-[0.1em]">{link.value ? 'Visualizar Canal' : 'Habilitar Enlace'}</span>
                                                                {link.value && <span className="material-symbols-outlined text-xs ml-auto opacity-30">open_in_new</span>}
                                                            </a>
                                                        ) : (
                                                            <div className="relative group/input">
                                                                <span className={`material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-lg transition-colors group-focus-within/input:indigo-600 font-black ${link.color}`}>{link.icon}</span>
                                                                <input
                                                                    type="text"
                                                                    value={profile[link.id as keyof EmpresaProfile] || ''}
                                                                    onChange={(e) => setProfile({ ...profile, [link.id]: e.target.value })}
                                                                    className="w-full h-14 pl-14 pr-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all"
                                                                    placeholder={`https://...`}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Manual Fields for Edit mode */}
                                        {isEditingProfile && (
                                            <div className="bg-zinc-950 border border-white/5 rounded-[32px] p-8 text-white space-y-8 animate-in zoom-in-95 duration-500 shadow-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 bg-white/10 rounded-lg flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-sm">settings</span>
                                                    </div>
                                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Metadatos Perfil</h4>
                                                </div>
                                                <div className="space-y-8">
                                                    <div className="space-y-3">
                                                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">Ubicación Global</label>
                                                        <input
                                                            type="text"
                                                            value={profile.ubicacion || ''}
                                                            onChange={(e) => setProfile({ ...profile, ubicacion: e.target.value })}
                                                            className="w-full h-14 px-6 bg-white/5 rounded-2xl border border-white/10 text-xs font-bold outline-none focus:border-indigo-500/50 transition-all text-white placeholder:text-white/20"
                                                            placeholder="Cáceres, España"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">Relato Corporativo</label>
                                                        <textarea
                                                            value={profile.descripcion || ''}
                                                            onChange={(e) => setProfile({ ...profile, descripcion: e.target.value })}
                                                            rows={5}
                                                            className="w-full p-6 bg-white/5 rounded-[28px] border border-white/10 text-sm font-medium outline-none focus:border-indigo-500/50 transition-all text-white resize-none"
                                                            placeholder="Misión, visión y valores..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Stats Sidebar */}
                                        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-100 dark:border-zinc-800 shadow-xl overflow-hidden relative">
                                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-8">Performance & Alcance</h4>
                                            <div className="space-y-10">
                                                {performanceStats.map((stat, i) => (
                                                    <div key={i} className="space-y-4">
                                                        <div className="flex justify-between items-end px-1">
                                                            <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">{stat.label}</span>
                                                            <span className="text-sm font-black dark:text-white leading-none tracking-tighter">{stat.value}</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${stat.color} rounded-full transition-all duration-1000 ease-out`}
                                                                style={{ width: `${stat.progress}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>

            {/* MODAL PARA VALIDACIÓN DE CALENDARIO */}
            {isActionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-950/40 backdrop-blur-[12px] animate-in fade-in duration-300">
                    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-[40px] w-full max-w-xl shadow-[0_30px_100px_-20px_rgba(99,102,241,0.25)] overflow-hidden border border-white dark:border-zinc-800 animate-in zoom-in-95 duration-500 max-h-[90dvh] flex flex-col">
                        <div className="p-6 sm:p-10 border-b border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
                            <div className="absolute top-0 right-0 size-48 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                            <h3 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white flex items-center gap-4 relative z-10">
                                <span className="size-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                    <span className="material-symbols-outlined text-2xl">calendar_today</span>
                                </span>
                                Configuración FCT
                            </h3>
                            <p className="text-zinc-500 font-bold text-[11px] uppercase tracking-widest mt-4 ml-1">Parámetros formativos del periodo</p>
                        </div>

                        <div className="p-6 sm:p-10 space-y-10 overflow-y-auto custom-scrollbar">
                            <section>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6 ml-1 flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30"></span>
                                    Periodo Lectivo Estimado
                                </label>
                                <div className="grid grid-cols-2 gap-6">
                                    {[
                                        { id: '1_mes', label: '1 Mes', icon: 'looks_one' },
                                        { id: '2_meses', label: '2 Meses', icon: 'looks_two' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setActionData({ ...actionData, tipoDuracion: opt.id })}
                                            className={`flex flex-col items-center justify-center p-8 rounded-[32px] border-2 transition-all duration-300 group relative ${actionData.tipoDuracion === opt.id
                                                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10'
                                                    : 'border-zinc-50 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-600/20'
                                                }`}
                                        >
                                            <span className={`material-symbols-outlined text-3xl mb-3 transition-colors ${actionData.tipoDuracion === opt.id ? 'text-indigo-600' : 'text-zinc-200 group-hover:text-indigo-400'
                                                }`}>{opt.icon}</span>
                                            <span className={`font-black text-xs uppercase tracking-widest ${actionData.tipoDuracion === opt.id ? 'text-indigo-600' : 'text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'
                                                }`}>{opt.label}</span>
                                            {actionData.tipoDuracion === opt.id && (
                                                <div className="absolute top-4 right-4 animate-in zoom-in">
                                                    <span className="material-symbols-outlined text-indigo-600 text-xl font-black">check_circle</span>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6 ml-1 flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30"></span>
                                    Ventana de Actividad Diaria
                                </label>
                                <div className="space-y-4">
                                    {[
                                        { id: 'manana', label: 'Mañana Corporativa', desc: '08:00 - 17:00 CET', icon: 'light_mode' },
                                        { id: 'tarde', label: 'Tarde / Cierre Nocturno', desc: '14:00 - 23:00 CET', icon: 'dark_mode' }
                                    ].map((turno) => (
                                        <button
                                            key={turno.id}
                                            onClick={() => setActionData({ ...actionData, horario: turno.id })}
                                            className={`w-full flex items-center justify-between p-5 rounded-[24px] border-2 transition-all duration-300 group ${actionData.horario === turno.id
                                                    ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10'
                                                    : 'border-zinc-50 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-600/20'
                                                }`}
                                        >
                                            <div className="flex items-center gap-5 text-left">
                                                <div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${actionData.horario === turno.id ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white shadow-lg shadow-indigo-600/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                                    }`}>
                                                    <span className="material-symbols-outlined text-2xl">{turno.icon}</span>
                                                </div>
                                                <div>
                                                    <p className={`font-black text-sm tracking-tight ${actionData.horario === turno.id ? 'text-indigo-600' : 'text-zinc-900 dark:text-white'}`}>{turno.label}</p>
                                                    <p className="text-[9px] font-black text-zinc-400 uppercase mt-0.5 tracking-tighter opacity-70">{turno.desc}</p>
                                                </div>
                                            </div>
                                            <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${actionData.horario === turno.id ? 'border-indigo-600 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30' : 'border-zinc-100 dark:border-zinc-800'
                                                }`}>
                                                {actionData.horario === turno.id && <span className="material-symbols-outlined text-white text-[14px] font-black">check</span>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="p-6 sm:p-10 pt-0 flex flex-col sm:flex-row gap-4 shrink-0">
                            <button
                                onClick={() => setIsActionModalOpen(false)}
                                className="flex-1 h-14 text-[10px] font-semibold tracking-wide text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                            >
                                Cancelar trámite
                            </button>
                            <button
                                onClick={confirmAdmitir}
                                className="flex-[2] h-14 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 px-10"
                            >
                                Validar y Emitir Calendario
                                <span className="material-symbols-outlined text-xl">rocket_launch</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default EmpresaDashboard;
