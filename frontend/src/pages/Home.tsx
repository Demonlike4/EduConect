import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, type UserRole } from '../context/UserContext';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import Logo from '../components/common/Logo';
import api from '../lib/api';

interface StatsData {
    empresas: number;
    alumnos: number;
    candidaturas: number;
    satisfaccion: string;
}

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        
        // Fetch Public Stats
        const fetchStats = async () => {
            try {
                const response = await api.get('/public/stats');
                setStats(response.data);
            } catch (error) {
                console.error("Error fetching public stats", error);
                // Fallback conservador
                setStats({
                    candidaturas: 1200,
                    empresas: 850,
                    satisfaccion: '99.4%',
                    alumnos: 12000
                });
            } finally {
                setIsLoadingStats(false);
            }
        };
        fetchStats();

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
        <div className="relative min-h-screen w-full bg-white text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden font-inter">
            {/* Fondo Premium Global (Top) */}
            <div className="absolute top-0 left-0 w-full h-[1200px] pointer-events-none z-0 overflow-hidden">
                <img 
                    src="/home_bg_premium.png" 
                    alt="" 
                    className="w-full h-full object-cover opacity-100"
                    style={{ filter: 'brightness(0.98) contrast(1.05)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white" />
            </div>

            {/* Scroll Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 z-[100] origin-left"
                style={{ scaleX }}
            />

            {/* Navigation Bar */}
            <header
                className={`fixed top-0 left-0 z-[100] w-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 ${scrolled ? 'py-4 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm' : 'py-8 bg-transparent'
                    }`}
            >
                <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <Logo size="md" variant="default" />

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-10">
                        <div className="flex items-center gap-8">
                            {['Digitalización', 'Plataforma', 'Resultados'].map((item, i) => {
                                const id = item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                return (
                                    <motion.a
                                        key={i}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 * i }}
                                        className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors relative group"
                                        href={`#${id}`}
                                        onClick={(e) => scrollToSection(e, id)}
                                    >
                                        {item}
                                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 transition-all duration-300 group-hover:w-full"></span>
                                    </motion.a>
                                );
                            })}
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
                    <button
                        className="md:hidden size-11 flex items-center justify-center text-slate-900 glass-card rounded-xl"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
                    >
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
                                {['Digitalización', 'Plataforma', 'Resultados'].map((item, i) => {
                                    const id = item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                    return (
                                        <a
                                            key={i}
                                            className="text-2xl font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                                            href={`#${id}`}
                                            onClick={(e) => scrollToSection(e, id)}
                                        >
                                            {item}
                                        </a>
                                    );
                                })}
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

            <main className="relative z-10">
                {/* Hero Section */}
                <section className="relative pt-40 lg:pt-56 pb-32 px-6">

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
                                    <span className="bg-gradient-to-r from-indigo-700 to-blue-800 bg-clip-text text-transparent">Futuro</span> de tus <br />
                                    Prácticas.
                                </motion.h1>

                                <motion.p variants={itemVariants} className="text-lg text-slate-600 max-w-xl leading-relaxed font-medium">
                                    La plataforma que conecta centros educativos, empresas y alumnos para una gestión de FCT transparente, eficiente y sin papeles.
                                </motion.p>

                                <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
                                    {user ? (
                                        <button
                                            onClick={() => navigate(getDashboardPath(user.role))}
                                            className="h-16 px-10 bg-slate-900 text-white font-bold rounded-2xl hover:bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.05] hover:shadow-indigo-500/30 transition-all shadow-2xl shadow-slate-900/10 flex items-center gap-3 active:scale-95"
                                        >
                                            <span className="material-symbols-outlined">dashboard_customize</span>
                                            Ir a mi Dashboard
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => navigate('/registro')}
                                                className="h-16 px-10 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-[1.05] hover:shadow-indigo-500/40 text-white font-bold rounded-2xl transition-all shadow-2xl shadow-indigo-600/30 flex items-center gap-3 active:scale-95"
                                            >
                                                Empezar Gratis
                                                <span className="material-symbols-outlined">arrow_forward</span>
                                            </button>
                                            <button
                                                onClick={(e) => scrollToSection(e, 'digitalizacion')}
                                                className="h-16 px-10 bg-white/40 backdrop-blur-md border border-white/50 text-slate-700 font-bold rounded-2xl hover:bg-white/60 transition-all active:scale-95 shadow-lg"
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
                                                <img
                                                    src={`https://i.pravatar.cc/150?u=${i}`}
                                                    alt="usuario satisfecho"
                                                    className="w-full h-full object-cover opacity-80"
                                                    loading="lazy"
                                                    width="40"
                                                    height="40"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                                        {isLoadingStats ? (
                                            <span className="flex flex-col gap-1.5 mt-1">
                                                <span className="h-3 w-24 bg-slate-200 animate-pulse rounded-md block"></span>
                                                <span className="h-3 w-32 bg-slate-200 animate-pulse rounded-md block"></span>
                                            </span>
                                        ) : (
                                            <>
                                                <span className="text-slate-900">+{(stats?.alumnos || 0) >= 1000 ? Math.floor((stats?.alumnos || 0) / 1000) + 'k' : (stats?.alumnos || 5000)} Alumnos</span> <br />
                                                ya confían en nosotros
                                            </>
                                        )}
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
                                            alt="Vista previa de la plataforma EduConect"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3s]"
                                            fetchPriority="high"
                                            width="600"
                                            height="450"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />
                                    </motion.div>
                                </div>

                                {/* Floating Stats Card */}
                                <motion.div
                                    initial={{ x: 50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 1, duration: 0.8 }}
                                    className="absolute -bottom-10 -right-10 bg-white/80 backdrop-blur-xl border border-white/50 p-6 rounded-3xl z-20 w-64 shadow-[0_32px_64px_-16px_rgba(79,70,229,0.2)]"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="size-12 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center">
                                            <span className="material-symbols-outlined font-bold">trending_up</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ahorro Administrativo</p>
                                            <p className="text-2xl font-black text-slate-900">-85%</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">Reducción del tiempo de gestión de convenios y firmas.</p>
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
                                La Nueva Era de la <span className="bg-gradient-to-r from-indigo-700 to-blue-800 bg-clip-text text-transparent">Gestión FCT</span>
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="text-lg text-slate-600 font-semibold"
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
                                    className="group p-10 rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(79,70,229,0.08)] hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className={`size-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300`}>
                                        <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-4 text-slate-900 font-outfit uppercase tracking-tight">{feature.title}</h3>
                                    <p className="text-slate-600 leading-relaxed font-semibold">
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
                                        alt="Panel de gestión de FCT digital"
                                        className="w-full h-full object-cover rounded-3xl"
                                        loading="lazy"
                                        width="500"
                                        height="375"
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
                                            className="group p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/50 transition-colors duration-300 cursor-default flex flex-col sm:flex-row gap-6"
                                        >
                                            <div className="size-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-3xl">{role.icon}</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-1">{role.label}</p>
                                                <h3 className="text-xl font-bold mb-2 tracking-tight group-hover:text-indigo-400 transition-colors uppercase">{role.title}</h3>
                                                <p className="text-sm text-slate-300/90 leading-relaxed mt-2">{role.desc}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats */}
                <section className="py-32 px-6 bg-slate-50/50 overflow-hidden" id="resultados">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                            {isLoadingStats ? (
                                Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="relative py-12 px-6">
                                        <div className="relative z-10 flex flex-col items-center">
                                            <div className="h-10 md:h-12 w-28 bg-slate-200 animate-pulse rounded-xl mb-4"></div>
                                            <div className="h-3 w-24 bg-slate-200 animate-pulse rounded-md"></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                [
                                    { value: `${stats?.candidaturas || 0}+`, label: 'Convenios Activos' },
                                    { value: `${stats?.empresas || 0}+`, label: 'Empresas Top' },
                                    { value: stats?.satisfaccion || '99.4%', label: 'Satisfacción' },
                                    { value: `${(stats?.alumnos || 0) >= 1000 ? Math.floor((stats?.alumnos || 0) / 1000) + 'k+' : (stats?.alumnos || 0) + '+'}`, label: 'Alumnos/Año' }
                                ].map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="relative py-12 px-6"
                                    >
                                        <div className="relative z-10 flex flex-col items-center">
                                            <span className="font-black tracking-tighter text-slate-900 text-4xl md:text-5xl mb-4">{stat.value}</span>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest font-inter">{stat.label}</p>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                {/* CTA section */}
                <section className="py-32 px-6 relative overflow-hidden" id="cta">
                    {/* Fondo Abstracto CTA */}
                    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        <img 
                            src="/home_bg_premium.png" 
                            alt="" 
                            className="w-full h-full object-cover"
                            style={{ filter: 'brightness(0.95) contrast(1.1) hue-rotate(10deg)' }}
                        />
                        <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />
                    </div>

                    <div className="max-w-5xl mx-auto relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="relative rounded-[2.5rem] bg-white/60 backdrop-blur-xl border border-white p-12 lg:p-24 shadow-[0_8px_30px_rgb(0,0,0,0.08)] text-center"
                        >
                            <div className="relative z-10 flex flex-col items-center gap-8">
                                <h2 className="text-4xl lg:text-7xl font-black text-slate-900 tracking-tight uppercase leading-none font-outfit">
                                    ¿Listo para <br />
                                    <span className="bg-gradient-to-r from-indigo-700 to-blue-800 bg-clip-text text-transparent">empezar a crecer?</span>
                                </h2>
                                <p className="text-slate-600 text-lg lg:text-xl font-bold max-w-xl">
                                    Únete a los cientos de centros y empresas que ya han digitalizado su formación profesional con EduConect.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={() => navigate(user ? getDashboardPath(user.role) : '/registro')}
                                        className="h-16 px-12 bg-[#4F46E5] text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        {user ? 'Volver a mi Panel' : 'Crear mi Ecosistema'}
                                        <span className="material-symbols-outlined font-bold">rocket_launch</span>
                                    </button>
                                    {!user && (
                                        <button
                                            onClick={() => navigate('/login')}
                                            className="h-16 px-12 bg-white/60 backdrop-blur-md border border-white/80 text-slate-700 font-bold rounded-2xl hover:bg-white/80 transition-all shadow-lg active:scale-95"
                                        >
                                            Iniciar Sesión
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-24 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
                        <div className="md:col-span-5 space-y-8">
                            <Logo size="sm" variant="default" />
                            <p className="text-slate-600 text-lg font-semibold leading-relaxed max-w-sm">
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
