import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';

interface ProfileData {
    nombre: string;
    email: string;
    grado: string;
    bio: string;
    habilidades: string[];
    centro: string;
    cv?: string;
}

const PerfilAlumno: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useUser();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [newSkill, setNewSkill] = useState('');
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (user?.email) {
                try {
                    const res = await axios.post('http://localhost:8000/api/alumno/profile', { email: user.email });
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
            await axios.post('http://localhost:8000/api/alumno/profile/update', {
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
            const res = await axios.post('http://localhost:8000/api/alumno/profile/cv', formData, {
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

    if (loading) return <div className="flex h-screen items-center justify-center text-primary font-bold">Cargando perfil...</div>;

    const displayName = profile?.nombre || user?.nombre || "Usuario";
    const displayEmail = profile?.email || user?.email || "email@ejemplo.com";
    const displayGrade = profile?.grado || user?.grado || "Grado no especificado";

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-[#111318] dark:text-slate-100 font-display transition-colors duration-300">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-white dark:bg-slate-900 border-r border-[#dbdfe6] dark:border-slate-800 flex flex-col shrink-0 transition-colors duration-300">
                <div className="p-6 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-2xl font-bold">school</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-tight dark:text-white">EduPrácticas</h1>
                        <p className="text-xs text-[#616f89] dark:text-slate-400 font-medium uppercase tracking-wider">Connect</p>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    <button onClick={() => navigate('/dashboard/alumno')} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-[#616f89] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-primary transition-all duration-200">
                        <span className="material-symbols-outlined text-[22px]">dashboard</span>
                        <span className="text-sm font-medium">Dashboard</span>
                    </button>
                    {/* Other links would match AlumnoDashboard but for now simplest is back to dashboard */}
                </nav>

                <div className="p-4 border-t border-[#dbdfe6] dark:border-slate-800">
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        className="flex w-full items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-white/5 text-[#616f89] dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-sm font-bold transition-all"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-[#dbdfe6] dark:border-slate-800 flex items-center justify-between px-8 shrink-0">
                    <h2 className="text-xl font-bold dark:text-white">Configuración del Perfil</h2>
                    <button
                        onClick={handleSave}
                        className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                    >
                        Guardar Cambios
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Profile Header Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-[#dbdfe6] dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start animate-in fade-in slide-in-from-bottom duration-500">
                            <div className="relative group">
                                <div className="size-32 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-4xl font-black border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden">
                                    {displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-3xl font-black tracking-tight dark:text-white">{displayName}</h3>
                                <p className="text-primary font-bold mt-1 uppercase text-sm tracking-wider">{displayGrade}</p>
                                <p className="text-xs text-slate-400 mt-1">{profile?.centro}</p>
                                <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
                                    <div className="flex items-center gap-2 text-[#616f89] dark:text-slate-400 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="material-symbols-outlined text-lg">mail</span>
                                        <span className="text-sm font-medium">{displayEmail}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Skills */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-[#dbdfe6] dark:border-slate-800 shadow-sm space-y-6">
                            <h4 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">terminal</span>
                                Tecnologías y Skills
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {profile?.habilidades.map((skill) => (
                                    <div key={skill} className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 group cursor-pointer hover:bg-primary/20 transition-all">
                                        {skill}
                                        <span
                                            onClick={() => removeSkill(skill)}
                                            className="material-symbols-outlined text-sm opacity-50 group-hover:opacity-100 transition-opacity hover:text-red-500"
                                        >
                                            close
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    className="bg-gray-50 dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                                    placeholder="Nueva habilidad (ej: Java)"
                                    onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                                />
                                <button onClick={addSkill} className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-all">
                                    Añadir
                                </button>
                            </div>
                        </div>

                        {/* CV Upload */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-[#dbdfe6] dark:border-slate-800 shadow-sm space-y-6">
                            <h4 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">picture_as_pdf</span>
                                Mi Curriculum Vitae
                            </h4>
                            <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                <div className="size-16 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-primary shadow-sm shrink-0">
                                    <span className="material-symbols-outlined text-4xl">description</span>
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <p className="text-sm font-bold dark:text-white">
                                        {profile?.cv ? (
                                            <span className="flex items-center justify-center md:justify-start gap-2 text-emerald-500">
                                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                                CV subido correctamente
                                            </span>
                                        ) : 'Aún no has subido tu CV'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">Sube tu curriculum en formato PDF (máx. 5MB)</p>
                                    {profile?.cv && (
                                        <p className="text-[10px] text-slate-400 mt-2 font-mono">Archivo: {profile.cv}</p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="cv-upload"
                                    />
                                    <label
                                        htmlFor="cv-upload"
                                        className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold text-center hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm"
                                    >
                                        {cvFile ? cvFile.name : 'Seleccionar PDF'}
                                    </label>
                                    <button
                                        onClick={handleCvUpload}
                                        disabled={!cvFile || uploading}
                                        className="bg-primary text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        {uploading && <div className="size-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                                        {uploading ? 'Subiendo...' : 'Subir Curriculum'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PerfilAlumno;
