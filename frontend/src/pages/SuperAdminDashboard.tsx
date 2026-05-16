import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useUser } from '../context/UserContext';
import LogoutModal from '../components/common/LogoutModal';

const SuperAdminDashboard = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [tutores, setTutores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [nuevoGrado, setNuevoGrado] = useState('');
    const [nuevoCentro, setNuevoCentro] = useState('');
    const [centros, setCentros] = useState<any[]>([]);
    const [selectedCentroId, setSelectedCentroId] = useState('');
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    
    // Quick load
    useEffect(() => {
        if (!user || user.role !== 'SUPERADMIN') {
            navigate('/login');
            return;
        }
        fetchData();
    }, [user, navigate]);

    const fetchData = async () => {
        try {
            const resTutores = await api.get('/admin/tutores/pending');
            setTutores(resTutores.data.tutores);

            const resCentros = await api.get('/admin/centros/full');
            setCentros(resCentros.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        try {
            await api.post(`/admin/tutores/${id}/approve`);
            setTutores(prev => prev.filter(t => t.id !== id));
            alert('Tutor/Centro aprobado');
        } catch (e) {
            alert('Error al aprobar');
        }
    };

    const handleCrearCentro = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/admin/centros/create', { nombre: nuevoCentro });
            alert('Centro creado correctamente. Ya estará disponible en el registro.');
            setNuevoCentro('');
            
            // Añadir inmediatamente el centro al state local 
            // Esto evita problemas de caché del navegador en peticiones GET
            if (res.data.centro) {
                setCentros(prev => [...prev, res.data.centro]);
            }
            // Por precaución re-hacemos el fetch de todo
            await fetchData();
        } catch (e) {
            alert('Error creando centro');
        }
    };

    const handleCrearGrado = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCentroId) {
            alert('Por favor, selecciona un centro antes de añadir el grado.');
            return;
        }
        try {
            await api.post('/admin/grados/create', { 
                nombre: nuevoGrado,
                centroId: parseInt(selectedCentroId)
            });
            alert('Grado creado correctamente. Se ha asignado al centro.');
            setNuevoGrado('');
            await fetchData(); // Refrescar para que aparezca abajo
        } catch (e) {
            alert('Error creando grado');
        }
    };

    const handleEditCentro = async (id: number, currentName: string) => {
        const newName = prompt('Editar nombre del centro:', currentName);
        if (!newName || newName === currentName) return;
        try {
            await api.put(`/admin/centros/${id}`, { nombre: newName });
            fetchData();
        } catch (e) { alert('Error al editar'); }
    };

    const handleDeleteCentro = async (id: number) => {
        if (!confirm('¿Seguro que deseas eliminar este centro?')) return;
        try {
            await api.delete(`/admin/centros/${id}`);
            fetchData();
        } catch (e: any) { alert(e.response?.data?.error || 'Error al eliminar'); }
    };

    const handleEditGrado = async (id: number, currentName: string) => {
        const newName = prompt('Editar nombre del módulo/grado:', currentName);
        if (!newName || newName === currentName) return;
        try {
            await api.put(`/admin/grados/${id}`, { nombre: newName });
            fetchData();
        } catch (e) { alert('Error al editar'); }
    };

    const handleDeleteGrado = async (id: number) => {
        if (!confirm('¿Seguro que deseas eliminar este módulo/grado?')) return;
        try {
            await api.delete(`/admin/grados/${id}`);
            fetchData();
        } catch (e: any) { alert(e.response?.data?.error || 'Error al eliminar'); }
    };


    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B111A] p-4 lg:p-8 text-slate-900 dark:text-slate-100 font-body">
            {/* ── HEADER RESPONSIVE ─────────────────────────────────────────── */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 lg:mb-12 bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex gap-5 items-center">
                    <div className="size-14 lg:size-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <span className="material-symbols-outlined text-white text-3xl">admin_panel_settings</span>
                    </div>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-black tracking-tight">Panel de Control</h1>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">Super Administración EduConect</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button 
                        onClick={() => setIsLogoutModalOpen(true)} 
                        className="btn-sm px-6 bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-100 dark:border-red-500/20 hover:bg-red-500 hover:text-white w-full md:w-auto"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            {/* ── TARJETAS DE ESTADÍSTICAS (KPIs) ──────────────────────────────
                grid-cols-1 (móvil) -> grid-cols-2 (tablet) -> grid-cols-4 (desktop)
            ───────────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 lg:mb-12">
                {[
                    { label: 'Institutos Activos', value: centros.length, icon: 'account_balance', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
                    { label: 'Cordinadores Pendientes', value: tutores.length, icon: 'person_add', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                    { label: 'Sistemas Operativos', value: 'Online', icon: 'cloud_done', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                    { label: 'Nivel de Seguridad', value: 'SSL v4', icon: 'security', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 group hover:border-indigo-500/30 transition-all">
                        <div className={`size-14 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                            <span className="material-symbols-outlined text-2xl font-bold">{kpi.icon}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                            <p className="text-2xl font-black tracking-tight">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* ── SECCIÓN DE FILTROS Y CREACIÓN ─────────────────────────── */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h2 className="text-lg font-black mb-6 flex items-center gap-3">
                            <span className="material-symbols-outlined text-indigo-600">add_circle</span>
                            Nuevas Entidades
                        </h2>
                        
                        <div className="space-y-6">
                            <form onSubmit={handleCrearCentro} className="space-y-4">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Registrar Instituto</label>
                                <div className="flex flex-col gap-3">
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ej: IES Politécnico..."
                                        value={nuevoCentro}
                                        onChange={e => setNuevoCentro(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent focus:border-indigo-500 outline-none transition-all dark:text-white"
                                    />
                                    <button className="btn-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20">
                                        Crear Centro
                                    </button>
                                </div>
                            </form>

                            <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

                            <form onSubmit={handleCrearGrado} className="space-y-4">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Añadir Grado/Módulo</label>
                                <div className="space-y-3">
                                    <select
                                        required
                                        value={selectedCentroId}
                                        onChange={(e) => setSelectedCentroId(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent focus:border-indigo-500 outline-none transition-all dark:text-white appearance-none cursor-pointer font-bold text-sm"
                                    >
                                        <option value="">Selecciona Centro...</option>
                                        {centros.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ej: DAW, DAM..."
                                        value={nuevoGrado}
                                        onChange={e => setNuevoGrado(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent focus:border-indigo-500 outline-none transition-all dark:text-white"
                                    />
                                    <button className="btn-sm bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-600 hover:text-white w-full transition-all">
                                        Confirmar Grado
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* ── SOLICITUDES PENDIENTES ──────────────────────────────────── */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-lg font-black flex items-center gap-3">
                            <span className="material-symbols-outlined text-amber-500">pending_actions</span>
                            Validaciones de Coordinador
                        </h2>
                        <span className="px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {tutores.length} Pendientes
                        </span>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => <div key={i} className="h-20 bg-slate-50 dark:bg-slate-800 animate-pulse rounded-2xl" />)}
                        </div>
                    ) : tutores.length === 0 ? (
                        <div className="p-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-6xl mb-4 opacity-20">verified_user</span>
                            <p className="font-bold text-sm tracking-widest uppercase">Todo en orden, jefe.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tutores.map(t => (
                                <div key={t.id} className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group">
                                    <div className="flex items-center gap-5 w-full">
                                        <div className="size-12 rounded-full bg-linear-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold shadow-md">
                                            {t.nombre.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white truncate">{t.nombre}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.email}</p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="material-symbols-outlined text-[14px] text-slate-400">school</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t.centro}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleApprove(t.id)}
                                        className="btn-sm px-6 bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 w-full sm:w-auto"
                                    >
                                        <span className="material-symbols-outlined text-lg">how_to_reg</span>
                                        Aprobar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── TABLA MASIVA DE CENTROS ─────────────────────────────────────
                Implementa Scroll Horizontal Aislado con Scroll Hint
            ────────────────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-lg font-black flex items-center gap-3">
                            <span className="material-symbols-outlined text-indigo-600">domain</span>
                            Estructura de Centros y Grados
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Gestión masiva de la arquitectura educativa del sistema</p>
                    </div>

                </div>

                <div className="scroll-hint-right group">
                    <div className="overflow-x-auto w-full custom-scrollbar">
                        <table className="w-full min-w-[800px] text-left border-separate border-spacing-y-3">
                            <thead>
                                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 py-2">ID</th>
                                    <th className="px-6 py-2">Nombre del Instituto</th>
                                    <th className="px-6 py-2">Estructura Académica (Grados)</th>
                                    <th className="px-6 py-2 text-right">Acciones de Sistema</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-transparent">
                                {centros.map(centro => (
                                    <tr key={centro.id} className="bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded-2xl">
                                        <td className="px-6 py-5 first:rounded-l-2xl">
                                            <span className="text-xs font-mono text-slate-400">#{centro.id}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-primary">{centro.nombre}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-2">
                                                {centro.grados && centro.grados.length > 0 ? (
                                                    centro.grados.map((g: any) => (
                                                        <div key={g.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg group/pill">
                                                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{g.nombre}</span>
                                                            <div className="flex gap-1 opacity-0 group-hover/pill:opacity-100 transition-opacity">
                                                                <button onClick={() => handleEditGrado(g.id, g.nombre)} className="text-slate-400 hover:text-indigo-600"><span className="material-symbols-outlined text-xs">edit</span></button>
                                                                <button onClick={() => handleDeleteGrado(g.id)} className="text-slate-400 hover:text-red-500"><span className="material-symbols-outlined text-xs">delete</span></button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-500 italic">Sin grados</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right last:rounded-r-2xl">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEditCentro(centro.id, centro.nombre)} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:text-indigo-600 transition-all shadow-sm">
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                                <button onClick={() => handleDeleteCentro(centro.id)} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:text-red-500 transition-all shadow-sm">
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {centros.length === 0 && (
                    <div className="py-20 text-center">
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Buscador de Centros Vacío</p>
                    </div>
                )}
            </div>
            
            <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} />
        </div>
    );
};

export default SuperAdminDashboard;
