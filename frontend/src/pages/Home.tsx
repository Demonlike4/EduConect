import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser, type UserRole } from '../context/UserContext';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useUser();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const getDashboardPath = (role: UserRole) => {
        switch (role) {
            case 'ALUMNO': return '/dashboard/alumno';
            case 'EMPRESA': return '/dashboard/empresa';
            case 'TUTOR_CENTRO': return '/dashboard/tutor-centro';
            case 'TUTOR_EMPRESA': return '/dashboard/tutor-empresa';
            default: return '/login';
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setIsMenuOpen(false);
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
            {/* Navigation Bar */}
            <header className="fixed top-0 left-0 z-50 w-full bg-primary dark:bg-[#0d47a1] text-white px-6 lg:px-20 py-2.5 shadow-md">
                <nav className="max-w-[1280px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-white p-1 rounded-sm flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[18px] font-bold">assured_workload</span>
                        </div>
                        <span className="text-lg font-bold tracking-tight text-white uppercase transition-none">EduConect</span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-6">
                        <a
                            className="text-xs font-bold uppercase tracking-tight hover:underline transition-colors text-white/90"
                            href="#digitalizar"
                            onClick={(e) => scrollToSection(e, 'digitalizar')}
                        >
                            Digitalización
                        </a>
                        <a
                            className="text-xs font-bold uppercase tracking-tight hover:underline transition-colors text-white/90"
                            href="#roles"
                            onClick={(e) => scrollToSection(e, 'roles')}
                        >
                            Plataforma
                        </a>
                        <a
                            className="text-xs font-bold uppercase tracking-tight hover:underline transition-colors text-white/90"
                            href="#resultados"
                            onClick={(e) => scrollToSection(e, 'resultados')}
                        >
                            Resultados
                        </a>
                        <div className="h-4 w-[1px] bg-[#dbdfe6] dark:bg-white/10"></div>
                        <div className="flex items-center gap-3">
                            {user ? (
                                <>
                                    <span className="text-xs font-bold text-white/80 hidden lg:block uppercase">{user.nombre.split(' ')[0]}</span>
                                    <button
                                        onClick={() => navigate(getDashboardPath(user.role))}
                                        className="bg-white text-primary text-xs font-bold px-4 py-2 rounded-sm hover:bg-gray-100 transition-none uppercase"
                                    >
                                        Panel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="bg-transparent border border-white text-white text-xs font-bold px-4 py-2 rounded-sm hover:bg-white/10 transition-none uppercase"
                                    >
                                        Acceder
                                    </button>
                                    <button
                                        onClick={() => navigate('/registro')}
                                        className="bg-white text-primary text-xs font-bold px-4 py-2 rounded-sm hover:bg-gray-100 transition-none uppercase"
                                    >
                                        Registro
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
                    </button>
                </nav>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-background-dark border-b border-[#dbdfe6] dark:border-white/10 p-6 flex flex-col gap-6 animate-in slide-in-from-top duration-300">
                        <a
                            className="text-lg font-medium hover:text-primary transition-colors"
                            href="#digitalizar"
                            onClick={(e) => scrollToSection(e, 'digitalizar')}
                        >
                            ¿Por qué digitalizar?
                        </a>
                        <a
                            className="text-lg font-medium hover:text-primary transition-colors"
                            href="#roles"
                            onClick={(e) => scrollToSection(e, 'roles')}
                        >
                            Roles
                        </a>
                        <a
                            className="text-lg font-medium hover:text-primary transition-colors"
                            href="#resultados"
                            onClick={(e) => scrollToSection(e, 'resultados')}
                        >
                            Resultados
                        </a>
                        <div className="flex flex-col gap-4 pt-4 border-t border-[#dbdfe6] dark:border-white/10">
                            {user ? (
                                <>
                                    <div className="text-center py-2 font-medium text-gray-600 dark:text-gray-400">
                                        Sesión iniciada como <span className="text-primary font-bold">{user.role}</span>
                                    </div>
                                    <button
                                        onClick={() => navigate(getDashboardPath(user.role))}
                                        className="w-full bg-primary text-white text-lg font-bold py-3 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                                    >
                                        Ir a mi Panel
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full bg-white/5 dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 text-[#111318] dark:text-white text-lg font-bold py-3 rounded-xl hover:bg-[#f0f2f4] dark:hover:bg-white/10 transition-all text-center"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="w-full bg-white/5 dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 text-[#111318] dark:text-white text-lg font-bold py-3 rounded-xl hover:bg-[#f0f2f4] dark:hover:bg-white/10 transition-all text-center"
                                    >
                                        Iniciar Sesión
                                    </button>
                                    <button
                                        onClick={() => navigate('/registro')}
                                        className="w-full bg-primary text-white text-lg font-bold py-3 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                                    >
                                        Empezar ahora
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* Hero Section with High-Quality Background */}
            <section className="relative overflow-hidden pt-32 pb-24 lg:pt-48 lg:pb-48 px-6 lg:px-20 border-b border-[#e0e0e0] dark:border-white/5">
                {/* Background Image Layer */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/fct_management_hero_bg_final_1774381111110.png" 
                        alt="Background" 
                        className="w-full h-full object-cover opacity-15 dark:opacity-5"
                    />
                    <div className="absolute inset-0 bg-linear-to-b from-white via-transparent to-white dark:from-background-dark dark:to-background-dark"></div>
                </div>

                {/* Institutional Subtle Pattern Background Layer */}
                <div className="absolute inset-0 opacity-5 pointer-events-none z-1" style={{ backgroundImage: `radial-gradient(#1a73e8 0.5px, transparent 0.5px)`, backgroundSize: '32px 32px' }}></div>
                
                <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-left duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f0f4f9] dark:bg-primary/10 text-primary-dark text-[11px] font-bold uppercase tracking-widest w-fit border border-primary/20">
                            <span className="material-symbols-outlined text-[14px]">assured_workload</span>
                            Sistema de Gestión Académica
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-[#111318] dark:text-white uppercase">
                            Edu<span className="text-primary">Conect</span>
                        </h1>
                        <p className="text-lg lg:text-xl text-[#616f89] dark:text-slate-400 max-w-[540px] leading-relaxed">
                            La plataforma profesional definitiva para la gestión de Formación en Centros de Trabajo (FCT). Una solución integral para centros, empresas y alumnos.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                            {user ? (
                                <button
                                    onClick={() => navigate(getDashboardPath(user.role))}
                                    className="col-span-1 sm:col-span-2 flex items-center justify-center gap-3 bg-primary text-white text-lg font-bold px-8 py-5 rounded-xl shadow-xl shadow-primary/25 hover:translate-y-[-2px] transition-all"
                                >
                                    <span className="material-symbols-outlined">dashboard</span>
                                    Acceder a mi Panel ({user.role?.replace('_', ' ')})
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate('/registro', { state: { role: 'alumno' } })}
                                        className="flex items-center justify-center gap-3 bg-primary text-white text-base font-bold px-6 py-4 rounded-xl shadow-xl shadow-primary/25 hover:translate-y-[-1px] transition-all"
                                    >
                                        <span className="material-symbols-outlined">school</span>
                                        Soy un Alumno
                                    </button>
                                    <button
                                        onClick={() => navigate('/registro', { state: { role: 'tutor_centro' } })}
                                        className="flex items-center justify-center gap-3 bg-white dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 text-[#111318] dark:text-white text-base font-bold px-6 py-4 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                                    >
                                        <span className="material-symbols-outlined">psychology</span>
                                        Tutor de Centro
                                    </button>
                                    <button
                                        onClick={() => navigate('/registro', { state: { role: 'tutor_empresa' } })}
                                        className="flex items-center justify-center gap-3 bg-white dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 text-[#111318] dark:text-white text-base font-bold px-6 py-4 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                                    >
                                        <span className="material-symbols-outlined">supervisor_account</span>
                                        Tutor de Empresa
                                    </button>
                                    <button
                                        onClick={() => navigate('/registro', { state: { role: 'empresa' } })}
                                        className="flex items-center justify-center gap-3 bg-white dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 text-[#111318] dark:text-white text-base font-bold px-6 py-4 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                                    >
                                        <span className="material-symbols-outlined">corporate_fare</span>
                                        Soy una Empresa
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="relative animate-in fade-in slide-in-from-right duration-700 delay-100">
                        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden aspect-video lg:aspect-4/3 flex items-center justify-center border-4 border-white dark:border-background-dark">
                            <img 
                                src="/hero_students_collaboration_1774380530901.png" 
                                alt="FCT Collaboration" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl border border-[#e0e0e0] dark:border-white/10 hidden md:block animate-in zoom-in duration-500 delay-500">
                            <div className="flex items-center gap-4">
                                <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">analytics</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sistema Web</p>
                                    <p className="text-lg font-bold dark:text-white">FCT Digital</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Digitalize Section */}
            <section className="py-24 px-6 lg:px-20 bg-white dark:bg-background-dark/50" id="digitalizar">
                <div className="max-w-[1280px] mx-auto">
                    <div className="flex flex-col items-center text-center gap-4 mb-16">
                        <h2 className="text-3xl lg:text-5xl font-black tracking-tight">¿Por qué digitalizar tus prácticas?</h2>
                        <p className="text-[#616f89] dark:text-slate-400 max-w-[720px] text-lg">
                            Optimiza la gestión de la FCT con una plataforma diseñada para eliminar la burocracia y mejorar la comunicación.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Efficiency */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-[#e0e0e0] dark:border-white/10 shadow-sm hover:translate-y-[-8px] transition-all duration-300">
                            <div className="w-14 h-14 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-[32px]">bolt</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3 dark:text-white">Eficiencia</h3>
                            <p className="text-[#616f89] dark:text-slate-400 leading-relaxed text-sm">
                                Reduce el papeleo en un 80% y automatiza procesos administrativos. Firma digital integrada para todos los convenios.
                            </p>
                        </div>
                        {/* Transparency */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-[#e0e0e0] dark:border-white/10 shadow-sm hover:translate-y-[-8px] transition-all duration-300">
                            <div className="w-14 h-14 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-[32px]">visibility</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3 dark:text-white">Transparencia</h3>
                            <p className="text-[#616f89] dark:text-slate-400 leading-relaxed text-sm">
                                Seguimiento en tiempo real del progreso, diario de prácticas y evaluaciones. Visibilidad completa para el centro y la empresa.
                            </p>
                        </div>
                        {/* Simplicity */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-[#e0e0e0] dark:border-white/10 shadow-sm hover:translate-y-[-8px] transition-all duration-300">
                            <div className="w-14 h-14 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-[32px]">touch_app</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3 dark:text-white">Simplicidad</h3>
                            <p className="text-[#616f89] dark:text-slate-400 leading-relaxed text-sm">
                                Interfaz intuitiva centrada en el usuario. Gestión de convenios y anexos con un solo clic, sin complicaciones técnicas.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Roles Section */}
            <section className="py-24 px-6 lg:px-20" id="roles">
                <div className="max-w-[1280px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="flex flex-col gap-4 mb-12">
                                <h2 className="text-3xl lg:text-4xl font-black tracking-tight dark:text-white uppercase transition-none">Perfiles en la plataforma</h2>
                                <p className="text-[#616f89] dark:text-slate-400 text-lg">Herramientas específicas diseñadas para cada protagonista del proceso educativo.</p>
                            </div>
                            <div className="space-y-6">
                                {/* Student Card */}
                                <div className="bg-white dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 p-6 rounded hover:border-primary/50 transition-all duration-300 group cursor-default">
                                    <div className="flex items-center gap-4 mb-2">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">person</span>
                                        <h3 className="text-xl font-bold dark:text-white uppercase">Alumnos</h3>
                                    </div>
                                    <p className="text-[#616f89] dark:text-slate-400 text-sm leading-relaxed ml-11">Accede a las mejores ofertas, gestiona tu diario de prácticas y comunica tus avances al instante desde cualquier dispositivo.</p>
                                </div>
                                {/* Tutor Card */}
                                <div className="bg-white dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 p-6 rounded hover:border-primary/50 transition-all duration-300 group cursor-default">
                                    <div className="flex items-center gap-4 mb-2">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">psychology</span>
                                        <h3 className="text-xl font-bold dark:text-white uppercase">Tutores</h3>
                                    </div>
                                    <p className="text-[#616f89] dark:text-slate-400 text-sm leading-relaxed ml-11">Gestiona convenios, asignaciones y evaluaciones sin esfuerzo. Mantén un control total sobre el aprendizaje de tus alumnos.</p>
                                </div>
                                {/* Company Card */}
                                <div className="bg-white dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 p-6 rounded hover:border-primary/50 transition-all duration-300 group cursor-default">
                                    <div className="flex items-center gap-4 mb-2">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">apartment</span>
                                        <h3 className="text-xl font-bold dark:text-white uppercase">Empresas</h3>
                                    </div>
                                    <p className="text-[#616f89] dark:text-slate-400 text-sm leading-relaxed ml-11">Capta y fideliza el mejor talento de FP. Gestiona la documentación legal y los planes formativos de forma ágil y segura.</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="aspect-4/5 rounded overflow-hidden shadow-2xl border-8 border-white dark:border-gray-800 rotate-2 group-hover:rotate-0 transition-transform duration-500">
                                <img 
                                    src="/digital_fct_management_1774380548962.png" 
                                    alt="Management Dashboard" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                                />
                            </div>
                            <div className="absolute -top-4 -right-4 bg-primary text-white p-4 rounded shadow-xl animate-bounce">
                                <span className="material-symbols-outlined text-3xl">verified</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 px-6 lg:px-20 bg-primary dark:bg-primary/90 text-white overflow-hidden relative" id="resultados">
                <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path d="M45.7,-77.6C58.9,-71.1,69.1,-58.5,77.5,-44.7C85.9,-30.9,92.5,-15.5,91.8,-0.4C91.1,14.6,83.1,29.3,73.8,42.2C64.6,55.1,54.1,66.1,41.2,74.1C28.2,82.2,14.1,87.2,-0.7,88.4C-15.5,89.6,-30.9,86.9,-44.4,79.5C-57.8,72.1,-69.2,60.1,-77.3,46.4C-85.3,32.7,-90,16.4,-90.6,-0.4C-91.2,-17.1,-87.6,-34.2,-78.9,-47.9C-70.1,-61.7,-56.1,-72.1,-41.6,-77.8C-27.1,-83.4,-12.1,-84.3,2.4,-88.4C16.9,-92.5,32.5,-84.1,45.7,-77.6Z" fill="#FFFFFF" transform="translate(100 100)"></path>
                    </svg>
                </div>
                <div className="max-w-[1280px] mx-auto text-center">
                    <h2 className="text-2xl lg:text-3xl font-bold mb-16 tracking-tight">Transformando el panorama de la FP en España</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                        {[
                            { label: 'Convenios Activos', value: '1000+' },
                            { label: 'Empresas', value: '500+' },
                            { label: 'Alumnos', value: '5000+' },
                            { label: 'Satisfacción', value: '98%' },
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center group cursor-default">
                                <span className="text-5xl font-black mb-2 group-hover:scale-110 transition-transform duration-300">{stat.value}</span>
                                <p className="text-primary-foreground/80 font-medium text-sm uppercase tracking-wider">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final Section */}
            <section className="py-24 px-6 lg:px-20 text-center" id="cta">
                <div className="max-w-[800px] mx-auto bg-gray-50 dark:bg-gray-800 p-10 rounded-lg border border-[#e0e0e0] dark:border-white/10">
                    <h2 className="text-3xl font-bold mb-4">Empezar a usar el sistema</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Accede ahora para gestionar tus prácticas de FCT de forma sencilla.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button onClick={() => navigate(user ? getDashboardPath(user.role) : '/registro')} className="bg-primary text-white font-bold px-8 py-3 rounded shadow hover:bg-primary-dark transition-none">
                            {user ? 'Mi Panel' : 'Crear mi cuenta'}
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white dark:bg-background-dark border-t border-[#dbdfe6] dark:border-white/10 py-16 px-6 lg:px-20">
                <div className="max-w-[1280px] mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4 text-primary">
                                <span className="material-symbols-outlined text-2xl">school</span>
                                <span className="text-lg font-bold">EduConect</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Gestión digital de la Formación Profesional.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6 text-gray-900 dark:text-white uppercase text-xs tracking-widest">Plataforma</h4>
                            <ul className="flex flex-col gap-4 text-sm text-[#616f89] dark:text-slate-400">
                                <li><a className="hover:text-primary" href="#digitalizar" onClick={(e) => scrollToSection(e, 'digitalizar')}>Cómo funciona</a></li>
                                <li><a className="hover:text-primary" href="#roles" onClick={(e) => scrollToSection(e, 'roles')}>Gestión de Roles</a></li>
                                <li><a className="hover:text-primary" href="#resultados" onClick={(e) => scrollToSection(e, 'resultados')}>Resultados y Estadísticas</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6 text-gray-900 dark:text-white uppercase text-xs tracking-widest">Servicios</h4>
                            <ul className="flex flex-col gap-4 text-sm text-[#616f89] dark:text-slate-400">
                                <li><a className="hover:text-primary" href="#cta" onClick={(e) => scrollToSection(e, 'cta')}>Empezar ahora</a></li>
                                <li><Link className="hover:text-primary" to="/privacidad">Privacidad</Link></li>
                                <li><a className="hover:text-primary" href="mailto:soporte@educonect.com">Contacto Soporte</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6">Legal</h4>
                            <ul className="flex flex-col gap-4 text-sm text-[#616f89] dark:text-slate-400">
                                <li><Link className="hover:text-primary" to="/privacidad">Privacidad</Link></li>
                                <li><Link className="hover:text-primary" to="/terminos">Términos de servicio</Link></li>
                                <li><Link className="hover:text-primary" to="/cookies">Cookies</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-[#dbdfe6] dark:border-white/10 text-sm text-[#616f89]">
                        <p>© 2024 EduPrácticas Connect. Todos los derechos reservados.</p>
                        <div className="flex gap-6 mt-4 md:mt-0">
                            <a className="hover:text-primary" href="#"><span className="material-symbols-outlined">public</span></a>
                            <a className="hover:text-primary" href="#"><span className="material-symbols-outlined">alternate_email</span></a>
                            <a className="hover:text-primary" href="#"><span className="material-symbols-outlined">share</span></a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
