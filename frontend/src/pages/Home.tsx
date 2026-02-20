import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
            <header className="fixed top-0 left-0 z-50 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-[#dbdfe6] dark:border-white/10 px-6 lg:px-20 py-4">
                <nav className="max-w-[1280px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-[24px]">rocket_launch</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-primary">EduPrácticas Connect</span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <a
                            className="text-sm font-medium hover:text-primary transition-colors"
                            href="#digitalizar"
                            onClick={(e) => scrollToSection(e, 'digitalizar')}
                        >
                            ¿Por qué digitalizar?
                        </a>
                        <a
                            className="text-sm font-medium hover:text-primary transition-colors"
                            href="#roles"
                            onClick={(e) => scrollToSection(e, 'roles')}
                        >
                            Roles
                        </a>
                        <a
                            className="text-sm font-medium hover:text-primary transition-colors"
                            href="#resultados"
                            onClick={(e) => scrollToSection(e, 'resultados')}
                        >
                            Resultados
                        </a>
                        <div className="h-4 w-[1px] bg-[#dbdfe6] dark:bg-white/10"></div>
                        <div className="flex items-center gap-4">
                            {user ? (
                                <>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden lg:block">Hola, {user.nombre.split(' ')[0]}</span>
                                    <button
                                        onClick={() => navigate(getDashboardPath(user.role))}
                                        className="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                                    >
                                        Mi Panel
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="bg-white/5 dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 text-[#111318] dark:text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#f0f2f4] dark:hover:bg-white/10 transition-all"
                                    >
                                        Salir
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="bg-white/5 dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 text-[#111318] dark:text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#f0f2f4] dark:hover:bg-white/10 transition-all"
                                    >
                                        Acceder
                                    </button>
                                    <button
                                        onClick={() => navigate('/registro')}
                                        className="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                                    >
                                        Empezar ahora
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

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-28 pb-20 lg:pt-32 lg:pb-32 px-6 lg:px-20">
                <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col gap-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider w-fit">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            Gestión FCT Inteligente
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-[#111318] dark:text-white">
                            Conectando <span className="text-primary">Talento</span> y Futuro
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
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-3xl transform rotate-3"></div>
                        <div className="relative bg-gradient-to-br from-primary to-[#2563eb] rounded-3xl shadow-2xl overflow-hidden aspect-video lg:aspect-square flex items-center justify-center border-8 border-white dark:border-background-dark" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAq-RUEAdhxEfrhrRb1EOpIjcyoJ6mx3sFPPri3BIMJbe0iZu6yzAJLFjM5yOZCbOdelW8d0CURsVje_KqH6EBKk1IratxhB-5X6F19z-Uu9Wli5zmjAEigK-_cVfdKfMl1WIXlq97YODEmAesbGkfVZMVTXas3HY5wUEY9lEzFPubKViKZxUNOPanb_koGi32a5sMisFrYmU-apmfs15e-CC1JKM5Jqf_w9Cwcjk23VFy8YjgwJP1oS6NZGx95yCe5DWdfm67ybY4')", backgroundSize: "cover", backgroundPosition: "center" }}>
                        </div>
                        {/* Floating Stat Card */}
                        <div className="absolute -bottom-6 -left-6 bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-[#dbdfe6] dark:border-white/5 hidden md:block">
                            <div className="flex items-center gap-4">
                                <div className="bg-green-100 dark:bg-green-500/20 text-green-600 p-3 rounded-full">
                                    <span className="material-symbols-outlined">task_alt</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#616f89] uppercase tracking-wide">Documentación</p>
                                    <p className="text-lg font-black dark:text-white">Automatizada 100%</p>
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
                        <div className="group bg-background-light dark:bg-white/5 p-8 rounded-2xl border border-transparent hover:border-primary/30 transition-all duration-300">
                            <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[32px]">bolt</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Eficiencia</h3>
                            <p className="text-[#616f89] dark:text-slate-400 leading-relaxed">
                                Reduce el papeleo en un 80% y automatiza procesos administrativos. Firma digital integrada para todos los convenios.
                            </p>
                        </div>
                        {/* Transparency */}
                        <div className="group bg-background-light dark:bg-white/5 p-8 rounded-2xl border border-transparent hover:border-primary/30 transition-all duration-300">
                            <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[32px]">visibility</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Transparencia</h3>
                            <p className="text-[#616f89] dark:text-slate-400 leading-relaxed">
                                Seguimiento en tiempo real del progreso, diario de prácticas y evaluaciones. Visibilidad completa para el centro y la empresa.
                            </p>
                        </div>
                        {/* Simplicity */}
                        <div className="group bg-background-light dark:bg-white/5 p-8 rounded-2xl border border-transparent hover:border-primary/30 transition-all duration-300">
                            <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[32px]">touch_app</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Simplicidad</h3>
                            <p className="text-[#616f89] dark:text-slate-400 leading-relaxed">
                                Interfaz intuitiva centrada en el usuario. Gestión de convenios y anexos con un solo clic, sin complicaciones técnicas.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Roles Section */}
            <section className="py-24 px-6 lg:px-20" id="roles">
                <div className="max-w-[1280px] mx-auto">
                    <div className="flex flex-col gap-4 mb-16">
                        <h2 className="text-3xl lg:text-4xl font-black tracking-tight">Perfiles en la plataforma</h2>
                        <p className="text-[#616f89] dark:text-slate-400 text-lg">Herramientas específicas diseñadas para cada protagonista del proceso educativo.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Student Card */}
                        <div className="bg-white dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 p-8 rounded-2xl flex flex-col justify-between hover:shadow-2xl transition-all">
                            <div>
                                <span className="material-symbols-outlined text-primary text-4xl mb-6">person</span>
                                <h3 className="text-2xl font-bold mb-4">Alumnos</h3>
                                <p className="text-[#616f89] dark:text-slate-400 mb-8">Accede a las mejores ofertas, gestiona tu diario de prácticas y comunica tus avances al instante desde cualquier dispositivo.</p>
                            </div>
                            <a className="inline-flex items-center gap-2 font-bold text-primary hover:gap-4 transition-all" href="#">
                                Saber más <span className="material-symbols-outlined">arrow_forward</span>
                            </a>
                        </div>
                        {/* Tutor Card */}
                        <div className="bg-white dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 p-8 rounded-2xl flex flex-col justify-between hover:shadow-2xl transition-all">
                            <div>
                                <span className="material-symbols-outlined text-primary text-4xl mb-6">psychology</span>
                                <h3 className="text-2xl font-bold mb-4">Tutores</h3>
                                <p className="text-[#616f89] dark:text-slate-400 mb-8">Gestiona convenios, asignaciones y evaluaciones sin esfuerzo. Mantén un control total sobre el aprendizaje de tus alumnos.</p>
                            </div>
                            <a className="inline-flex items-center gap-2 font-bold text-primary hover:gap-4 transition-all" href="#">
                                Herramientas de tutoría <span className="material-symbols-outlined">arrow_forward</span>
                            </a>
                        </div>
                        {/* Company Card */}
                        <div className="bg-white dark:bg-white/5 border border-[#dbdfe6] dark:border-white/10 p-8 rounded-2xl flex flex-col justify-between hover:shadow-2xl transition-all">
                            <div>
                                <span className="material-symbols-outlined text-primary text-4xl mb-6">apartment</span>
                                <h3 className="text-2xl font-bold mb-4">Empresas</h3>
                                <p className="text-[#616f89] dark:text-slate-400 mb-8">Capta y fideliza el mejor talento de FP. Gestiona la documentación legal y los planes formativos de forma ágil y segura.</p>
                            </div>
                            <a className="inline-flex items-center gap-2 font-bold text-primary hover:gap-4 transition-all" href="#">
                                Portal para empresas <span className="material-symbols-outlined">arrow_forward</span>
                            </a>
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
                        <div className="flex flex-col items-center">
                            <span className="text-5xl font-black mb-2">1000+</span>
                            <p className="text-primary-foreground/80 font-medium">Convenios Activos</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-5xl font-black mb-2">500+</span>
                            <p className="text-primary-foreground/80 font-medium">Empresas</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-5xl font-black mb-2">5000+</span>
                            <p className="text-primary-foreground/80 font-medium">Alumnos</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-5xl font-black mb-2">98%</span>
                            <p className="text-primary-foreground/80 font-medium">Satisfacción</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final Section */}
            <section className="py-24 px-6 lg:px-20 text-center">
                <div className="max-w-[800px] mx-auto bg-white dark:bg-white/5 p-12 lg:p-20 rounded-[2rem] border border-[#dbdfe6] dark:border-white/10 shadow-xl">
                    <h2 className="text-3xl lg:text-4xl font-black tracking-tight mb-6">¿Listo para dar el salto digital?</h2>
                    <p className="text-lg text-[#616f89] dark:text-slate-400 mb-10">Únete a cientos de centros y empresas que ya han optimizado su gestión de prácticas.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button onClick={() => navigate(user ? getDashboardPath(user.role) : '/registro')} className="bg-primary text-white text-base font-bold px-10 py-4 rounded-xl shadow-lg hover:scale-105 transition-all">
                            {user ? 'Ir a mi Panel' : 'Empezar ahora'}
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white dark:bg-background-dark border-t border-[#dbdfe6] dark:border-white/10 py-16 px-6 lg:px-20">
                <div className="max-w-[1280px] mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex items-center gap-3 mb-6 text-primary">
                                <span className="material-symbols-outlined text-3xl">rocket_launch</span>
                                <span className="text-xl font-bold tracking-tight">EduPrácticas</span>
                            </div>
                            <p className="text-sm text-[#616f89] dark:text-slate-400 leading-relaxed">
                                Líderes en digitalización de la Formación Profesional. Conectando talento y oportunidades.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6">Plataforma</h4>
                            <ul className="flex flex-col gap-4 text-sm text-[#616f89] dark:text-slate-400">
                                <li><a className="hover:text-primary" href="#">Cómo funciona</a></li>
                                <li><a className="hover:text-primary" href="#">Seguridad y Firma Digital</a></li>
                                <li><a className="hover:text-primary" href="#">Precios</a></li>
                                <li><a className="hover:text-primary" href="#">Casos de Éxito</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6">Compañía</h4>
                            <ul className="flex flex-col gap-4 text-sm text-[#616f89] dark:text-slate-400">
                                <li><a className="hover:text-primary" href="#">Sobre nosotros</a></li>
                                <li><a className="hover:text-primary" href="#">Blog</a></li>
                                <li><a className="hover:text-primary" href="#">Prensa</a></li>
                                <li><a className="hover:text-primary" href="#">Contacto</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6">Legal</h4>
                            <ul className="flex flex-col gap-4 text-sm text-[#616f89] dark:text-slate-400">
                                <li><a className="hover:text-primary" href="#">Privacidad</a></li>
                                <li><a className="hover:text-primary" href="#">Términos de servicio</a></li>
                                <li><a className="hover:text-primary" href="#">Cookies</a></li>
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
