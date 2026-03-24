import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';

const SuperAdminDashboard = () => {
    const { user, logout } = useUser();
    const navigate = useNavigate();
    const [tutores, setTutores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [nuevoGrado, setNuevoGrado] = useState('');
    const [nuevoCentro, setNuevoCentro] = useState('');
    const [centros, setCentros] = useState<any[]>([]);
    const [selectedCentroId, setSelectedCentroId] = useState('');
    
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
            const resTutores = await axios.get('http://localhost:8000/api/admin/tutores/pending');
            setTutores(resTutores.data.tutores);

            const resCentros = await axios.get('http://localhost:8000/api/admin/centros/full');
            setCentros(resCentros.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        try {
            await axios.post(`http://localhost:8000/api/admin/tutores/${id}/approve`);
            setTutores(prev => prev.filter(t => t.id !== id));
            alert('Tutor/Centro aprobado');
        } catch (e) {
            alert('Error al aprobar');
        }
    };

    const handleCrearCentro = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:8000/api/admin/centros/create', { nombre: nuevoCentro });
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
            await axios.post('http://localhost:8000/api/admin/grados/create', { 
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
            await axios.put(`http://localhost:8000/api/admin/centros/${id}`, { nombre: newName });
            fetchData();
        } catch (e) { alert('Error al editar'); }
    };

    const handleDeleteCentro = async (id: number) => {
        if (!confirm('¿Seguro que deseas eliminar este centro?')) return;
        try {
            await axios.delete(`http://localhost:8000/api/admin/centros/${id}`);
            fetchData();
        } catch (e: any) { alert(e.response?.data?.error || 'Error al eliminar'); }
    };

    const handleEditGrado = async (id: number, currentName: string) => {
        const newName = prompt('Editar nombre del módulo/grado:', currentName);
        if (!newName || newName === currentName) return;
        try {
            await axios.put(`http://localhost:8000/api/admin/grados/${id}`, { nombre: newName });
            fetchData();
        } catch (e) { alert('Error al editar'); }
    };

    const handleDeleteGrado = async (id: number) => {
        if (!confirm('¿Seguro que deseas eliminar este módulo/grado?')) return;
        try {
            await axios.delete(`http://localhost:8000/api/admin/grados/${id}`);
            fetchData();
        } catch (e: any) { alert(e.response?.data?.error || 'Error al eliminar'); }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background-dark p-8 text-black dark:text-white">
            <header className="flex justify-between items-center mb-10 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex gap-4 items-center">
                    <span className="material-symbols-outlined text-4xl text-primary p-3 bg-primary/10 rounded-2xl">admin_panel_settings</span>
                    <div>
                        <h1 className="text-2xl font-black text-primary">Dirección Central</h1>
                        <p className="text-sm font-bold uppercase tracking-wider text-slate-400">EduConect SuperAdmin</p>
                    </div>
                </div>
                <button onClick={() => { logout(); navigate('/login'); }} className="flex text-sm cursor-pointer items-center justify-center p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                    Cerrar Sesión
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-black mb-6">Administración de Entidades</h2>
                    
                    <form onSubmit={handleCrearCentro} className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-4">
                        <h3 className="font-bold mb-2">Crear Nuevo Instituto/Centro</h3>
                        <input
                            required
                            type="text"
                            placeholder="Nombre del Centro"
                            value={nuevoCentro}
                            onChange={e => setNuevoCentro(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                        />
                        <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all">Crear Centro</button>
                    </form>

                    <form onSubmit={handleCrearGrado} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-4">
                        <h3 className="font-bold mb-2">Añadir Módulo/Grado a un Centro</h3>
                        <select
                            required
                            value={selectedCentroId}
                            onChange={(e) => setSelectedCentroId(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                        >
                            <option value="">Selecciona un Centro...</option>
                            {centros.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                        <input
                            required
                            type="text"
                            placeholder="Nombre del Grado (ej: DAW, Mecatrónica...)"
                            value={nuevoGrado}
                            onChange={e => setNuevoGrado(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                        />
                        <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all">Añadir Grado</button>
                    </form>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-black mb-6">Solicitudes de Coordinadores / Tutores de Centro</h2>
                    {loading ? (
                        <p>Cargando peticiones...</p>
                    ) : tutores.length === 0 ? (
                        <div className="p-10 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-5xl mb-4">task_alt</span>
                            <p className="font-bold">No hay coordinadores pendientes</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tutores.map(t => (
                                <div key={t.id} className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                            {t.nombre.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold">{t.nombre}</p>
                                            <p className="text-xs text-slate-500 mb-1">{t.email}</p>
                                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full font-bold">{t.centro}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleApprove(t.id)}
                                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-500/20 hover:scale-105"
                                    >
                                        <span className="material-symbols-outlined text-lg">check</span>
                                        Aprobar Institución
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-black mb-6">Gestión de Centros Registrados</h2>
                <div className="space-y-4">
                    {centros.map(centro => (
                        <div key={centro.id} className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-black text-lg text-primary">{centro.nombre}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditCentro(centro.id, centro.nombre)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-all" title="Editar"><span className="material-symbols-outlined text-sm">edit</span></button>
                                    <button onClick={() => handleDeleteCentro(centro.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-all" title="Eliminar"><span className="material-symbols-outlined text-sm">delete</span></button>
                                </div>
                            </div>
                            {centro.grados && centro.grados.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                                    {centro.grados.map((g: any) => (
                                        <div key={g.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-[#0B111A] rounded-xl border border-slate-200 dark:border-slate-800">
                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300 truncate pr-2" title={g.nombre}>{g.nombre}</span>
                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={() => handleEditGrado(g.id, g.nombre)} className="p-1.5 text-slate-500 hover:text-primary transition-colors"><span className="material-symbols-outlined text-xs">edit</span></button>
                                                <button onClick={() => handleDeleteGrado(g.id)} className="p-1.5 text-slate-500 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-xs">delete</span></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 italic px-2">No hay grados asociados a este centro.</p>
                            )}
                        </div>
                    ))}
                    {centros.length === 0 && <p className="text-slate-500">Aún no se han creado centros.</p>}
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
