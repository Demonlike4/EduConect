import React from 'react';
import { Link } from 'react-router-dom';

/**
 * ── IDENTIDAD VISUAL: Logo ──────────────────────────────────────────────────
 * Componente de nivel de producción que centraliza la marca EduConect.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'dark';
  showTagline?: boolean;
  tagline?: string;
  className?: string;
  disableLink?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'default',
  showTagline = false,
  tagline = 'Digitalizando la FP',
  className = '',
  disableLink = false,
}) => {
  const sizeMap = {
    xs: { container: 'size-7', svg: 'size-4', brand: 'text-xs', tagline: 'text-[7px]' },
    sm: { container: 'size-9', svg: 'size-5', brand: 'text-base', tagline: 'text-[9px]' },
    md: { container: 'size-12', svg: 'size-7', brand: 'text-xl', tagline: 'text-[10px]' },
    lg: { container: 'size-16', svg: 'size-9', brand: 'text-3xl', tagline: 'text-[12px]' },
    xl: { container: 'size-20', svg: 'size-11', brand: 'text-4xl', tagline: 'text-[14px]' },
  };

  const themeMap = {
    default: {
      brand: 'text-slate-900 dark:text-white',
      accent: 'text-brand-primary',
      tagline: 'text-slate-500 dark:text-slate-400',
      bg: 'bg-gradient-to-br from-brand-primary to-brand-secondary shadow-brand-primary/20'
    },
    white: {
      brand: 'text-white',
      accent: 'text-white',
      tagline: 'text-white/60',
      bg: 'bg-white/20 backdrop-blur-sm shadow-none border border-white/20'
    },
    dark: {
      brand: 'text-slate-900',
      accent: 'text-slate-700',
      tagline: 'text-slate-600',
      bg: 'bg-slate-900 shadow-slate-900/20'
    }
  };

  const currentTheme = themeMap[variant];
  const currentSize = sizeMap[size];

  const content = (
    <>
      {/* Imagotipo: SVG Nativo Escalable */}
      <div className={`
        ${currentSize.container} 
        ${currentTheme.bg}
        rounded-2xl flex items-center justify-center 
        transition-all duration-500 ease-out
        group-hover:scale-105 group-hover:rotate-3
        ring-4 ring-brand-primary/5
      `}>
        <svg 
          aria-hidden="true"
          className={`${currentSize.svg} text-white fill-current`} 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2L1 8L12 14L21 9.09V16H23V8L12 2ZM12 11.8L4.3 7.6L12 3.4L19.7 7.6L12 11.8Z" opacity="0.9" />
          <path d="M6 11.5V16C6 18.5 9 20 12 20C15 20 18 18.5 18 16V11.5L12 14.8L6 11.5Z" opacity="0.8" />
          <circle cx="12" cy="20" r="1.5" className="text-white" />
          <circle cx="18" cy="16" r="1.5" className="text-white" />
          <circle cx="6" cy="16" r="1.5" className="text-white" />
          <path d="M6 16L12 20L18 16" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
        </svg>
      </div>

      {/* Logotipo: Tipografía de Marca */}
      <div className="flex flex-col">
        <h1 className={`${currentSize.brand} font-black tracking-tighter uppercase leading-none ${currentTheme.brand}`}>
          Edu<span className={currentTheme.accent}>Conect</span>
        </h1>
        {showTagline && (
          <p className={`${currentSize.tagline} font-black uppercase tracking-[0.2em] mt-1.5 opacity-90 ${currentTheme.tagline}`}>
            {tagline}
          </p>
        )}
      </div>
    </>
  );

  const containerClasses = `flex items-center gap-3 select-none group w-fit ${className}`;

  if (disableLink) {
    return <div className={containerClasses}>{content}</div>;
  }

  return (
    <Link to="/" className={containerClasses} aria-label="Ir al inicio de EduConect">
      {content}
    </Link>
  );
};

export default Logo;
