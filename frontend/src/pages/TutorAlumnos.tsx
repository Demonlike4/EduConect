import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';

interface AlumnoData {
    id: number;
    nombre: string;
    email: string;
    grado: string;
    status: string;
    empresa: string;
}

const TutorAlumnos: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useUser();
    const [alumnos, setAlumnos] = useState<AlumnoData[]>([]);
    const [loading, setLoading] = useState(true);

    // Datos del usuario (con fallback)
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
                } catch (error) {
                    console.error("Error fetching alumnos:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchAlumnos();
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

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
                        { id: 'resumen', label: 'Resumen', icon: 'dashboard', path: '/dashboard/tutor-centro' },
                        { id: 'alumnos', label: 'Alumnos', icon: 'group', path: '/dashboard/tutor-centro/alumnos' },
                        { id: 'empresas', label: 'Empresas', icon: 'corporate_fare', path: '#' },
                        { id: 'documentacion', label: 'Documentación', icon: 'description', path: '#' },
                        { id: 'reportes', label: 'Reportes', icon: 'assessment', path: '#' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => item.path !== '#' && navigate(item.path)}
                            className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${item.id === 'alumnos'
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                            <span className="text-sm">{item.label}</span>
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
            <main className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-[#0B111A]">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 transition-colors duration-300">
                    <h2 className="text-lg font-bold dark:text-white">Alumnos - {user?.centro || 'Centro Educativo'}</h2>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                            <input
                                className="pl-10 pr-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B111A] text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent w-64 outline-none transition-all placeholder:text-slate-400"
                                placeholder="Buscar alumnos..."
                                type="text"
                            />
                        </div>
                        <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative transition-colors">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-background-dark"></span>
                        </button>
                    </div>
                </header>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="bg-white dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom duration-500">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-lg dark:text-white">Listado de Alumnos</h3>
                            <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Nuevo Alumno
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
                                    ) : alumnos.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-slate-500">
                                                No hay alumnos registrados en tu centro todavía.
                                            </td>
                                        </tr>
                                    ) : (
                                        alumnos.map((row) => (
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
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${row.status === 'Activa' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' :
                                                        row.status === 'Finalizada' ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600' :
                                                            'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                                        }`}>{row.status}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-primary hover:text-primary/70 text-sm font-semibold transition-colors">Ver detalles</button>
                                                </td>
                                            </tr>
                                        )))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TutorAlumnos;
