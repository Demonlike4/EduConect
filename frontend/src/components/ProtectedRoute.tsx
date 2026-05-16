import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser, type UserRole } from '../context/UserContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, isAuthenticated } = useUser();
    const location = useLocation();

    // Función auxiliar: normalizar rol eliminando prefijo ROLE_ si existe
    const normalizeRole = (role: UserRole): string => {
        if (!role) return '';
        const roleStr = String(role);
        return roleStr.startsWith('ROLE_') ? roleStr.substring(5) : roleStr;
    };

    // Ruta de login: no redirigir si ya estamos en login (evitar bucles)
    if (!isAuthenticated) {
        if (location.pathname === '/login') {
            return <>{children}</>;
        }
        // Redirigir a login guardando la ubicación actual para volver después
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Validación de roles: normalizar y comparar
    if (allowedRoles && user) {
        const normalizedUserRole = normalizeRole(user.role);
        const allowedRolesNormalized = allowedRoles.map(normalizeRole);

        if (!allowedRolesNormalized.includes(normalizedUserRole)) {
            // Usuario autenticado pero sin permiso para esta ruta
            // Redirigir a su dashboard correspondiente
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

export default ProtectedRoute;
