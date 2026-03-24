
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const Terminos = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-12 px-6">
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="bg-primary/10 dark:bg-primary/20 p-8 border-b border-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary text-white p-3 rounded-full">
                            <FileText size={32} />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Términos de Servicio</h1>
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

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">1. Aceptación de los términos</h2>
                    <p className="mb-6">
                        Al acceder y utilizar la plataforma EduPrácticas Connect, aceptas cumplir con estos Términos 
                        de Servicio y con todas las leyes y normativas aplicables. Si no estás de acuerdo con 
                        algún término de este acuerdo, no utilices la plataforma.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">2. Uso de la plataforma</h2>
                    <p className="mb-6">
                        Te comprometes a utilizar EduPrácticas Connect de forma ética y legal. Esto incluye, de 
                        forma no limitativa, abstenerse de compartir contenido inapropiado, falsificar información 
                        académica o dañar la infraestructura de la plataforma mediante cualquier tipo de ataque informático.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">3. Cuentas de usuario</h2>
                    <p className="mb-6">
                        Eres responsable de mantener la confidencialidad de tu contraseña y de tu cuenta. Todo 
                        lo que suceda con tu cuenta es tu responsabilidad, por lo que te pedimos que notifiques 
                        inmediatamente de cualquier uso no autorizado o violación de seguridad.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">4. Propiedad intelectual</h2>
                    <p className="mb-6">
                        El código, diseño gráfico, logotipos y todo el contenido generado en EduPrácticas Connect 
                        son propiedad de sus respectivos dueños. No puedes copiar, reproducir ni distribuir ninguna 
                        parte de nuestra plataforma sin consentimiento explícito.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">5. Limitación de responsabilidad</h2>
                    <p className="mb-8">
                        La plataforma se ofrece "tal cual". Si bien nos esforzamos en brindar el mejor y más 
                        seguro servicio posible, no garantizamos que el funcionamiento sea ininterrumpido ni libre 
                        de errores en todo momento. En ningún caso nuestra entidad será responsable por daños indirectos.
                    </p>

                    <div className="bg-slate-100 dark:bg-slate-700 p-6 rounded-xl border border-slate-200 dark:border-slate-600 mt-8">
                        <p className="text-sm m-0 text-slate-700 dark:text-slate-300">
                            Estos términos pueden cambiar ocasionalmente. Tu uso continuado de la plataforma implica 
                            la aceptación incondicional de los nuevos términos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Terminos;
