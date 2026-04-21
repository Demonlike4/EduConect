import React from 'react';

interface Stats {
    alumnosValidados: number;
    totalAlumnos: number;
    totalEmpresas: number;
    pendingValidations: number;
}

interface DashboardMetricsProps {
    stats: Stats;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ stats }) => {
    const kpis = [
        {
            label: 'Alumnos Activos',
            value: stats.alumnosValidados,
            change: `${Math.round((stats.alumnosValidados / (stats.totalAlumnos || 1)) * 100)}% de conversión`,
            icon: 'person_check',
            trend: 'up',
            color: 'indigo'
        },
        {
            label: 'Empresas Vinculadas',
            value: stats.totalEmpresas,
            change: '+2 este mes',
            icon: 'business',
            trend: 'up',
            color: 'slate'
        },
        {
            label: 'Ptes. Validación',
            value: stats.pendingValidations,
            change: stats.pendingValidations > 0 ? 'Requiere atención' : 'Al día',
            icon: 'fact_check',
            trend: stats.pendingValidations > 0 ? 'alert' : 'neutral',
            color: stats.pendingValidations > 0 ? 'amber' : 'emerald'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {kpis.map((kpi, index) => (
                <div 
                    key={index} 
                    className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl ${
                            kpi.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' :
                            kpi.color === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                            kpi.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                            'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                            <span className="material-symbols-outlined text-[24px]">{kpi.icon}</span>
                        </div>
                        <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            kpi.trend === 'up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                            kpi.trend === 'alert' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                            'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                            {kpi.trend === 'up' && <span className="material-symbols-outlined text-[12px]">trending_up</span>}
                            {kpi.change}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-3xl font-black tracking-tight text-zinc-800 dark:text-white">
                            {kpi.value.toLocaleString()}
                        </h3>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            {kpi.label}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};
