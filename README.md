# EduConect

EduConect es una plataforma integral para la gestión de prácticas empresariales, facilitando la conexión y el seguimiento entre alumnos, tutores de centro y tutores de empresa.

## Arquitectura del Proyecto

La plataforma sigue una arquitectura cliente-servidor estandarizada:

### Backend
- **Lenguaje:** PHP 8.2+
- **Framework:** Symfony 7 LTS
- **ORM:** Doctrine
- **Seguridad:** JWT Authentication

### Frontend
- **Librería/Framework:** React 19.2.4
- **Lenguaje:** TypeScript
- **Bundler:** Vite 7.3.1
- **Estilos:** Tailwind CSS v4.2.0

## Módulos Principales
- **Autenticación y Autorización:** Roles separados para SuperAdmin, Alumno, Tutor de Centro y Tutor de Empresa.
- **Gestión de Prácticas:** Seguimiento del progreso del alumno en la empresa y firmas de actas.
- **Comunicación Integrada:** Sistema de chat en tiempo real y notificaciones en vivo.
