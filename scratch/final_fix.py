
file_path = r'c:\2 DAW\PF\EDUCONECT\frontend\src\pages\TutorCentroDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Definimos el bloque limpio del modal
clean_modal = r'''                {isDetailModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 lg:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-6xl max-h-[95vh] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-bottom-10 duration-500">
                            {detailLoading ? (
                                <div className="p-20 flex flex-col items-center justify-center gap-4">
                                    <div className="size-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-500 font-bold">Cargando expediente académico...</p>
                                </div>
                            ) : studentDetail && (
                                <>
                                    {/* Header Premium */}
                                    <div className="relative p-6 lg:p-8 overflow-hidden shrink-0">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-600/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                                        <div className="relative flex justify-between items-start gap-4">
                                            <div className="flex gap-4 lg:gap-8 items-center">
                                                <div className="relative group/photo">
                                                    <div className="absolute -inset-1.5 bg-linear-to-r from-indigo-600 to-purple-600 rounded-[2rem] blur opacity-20 group-hover/photo:opacity-40 transition duration-1000"></div>
                                                    <div className="relative size-28 rounded-3xl bg-white dark:bg-zinc-800 flex items-center justify-center text-indigo-600 text-4xl font-black shadow-2xl border border-white dark:border-zinc-700 overflow-hidden">
                                                        {studentDetail.foto ? (
                                                            <img src={`https://educonect.alwaysdata.net/uploads/fotos/${studentDetail.foto}`} className="w-full h-full object-cover" alt="Perfil" />
                                                        ) : (
                                                            studentDetail.nombre.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-1">
                                                        <h3 className="text-xl lg:text-3xl font-black dark:text-white tracking-tight">{studentDetail.nombre}</h3>
                                                        <span className="px-2 py-0.5 lg:px-2.5 lg:py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] lg:text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                                                            Activo 2026/27
                                                        </span>
                                                    </div>
                                                    <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm lg:text-base uppercase tracking-wider mb-2 lg:mb-3">{studentDetail.grado}</p>
                                                    <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-zinc-500 dark:zinc-400 text-[10px] lg:text-sm">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[16px] lg:text-[18px] opacity-70">mail</span>
                                                            {studentDetail.email}
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
                                        <button
                                            onClick={() => setModalTab('info')}
                                            className={`py-4 text-xs font-black uppercase tracking-[0.2em] relative transition-all ${modalTab === 'info' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                                        >
                                            Expediente General
                                            {modalTab === "info" && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>}
                                        </button>
                                        <button
                                            onClick={() => studentDetail?.candidatura?.estado === 'VALIDADO' && setModalTab('diario')}
                                            className={`py-4 text-xs font-black uppercase tracking-[0.2em] relative transition-all ${studentDetail?.candidatura?.estado !== "VALIDADO" ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed" : modalTab === "diario" ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"}`}
                                        >
                                            Diario de Prácticas
                                            {modalTab === "diario" && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>}
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
                                        {modalTab === 'info' ? (
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
                                                <div className="md:col-span-12 flex flex-col gap-4 lg:gap-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <section className="bg-zinc-50 dark:bg-zinc-800/20 p-5 rounded-[28px] border border-zinc-100 dark:border-zinc-800/50">
                                                            <div className="flex items-center gap-3 mb-5">
                                                                <div className="size-8 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                                                                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                                                                </div>
                                                                <h4 className="font-black text-zinc-400 text-[10px] uppercase tracking-[0.2em]">Stack Tecnológico</h4>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {studentDetail.habilidades?.split(',').map((skill, i) => (
                                                                    <span key={i} className="px-4 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 shadow-xs">
                                                                        {skill.trim()}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </section>

                                                        <section className="bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Estado Candidatura</p>
                                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border ${studentDetail.candidatura?.estado === 'VALIDADO' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                                    {studentDetail.candidatura?.estado || 'Sin Solicitud'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                                                                <div className="size-10 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                                                                    <span className="material-symbols-outlined text-indigo-600">business</span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-zinc-400 uppercase">Empresa Asignada</p>
                                                                    <p className="text-sm font-bold dark:text-white truncate">{studentDetail.candidatura?.empresa || 'Ninguna'}</p>
                                                                </div>
                                                            </div>
                                                        </section>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-8">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <h4 className="font-black text-zinc-400 text-[10px] uppercase tracking-[0.2em] mb-1">Bitácora de Seguimiento</h4>
                                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Registro detallado de actividades</p>
                                                    </div>
                                                </div>

                                                {loadingDiario ? (
                                                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                                                        <span className="material-symbols-outlined animate-spin text-indigo-600 text-5xl">progress_activity</span>
                                                        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Sincronizando...</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {diarioEntries.map((entry) => (
                                                            <div key={entry.id} className="bg-white dark:bg-zinc-800 p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800 group transition-all duration-500">
                                                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                                                    <div className="flex-1 space-y-4">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="size-12 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex flex-col items-center justify-center border border-zinc-100 dark:border-zinc-800">
                                                                                <span className="text-[10px] font-black text-zinc-400 uppercase leading-none">{new Date(entry.fecha).toLocaleDateString('es-ES', { month: 'short' })}</span>
                                                                                <span className="text-lg font-black text-zinc-800 dark:text-white leading-none">{new Date(entry.fecha).toLocaleDateString('es-ES', { day: '2-digit' })}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${entry.estado === 'APROBADO' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{entry.estado}</span>
                                                                                <p className="text-xs font-bold text-zinc-400 mt-1">{entry.horas}h declaradas</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="pl-16">
                                                                            <p className="text-zinc-700 dark:text-zinc-200 text-sm leading-relaxed">{entry.actividad}</p>
                                                                            {entry.estado === 'PENDIENTE' && (
                                                                                <div className="mt-4 p-5 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3">
                                                                                    <textarea
                                                                                        placeholder="Mensaje de corrección..."
                                                                                        value={bitacoraFeedback[entry.id] || ''}
                                                                                        onChange={(e) => setBitacoraFeedback({ ...bitacoraFeedback, [entry.id]: e.target.value })}
                                                                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none shadow-xs transition-all"
                                                                                        rows={2}
                                                                                    ></textarea>
                                                                                    <div className="flex gap-3">
                                                                                        <button onClick={() => handleValidarDiario(entry.id, 'APROBADO')} className="flex-1 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">Aprobar</button>
                                                                                        <button onClick={() => handleValidarDiario(entry.id, 'RECHAZADO')} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all">Rechazar</button>
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

                                    <div className="p-4 lg:p-6 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center shrink-0">
                                        <div className="hidden sm:flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                                            <span className="material-symbols-outlined text-[18px]">shield</span>
                                            Protegido por Sistema EduConect
                                        </div>
                                        <button
                                            onClick={() => setIsDetailModalOpen(false)}
                                            className="px-6 lg:px-10 py-3 lg:py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-[10px] lg:text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Cerrar Expediente
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}'''

# Reemplazamos el rango de líneas
start_index = 1278 # 1279 en 1-based
end_index = 1631 # 1631 en 1-based

new_lines = lines[:start_index] + [clean_modal + '\n'] + lines[end_index:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
