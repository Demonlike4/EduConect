import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import AlumnoDashboard from './pages/AlumnoDashboard';
import EmpresaDashboard from './pages/EmpresaDashboard';
import TutorCentroDashboard from './pages/TutorCentroDashboard';
import TutorAlumnos from './pages/TutorAlumnos';
import TutorEmpresaDashboard from './pages/TutorEmpresaDashboard';
import PerfilAlumno from './pages/PerfilAlumno';
import Registro from './pages/Registro';
import Home from './pages/Home';
import Login from './pages/Login';
import Privacidad from './pages/Privacidad';
import Terminos from './pages/Terminos';
import Cookies from './pages/Cookies';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
    return (
        <ThemeProvider>
            <UserProvider>
                <Router>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/registro" element={<Registro />} />
                        <Route path="/dashboard/alumno" element={<AlumnoDashboard />} />
                        <Route path="/dashboard/tutor-centro" element={<TutorCentroDashboard />} />
                        <Route path="/dashboard/tutor-centro/alumnos" element={<TutorAlumnos />} />
                        <Route path="/perfil/alumno" element={<PerfilAlumno />} />
                        <Route path="/dashboard/empresa" element={<EmpresaDashboard />} />
                        <Route path="/dashboard/tutor-empresa" element={<TutorEmpresaDashboard />} />
                        <Route path="/privacidad" element={<Privacidad />} />
                        <Route path="/terminos" element={<Terminos />} />
                        <Route path="/cookies" element={<Cookies />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/restaurar-password/:token" element={<ResetPassword />} />
                        <Route path="/dashboard/superadmin" element={<SuperAdminDashboard />} />
                        <Route path="*" element={<div>404 - Not Found</div>} />
                    </Routes>
                </Router>
            </UserProvider>
        </ThemeProvider>
    );
}


export default App;
