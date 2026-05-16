import React from 'react';
import Logo from './common/Logo';

const Loader: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-[#0B111A] transition-colors duration-500">
            <Logo size="xl" variant="default" showTagline tagline="Iniciando entorno seguro..." disableLink />

            {/* ── DETALLE INFERIOR ─────────────────────────────────────────── */}
            <p className="absolute bottom-10 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] opacity-40">
                Iniciando Entorno Seguro
            </p>
        </div>
    );
};

export default Loader;
