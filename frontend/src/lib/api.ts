import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://educonect.alwaysdata.net/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para inyectar el Token en cada petición de forma síncrona
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor para manejar respuestas de error globales
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Purga absoluta del estado de autenticación
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('auth_user');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            
            // Enrutar a /login cortando de raíz posibles bucles de React
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        } else if (error.response?.status === 403) {
            console.error('Acceso prohibido (403): Tu rol no tiene permisos para este recurso.');
        } else if (error.request && !error.response) {
            console.error('Error de red: No se recibió respuesta del servidor.');
        } else {
            console.error('Error en petición API:', error.message);
        }

        return Promise.reject(error);
    }
);

export default api;
