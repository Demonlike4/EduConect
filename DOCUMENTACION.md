# EduConect - Documentación Técnica del Proyecto Final (DAW)

## 1. Introducción y Objetivos

**EduConect** es una plataforma web integral diseñada para la gestión y digitalización del proceso de Formación en Centros de Trabajo (FCT). El objetivo principal del proyecto es simplificar la burocracia y mejorar la comunicación entre los tres pilares fundamentales de las prácticas: el **Alumno**, el **Tutor Académico** (Centro Educativo) y el **Tutor de Empresa**.

### Objetivos Principales:
*   **Digitalización del Diario de Prácticas**: Eliminar el uso de papel para el seguimiento diario de actividades.
*   **Gestión de Candidaturas**: Centralizar las ofertas de prácticas y las solicitudes de los alumnos.
*   **Firma Digital de Convenios**: Agilizar la firma de acuerdos entre el centro y la empresa.
*   **Transparencia en el Progreso**: Permitir un seguimiento en tiempo real de las horas realizadas y validadas.

---

## 2. Tecnologías Utilizadas (Tech Stack)

### Backend:
*   **Lenguaje**: PHP 8.2+
*   **Framework**: Symfony 7.0
*   **Base de Datos**: MySQL (manejada con Doctrine ORM)
*   **Gestión de Dependencias**: Composer
*   **Seguridad**: Autenticación basada en JWT (JSON Web Tokens).

### Frontend:
*   **Lenguaje**: TypeScript
*   **Framework**: React 18+
*   **Gestión de Estado y Rutas**: React Router 6
*   **Estilizado**: Tailwind CSS (Utilizando un diseño premium con modo oscuro y animaciones).
*   **Comunicación API**: Axios
*   **Iconografía**: Google Material Symbols.

---

## 3. Funcionalidades por Rol

### 🎓 Alumno (Estudiante)
1.  **Registro y Perfil**: Carga de CV en PDF y definición de habilidades tecnológicas.
2.  **Panel de Ofertas**: Visualización de vacantes de FCT publicadas por empresas y aplicación directa.
3.  **Seguimiento de Estado**: Notificación visual sobre el estado de su candidatura (Postulado, Admitido, Validado).
4.  **Diario de Prácticas Digital**: 
    *   Registro diario de actividades realizadas y horas dedicadas.
    *   Visualización de estadísticas de progreso (horas totales vs. objetivo de 370h).
    *   Recepción de feedback y correcciones de los tutores.
5.  **Descarga de Documentación**: Acceso inmediato al convenio firmado una vez validado.

### 🏛️ Tutor Académico (Centro Educativo)
1.  **Gestión de Alumnos**: Aprobación de nuevos registros de estudiantes del centro.
2.  **Validación de Prácticas**: 
    *   Revisión de ofertas de empresas.
    *   Asignación formal de alumnos a empresas mediante firma digital del convenio.
3.  **Supervisión de Bitácoras**:
    *   Revisión diaria o semanal de las actividades registradas por los alumnos.
    *   Capacidad para aprobar o rechazar entradas del diario con observaciones técnicas.
4.  **Gestión de Convenios**: Generación y descarga de la documentación legal del acuerdo de FCT.

### 🏢 Tutor de Empresa (Colaborador)
1.  **Firma del Convenio**: Proceso simplificado para plasmar la firma digital de la empresa en el acuerdo de colaboración.
2.  **Gestión de Estudiantes Asignados**: Vista de los alumnos que actualmente realizan prácticas en su entidad.
3.  **Visto Bueno (Diario)**: Revisión de las tareas realizadas por el alumno en la empresa para asegurar que coinciden con la realidad laboral.
4.  **Perfil de la Empresa**: Gestión de la información de contacto y descripción de la entidad.

---

## 4. Ciclo de Vida del Estudiante en la Plataforma

1.  **Registro**: El alumno se registra y el **Tutor Académico** debe activarlo.
2.  **Postulación**: El alumno aplica a una oferta de una empresa.
3.  **Selección**: La empresa acepta al candidato.
4.  **Formalización**: El **Tutor Académico** genera el convenio y tanto él como el **Tutor de Empresa** lo firman digitalmente.
5.  **Ejecución**: Se activan las prácticas. El alumno empieza a registrar su **Diario de Prácticas**.
6.  **Validación**: Los tutores revisan y validan las horas de forma periódica hasta completar el ciclo de formación.

---

## 5. Arquitectura de Datos (Entidades Clave)

*   **User**: Gestiona el acceso, roles (ROLE_ALUMNO, ROLE_TUTOR_CENTRO, ROLE_TUTOR_EMPRESA) y credenciales.
*   **Alumno**: Almacena datos académicos, habilidades y relación con el centro.
*   **Oferta**: Datos del puesto (tecnologías, ubicación, horario) publicado por empresas.
*   **Candidatura**: Vincula Alumno + Oferta y gestiona las firmas y fechas de las prácticas.
*   **DiarioActividad**: Registros diarios de trabajo (fecha, horas, descripción, estado).

---

## 6. Seguridad y Buenas Prácticas
*   **Validación de Datos**: Implementada en backend con Symfony Validator y en frontend mediante estados controlados.
*   **CORS**: Configurado para permitir solo comunicaciones desde el dominio del frontend.
*   **UX/UI**: Diseño responsive, soporte para modo oscuro nativo y feedback inmediato al usuario mediante alertas y skeletons de carga.
