
interface SkeletonCardProps {
    count?: number;
}

export function SkeletonCard({ count = 1 }: SkeletonCardProps) {
    const skeletons = Array.from({ length: count }, (_, i) => i);

    return (
        <>
            {skeletons.map((index) => (
                <div key={index} className="glass-card p-6 animate-pulse rounded-2xl flex flex-col gap-4 w-full">
                    {/* Header: Title simulation */}
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                        </div>
                    </div>
                    {/* Body: Lines simulation */}
                    <div className="space-y-3 mt-4">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                    </div>
                    {/* Footer: Action button simulation */}
                    <div className="mt-2 flex justify-end">
                        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-24"></div>
                    </div>
                </div>
            ))}
        </>
    );
}
