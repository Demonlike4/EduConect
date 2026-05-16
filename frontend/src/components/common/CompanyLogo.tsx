import React from 'react';

/**
 * ── COMPONENTE: CompanyLogo ──────────────────────────────────────────────────
 * Muestra el logo de la empresa. Si la imagen falla (404, ruta rota, etc.),
 * muestra un marcador de posición integrado con la inicial de la empresa.
 * Utiliza un diseño Glassmorphism oscuro (rounded-[22px], bg-white/5, text-white/70).
 */
export const CompanyLogo: React.FC<{ logoPath: string; companyName: string; className?: string }> = ({ logoPath, companyName, className }) => {
    const [imgError, setImgError] = React.useState(false);
    const initial = companyName.trim().charAt(0).toUpperCase() || '?';
    
    // Si no se proporciona className, se usan los estilos por defecto (size-16 lg:size-20)
    const containerClasses = className || "size-16 lg:size-20 bg-white/5 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-[22px] p-2.5 shadow-inner flex items-center justify-center flex-shrink-0";
    const textClasses = className ? "text-white/70 font-bold text-xl" : "text-white/70 font-bold text-2xl lg:text-3xl";

    if (imgError || !logoPath) {
        return (
            <div className={containerClasses}>
                <span className={textClasses}>{initial}</span>
            </div>
        );
    }

    return (
        <div className={`${containerClasses} overflow-hidden`}>
            <img
                src={logoPath}
                className="w-full h-full object-contain"
                alt={`Logo ${companyName}`}
                onError={() => setImgError(true)}
                loading="lazy"
                width="80"
                height="80"
            />
        </div>
    );
};
