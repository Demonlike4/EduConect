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
  zIndexSidebarClass?: string;
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
  zIndexSidebarClass = 'z-[70]',
}: DashboardLayoutProps) {
  const desktopPaddingClass = sidebarWidthClass === 'w-72' ? 'lg:pl-72' : 'lg:pl-80';

  return (
    <div className={`min-h-dvh ${mainClassName} font-body relative flex overflow-x-hidden`}>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed left-0 top-0 bottom-0 ${sidebarWidthClass} ${sidebarClassName} ${zIndexSidebarClass} hidden lg:flex flex-col shadow-2xl overflow-hidden`}
      >
        {sidebar}
      </aside>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed left-0 top-0 bottom-0 ${sidebarWidthClass} ${sidebarClassName} ${zIndexSidebarClass} flex lg:hidden flex-col shadow-2xl overflow-hidden`}
          >
            {sidebar}
          </motion.aside>
        )}
      </AnimatePresence>

      <div className={`flex-1 min-w-0 flex flex-col ${desktopPaddingClass}`}>
        {header}
        <main className="flex-1 min-w-0 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}


