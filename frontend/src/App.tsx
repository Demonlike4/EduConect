import { UserProvider } from './context/UserContext';
import AlumnoDashboard from './pages/AlumnoDashboard';
import EmpresaDashboard from './pages/EmpresaDashboard';
import TutorCentroDashboard from './pages/TutorCentroDashboard';
import TutorAlumnos from './pages/TutorAlumnos';
import TutorEmpresaDashboard from './pages/TutorEmpresaDashboard';
import PerfilAlumno from './pages/PerfilAlumno';
import Registro from './pages/Registro';
import Home from './pages/Home';
import Login from './pages/Login';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
    return (
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
                    <Route path="*" element={<div>404 - Not Found</div>} />
                </Routes>
            </Router>
        </UserProvider>
    );
}

export default App;
