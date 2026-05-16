import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SidebarWidth = 'w-72' | 'w-80';

export interface DashboardLayoutProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  sidebar: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  sidebarWidthClass?: SidebarWidth;
  sidebarClassName?: string;
  mainClassName?: string;
}

export default function DashboardLayout({
  isSidebarOpen,
  setIsSidebarOpen,
  sidebar,
  header,
  children,
  sidebarWidthClass = 'w-80',
  sidebarClassName = 'bg-zinc-950 text-white',
  mainClassName = 'bg-zinc-50',
}: DashboardLayoutProps) {

  return (
    /**
     * Raíz: min-h-screen
     * → Permite que el contenedor crezca dinámicamente y delegue el scroll
     *   al flujo natural del documento (body) en móviles.
     */
    <div className={`min-h-screen ${mainClassName} font-body flex justify-center`}>
      <div className="w-full max-w-screen-2xl min-h-screen flex relative bg-inherit shadow-2xl border-x border-zinc-200/50 dark:border-zinc-800/50">

      {/* ── OVERLAY MÓVIL ────────────────────────────────────────────────
          Solo se renderiza en móvil (lg:hidden). Cuando está cerrado NO
          existe en el DOM gracias a AnimatePresence, eliminando cualquier
          capa invisible que pueda bloquear el mouse en desktop.          */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md lg:hidden"
            style={{ zIndex: 'var(--z-overlay)' }}
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR DESKTOP (sticky, parte del flujo en lg+) ────────────── */}
      <aside
        className={`sticky top-0 h-screen ${sidebarWidthClass} ${sidebarClassName} hidden lg:flex flex-col shadow-2xl overflow-hidden shrink-0`}
        style={{ zIndex: 'var(--z-sidebar)' }}
      >
        {sidebar}
      </aside>

      {/* ── DRAWER MÓVIL (animado, solo en <lg) ──────────────────────── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            key="mobile-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed left-0 top-0 bottom-0 ${sidebarWidthClass} ${sidebarClassName} flex lg:hidden flex-col shadow-2xl overflow-y-auto`}
            style={{ zIndex: 'var(--z-drawer)' }}
          >
            {sidebar}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── ÁREA DE CONTENIDO PRINCIPAL ──────────────────────────────────
          flex-1: ocupa el espacio restante al sidebar.
          min-h-0: CLAVE en Flexbox — permite que el hijo se encoja por debajo
                   de su tamaño natural para que overflow-y-auto funcione.
                   Sin min-h-0, un elemento flex NO puede hacer scroll.      */}
      <div className="flex-1 min-w-0 flex flex-col max-w-full relative">

        {/* Header sticky — no hace scroll */}
        {header}

        {/* ── MAIN SCROLLABLE ───────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden w-full relative">
          {children}
        </main>
      </div>
    </div>
    </div>
  );
}
