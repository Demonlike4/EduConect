import { createContext, useContext, useState, type ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export type UserRole = 'ALUMNO' | 'EMPRESA' | 'TUTOR_CENTRO' | 'TUTOR_EMPRESA' | 'SUPERADMIN' | null;

interface User {
    id: number;
    email: string;
    nombre: string;
    role: UserRole;
    isAprobado?: boolean;
    centro?: string;
    grado?: string;
    empresa?: string;
    foto?: string;
    token?: string; // Token JWT o de sesión devuelto por el backend
}

interface UserContextType {
    user: User | null;
    login: (userData: User, token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';


export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedToken = sessionStorage.getItem(TOKEN_KEY);
        const savedUser = sessionStorage.getItem(USER_KEY);
        
        if (savedToken && savedUser) {
            try {
                return JSON.parse(savedUser);
            } catch (e) {
                sessionStorage.removeItem(TOKEN_KEY);
                sessionStorage.removeItem(USER_KEY);
            }
        }
        return null;
    });

    const login = (userData: User, token: string) => {
        // Validación exhaustiva del token
        if (!token || typeof token !== 'string' || token.trim() === '') {
            console.error(
                "Login fallido: El token recibido es nulo, indefinido, no es string o está vacío.",
                { token, type: typeof token }
            );
            return;
        }

        // Validación del usuario
        if (!userData) {
            console.error("Login fallido: userData es nulo o indefinido.");
            return;
        }

        // Normalizar rol: eliminar prefijo ROLE_ si existe
        let normalizedRole = userData.role;
        if (typeof userData.role === 'string' && userData.role.startsWith('ROLE_')) {
            normalizedRole = userData.role.substring(5) as UserRole;
        }

        // Construir usuario con datos normalizados
        const userWithToken = {
            ...userData,
            role: normalizedRole,
            token
        };

        // Persistir en estado y storage
        setUser(userWithToken);
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(userWithToken));

        console.log(
            `Login persistido: usuario ${userData.email} con rol normalizado ${normalizedRole}`
        );
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out from Firebase", error);
        } finally {
            setUser(null);
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(USER_KEY);
        }
    };

    return (
        <UserContext.Provider value={{
            user,
            login,
            logout,
            isAuthenticated: !!user
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
