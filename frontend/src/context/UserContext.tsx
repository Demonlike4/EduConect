import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type UserRole = 'ALUMNO' | 'EMPRESA' | 'TUTOR_CENTRO' | 'TUTOR_EMPRESA' | null;

interface User {
    id: number;
    email: string;
    nombre: string;
    role: UserRole;
    centro?: string;
    grado?: string;
    empresa?: string;
}

interface UserContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const SESSION_KEY = 'educonect_session_v2';
const SESSION_DURATION = 28800000; // 8 hours in ms

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
            try {
                const { user: savedUser, expiry } = JSON.parse(savedSession);
                if (Date.now() < expiry) {
                    console.debug("[UserContext] Session restored for:", savedUser.email);
                    return savedUser;
                }
                console.debug("[UserContext] Session expired");
                localStorage.removeItem(SESSION_KEY);
            } catch (e) {
                console.error("[UserContext] Error parsing session:", e);
                localStorage.removeItem(SESSION_KEY);
            }
        }
        return null;
    });

    useEffect(() => {
        if (user) {
            const sessionData = {
                user,
                token: btoa(user.email + ':' + Date.now()),
                expiry: Date.now() + SESSION_DURATION
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
            console.debug("[UserContext] Session saved/refreshed");
        } else {
            localStorage.removeItem(SESSION_KEY);
            console.debug("[UserContext] Session removed");
        }
    }, [user]);

    const login = (userData: User) => {
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
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
