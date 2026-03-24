import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-2xl hover:scale-110 active:scale-95 transition-all border border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary"
            aria-label="Toggle Theme"
        >
            {theme === 'light' ? (
                <Moon size={24} />
            ) : (
                <Sun size={24} />
            )}
        </button>
    );
};

export default ThemeToggle;
