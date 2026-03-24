# EduConect - Diario de Prácticas de Desarrollo

Este documento detalla la evolución técnica y funcional del proyecto **EduConect**, registrando los hitos alcanzados durante su construcción.

---

## 📅 Fase 1: Cimientos y Arquitectura
**Objetivo**: Establecer la estructura base y la comunicación entre el frontend y el backend.

*   **Configuración del Entorno**: Inicialización del proyecto con **Symfony 7** y **React 18** con TypeScript.
*   **Diseño de Datos**: Modelado de la base de datos MySQL mediante **Doctrine ORM**, definiendo las entidades base: `User`, `Alumno`, `Empresa`, `Centro`.
*   **Sistema de Autenticación**: Implementación de seguridad mediante **JWT (JSON Web Tokens)** para manejar sesiones de forma stateless.
*   **Design System**: Configuración de **Tailwind CSS** con una paleta de colores personalizada y soporte para **Modo Oscuro**.

---

## 📅 Fase 2: El Portal del Alumno y el Tutor Académico
**Objetivo**: Implementar las herramientas básicas de gestión de la FCT.

*   **Registro y Perfiles**: Creación de formularios de registro inteligentes que discriminan entre alumnos, tutores y empresas. Implementación de carga de archivos (CV en PDF) en el perfil del alumno.
*   **Diario de Actividades**: Desarrollo del módulo del diario donde el alumno registra sus horas y tareas diarias. Consumo de API para mostrar el progreso hacia las 370h.
*   **Dashboard del Tutor**: Panel para que el centro educativo valide los registros de alumnos y supervise las bitácoras en tiempo real.
*   **Validación de Usuarios**: Lógica de backend para permitir que solo usuarios aprobados por el tutor puedan operar.

---

## 📅 Fase 3: Gestión de Ofertas y Firma Digital
**Objetivo**: Digitalizar el proceso de selección y los convenios legales.

*   **Ofertas de FCT**: Implementación del marketplace de prácticas donde las empresas publican vacantes y los alumnos se postulan.
*   **Gestión de Candidaturas**: Flujo de estados (Pendiente, Aceptado, Rechazado, Firmado) para las solicitudes.
*   **Firma Digital (SignaturePad)**: Desarrollo e integración del componente de captura de firma manuscrita para formalizar convenios de forma digital desde el navegador.
*   **Consumo de API de Candidaturas**: Conexión del frontend con el backend para la gestión de firmas por parte de los tres actores (Alumno, Tutor Centro, Tutor Empresa).

---

## 📅 Fase 4: Sistemas Avanzados y SuperAdministración
**Objetivo**: Añadir capas de robustez y control global al sistema.

*   **Centro de Notificaciones**: Integración de un sistema de alertas en tiempo real que avisa a los usuarios sobre cambios críticos en su estado.
*   **Panel de SuperAdmin**: Creación del dashboard central para la validación de Instituciones (Centros) y la gestión global de grados formativos.
*   **Recuperación de Cuentas**: Implementación del flujo de "Olvide mi contraseña" con generación de tokens seguros y expiración temporal.
*   **Comandos de Mantenimiento**: Creación de comandos CLI en Symfony para tareas administrativas y de depuración del sistema.

---

## 📅 Fase 5: Comunicación y Pulido UI/UX
**Objetivo**: Mejorar la experiencia de usuario y añadir herramientas de comunicación.

*   **Chat Interno**: Implementación de un sistema de mensajería directo (`ChatController`) entre alumnos y sus tutores/empresas asignados.
*   **UX/UI Premium**: Añadido de esqueletos de carga (*Skeletons*), transiciones suaves y *feedback* visual (Toasts, Alertas) ante cada acción.
*   **Optimización SEO y Accesibilidad**: Estructura semántica HTML5 y optimización de metadatos para cada página.
*   **Documentación Final**: Elaboración de la documentación técnica exhaustiva del proyecto.

---

## 📊 Resumen de Logros Técnicos
*   **Fullstack Real**: Sincronización perfecta entre Symfony y React.
*   **Seguridad por Roles**: Jerarquía clara de acceso (5 roles distintos).
*   **Papel Cero**: Digitalización completa de diarios y convenios firmados.
*   **Diseño Moderno**: Interfaz interactiva, oscura y atractiva para el usuario.
