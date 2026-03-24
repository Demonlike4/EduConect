
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const Privacidad = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-12 px-6">
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="bg-primary/10 dark:bg-primary/20 p-8 border-b border-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary text-white p-3 rounded-full">
                            <ShieldCheck size={32} />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Política de Privacidad</h1>
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

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">1. Información que recopilamos</h2>
                    <p className="mb-6">
                        En EduPrácticas Connect recopilamos información personal que nos proporcionas de manera directa, 
                        como tu nombre, dirección de correo electrónico, y datos de perfil académico y profesional 
                        al registrarte en nuestra plataforma.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">2. Cómo utilizamos tu información</h2>
                    <p className="mb-6">
                        Utilizamos la información recopilada para gestionar las prácticas, realizar el seguimiento 
                        del alumnado, facilitar la comunicación entre centros educativos y empresas, y mejorar 
                        nuestros servicios. No vendemos ni alquilamos tu información personal a terceros.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">3. Seguridad de los datos</h2>
                    <p className="mb-6">
                        Implementamos medidas de seguridad técnicas y organizativas de última generación para 
                        proteger tu información personal contra accesos no autorizados, modificaciones o divulgaciones. 
                        Toda la información sensible está encriptada.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">4. Derechos del usuario</h2>
                    <p className="mb-6">
                        Tienes derecho a acceder, rectificar, cancelar y oponerte al tratamiento de tus datos 
                        personales en cualquier momento enviando una solicitud a nuestro equipo de soporte a través de 
                        los canales oficiales de contacto.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">5. Cambios en la Política de Privacidad</h2>
                    <p className="mb-8">
                        Nos reservamos el derecho a modificar esta política en el futuro. Te notificaremos cualquier 
                        cambio significativo a través de nuestro sitio web o por correo electrónico.
                    </p>

                    <div className="bg-slate-100 dark:bg-slate-700 p-6 rounded-xl border border-slate-200 dark:border-slate-600 mt-8">
                        <p className="text-sm m-0 text-slate-700 dark:text-slate-300">
                            Si tienes alguna duda sobre nuestra política de privacidad, no dudes en ponerte en 
                            contacto con nosotros a través de soporte@edupracticas.com.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Privacidad;
