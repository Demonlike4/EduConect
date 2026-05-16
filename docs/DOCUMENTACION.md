# EduConect - Documentación Técnica del Proyecto Final (DAW)

## 1. Introducción y Objetivos
**EduConect** es una plataforma web integral diseñada para la gestión y digitalización del proceso de Formación en Centros de Trabajo (FCT). El objetivo principal del proyecto es simplificar la burocracia y mejorar la comunicación entre los cuatro pilares fundamentales: el **Alumno**, el **Tutor Académico** (Centro Educativo), el **Tutor de Empresa** y el **Super Administrador**.

### Objetivos Principales:
*   **Digitalización del Diario de Prácticas**: Eliminación total del papel para el seguimiento de actividades.
*   **Gestión de Candidaturas**: Centralización de ofertas y solicitudes en tiempo real.
*   **Firma Digital de Convenios**: Implementación de un panel de firma táctil/ratón para formalizar acuerdos de forma legal y ágil.
*   **Notificaciones Inteligentes**: Sistema de avisos automáticos según el rol y el estado de la FCT.
*   **Transparencia en el Progreso**: Seguimiento visual del cómputo total de horas (370h) y su validación periódica.

---

## 2. Tecnologías Utilizadas (Tech Stack)
### Backend:
*   **Lenguaje**: PHP 8.2+
*   **Framework**: Symfony 7.0
*   **Base de Datos**: MySQL (gestionada a través de Doctrine ORM)
*   **Seguridad**: Autenticación basada en JWT (JSON Web Tokens) y sistema robusto de recuperación de contraseñas.
*   **Comandos**: CLI personalizados para depuración de tutores y mantenimiento del sistema.

### Frontend:
*   **Framework**: React 18+ con TypeScript.
*   **Estilizado**: Tailwind CSS v3 (Diseño premium con arquitectura de diseño atómico).
*   **Gestión de Estado**: Context API para temas (DarkMode) y sesión de usuario.
*   **Navegación**: React Router Dom 6.
*   **UX/UI**: Animaciones fluidas, Skeleton Loaders y Material Symbols para iconografía.

---

## 3. Funcionalidades por Rol

### 🎓 Alumno (Estudiante)
1.  **Perfil Digital**: Carga de CV en PDF, definición de habilidades técnicas y foto de perfil.
2.  **Marketplace de Prácticas**: Visualización de vacantes publicadas por empresas con aplicación directa en un clic.
3.  **Diario de Actividades**: Registro diario de jornada (fecha, descripción y horas) con estadísticas de progreso en tiempo real.
4.  **Descarga de Documentación**: Acceso inmediato a convenios firmados una vez validados por las partes.

### 🏛️ Tutor Académico (Centro Educativo)
1.  **Gestión de Alumnado**: Activación manual de nuevos registros y supervisión de expedientes externos.
2.  **Generación de Convenios**: Creación de acuerdos legales y firma digital mediante el componente `SignaturePad`.
3.  **Supervisión de Bitácoras**: Panel para revisar, corregir o aprobar las entradas diarias de sus alumnos asignados.
4.  **Panel de Control del Centro**: Gestión de las relaciones con empresas colaboradoras y tutores externos.

### 🏢 Empresa / Tutor de Empresa
1.  **Publicación de Vacantes**: Formulario avanzado para detallar puestos de FCT (tecnologías requeridas, horarios, tareas).
2.  **Selección de Talento**: Gestión de candidatos postulados con acceso a sus CVs y perfiles.
3.  **Firma de la Empresa**: Proceso de firma digital simplificado para el tutor laboral asignado.
4.  **Validación de Jornadas**: Visto bueno a las horas registradas por el alumno para certificar la estancia.

### 🛡️ Super Administrador (Sistema)
1.  **Administración de Instituciones**: Validación y alta de nuevos Centros Educativos autorizados.
2.  **Gestión de Grados**: Definición de las titulaciones disponibles (DAM, DAW, ASIR, etc.) en el sistema.
3.  **Mantenimiento Global**: Acceso a comandos de depuración y gestión de todos los perfiles de usuario.

---

## 4. Sistemas Transversales (Core Features)

### 🔔 Notificaciones en Tiempo Real
*   Panel centralizado (`NotificationPanel`) que muestra avisos críticos:
    *   **Alumnos**: Candidaturas aceptadas, diarios rechazados con feedback.
    *   **Tutores**: Notificaciones de firmas pendientes o nuevos registros de alumnos.
    *   **Empresas**: Alertas de nuevos perfiles postulados.

### ✍️ Firma Digital Integrada
*   Componente `SignaturePad` que permite capturar la firma manuscrita desde dispositivos táctiles o ratón.
*   Persistencia de firmas en el flujo de la candidatura para la formalización automática del PDF oficial.

### 🔐 Seguridad y Recuperación
*   **Auth Flow**: Login basado en roles con redirección automática al dashboard correspondiente.
*   **Password Reset**: Flujo de "Olvide mi contraseña" con generación de tokens, expiración y restablecimiento seguro.
*   **Control de Acceso**: Middleware de Symfony configurado para proteger endpoints por jerarquía de roles.

### 🌗 Interfaz de Usuario (UX/UI)
*   **Modo Oscuro Adaptativo**: Soporte completo para temas claro/oscuro con almacenamiento en LocalStorage.
*   **Feedback Inmediato**: Alertas de sistema, Skeleton screens para estados de carga y transiciones de página suaves.

---

## 5. Ciclo de Vida de la FCT en la Plataforma
1.  **Registro**: El alumno se une y el Tutor Académico verifica su perfil.
2.  **Postulación**: El alumno aplica; la empresa revisa el perfil y lo acepta como candidato.
3.  **Formalización**: El Tutor Académico genera el convenio digital y se firman por todas las partes.
4.  **Ejecución**: El alumno empieza a registrar horas diariamente en su portal.
5.  **Cierre**: Los tutores validan el total de horas (370h) y se da por finalizado el ciclo formativo.

---

## 6. Arquitectura de Datos (Entidades Clave)
*   **User**: Base central del sistema (email, roles, estado de aprobación).
*   **Candidatura**: El nexo que vincula Alumno, Oferta, Convenio y Fechas de prácticas.
*   **DiarioActividad**: Colección cronológica de todas las tareas y horas de formación realizadas.
*   **Centro / Empresa**: Estructuras organizativas que agrupan a alumnos y tutores respectivamente.
