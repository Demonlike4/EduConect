import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { apiUrl, assetUrl } from '../lib/urls';
import DashboardLayout from '../components/layout/DashboardLayout';

interface ProfileData {
    nombre: string;
    email: string;
    grado: string;
    bio: string;
    habilidades: string[];
    centro: string;
    cv?: string;
    foto?: string;
}

const PerfilAlumno: React.FC = () => {
    const navigate = useNavigate();
    const { user, login, logout } = useUser();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [newSkill, setNewSkill] = useState('');
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadingFoto, setUploadingFoto] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (user?.email) {
                try {
                    const res = await axios.post(apiUrl('/api/alumno/profile'), { email: user.email });
                    setProfile(res.data);
                } catch (error) {
                    console.error("Error fetching profile", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchProfile();
    }, [user]);

    const handleSave = async () => {
        try {
            await axios.post(apiUrl('/api/alumno/profile/update'), {
                email: user?.email,
                habilidades: profile?.habilidades || [] // Bio is mocked in backend so sending it won't persist yet
            });
            alert("Perfil actualizado correctamente");
        } catch (error) {
            console.error("Error updating profile", error);
            alert("Error al guardar cambios");
        }
    };

    const handleCvUpload = async () => {
        if (!cvFile || !user?.email) return;

        const formData = new FormData();
        formData.append('cv', cvFile);
        formData.append('email', user.email);

        setUploading(true);
        try {
            const res = await axios.post(apiUrl('/api/alumno/profile/cv'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(res.data.message);
            if (profile) setProfile({ ...profile, cv: res.data.cv });
            setCvFile(null);
        } catch (error: any) {
            console.error("Error uploading CV", error);
            alert(error.response?.data?.error || "Error al subir CV");
        } finally {
            setUploading(false);
        }
    };

    const handleFotoUpload = async (file: File) => {
        if (!user?.email) return;

        const formData = new FormData();
        formData.append('foto', file);
        formData.append('email', user.email);

        setUploadingFoto(true);
        try {
            const res = await axios.post(apiUrl('/api/alumno/profile/foto'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (profile) setProfile({ ...profile, foto: res.data.foto });
            if (user) login({ ...user, foto: res.data.foto });
            alert("Foto de perfil actualizada");
        } catch (error: any) {
            console.error("Error uploading foto", error);
            alert(error.response?.data?.error || "Error al subir la foto");
        } finally {
            setUploadingFoto(false);
        }
    };

    const addSkill = () => {
        if (newSkill && profile) {
            if (!profile.habilidades.includes(newSkill)) {
                setProfile({ ...profile, habilidades: [...profile.habilidades, newSkill] });
            }
            setNewSkill('');
        }
    };

    const removeSkill = (skill: string) => {
        if (profile) {
            setProfile({ ...profile, habilidades: profile.habilidades.filter(s => s !== skill) });
        }
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (loading) return <div className="flex h-screen items-center justify-center text-primary font-bold">Cargando perfil...</div>;

    const displayName = profile?.nombre || user?.nombre || "Usuario";
    const displayEmail = profile?.email || user?.email || "email@ejemplo.com";
    const displayGrade = profile?.grado || user?.grado || "Grado no especificado";

    return (
        <DashboardLayout
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            sidebarWidthClass="w-80"
            sidebarClassName="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800"
            zIndexSidebarClass="z-[70]"
            mainClassName="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
            sidebar={
                <>
                <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-600/20 group">
                            <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">school</span>
                        </div>
                        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">EduConect</h1>
                    </div>
                    <button className="lg:hidden p-2 text-zinc-400" onClick={() => setIsSidebarOpen(false)}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <div className="px-4 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Navegación</div>
                    <button 
                        onClick={() => navigate('/dashboard/alumno')} 
                        className="flex w-full items-center gap-3 px-4 py-3.5 rounded-2xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-indigo-600 transition-all duration-300 group"
                    >
                        <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">dashboard</span>
                        <span className="text-sm font-black">Mi Panel</span>
                    </button>
                    <button 
                        className="flex w-full items-center gap-3 px-4 py-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 font-black shadow-xs border border-indigo-100 dark:border-indigo-500/20 animate-in slide-in-from-left-2 duration-300"
                    >
                        <span className="material-symbols-outlined text-[22px]">person_check</span>
                        <span className="text-sm">Configuración</span>
                    </button>
                    {/* Placeholder for other links */}
                    <div className="pt-8 px-4 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Ayuda</div>
                    <button 
                        onClick={() => alert("Próximamente: Centro de Ayuda")}
                        className="flex w-full items-center gap-3 px-4 py-3.5 rounded-2xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-300"
                    >
                        <span className="material-symbols-outlined text-[22px]">help</span>
                        <span className="text-sm font-black">Soporte técnico</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-red-600 dark:hover:bg-red-500 text-xs font-semibold tracking-wide rounded-2xl transition-all shadow-lg hover:shadow-red-500/20"
                    >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Cerrar Sesión
                    </button>
                </div>
                </>
            }
            header={
                <header className="h-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 lg:px-10 shrink-0 z-30 sticky top-0 transition-all">
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden p-2 text-zinc-500" onClick={() => setIsSidebarOpen(true)}>
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-base lg:text-lg font-black text-zinc-900 dark:text-white tracking-tight">Perfil Profesional</h2>
                            <p className="text-[10px] text-zinc-400 font-medium hidden sm:block">Gestiona tu identidad en el sistema</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSave}
                            className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 hover:bg-indigo-700 text-white px-4 lg:px-8 py-2 lg:py-2.5 rounded-2xl text-[9px] lg:text-[10px] font-semibold tracking-wide transition-all shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[16px] lg:text-[18px]">save</span>
                            <span className="hidden xs:inline">Guardar</span>
                        </button>
                    </div>
                </header>
            }
        >
                <main className="p-4 lg:p-10 space-y-10 custom-scrollbar bg-zinc-50 dark:bg-zinc-950 pb-24">
                    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700">
                        {/* Profile Header Visual Card */}
                        <div className="relative group p-1 bg-linear-to-tr from-indigo-500 to-indigo-700 rounded-[40px] shadow-2xl shadow-indigo-500/20">
                            <div className="bg-white dark:bg-zinc-900 rounded-[38px] p-8 md:p-12 overflow-hidden relative">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 size-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                <div className="absolute bottom-0 left-0 size-48 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30/5 rounded-full blur-2xl -ml-24 -mb-24"></div>

                                <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-left">
                                    <div className="relative flex-none">
                                        <div className="size-40 rounded-[32px] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-indigo-600 text-5xl font-black border-8 border-white dark:border-zinc-900 shadow-2xl relative z-10 overflow-hidden select-none">
                                            {profile?.foto ? (
                                                <img 
                                                    src={profile.foto.startsWith('http') ? profile.foto : assetUrl(`/uploads/fotos/${profile.foto}`)} 
                                                    alt="Perfil" 
                                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" 
                                                />
                                            ) : (
                                                displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)
                                            )}
                                            
                                            {uploadingFoto && (
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
                                                    <div className="size-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <input 
                                            type="file" 
                                            id="foto-input" 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFotoUpload(file);
                                            }}
                                        />
                                        
                                        <label 
                                            htmlFor="foto-input"
                                            className="absolute -bottom-2 -right-2 size-12 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 dark:bg-indigo-500 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white dark:border-zinc-900 z-30 text-white cursor-pointer hover:scale-110 active:scale-95 transition-all group/edit"
                                        >
                                            <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">edit</span>
                                        </label>
                                    </div>

                                    <div className="flex-1 py-2">
                                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                            <div>
                                                <h3 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">{displayName}</h3>
                                                <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                                                    <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white text-[9px] font-bold rounded-lg tracking-wide px-2.5 py-0.5 shadow-lg shadow-indigo-600/20">{displayGrade}</span>
                                                    <span className="text-zinc-400 font-bold text-sm flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">location_city</span>
                                                        {profile?.centro}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center md:items-end">
                                                <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-50 dark:bg-zinc-800/50 px-5 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs group/email transition-all hover:border-indigo-500/30">
                                                    <span className="material-symbols-outlined text-indigo-600 group-hover/email:rotate-12 transition-transform">mail</span>
                                                    <span className="text-sm font-black tracking-tight">{displayEmail}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Actividad</p>
                                                <p className="text-lg font-black text-zinc-800 dark:text-white">FCT Activa</p>
                                            </div>
                                            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Skills</p>
                                                <p className="text-lg font-black text-zinc-800 dark:text-white">{profile?.habilidades.length}</p>
                                            </div>
                                            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">CV Estado</p>
                                                <span className={`text-xs font-semibold tracking-wide ${profile?.cv ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    {profile?.cv ? 'VINCULADO' : 'PENDIENTE'}
                                                </span>
                                            </div>
                                            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Rol</p>
                                                <p className="text-lg font-black text-indigo-600">Alumno</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Skills Section */}
                            <div className="lg:col-span-2 space-y-10">
                                <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none group">
                                    <div className="flex items-center justify-between mb-8">
                                        <h4 className="font-black text-xl dark:text-white flex items-center gap-3">
                                            <div className="size-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                                                <span className="material-symbols-outlined">terminal</span>
                                            </div>
                                            Skills & Tecnologías Dominadas
                                        </h4>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-3 mb-10">
                                        {profile?.habilidades.map((skill) => (
                                            <div key={skill} className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-1.5 pl-4 rounded-2xl flex items-center gap-3 group hover:border-indigo-500/30 hover:bg-white dark:hover:bg-zinc-800 transition-all shadow-sm">
                                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">{skill}</span>
                                                <button
                                                    onClick={() => removeSkill(skill)}
                                                    className="size-7 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-300 hover:bg-red-500 hover:text-white transition-all shadow-xs border border-zinc-100 dark:border-zinc-800"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </div>
                                        ))}
                                        {profile?.habilidades.length === 0 && (
                                            <p className="text-zinc-400 text-sm italic py-4">No has añadido ninguna habilidad todavía...</p>
                                        )}
                                    </div>

                                    <div className="flex gap-3 bg-zinc-50 dark:bg-zinc-800/30 p-2 rounded-[24px] border border-zinc-100 dark:border-zinc-800">
                                        <input
                                            type="text"
                                            value={newSkill}
                                            onChange={(e) => setNewSkill(e.target.value)}
                                            className="flex-1 bg-transparent border-none px-6 py-3 text-sm font-medium outline-none placeholder:text-zinc-400 placeholder:font-bold"
                                            placeholder="Nueva tecnología (ej: Docker, React...)"
                                            onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                                        />
                                        <button 
                                            onClick={addSkill} 
                                            className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl text-[10px] font-semibold tracking-wide transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                                        >
                                            Añadir
                                        </button>
                                    </div>
                                </div>

                                {/* Privacy Info Card */}
                                <div className="bg-linear-to-r from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-zinc-950 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
                                    <span className="material-symbols-outlined absolute -top-4 -right-4 text-9xl text-white/5 rotate-12 select-none">security</span>
                                    <div className="relative z-10 flex items-start gap-6">
                                        <div className="size-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                                            <span className="material-symbols-outlined text-indigo-400 text-3xl">info</span>
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black mb-2 tracking-tight">Visibilidad del Perfil</h4>
                                            <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                                                Tus habilidades y competencias técnicas son visibles para las empresas del sistema. 
                                                Mantener tu perfil actualizado aumenta tus probabilidades de conseguir una mejor vacante de FCT.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CV Section Area */}
                            <div className="space-y-10">
                                <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden relative">
                                    <h4 className="font-black text-xl dark:text-white flex items-center gap-3 mb-8">
                                        <div className="size-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                                            <span className="material-symbols-outlined">picture_as_pdf</span>
                                        </div>
                                        Fichero CV (PDF)
                                    </h4>

                                    <div className="flex flex-col gap-6">
                                        <div className="flex items-center gap-4 p-5 bg-zinc-50 dark:bg-zinc-800/40 rounded-3xl border border-zinc-100 dark:border-zinc-800 group hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
                                            <div className="size-14 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-zinc-100 dark:border-zinc-800 group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-3xl">{profile?.cv ? 'folder_open' : 'upload_file'}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-zinc-800 dark:text-zinc-200 truncate pr-2">
                                                    {profile?.cv ? profile.cv : 'No vinculado'}
                                                </p>
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight mt-0.5">Estado del documento</p>
                                            </div>
                                            {profile?.cv && (
                                                <div className="size-6 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                                    <span className="material-symbols-outlined text-[14px] font-black">done</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                                                className="hidden"
                                                id="cv-upload"
                                            />
                                            <label
                                                htmlFor="cv-upload"
                                                className="cursor-pointer group block w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-indigo-400 p-8 rounded-[28px] text-center transition-all"
                                            >
                                                <span className="material-symbols-outlined text-4xl text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-400 group-hover:scale-110 transition-all mb-3 block">cloud_upload</span>
                                                <p className="text-sm font-black text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-600 transition-colors">
                                                    {cvFile ? cvFile.name : 'Arrastra o busca tu PDF'}
                                                </p>
                                                <p className="text-[10px] text-zinc-400 mt-1 uppercase font-black tracking-widest">Máximo 5MB</p>
                                            </label>

                                            <button
                                                onClick={handleCvUpload}
                                                disabled={!cvFile || uploading}
                                                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 hover:bg-indigo-700 text-white text-[10px] font-semibold tracking-wide tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                        <span>Subiendo Documento...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
                                                        Actualizar Curriculum
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-indigo-50 dark:bg-indigo-500/5 rounded-[32px] border border-indigo-100 dark:border-indigo-500/10 text-center">
                                    <h5 className="font-black text-indigo-700 dark:text-indigo-400 text-sm mb-2 uppercase tracking-tight">Consejo Profesional</h5>
                                    <p className="text-xs text-indigo-900/60 dark:text-indigo-400/60 leading-relaxed font-medium">
                                        Incluye tus habilidades de "Soft Skills" (Trabajo en equipo, Adaptabilidad) además de las tecnologías técnicas.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
        </DashboardLayout>
    );
};

export default PerfilAlumno;
