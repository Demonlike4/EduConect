$path = "c:\2 DAW\PF\EDUCONECT\frontend\src\pages\TutorCentroDashboard.tsx"
$content = Get-Content $path

# Fix mangled lines 1670-1692
$newLines = @(
    '                                                                    <div className="flex justify-between pt-2">',
    '                                                                        <p className="text-[9px] font-semibold tracking-wide text-white/30 tracking-tighter italic">Validado por Tutor Docente</p>',
    '                                                                        <p className="text-[9px] font-semibold tracking-wide text-white/30 tracking-tighter italic">Responsable Empresa</p>',
    '                                                                    </div>',
    '                                                                </div>',
    '                                                            </div>',
    '',
    '                                                            <div className="grid grid-cols-2 gap-3 mt-6 lg:mt-8 relative">',
    '                                                                <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-white/5 rounded-[22px] border border-white/10 hover:bg-white/10 transition-colors">',
    '                                                                    <div className="size-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">',
    '                                                                        <span className="material-symbols-outlined text-[20px]">timelapse</span>',
    '                                                                    </div>',
    '                                                                    <div>',
    '                                                                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Duración</p>',
    '                                                                        <p className="text-sm font-black text-white capitalize">{studentDetail.candidatura.tipoDuracion.replace(''_'', '' '')}</p>',
    '                                                                    </div>',
    '                                                                </div>',
    '                                                                <div className="flex items-center gap-4 p-5 bg-white/5 rounded-[24px] border border-white/10 hover:bg-white/10 transition-colors">',
    '                                                                    <div className="size-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">'
)

# Splice the new lines into the content array
# Corrupted block is roughly 1670 to 1692 (index 1669 to 1691)
$head = $content[0..1668]
$tail = $content[1692..($content.Length - 1)]
$fixedContent = $head + $newLines + $tail

$fixedContent | Set-Content $path -Encoding UTF8
