
import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie } from 'lucide-react';

const Cookies = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-12 px-6">
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="bg-primary/10 dark:bg-primary/20 p-8 border-b border-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary text-white p-3 rounded-full">
                            <Cookie size={32} />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Política de Cookies</h1>
                    </div>
                    <Link to="/" className="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-semibold bg-white dark:bg-slate-700 px-4 py-2 rounded-lg shadow-sm">
                        <ArrowLeft size={20} />
                        Volver al inicio
                    </Link>
                </div>
                
                <div className="p-8 prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                        Última actualización: {new Date().toLocaleDateString('es-ES')}
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">1. ¿Qué son las cookies?</h2>
                    <p className="mb-6">
                        Las cookies son pequeños archivos de texto que los sitios web que visitas guardan en tu 
                        ordenador, móvil o tablet. Se utilizan principalmente para que el sitio funcione o lo 
                        haga de forma más eficiente, así como para recoger información estadística y de uso.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">2. Cómo usamos las cookies</h2>
                    <p className="mb-6">
                        En EduPrácticas Connect utilizamos cookies para diversas finalidades, entre las que se 
                        encuentran: mantener tu sesión iniciada de manera segura, guardar tus preferencias visuales 
                        (como el modo oscuro) y entender de forma anónima cómo navegas por la plataforma para 
                        mejorar el servicio que te ofrecemos.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">3. Tipos de cookies que usamos</h2>
                    <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-700 dark:text-slate-300">
                        <li><strong>Cookies estrictamente necesarias:</strong> Aquellas requeridas para el funcionamiento básico del sistema y el inicio de sesión.</li>
                        <li><strong>Cookies de rendimiento y análisis:</strong> Para contabilizar visitas y fuentes de tráfico para medir el rendimiento de la aplicación.</li>
                        <li><strong>Cookies funcionales:</strong> Permiten que el sitio ofrezca una funcionalidad y personalización mejoradas.</li>
                    </ul>

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">4. Gestión y bloqueo de cookies</h2>
                    <p className="mb-8">
                        Tienes el control absoluto sobre tus cookies. Puedes decidir en cualquier momento qué 
                        cookies quieres que funcionen en este sitio web ajustando las configuraciones de tu navegador, 
                        bloqueando cookies de terceros o eliminando las existentes. No obstante, adviértase que 
                        algunas funciones pueden dejar de operar total o parcialmente si rechazas nuestro uso de cookies vitales.
                    </p>

                    <div className="bg-slate-100 dark:bg-slate-700 p-6 rounded-xl border border-slate-200 dark:border-slate-600 mt-8">
                        <p className="text-sm m-0 text-slate-700 dark:text-slate-300">
                            Revisamos esta política regularmente para asegurar que cumpla con los estándares web y 
                            legislaciones en privacidad de la región (como la RGPD europea).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cookies;
