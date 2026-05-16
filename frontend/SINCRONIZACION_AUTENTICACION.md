# 🔐 Sincronización de Autenticación Frontend-Backend

**Fecha:** Abril 2026  
**Versión:** 1.0  
**Objetivo:** Refactorizar el flujo de autenticación y protección de rutas en React para alinearlo con la nueva respuesta del Backend en Symfony.

---

## 📋 Tabla de Contenidos

1. [Cambios Realizados](#cambios-realizados)
2. [1. Normalización de Roles](#1-normalización-de-roles)
3. [2. Gestión de Login y Tokens](#2-gestión-de-login-y-tokens)
4. [3. Interceptor de API](#3-interceptor-de-api)
5. [4. Protección de Rutas](#4-protección-de-rutas)
6. [5. Limpieza de Efectos en Dashboards](#5-limpieza-de-efectos-en-dashboards)
7. [Guía de Resolución de Bucles de Redirección](#guía-de-resolución-de-bucles-de-redirección)

---

## ✅ Cambios Realizados

### Archivos Modificados

1. **`frontend/src/pages/Login.tsx`**
   - ✅ Validación exhaustiva de token (no null, no undefined, no vacío)
   - ✅ Normalización de roles: elimina prefijo `ROLE_` si existe
   - ✅ Manejo específico de errores HTTP (401, 429, 500)
   - ✅ Logging detallado para debugging

2. **`frontend/src/components/ProtectedRoute.tsx`**
   - ✅ Función `normalizeRole()` para eliminar prefijo `ROLE_`
   - ✅ Validación sin bucles: evita redirigir desde `/login` a `/login`
   - ✅ Comparación de roles normalizada
   - ✅ Logging de acceso denegado

3. **`frontend/src/context/UserContext.tsx`**
   - ✅ Validación de token en `login()`: exhausitva y defensiva
   - ✅ Normalización de rol al persistir
   - ✅ Logging de persistencia exitosa

4. **`frontend/src/lib/api.ts`**
   - ✅ Flag `isRedirectingToLogin` para evitar múltiples redireccionamientos
   - ✅ Uso de `window.location.replace()` en lugar de `window.location.href`
   - ✅ Verifica que no estemos ya en `/login` antes de redirigir
   - ✅ Manejo específico de errores de red

---

## 1. Normalización de Roles

### 🔴 Problema

El Backend envía roles sin el prefijo `ROLE_`:
```json
{
  "token": "jwt...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "SUPERADMIN"  // ❌ No tiene prefijo ROLE_
  }
}
```

Pero el Frontend anterior esperaba `ROLE_SUPERADMIN`.

### ✅ Solución Implementada

#### En `Login.tsx`:
```typescript
// Normalizar el rol: eliminar prefijo ROLE_ si existe
const normalizedRole = userData.role.startsWith('ROLE_')
    ? userData.role.substring(5)
    : userData.role;

const normalizedUserData = {
    ...userData,
    role: normalizedRole
};

login(normalizedUserData, token);
```

#### En `ProtectedRoute.tsx`:
```typescript
// Función auxiliar: normalizar rol eliminando prefijo ROLE_ si existe
const normalizeRole = (role: UserRole): string => {
    if (!role) return '';
    const roleStr = String(role);
    return roleStr.startsWith('ROLE_') ? roleStr.substring(5) : roleStr;
};

// Validación de roles: normalizar y comparar
if (allowedRoles && user) {
    const normalizedUserRole = normalizeRole(user.role);
    const allowedRolesNormalized = allowedRoles.map(normalizeRole);

    if (!allowedRolesNormalized.includes(normalizedUserRole)) {
        // Acceso denegado, redirigir al dashboard correspondiente
        ...
    }
}
```

#### En `UserContext.tsx`:
```typescript
// Normalizar rol: eliminar prefijo ROLE_ si existe
let normalizedRole = userData.role;
if (typeof userData.role === 'string' && userData.role.startsWith('ROLE_')) {
    normalizedRole = userData.role.substring(5) as UserRole;
}

const userWithToken = {
    ...userData,
    role: normalizedRole,
    token
};
```

### ✅ Roles Soportados (sin prefijo)

- `SUPERADMIN` → `/dashboard/superadmin`
- `TUTOR_CENTRO` → `/dashboard/tutor-centro`
- `TUTOR_EMPRESA` → `/dashboard/tutor-empresa`
- `EMPRESA` → `/dashboard/empresa`
- `ALUMNO` → `/dashboard/alumno`

---

## 2. Gestión de Login y Tokens

### 🔴 Problema

- Login no validaba si el token era `null` o `undefined`
- No diferenciaba entre token vacío y token válido
- Podía navegar a dashboard sin token persistido

### ✅ Solución Implementada

#### En `Login.tsx`:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        const response = await api.post('/login', { email, password });

        // Validación exhaustiva de la respuesta
        const { token, user: userData } = response.data;

        // ✅ Verificar que el token sea válido
        if (!token || typeof token !== 'string' || token.trim() === '') {
            console.error("Login fallido: Token recibido es nulo, indefinido o vacío.", token);
            setError('Respuesta de servidor incompleta: token inválido.');
            return;
        }

        // ✅ Verificar que los datos del usuario sean válidos
        if (!userData || !userData.role) {
            console.error("Login fallido: Datos de usuario incompletos.", userData);
            setError('Respuesta de servidor incompleta: datos de usuario inválidos.');
            return;
        }

        // ✅ Normalizar el rol
        const normalizedRole = userData.role.startsWith('ROLE_')
            ? userData.role.substring(5)
            : userData.role;

        const normalizedUserData = { ...userData, role: normalizedRole };

        // ✅ Persistir en contexto
        login(normalizedUserData, token);
        console.log(`Login exitoso para usuario ${userData.email} con rol ${normalizedRole}`);

        // ✅ Redireccionar al dashboard correspondiente
        const dashboardRoutes: Record<string, string> = {
            'SUPERADMIN': '/dashboard/superadmin',
            'TUTOR_CENTRO': '/dashboard/tutor-centro',
            'TUTOR_EMPRESA': '/dashboard/tutor-empresa',
            'EMPRESA': '/dashboard/empresa',
            'ALUMNO': '/dashboard/alumno'
        };

        const targetPath = dashboardRoutes[normalizedRole] || '/';
        navigate(targetPath);

    } catch (err: any) {
        // ✅ Manejo específico de errores
        if (err.response?.status === 429) {
            setError('Demasiados intentos. Por seguridad, tu acceso ha sido restringido temporalmente (15 min).');
        } else if (err.response?.status === 401) {
            setError('Credenciales inválidas. Verifica tu email y contraseña.');
        } else if (err.response?.status === 500) {
            setError('Error del servidor. Por favor, intenta más tarde.');
        } else {
            setError(err.response?.data?.error || 'Error al iniciar sesión.');
        }
        console.error("Error en handleSubmit:", err);
    } finally {
        setLoading(false);
    }
};
```

#### En `UserContext.tsx`:
```typescript
const login = (userData: User, token: string) => {
    // ✅ Validación exhaustiva del token
    if (!token || typeof token !== 'string' || token.trim() === '') {
        console.error(
            "Login fallido: El token recibido es nulo, indefinido, no es string o está vacío.",
            { token, type: typeof token }
        );
        return;
    }

    // ✅ Validación del usuario
    if (!userData) {
        console.error("Login fallido: userData es nulo o indefinido.");
        return;
    }

    // ✅ Normalizar rol
    let normalizedRole = userData.role;
    if (typeof userData.role === 'string' && userData.role.startsWith('ROLE_')) {
        normalizedRole = userData.role.substring(5) as UserRole;
    }

    // ✅ Construir usuario con datos normalizados
    const userWithToken = {
        ...userData,
        role: normalizedRole,
        token
    };

    // ✅ Persistir en estado y storage
    setUser(userWithToken);
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(userWithToken));

    console.log(
        `Login persistido: usuario ${userData.email} con rol normalizado ${normalizedRole}`
    );
};
```

---

## 3. Interceptor de API

### 🔴 Problema

- Usaba `window.location.href` que puede causar bucles
- Sin verificación de ruta actual antes de redirigir
- Sin flag para evitar múltiples redireccionamientos simultáneos
- Mal manejo de errores de red

### ✅ Solución Implementada

#### En `frontend/src/lib/api.ts`:
```typescript
// Flag para evitar múltiples redireccionamientos a login simultáneamente
let isRedirectingToLogin = false;

// Interceptor para manejar respuestas de error globales (401, 403, 429)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const { status } = error.response;
            const currentPath = window.location.pathname;

            // ✅ Manejo de expiración de sesión o acceso no autorizado
            if ((status === 401 || status === 403) && currentPath !== '/login') {
                console.warn(
                    `Error ${status}: Sesión expirada o no autorizada. ` +
                    `Limpiando store y redirigiendo a /login desde ${currentPath}...`
                );

                // ✅ Evitar múltiples redireccionamientos simultáneos
                if (!isRedirectingToLogin) {
                    isRedirectingToLogin = true;

                    // ✅ Limpiar storage de forma segura
                    try {
                        sessionStorage.removeItem('auth_token');
                        sessionStorage.removeItem('auth_user');
                    } catch (e) {
                        console.error("Error al limpiar sessionStorage:", e);
                    }

                    // ✅ Redirigir a login de forma limpia (sin bucles)
                    window.location.replace('/login');

                    // ✅ Reset flag después de corto delay
                    setTimeout(() => {
                        isRedirectingToLogin = false;
                    }, 2000);
                } else {
                    console.warn("Redireccionamiento a login ya en progreso. Ignorando solicitud duplicada.");
                }
            } else if (status === 403) {
                console.error(
                    `Acceso prohibido (403): Tu rol no tiene permisos para este recurso.`
                );
            }
        } else if (error.request && !error.response) {
            // ✅ Error de red
            console.error(
                "Error de red: No se recibió respuesta del servidor. " +
                "Verifica tu conexión a internet."
            );
        } else {
            console.error("Error en petición API:", error.message);
        }

        return Promise.reject(error);
    }
);
```

### Diferencias entre `href` y `replace()`

| Propiedad | Ventaja | Desventaja |
|-----------|---------|-----------|
| `window.location.href = '/login'` | Guarda en navegación | Permite retroceder (bucles) |
| `window.location.replace('/login')` | ✅ No guarda - limpia historial | No permite retroceder |

---

## 4. Protección de Rutas

### 🔴 Problema

- ProtectedRoute comparaba roles sin normalización
- Podía causar redirecciones infinitas
- No manejaba correctamente el estado de login incompleto

### ✅ Solución Implementada

#### En `ProtectedRoute.tsx`:
```typescript
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, isAuthenticated } = useUser();
    const location = useLocation();

    // ✅ Función para normalizar rol
    const normalizeRole = (role: UserRole): string => {
        if (!role) return '';
        const roleStr = String(role);
        return roleStr.startsWith('ROLE_') ? roleStr.substring(5) : roleStr;
    };

    // ✅ Guarda: no redirigir si ya estamos en login
    if (!isAuthenticated) {
        if (location.pathname === '/login') {
            return <>{children}</>;
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // ✅ Validación de roles: normalizar y comparar
    if (allowedRoles && user) {
        const normalizedUserRole = normalizeRole(user.role);
        const allowedRolesNormalized = allowedRoles.map(normalizeRole);

        if (!allowedRolesNormalized.includes(normalizedUserRole)) {
            // Usuario sin permisos: redirigir a su dashboard
            const dashboardMap: Record<string, string> = {
                'ALUMNO': '/dashboard/alumno',
                'EMPRESA': '/dashboard/empresa',
                'TUTOR_CENTRO': '/dashboard/tutor-centro',
                'TUTOR_EMPRESA': '/dashboard/tutor-empresa',
                'SUPERADMIN': '/dashboard/superadmin'
            };
            const redirectPath = dashboardMap[normalizedUserRole] || '/';
            console.warn(
                `Acceso denegado: Usuario con rol ${normalizedUserRole} ` +
                `intentó acceder a ruta que requiere: ${allowedRolesNormalized.join(', ')}. ` +
                `Redirigiendo a ${redirectPath}`
            );
            return <Navigate to={redirectPath} replace />;
        }
    }

    return <>{children}</>;
};
```

---

## 5. Limpieza de Efectos en Dashboards

### 🔴 Problema

- Dashboards hacían peticiones a la API antes de que `user` estuviera cargado completamente
- Causaba pantallazos en blanco o recargas forzosas
- Efectos sin dependencias correctas podían causar múltiples peticiones

### ✅ Solución Implementada

#### Patrón Recomendado en Dashboards:

```typescript
const YourDashboard: React.FC = () => {
    const { user, isAuthenticated } = useUser();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ✅ Efecto con guardas de seguridad
    useEffect(() => {
        // ✅ Guarda 1: Verificar que el usuario está autenticado
        if (!isAuthenticated || !user) {
            console.warn("Dashboard: Usuario no autenticado. Deteniendo cargas.");
            setLoading(false);
            return;
        }

        // ✅ Guarda 2: Verificar que el usuario tiene email (dato crítico)
        if (!user.email) {
            console.warn("Dashboard: Email del usuario vacío. Deteniendo cargas.");
            setLoading(false);
            return;
        }

        // ✅ Guarda 3: Verificar que el token existe en storage
        const token = sessionStorage.getItem('auth_token');
        if (!token) {
            console.error("Dashboard: Token no encontrado en sessionStorage.");
            setError('Sesión inválida. Por favor, inicia sesión de nuevo.');
            setLoading(false);
            return;
        }

        // ✅ Ahora es seguro hacer la petición
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.post('/your-endpoint', {
                    email: user.email
                });
                setData(response.data);
            } catch (err: any) {
                console.error("Error fetching data:", err);
                setError('Error al cargar los datos. Por favor, recarga la página.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // ✅ Limpiar intervalo si hay polling
        let interval: NodeJS.Timeout | null = null;
        if (true) { // Activar polling si es necesario
            interval = setInterval(fetchData, 30000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [user, isAuthenticated]); // ✅ Dependencias incluyen user e isAuthenticated

    // Render
    if (loading && isAuthenticated) return <Skeleton />;
    if (error) return <Error message={error} />;
    if (!isAuthenticated) return <NotAuthenticated />;

    return <>{/* Contenido del dashboard */}</>;
};
```

---

## 🔄 Guía de Resolución de Bucles de Redirección

### Síntomas

- ❌ Pareja de redirecciones infinita: `/login` ↔ `/dashboard`
- ❌ Página en blanco o recargando constantemente
- ❌ Console llena de warnings "Sesión expirada" repetidos
- ❌ La app se congela o ralentiza

### Causas Comunes

| Causa | Síntoma | Solución |
|-------|---------|----------|
| Token inválido pero persistido | No puede acceder a dashbard | Validar token en login |
| Role comparación sin normalizer | Siempre acceso denegado | Usar normalizeRole() |
| `window.location.href` | Permite retroceso | Usar `window.location.replace()` |
| Sin flag isRedirectingToLogin | Múltiples redireccionamientos | Agregar flag en interceptor |
| useEffect sin guardas | Peticiones antes de user listo | Agregar `if (!user) return` |

### Checklist de Debugging

```typescript
// 1. Verificar que el token se guarda correctamente
// En Console: sessionStorage.getItem('auth_token')
// Debe devolver algo como: "eyJhbGc..."

// 2. Verificar que el rol se normaliza
// En Console: sessionStorage.getItem('auth_user')
// Debe tener role sin ROLE_: "SUPERADMIN", no "ROLE_SUPERADMIN"

// 3. Verificar que el interceptor no entra en bucle
// En Network tab → ver si hay múltiples POST a /login seguidas

// 4. Verificar que ProtectedRoute no redirige desde /login
// Si estás en /login y ves redirección a otro lugar → bug en ProtectedRoute
```

### Pasos de Resolución

1. **Abrir DevTools (F12)**
2. **Ir a Application → Session Storage**
3. **Verificar `auth_token` existe y no es null**
4. **Verificar `auth_user` tiene role sin prefijo ROLE_**
5. **Console → verificar logs de Login.tsx**
6. **Network → verificar que solo hay UNA petición POST a /login**
7. **Si hay múltiples peticiones → hay bug en interceptor**

---

## 🧪 Testing Manual

### Escenario 1: Login Exitoso

```
1. Acceder a /login
2. Ingresar credenciales válidas
3. ✅ Debería:
   - Guardar token en sessionStorage
   - Guardar user con role normalizado
   - Redirigir a dashboard correspondiente
   - NO redirigir de vuelta a /login
```

### Escenario 2: Credenciales Inválidas

```
1. Acceder a /login
2. Ingresar email/password incorrectos
3. ✅ Debería:
   - Mostrar error "Credenciales inválidas"
   - NO limpiar sessionStorage
   - NO redirigir
```

### Escenario 3: Token Expirado

```
1. Estar en /dashboard/alumno
2. Esperar a que expire el token (o limpiar sessionStorage manualmente)
3. Hacer click en cualquier botón que invoque API
4. ✅ Debería:
   - Interceptor captura error 401
   - Limpia sessionStorage
   - Redirige a /login UNA SOLA VEZ (no bucle)
   - NO redirige de vuelta a /dashboard
```

### Escenario 4: Rol Insuficiente

```
1. Iniciar sesión como ALUMNO
2. Intentar acceder a /dashboard/tutor-centro
3. ✅ Debería:
   - ProtectedRoute rechaza acceso
   - Redirige a /dashboard/alumno (dashboard del rol actual)
   - No redirige de vuelta a /dashboard/tutor-centro
```

---

## 📝 Notas Importantes

### ⚠️ Cambios en el Backend Requeridos

El Backend debe responder con esta estructura en el endpoint `/login`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nombre": "Andres Martinez",
    "role": "SUPERADMIN",
    "foto": null,
    "centro": "IES San Cristobal",
    "isAprobado": true
  }
}
```

**IMPORTANTE:** El rol NO debe incluir el prefijo `ROLE_`.

### 🔒 Seguridad

- ✅ Token se guarda en `sessionStorage` (se limpia al cerrar navegador)
- ✅ No se expone token en URL
- ✅ No se guarda en `localStorage` (más seguro)
- ✅ Bearer token se inyecta automáticamente en headers
- ✅ Error 401/403 limpia automáticamente el token

### 📊 Logging para Debugging

Todos los componentes incluyen `console.log()` y `console.error()` estratégicos para debugging:

```typescript
// En Login.tsx
console.log(`Login exitoso para usuario ${userData.email} con rol ${normalizedRole}`);

// En ProtectedRoute.tsx
console.warn(`Acceso denegado: Usuario con rol ${normalizedUserRole} ...`);

// En api.ts
console.warn(`Error ${status}: Sesión expirada ...`);
```

---

## 📞 Contacto & Soporte

Si encuentras problemas:

1. Verifica los logs en Console (F12)
2. Revisa que el Backend devuelva la estructura correcta
3. Limpia sessionStorage y vuelve a iniciar sesión
4. Abre una issue con:
   - Síntoma exacto
   - URL y paso para reproducir
   - Logs de Console
   - Network tab screenshot

---

**Última actualización:** abril 2026  
**Estado:** ✅ Implementado y Testeado  
