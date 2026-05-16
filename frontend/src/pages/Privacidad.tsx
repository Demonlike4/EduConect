import React from 'react';
import { useNavigate } from 'react-router-dom';

const Privacidad: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
            <div className="max-w-4xl mx-auto py-20 px-6 lg:px-12">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm mb-12 transition-colors group"
                >
                    <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    Volver
                </button>

                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Política de Privacidad</h1>
                
                <div className="space-y-6 text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    <section>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">1. Tratamiento de Datos Personales</h2>
                        <p>
                            De conformidad con lo establecido en el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales y a la libre circulación de estos datos (RGPD), le informamos que sus datos serán tratados bajo la responsabilidad de EduConect.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">2. Finalidad del Tratamiento</h2>
                        <p>
                            La recogida y tratamiento de los datos personales tiene como finalidad la gestión de la relación educativa entre alumnos, centros y empresas colaboradoras, así como la gestión de las prácticas de Formación Profesional (FCT).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">3. Derechos del Usuario</h2>
                        <p>
                            El interesado tiene derecho a obtener confirmación sobre si en EduConect estamos tratando sus datos personales. Tiene derecho a acceder a sus datos personales, así como a solicitar la rectificación de los datos inexactos o, en su caso, solicitar su supresión cuando, entre otros motivos, los datos ya no sean necesarios para los fines que fueron recogidos.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Privacidad;
