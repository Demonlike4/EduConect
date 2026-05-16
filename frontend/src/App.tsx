import { lazy, Suspense } from 'react';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Loader from './components/Loader';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy loading components
const AlumnoDashboard = lazy(() => import('./pages/AlumnoDashboard'));
const EmpresaDashboard = lazy(() => import('./pages/EmpresaDashboard'));
const TutorCentroDashboard = lazy(() => import('./pages/TutorCentroDashboard'));
const TutorAlumnos = lazy(() => import('./pages/TutorAlumnos'));
const TutorEmpresaDashboard = lazy(() => import('./pages/TutorEmpresaDashboard'));
const PerfilAlumno = lazy(() => import('./pages/PerfilAlumno'));
const Registro = lazy(() => import('./pages/Registro'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Privacidad = lazy(() => import('./pages/Privacidad'));
const Terminos = lazy(() => import('./pages/Terminos'));
const Cookies = lazy(() => import('./pages/Cookies'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AvisoLegal = lazy(() => import('./pages/AvisoLegal'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));

const AuthActionHijacker = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');

    if (mode === 'resetPassword' && oobCode) {
        return <Navigate to={`/restaurar-password?oobCode=${oobCode}`} replace />;
    }
    return <Navigate to="/login" replace />;
};

function App() {
    return (
        <ThemeProvider>
            <UserProvider>
                <Router>
                    <Suspense fallback={<Loader />}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/registro" element={<Registro />} />
                            <Route path="/dashboard/alumno" element={
                                <ProtectedRoute allowedRoles={['ALUMNO']}>
                                    <AlumnoDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/dashboard/tutor-centro" element={
                                <ProtectedRoute allowedRoles={['TUTOR_CENTRO']}>
                                    <TutorCentroDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/dashboard/tutor-centro/alumnos" element={
                                <ProtectedRoute allowedRoles={['TUTOR_CENTRO']}>
                                    <TutorAlumnos />
                                </ProtectedRoute>
                            } />
                            <Route path="/perfil/alumno" element={
                                <ProtectedRoute allowedRoles={['ALUMNO']}>
                                    <PerfilAlumno />
                                </ProtectedRoute>
                            } />
                            <Route path="/dashboard/empresa" element={
                                <ProtectedRoute allowedRoles={['EMPRESA']}>
                                    <EmpresaDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/dashboard/tutor-empresa" element={
                                <ProtectedRoute allowedRoles={['TUTOR_EMPRESA']}>
                                    <TutorEmpresaDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/dashboard/superadmin" element={
                                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                                    <SuperAdminDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/privacidad" element={<Privacidad />} />
                            <Route path="/terminos" element={<Terminos />} />
                            <Route path="/cookies" element={<Cookies />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/restaurar-password" element={<ResetPassword />} />
                            <Route path="/__/auth/action" element={<AuthActionHijacker />} />
                            <Route path="/aviso-legal" element={<AvisoLegal />} />
                            <Route path="*" element={<div className="min-h-screen flex items-center justify-center font-black text-4xl">404 - Not Found</div>} />
                        </Routes>
                    </Suspense>
                </Router>
            </UserProvider>
        </ThemeProvider>
    );
}


export default App;
