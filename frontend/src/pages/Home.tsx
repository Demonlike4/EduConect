import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, type UserRole } from '../context/UserContext';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const getDashboardPath = (role: UserRole) => {
        switch (role) {
            case 'ALUMNO': return '/dashboard/alumno';
            case 'EMPRESA': return '/dashboard/empresa';
            case 'TUTOR_CENTRO': return '/dashboard/tutor-centro';
            case 'TUTOR_EMPRESA': return '/dashboard/tutor-empresa';
            default: return '/login';
        }
    };

    const scrollToSection = (e: React.MouseEvent<any>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setIsMenuOpen(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3
            }
        }
    };

    const itemVariants: any = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    return (
        <div className="relative min-h-screen w-full bg-[#f8faff] text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
            {/* Scroll Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 z-[100] origin-left"
                style={{ scaleX }}
            />

            {/* Navigation Bar */}
            <header 
                className={`fixed top-0 left-0 z-50 w-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 ${
                    scrolled ? 'py-4 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm' : 'py-8 bg-transparent'
                }`}
            >
                <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 group cursor-pointer" 
                        onClick={() => navigate('/')}
                    >
                        <div className="size-11 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform duration-300">
                            <span className="material-symbols-outlined text-2xl font-bold">assured_workload</span>
                        </div>
                        <span className="text-2xl font-black tracking-tight text-slate-900">
                            Edu<span className="text-indigo-600">Conect</span>
                        </span>
                    </motion.div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-10">
                        <div className="flex items-center gap-8">
                            {['Digitalización', 'Plataforma', 'Resultados'].map((item, i) => (
                                <motion.a
                                    key={i}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * i }}
                                    className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors relative group"
                                    href={`#${item.toLowerCase()}`}
                                    onClick={(e) => scrollToSection(e, item.toLowerCase())}
                                >
                                    {item}
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 transition-all duration-300 group-hover:w-full"></span>
                                </motion.a>
                            ))}
                        </div>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-4">
                            {user ? (
                                <button
                                    onClick={() => navigate(getDashboardPath(user.role))}
                                    className="px-6 h-11 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                                >
                                    Mi Panel
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="px-4 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                                    >
                                        Log in
                                    </button>
                                    <button
                                        onClick={() => navigate('/registro')}
                                        className="px-6 h-11 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                                    >
                                        Empieza ahora
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button className="md:hidden size-11 flex items-center justify-center text-slate-900 glass-card rounded-xl" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <span className="material-symbols-outlined text-2xl">{isMenuOpen ? 'close' : 'menu'}</span>
                    </button>
                </nav>

                {/* Mobile Menu Dropdown */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden overflow-hidden bg-white border-b border-slate-100 shadow-2xl"
                        >
                            <div className="px-6 py-10 flex flex-col gap-6">
                                {['Digitalización', 'Plataforma', 'Resultados'].map((item, i) => (
                                    <a
                                        key={i}
                                        className="text-2xl font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                                        href={`#${item.toLowerCase()}`}
                                        onClick={(e) => scrollToSection(e, item.toLowerCase())}
                                    >
                                        {item}
                                    </a>
                                ))}
                                <div className="pt-6 border-t border-slate-50 flex flex-col gap-4">
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="w-full h-14 bg-slate-50 text-slate-900 font-bold rounded-2xl"
                                    >
                                        Iniciar Sesión
                                    </button>
                                    <button
                                        onClick={() => navigate('/registro')}
                                        className="w-full h-14 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white font-bold rounded-2xl"
                                    >
                                        Registrarse
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Hero Section */}
            <section className="relative pt-40 lg:pt-56 pb-32 px-6 overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[1400px] pointer-events-none -z-10">
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.1, 1],
                            opacity: [0.3, 0.5, 0.3],
                            rotate: [0, 90, 0]
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute top-[-10%] left-[-10%] size-[600px] bg-indigo-200/40 rounded-full blur-[120px]"
                    />
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.2, 0.4, 0.2],
                            rotate: [0, -90, 0]
                        }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute bottom-[-10%] right-[-10%] size-[500px] bg-blue-200/40 rounded-full blur-[100px]"
                    />
                </div>

                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                        <motion.div 
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={containerVariants}
                            className="lg:col-span-7 flex flex-col gap-8"
                        >
                            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full w-fit">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                <span className="text-indigo-700 text-[11px] font-bold uppercase tracking-wider">Sistema Oficial de Gestión FCT</span>
                            </motion.div>
                            
                            <motion.h1 variants={itemVariants} className="text-6xl lg:text-8xl font-black leading-[1.05] tracking-tight text-slate-900">
                                Digitaliza el <br />
                                <span className="text-indigo-600">Futuro</span> de tus <br />
                                Prácticas.
                            </motion.h1>
                            
                            <motion.p variants={itemVariants} className="text-lg text-slate-500 max-w-xl leading-relaxed">
                                La plataforma que conecta centros educativos, empresas y alumnos para una gestión de FCT transparente, eficiente y sin papeles.
                            </motion.p>
                            
                            <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
                                {user ? (
                                    <button
                                        onClick={() => navigate(getDashboardPath(user.role))}
                                        className="h-16 px-10 bg-slate-900 text-white font-bold rounded-2xl hover:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 transition-all shadow-2xl shadow-slate-900/10 flex items-center gap-3 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined">dashboard_customize</span>
                                        Ir a mi Dashboard
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => navigate('/registro')}
                                            className="h-16 px-10 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/30 flex items-center gap-3 active:scale-95"
                                        >
                                            Empezar Gratis
                                            <span className="material-symbols-outlined">arrow_forward</span>
                                        </button>
                                        <button
                                            onClick={(e) => scrollToSection(e, 'digitalizacion')}
                                            className="h-16 px-10 bg-white/50 text-slate-700 font-bold rounded-2xl hover:bg-white transition-all active:scale-95"
                                        >
                                            Conoce más
                                        </button>
                                    </>
                                )}
                            </motion.div>

                            <motion.div variants={itemVariants} className="flex items-center gap-6 pt-8 border-t border-slate-100">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="size-10 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                                            <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" className="w-full h-full object-cover opacity-80" />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                                    <span className="text-slate-900">+5.000 Alumnos</span> <br /> 
                                    ya confían en nosotros
                                </p>
                            </motion.div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="lg:col-span-5 relative lg:block hidden"
                        >
                            <div className="relative z-10 rounded-4xl overflow-hidden p-4">
                                <motion.div 
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                    className="rounded-3xl overflow-hidden shadow-2xl relative group"
                                >
                                    <img 
                                        src="/hero_students_collaboration_1774380530901.png" 
                                        alt="Platform Preview" 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3s]"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />
                                </motion.div>
                            </div>

                            {/* Floating Stats Card */}
                            <motion.div 
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 1, duration: 0.8 }}
                                className="absolute -bottom-10 -right-10 bg-white p-6 rounded-3xl z-20 w-64 shadow-[0_32px_64px_-16px_rgba(79,70,229,0.2)]"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="size-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                                        <span className="material-symbols-outlined font-bold">trending_up</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ahorro Administrativo</p>
                                        <p className="text-2xl font-black text-slate-900">-85%</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">Reducción del tiempo de gestión de convenios y firmas.</p>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features section */}
            <section className="py-32 px-6 bg-white" id="digitalizacion">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-20">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="size-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6"
                        >
                            <span className="material-symbols-outlined text-4xl">auto_awesome</span>
                        </motion.div>
                        <motion.h2 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-4xl lg:text-6xl font-black tracking-tight text-slate-900 mb-6 uppercase"
                        >
                            La Nueva Era de la <span className="text-indigo-600">Gestión FCT</span>
                        </motion.h2>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-lg text-slate-500 font-medium"
                        >
                            Elimina la fricción burocrática y potencia la comunicación real entre todos los actores del ecosistema educativo.
                        </motion.p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { title: 'Automatización inteligente', desc: 'Generación de anexos y convenios con un solo clic. Olvídate del papeleo infinito.', icon: 'bolt', color: 'indigo' },
                            { title: 'Monitorización en tiempo real', desc: 'Sigue el progreso de cada alumno al instante. Diario de prácticas digital y verificado.', icon: 'monitoring', color: 'blue' },
                            { title: 'Firma Digital Segura', desc: 'Integración completa para firmas de acuerdos sin necesidad de imprimir ni escanear.', icon: 'verified_user', color: 'emerald' }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="group p-10 rounded-4xl bg-[#fcfdff] border border-slate-100 hover:border-indigo-100 hover:bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 hover:shadow-2xl hover:shadow-indigo-500/5"
                            >
                                <div className={`size-14 rounded-2xl bg-${feature.color}-50 text-${feature.color}-600 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300`}>
                                    <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-slate-900">{feature.title}</h3>
                                <p className="text-slate-500 leading-relaxed font-medium">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Roles Showcase */}
            <section className="py-32 px-6 bg-slate-950 text-white relative overflow-hidden" id="plataforma">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 right-0 size-[800px] bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 rounded-full blur-[150px] -mr-96 -mt-96" />
                    <div className="absolute bottom-0 left-0 size-[600px] bg-blue-600 rounded-full blur-[120px] -ml-64 -mb-64" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="aspect-[4/3] rounded-4xl overflow-hidden p-2 border-white/5 shadow-2xl skew-y-3 group hover:skew-y-0 transition-transform duration-700">
                                <img 
                                    src="/digital_fct_management_1774380548962.png" 
                                    alt="Management Dashboard" 
                                    className="w-full h-full object-cover rounded-3xl"
                                />
                            </div>
                            <div className="absolute -bottom-8 -right-8 bg-white/90 p-8 rounded-3xl shadow-2xl max-w-xs animate-bounce-slow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="size-10 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 rounded-lg flex items-center justify-center text-white">
                                        <span className="material-symbols-outlined">hub</span>
                                    </div>
                                    <span className="text-slate-900 font-bold tracking-tight">Ecosistema Unificado</span>
                                </div>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed">Conexión directa entre Tutores, Alumnos y Empresas en una sola interfaz.</p>
                            </div>
                        </motion.div>

                        <div className="flex flex-col gap-12">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="space-y-6"
                            >
                                <div className="px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold tracking-wide w-fit rounded-full">Gestión Multirrol</div>
                                <h2 className="text-5xl lg:text-7xl font-black tracking-tight leading-none uppercase">
                                    Una solución <br />
                                    <span className="text-slate-500">para cada necesidad</span>
                                </h2>
                                <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
                                    Hemos diseñado experiencias a medida para cada tipo de usuario, asegurando que tengan las herramientas exactas que necesitan.
                                </p>
                            </motion.div>

                            <div className="space-y-4">
                                {[
                                    { label: 'Alumnos', title: 'Tu carrera empieza aquí', desc: 'Gestiona tu cuaderno de bitácora, consulta tutorías y recibe feedbacks.', icon: 'rocket_launch' },
                                    { label: 'Tutores', title: 'Control total del aula', desc: 'Valida actividades en masa y genera memorias finales automáticamente.', icon: 'psychology' },
                                    { label: 'Empresas', title: 'Talento a tu alcance', desc: 'Simplifica los convenios y encuentra los perfiles que tu negocio necesita.', icon: 'corporate_fare' }
                                ].map((role, i) => (
                                    <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="group p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/50 hover:shadow-2xl transition-all duration-300 cursor-default flex gap-6"
                                    >
                                        <div className="size-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-3xl">{role.icon}</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-1">{role.label}</p>
                                            <h3 className="text-xl font-bold mb-2 tracking-tight group-hover:text-indigo-400 transition-colors uppercase">{role.title}</h3>
                                            <p className="text-slate-400 text-sm font-medium leading-relaxed">{role.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-32 px-6 bg-white overflow-hidden" id="resultados">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                        {[
                            { value: '1,200+', label: 'Convenios Activos', icon: 'handshake' },
                            { value: '850+', label: 'Empresas Top', icon: 'business' },
                            { value: '99.4%', label: 'Satisfacción', icon: 'star' },
                            { value: '12k+', label: 'Alumnos/Año', icon: 'school' }
                        ].map((stat, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="relative py-12 px-6"
                            >
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl font-black text-slate-50/50 pointer-events-none select-none">
                                    {stat.value.replace('+', '')}
                                </span>
                                <div className="relative z-10 flex flex-col items-center">
                                    <span className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter mb-4 group-hover:scale-105 transition-transform">{stat.value}</span>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA section */}
            <section className="py-32 px-6 bg-gradient-to-b from-white to-indigo-50" id="cta">
                <div className="max-w-5xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-4xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 p-12 lg:p-24 overflow-hidden shadow-2xl shadow-indigo-500/40 text-center"
                    >
                        {/* Decorative Background */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none">
                            <div className="absolute top-0 right-0 size-96 bg-white rounded-full blur-[80px] -mr-48 -mt-48" />
                            <div className="absolute bottom-0 left-0 size-80 bg-blue-400 rounded-full blur-[70px] -ml-40 -mb-40" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center gap-8">
                            <h2 className="text-4xl lg:text-7xl font-black text-white tracking-tight uppercase leading-none">
                                ¿Listo para <br />
                                <span className="text-indigo-200">empezar a crecer?</span>
                            </h2>
                            <p className="text-indigo-100 text-lg lg:text-xl font-medium max-w-xl">
                                Únete a los cientos de centros y empresas que ya han digitalizado su formación profesional con EduConect.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button 
                                    onClick={() => navigate(user ? getDashboardPath(user.role) : '/registro')}
                                    className="h-16 px-12 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {user ? 'Volver a mi Panel' : 'Crear mi Ecosistema'}
                                    <span className="material-symbols-outlined">rocket_launch</span>
                                </button>
                                {!user && (
                                    <button 
                                        onClick={() => navigate('/login')}
                                        className="h-16 px-12 border border-white/30 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
                                    >
                                        Iniciar Sesión
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-24 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
                        <div className="md:col-span-5 space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="size-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-2xl font-bold">assured_workload</span>
                                </div>
                                <span className="text-2xl font-black tracking-tight text-slate-900 uppercase">Edu<span className="text-indigo-600">Conect</span></span>
                            </div>
                            <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-sm">
                                Transformando el futuro de la educación mediante la digitalización inteligente de la formación profesional.
                            </p>
                        </div>

                        <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
                            {[
                                { 
                                    title: 'Plataforma', 
                                    links: [
                                        { label: 'Cómo funciona', path: '#digitalizacion', scroll: true },
                                        { label: 'Gestión de Roles', path: '#plataforma', scroll: true },
                                        { label: 'Seguridad Cloud', path: '#cta', scroll: true }
                                    ] 
                                },
                                { 
                                    title: 'Soporte', 
                                    links: [
                                        { label: 'Ayuda', path: '#' },
                                        { label: 'Guías de Usuario', path: '#' },
                                        { label: 'Contacto', path: '#' }
                                    ] 
                                },
                                { 
                                    title: 'Legal', 
                                    links: [
                                        { label: 'Privacidad', path: '/privacidad' },
                                        { label: 'Términos', path: '/terminos' },
                                        { label: 'Cookies', path: '/cookies' }
                                    ] 
                                }
                            ].map((group, i) => (
                                <div key={i} className="space-y-6">
                                    <h4 className="text-[10px] font-semibold tracking-wide text-slate-400 tracking-[0.2em]">{group.title}</h4>
                                    <ul className="space-y-4">
                                        {group.links.map((link, j) => (
                                            <li key={j}>
                                                <button 
                                                    onClick={(e) => {
                                                        if ((link as any).scroll) {
                                                            scrollToSection(e, link.path.replace('#', ''));
                                                        } else {
                                                            navigate(link.path);
                                                            window.scrollTo(0, 0);
                                                        }
                                                    }}
                                                    className="text-slate-600 hover:text-indigo-600 font-bold transition-colors text-left"
                                                >
                                                    {link.label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-8">
                        <p className="text-slate-400 text-xs font-medium">
                            © 2026 EduPrácticas Connect — Innovación Educativa para el Siglo XXI.
                        </p>
                        <div className="flex items-center gap-6">
                             <div className="flex items-center gap-2 text-slate-400">
                                 <span className="size-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                 <span className="text-[10px] font-semibold tracking-wide">Todos los sistemas operativos</span>
                             </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
