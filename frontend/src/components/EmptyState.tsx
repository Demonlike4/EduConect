import type { ReactNode } from 'react';

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
    action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 bg-indigo-50/50 dark:bg-slate-800/50 border-2 border-dashed border-indigo-100 dark:border-slate-700 rounded-3xl text-center transition-all duration-300 w-full">
            <div className="size-20 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/10 mb-6 rotate-3 hover:rotate-0 transition-transform">
                <span className="material-symbols-outlined text-6xl text-indigo-300 dark:text-indigo-400">
                    {icon}
                </span>
            </div>
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">
                {title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
                {description}
            </p>
            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}
        </div>
    );
}
