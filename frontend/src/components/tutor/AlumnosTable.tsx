import React, { useState } from 'react';

export interface AlumnoData {
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
    foto?: string;
}

interface AlumnosTableProps {
    alumnos: AlumnoData[];
    loading: boolean;
    onRemoveAlumno: (id: number, nombre: string) => void;
    onOpenDetailModal: (id: number) => void;
    onOpenValModal: (alumno: AlumnoData) => void;
    onOpenOfferModal: (id: number) => void;
}

export const AlumnosTable: React.FC<AlumnosTableProps> = ({
    alumnos,
    loading,
    onRemoveAlumno,
    onOpenDetailModal,
    onOpenValModal,
    onOpenOfferModal
}) => {
    const [page, setPage] = useState(1);
    const itemsPerPage = 8;

    const approvedStudents = alumnos.filter(a => a.isAprobado !== false);
    const totalPages = Math.max(1, Math.ceil(approvedStudents.length / itemsPerPage));
    const paginatedStudents = approvedStudents.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const getStatusBadge = (status: string) => {
        const statuses: Record<string, string> = {
            'VALIDADO': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
            'PENDIENTE_FIRMA_EMPRESA': 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
            'Finalizada': 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700',
            'ADMITIDO': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
        };
        const defaultStyle = 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700';
        return statuses[status] || defaultStyle;
    };

    const getStatusLabel = (status: string) => {
        if (status === 'PENDIENTE_FIRMA_EMPRESA') return 'Firma Empresa Pte.';
        return status;
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-lg text-zinc-800 dark:text-white tracking-tight">Gestión de Alumnado</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Supervisa y valida los expedientes de tus estudiantes asignados</p>
                </div>

            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/30 text-zinc-500 dark:text-zinc-400 text-xs uppercase font-semibold tracking-wider">
                            <th className="px-6 py-4 font-medium">Alumno / Contacto</th>
                            <th className="px-6 py-4 font-medium">Programa (Grado)</th>
                            <th className="px-6 py-4 font-medium">Empresa Asignada</th>
                            <th className="px-6 py-4 font-medium">Estado</th>
                            <th className="px-6 py-4 font-medium text-right">Opciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-sm">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full bg-zinc-200 dark:bg-zinc-700"></div>
                                            <div className="space-y-2">
                                                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                                <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
                                    <td className="px-6 py-4"><div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div></td>
                                    <td className="px-6 py-4 text-right"><div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-lg ml-auto"></div></td>
                                </tr>
                            ))
                        ) : paginatedStudents.length === 0 ? (
                            <tr>
                                <td colSpan={5}>
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="size-16 mb-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                            <span className="material-symbols-outlined text-3xl">person_off</span>
                                        </div>
                                        <h4 className="text-zinc-900 dark:text-zinc-100 font-bold mb-1">Sin alumnos registrados</h4>
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mb-6">No hay estudiantes activos en tu lista actual. Cuando los alumnos se registren y los apruebes, aparecerán aquí.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedStudents.map((row) => (
                                <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors duration-200 group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 ring-2 ring-white dark:ring-zinc-900 overflow-hidden">
                                                {row.foto ? (
                                                    <img src={`https://educonect.alwaysdata.net/uploads/fotos/${row.foto}`} className="w-full h-full object-cover" alt="Perfil" />
                                                ) : (
                                                    row.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{row.nombre}</p>
                                                <p className="text-xs text-zinc-500">{row.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={row.grado}>
                                        {row.grado}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {row.empresa ? (
                                                <>
                                                    <span className="material-symbols-outlined text-zinc-400 text-[18px]">business</span>
                                                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">{row.empresa}</span>
                                                </>
                                            ) : (
                                                <span className="text-zinc-400 italic">No asignada</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(row.status)}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 mr-1.5"></span>
                                            {getStatusLabel(row.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end items-center gap-2">
                                            <button
                                                onClick={() => onRemoveAlumno(row.id, row.nombre)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Eliminar Alumno"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>

                                            <button
                                                onClick={() => onOpenDetailModal(row.id)}
                                                className="px-3 py-1.5 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
                                            >
                                                Expediente
                                            </button>

                                            {row.oferta_id && (
                                                <button
                                                    onClick={() => {
                                                        onOpenDetailModal(row.id);
                                                        onOpenOfferModal(row.id);
                                                    }}
                                                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                                                >
                                                    Oferta
                                                </button>
                                            )}

                                            {row.status === 'ADMITIDO' && row.candidatura_id && (
                                                <button
                                                    onClick={() => onOpenValModal(row)}
                                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition-colors flex items-center gap-1"
                                                >
                                                    Validar <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
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

            {/* Mobile Card View */}
            <div className="sm:hidden flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl p-4 animate-pulse space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-12 rounded-full bg-zinc-200 dark:bg-zinc-700"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                        <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                                    </div>
                                </div>
                                <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded-lg"></div>
                                    <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded-lg"></div>
                                </div>
                            </div>
                        ))
                    ) : paginatedStudents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <span className="material-symbols-outlined text-4xl text-zinc-300 mb-2">person_off</span>
                            <p className="text-sm text-zinc-500">Sin alumnos registrados</p>
                        </div>
                    ) : (
                        paginatedStudents.map((row) => (
                            <div key={row.id} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 space-y-4 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="size-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 overflow-hidden shrink-0">
                                            {row.foto ? (
                                                <img src={`https://educonect.alwaysdata.net/uploads/fotos/${row.foto}`} className="w-full h-full object-cover" alt="Perfil" />
                                            ) : (
                                                row.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{row.nombre}</p>
                                            <p className="text-xs text-zinc-500 truncate">{row.email}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(row.status)}`}>
                                        {getStatusLabel(row.status)}
                                    </span>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center gap-2 text-zinc-500">
                                        <span className="material-symbols-outlined text-[16px]">school</span>
                                        <span className="truncate">{row.grado}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-500">
                                        <span className="material-symbols-outlined text-[16px]">business</span>
                                        <span className={row.empresa ? "text-zinc-700 dark:text-zinc-300 font-medium" : "italic"}>
                                            {row.empresa || 'No asignada'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <button
                                        onClick={() => onOpenDetailModal(row.id)}
                                        className="py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                                    >
                                        Expediente
                                    </button>
                                    
                                    {row.status === 'ADMITIDO' && row.candidatura_id ? (
                                        <button
                                            onClick={() => onOpenValModal(row)}
                                            className="py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                                        >
                                            Validar
                                        </button>
                                    ) : row.oferta_id ? (
                                        <button
                                            onClick={() => {
                                                onOpenDetailModal(row.id);
                                                onOpenOfferModal(row.id);
                                            }}
                                            className="py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20"
                                        >
                                            Oferta
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onRemoveAlumno(row.id, row.nombre)}
                                            className="py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                        >
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>


            {/* Pagination Controls */}
            {approvedStudents.length > 0 && (
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/20">
                    <div>
                        Mostrando <span className="font-medium text-zinc-900 dark:text-zinc-100">{((page - 1) * itemsPerPage) + 1}</span> a <span className="font-medium text-zinc-900 dark:text-zinc-100">{Math.min(page * itemsPerPage, approvedStudents.length)}</span> de <span className="font-medium text-zinc-900 dark:text-zinc-100">{approvedStudents.length}</span> alumnos
                    </div>
                    <div className="flex gap-1">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>
                        <button 
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
