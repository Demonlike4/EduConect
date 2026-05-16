import React from 'react';
import { useNavigate } from 'react-router-dom';

const AvisoLegal: React.FC = () => {
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

                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Aviso Legal</h1>
                
                <div className="space-y-6 text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    <section>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">1. Datos Identificativos</h2>
                        <p>
                            En cumplimiento con el deber de información recogido en artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE), se facilitan los siguientes datos:
                        </p>
                        <p className="mt-2">
                            EduConect es una plataforma gestionada por el Departamento de Formación Profesional. Dirección: Av. de la Tecnología, 12, 28001 Madrid. Email: soporte@educonect.com.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">2. Usuarios</h2>
                        <p>
                            El acceso y/o uso de este portal de EduConect atribuye la condición de USUARIO, que acepta, desde dicho acceso y/o uso, las Condiciones Generales de Uso aquí reflejadas. Las citadas Condiciones serán de aplicación independientemente de las Condiciones Generales de Contratación que en su caso resulten de obligado cumplimiento.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">3. Uso del Portal</h2>
                        <p>
                            EduConect proporciona el acceso a multitud de informaciones, servicios, programas o datos (en adelante, "los contenidos") en Internet pertenecientes a EduConect o a sus licenciantes a los que el USUARIO pueda tener acceso. El USUARIO asume la responsabilidad del uso del portal.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AvisoLegal;
