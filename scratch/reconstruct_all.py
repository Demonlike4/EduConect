
file_path = r'c:\2 DAW\PF\EDUCONECT\frontend\src\pages\TutorCentroDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Localizamos el inicio del desastre (isDetailModalOpen)
# y el final del componente (donde terminan los modales)
start_index = 0
end_index = 0

for i, line in enumerate(lines):
    if '{isDetailModalOpen && (' in line and start_index == 0:
        start_index = i
    if 'export default TutorCentroDashboard;' in line:
        end_index = i - 3 # Un poco antes del export

all_modals_clean = r'''
                {/* ── MODAL: EXPEDIENTE ACADÉMICO / BITÁCORA ────────────────────────── */}
                {isDetailModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 lg:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-6xl max-h-[95vh] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-bottom-10 duration-500">
                            {detailLoading ? (
                                <div className="p-20 flex flex-col items-center justify-center gap-4">
                                    <div className="size-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-500 font-bold">Cargando expediente académico...</p>
                                </div>
                            ) : studentDetail && (
                                <>
                                    <div className="relative p-6 lg:p-8 overflow-hidden shrink-0">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                                        <div className="relative flex justify-between items-start gap-4">
                                            <div className="flex gap-4 lg:gap-8 items-center">
                                                <div className="relative group/photo">
                                                    <div className="absolute -inset-1.5 bg-linear-to-r from-indigo-600 to-purple-600 rounded-[2rem] blur opacity-20 group-hover/photo:opacity-40 transition duration-1000"></div>
                                                    <div className="relative size-28 rounded-3xl bg-white dark:bg-zinc-800 flex items-center justify-center text-indigo-600 text-4xl font-black shadow-2xl border border-white dark:border-zinc-700 overflow-hidden">
                                                        {studentDetail.foto ? (
                                                            <img src={`https://educonect.alwaysdata.net/uploads/fotos/${studentDetail.foto}`} className="w-full h-full object-cover" alt="Perfil" />
                                                        ) : (
                                                            studentDetail.nombre.split(' ').map((n:any) => n[0]).join('').substring(0, 2).toUpperCase()
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-1">
                                                        <h3 className="text-xl lg:text-3xl font-black dark:text-white tracking-tight">{studentDetail.nombre}</h3>
                                                        <span className="px-2 py-0.5 lg:px-2.5 lg:py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] lg:text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Activo 2026/27</span>
                                                    </div>
                                                    <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm lg:text-base uppercase tracking-wider mb-2 lg:mb-3">{studentDetail.grado}</p>
                                                    <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-zinc-500 dark:zinc-400 text-[10px] lg:text-sm">
                                                        <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] lg:text-[18px] opacity-70">mail</span>{studentDetail.email}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => setIsDetailModalOpen(false)} className="z-10 size-10 lg:size-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center transition-all group hover:rotate-90 shrink-0">
                                                <span className="material-symbols-outlined text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">close</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="px-6 lg:px-8 mt-2 lg:mt-4 flex gap-4 lg:gap-8 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                                        <button onClick={() => setModalTab('info')} className={`py-4 text-xs font-black uppercase tracking-[0.2em] relative transition-all ${modalTab === 'info' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}>
                                            Expediente General
                                            {modalTab === "info" && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>}
                                        </button>
                                        <button onClick={() => studentDetail?.candidatura?.estado === 'VALIDADO' && setModalTab('diario')} className={`py-4 text-xs font-black uppercase tracking-[0.2em] relative transition-all ${studentDetail?.candidatura?.estado !== "VALIDADO" ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed" : modalTab === "diario" ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"}`}>
                                            Diario de Prácticas
                                            {modalTab === "diario" && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>}
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
                                        {modalTab === 'info' ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <section className="bg-zinc-50 dark:bg-zinc-800/20 p-5 rounded-[28px] border border-zinc-100 dark:border-zinc-800/50">
                                                    <h4 className="font-black text-zinc-400 text-[10px] uppercase tracking-[0.2em] mb-4">Stack Tecnológico</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {studentDetail.habilidades?.split(',').map((skill:string, i:number) => (
                                                            <span key={i} className="px-4 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 shadow-xs">{skill.trim()}</span>
                                                        ))}
                                                    </div>
                                                </section>
                                                <section className="bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Estado</p>
                                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{studentDetail.candidatura?.estado || 'S/D'}</span>
                                                    </div>
                                                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                                                        <p className="text-[9px] font-black text-zinc-400 uppercase mb-1">Empresa</p>
                                                        <p className="text-sm font-bold dark:text-white">{studentDetail.candidatura?.empresa || 'Ninguna'}</p>
                                                    </div>
                                                </section>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {loadingDiario ? <p>Cargando diario...</p> : diarioEntries.map((entry:any) => (
                                                    <div key={entry.id} className="bg-white dark:bg-zinc-800 p-6 rounded-[28px] border border-zinc-200 dark:border-zinc-800">
                                                        <div className="flex items-start gap-4">
                                                            <div className="size-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex flex-col items-center justify-center font-bold">
                                                                <span className="text-[10px] uppercase opacity-50">{new Date(entry.fecha).toLocaleDateString('es-ES', {month:'short'})}</span>
                                                                <span className="text-lg leading-none">{new Date(entry.fecha).getDate()}</span>
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${entry.estado === 'APROBADO' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{entry.estado}</span>
                                                                    <span className="text-[10px] font-bold text-zinc-400">{entry.horas}h</span>
                                                                </div>
                                                                <p className="text-sm text-zinc-700 dark:text-zinc-300">{entry.actividad}</p>
                                                                {entry.estado === 'PENDIENTE' && (
                                                                    <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3">
                                                                        <textarea
                                                                            value={bitacoraFeedback[entry.id] || ''}
                                                                            onChange={(e) => setBitacoraFeedback({...bitacoraFeedback, [entry.id]: e.target.value})}
                                                                            className="w-full bg-white dark:bg-zinc-900 border rounded-xl p-3 text-xs outline-none"
                                                                            placeholder="Feedback..."
                                                                            rows={2}
                                                                        />
                                                                        <div className="flex gap-2">
                                                                            <button onClick={() => handleValidarDiario(entry.id, 'APROBADO')} className="flex-1 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg">Aprobar</button>
                                                                            <button onClick={() => handleValidarDiario(entry.id, 'RECHAZADO')} className="flex-1 py-2 bg-zinc-200 dark:bg-zinc-700 text-[10px] font-black uppercase rounded-lg">Rechazar</button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 shrink-0 flex justify-end">
                                        <button onClick={() => setIsDetailModalOpen(false)} className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 transition-all">Cerrar Expediente</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ── MODAL: OFERTA FCT ────────────────────────────────────────────────── */}
                {isOfferModalOpen && studentDetail?.candidatura?.oferta && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-500">
                        <div className="bg-white dark:bg-zinc-900 rounded-[44px] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden border border-white/20 flex flex-col animate-in zoom-in-95 duration-500">
                            <div className="relative h-48 bg-linear-to-br from-indigo-600 to-purple-700 p-8 lg:p-12 flex flex-col justify-end shrink-0 overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 text-white/70 text-[10px] font-black uppercase tracking-[0.3em] mb-3">
                                        <span className="material-symbols-outlined text-[18px]">verified_user</span>
                                        Detalles de la Oferta Seleccionada
                                    </div>
                                    <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter leading-tight">
                                        {studentDetail.candidatura.oferta.titulo}
                                    </h2>
                                </div>
                                <button onClick={() => setIsOfferModalOpen(false)} className="absolute top-8 right-8 size-12 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all group">
                                    <span className="material-symbols-outlined text-white transition-transform group-hover:rotate-90">close</span>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-10 custom-scrollbar">
                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Acerca de la posición</h4>
                                    <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-base font-medium italic p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-4xl border border-zinc-100 dark:border-zinc-800/50 shadow-inner">
                                        "{studentDetail.candidatura.oferta.descripcion}"
                                    </p>
                                </section>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ubicación</h4>
                                        <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                                            <span className="material-symbols-outlined text-indigo-500">location_on</span>
                                            <span className="text-sm font-bold dark:text-white">{studentDetail.candidatura.oferta.ubicacion}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Jornada</h4>
                                        <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                                            <span className="material-symbols-outlined text-purple-500">schedule</span>
                                            <span className="text-sm font-bold dark:text-white">{studentDetail.candidatura.oferta.jornada}</span>
                                        </div>
                                    </div>
                                </div>
                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Stack Tecnológico Requerido</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {studentDetail.candidatura.oferta.tecnologias?.split(',').map((tech:string, i:number) => (
                                            <span key={i} className="px-5 py-2.5 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 rounded-2xl text-[11px] font-black border border-indigo-500/10 hover:scale-105 transition-transform">
                                                {tech.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            </div>
                            <div className="p-8 lg:p-12 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex flex-col items-center">
                                <button onClick={() => setIsOfferModalOpen(false)} className="w-full py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl font-black uppercase text-xs tracking-[0.4em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">Finalizar Consulta</button>
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-6 opacity-40 italic">Expediente de Calidad EduConect • 2026</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── OTROS MODALES (Simplificados para Restaurar Balance) ──────────────── */}
                {selectedCompany && (
                   <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                       <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
                           <div className="p-8 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                               <h3 className="text-xl font-bold dark:text-white">{selectedCompany.nombre}</h3>
                               <button onClick={() => setSelectedCompany(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 font-bold">X</button>
                           </div>
                           <div className="p-8"><p className="text-slate-500 dark:text-slate-400">Listado de alumnos asignados (restaurando sección...)</p></div>
                           <div className="p-4 flex justify-end"><button onClick={() => setSelectedCompany(null)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase">Cerrar</button></div>
                       </div>
                   </div>
                )}

                {isGuideModalOpen && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-8">
                            <div className="flex justify-between mb-6"><h3 className="text-2xl font-black dark:text-white">Guía del Tutor</h3><button onClick={() => setIsGuideModalOpen(false)}>X</button></div>
                            <p className="text-slate-600 dark:text-zinc-400 text-sm italic">Panel de ayuda rápida en proceso de mantenimiento estético.</p>
                            <button onClick={() => setIsGuideModalOpen(false)} className="mt-8 px-8 py-3 bg-zinc-900 text-white rounded-2xl text-xs font-black uppercase">Entendido</button>
                        </div>
                    </div>
                )}

                {isCompanyProfileModalOpen && companyProfileData && (
                    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                        <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl p-10 text-center">
                            <h2 className="text-3xl font-black mb-4 dark:text-white">{companyProfileData.nombre}</h2>
                            <p className="text-indigo-600 font-bold mb-6 italic">{companyProfileData.email}</p>
                            <button onClick={() => setIsCompanyProfileModalOpen(false)} className="px-10 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl font-black uppercase text-[10px] tracking-widest">Cerrar Perfil</button>
                        </div>
                    </div>
                )}
'''

new_lines = lines[:start_index] + [all_modals_clean + '\n'] + lines[end_index:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
