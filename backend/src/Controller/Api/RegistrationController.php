<?php

namespace App\Controller\Api;

use App\Entity\Alumno;
use App\Entity\Empresa;
use App\Entity\User;
use App\Entity\Notificacion;
use App\Repository\CentroRepository;
use App\Repository\GradoRepository;
use App\Repository\EmpresaRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

class RegistrationController extends AbstractController
{
    #[Route('/api/register', name: 'api_register', methods: ['POST'])]
    public function register(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
        CentroRepository $centroRepository,
        GradoRepository $gradoRepository,
        EmpresaRepository $empresaRepository
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['email'], $data['password'], $data['role'])) {
            return new JsonResponse(['error' => 'Faltan campos obligatorios (email, contraseña, rol)'], 400);
        }

        $email = trim($data['email']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return new JsonResponse(['error' => 'El formato del correo electrónico no es válido.'], 400);
        }

        // Check if user already exists
        $existingUser = $entityManager->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existingUser) {
            return new JsonResponse(['error' => 'Este correo electrónico ya está en uso. Por favor, inicia sesión o utiliza otro correo.'], 409);
        }

        try {
            $user = new User();
            $user->setEmail($email);
            $user->setPassword($passwordHasher->hashPassword($user, $data['password']));
            $user->setNombre($data['nombre'] ?? null);

            $role = $data['role'];
            switch ($role) {
                case 'alumno':
                    $user->setIsAprobado(false); // Alumno must be approved by Tutor
                    $user->setRoles(['ROLE_ALUMNO']);
                    
                    $alumno = new Alumno();
                    $alumno->setUser($user);
                    
                    if (isset($data['centroId'])) {
                        $centro = $centroRepository->find($data['centroId']);
                        if ($centro) $alumno->setCentro($centro);
                    }
                    
                    // Handle Grade (accepts both 'grade' from frontend or 'grado')
                    $gradoId = $data['grade'] ?? $data['grado'] ?? null;
                    if ($gradoId) {
                        $grado = $gradoRepository->find($gradoId);
                        if ($grado) $alumno->setGrado($grado);
                    }
                    
                    if (isset($data['tutorId'])) {
                        $tutor = $entityManager->getRepository(User::class)->find($data['tutorId']);
                        if ($tutor) {
                            $alumno->setTutorCentro($tutor); // Confirmed method exists in Alumno entity
                            
                            $notiTutor = new Notificacion();
                            $notiTutor->setUser($tutor);
                            $notiTutor->setTipo('neutral');
                            $notiTutor->setTitle('Nuevo Alumno Pendiente');
                            $notiTutor->setDescription('El alumno ' . ($user->getNombre() ?? $user->getEmail()) . ' te ha seleccionado como su tutor de prácticas y espera tu validación.');
                            $notiTutor->setActionText('Aprobar acceso');
                            $notiTutor->setIcon('person_add');
                            $entityManager->persist($notiTutor);
                        }
                    }
                    
                    $entityManager->persist($alumno);
                    break;

                case 'tutor_centro':
                    $user->setRoles(['ROLE_TUTOR_CENTRO']);
                    $user->setIsAprobado(false); // Requiere validación del SuperAdministrador
                    if (isset($data['centroId'])) {
                        $centro = $centroRepository->find($data['centroId']);
                        if ($centro) $user->setCentroEducativo($centro);
                    }
                    break;

                case 'tutor_empresa':
                    $user->setRoles(['ROLE_TUTOR_EMPRESA']);
                    $user->setIsAprobado(false); // New tutors must be approved
                    if (isset($data['empresaId'])) {
                        $empresa = $empresaRepository->find($data['empresaId']);
                        if ($empresa) {
                            $user->setEmpresaLaboral($empresa);
                            
                            $notiEmpresa = new Notificacion();
                            $notiEmpresa->setUser($empresa->getUser());
                            $notiEmpresa->setTipo('neutral');
                            $notiEmpresa->setTitle('Nuevo Tutor Pendiente');
                            $notiEmpresa->setDescription('Un responsable (' . ($user->getNombre() ?? $user->getEmail()) . ') se ha registrado como tutor de tu empresa y espera aprobación.');
                            $notiEmpresa->setActionText('Ver panel');
                            $notiEmpresa->setIcon('person_add');
                            $entityManager->persist($notiEmpresa);
                        }
                    }
                    break;

                case 'empresa':
                    $user->setRoles(['ROLE_EMPRESA']);
                    $empresa = new Empresa();
                    $empresa->setUser($user);
                    $empresa->setNombreComercial($data['nombreEmpresa'] ?? 'Nueva Empresa');
                    
                    if (isset($data['cif'])) {
                        $empresa->setCif($data['cif']);
                    } else {
                        // Fallback or error if CIF is mandatory and missing (though frontend should catch this)
                         return new JsonResponse(['error' => 'CIF is required for company registration'], 400);
                    }
                    
                    $entityManager->persist($empresa);
                    break;

                default:
                    return new JsonResponse(['error' => 'Invalid role specified'], 400);
            }

            $entityManager->persist($user);
            $entityManager->flush();

            // Determine role string for frontend
            $roleStr = null;
            $roles = $user->getRoles();
            if (in_array('ROLE_ALUMNO', $roles)) $roleStr = 'ALUMNO';
            elseif (in_array('ROLE_EMPRESA', $roles)) $roleStr = 'EMPRESA';
            elseif (in_array('ROLE_TUTOR_CENTRO', $roles)) $roleStr = 'TUTOR_CENTRO';
            elseif (in_array('ROLE_TUTOR_EMPRESA', $roles)) $roleStr = 'TUTOR_EMPRESA';
            else $roleStr = 'ALUMNO';

            // Helper to get Centro name safest way
            $centroName = null;
            if ($user->getCentroEducativo()) {
                $centroName = $user->getCentroEducativo()->getNombre();
            } elseif ($user->getAlumno() && $user->getAlumno()->getCentro()) {
                $centroName = $user->getAlumno()->getCentro()->getNombre();
            }

            // Helper to get Grado name
            $gradoName = ($user->getAlumno() && $user->getAlumno()->getGrado()) ? $user->getAlumno()->getGrado()->getNombre() : null;
            
            // Helper to get Empresa name (if it's a tutor_empresa, they might relate to EmpresaLaboral)
            $empresaName = null;
            if ($user->getEmpresa()) {
                $empresaName = $user->getEmpresa()->getNombreComercial();
            } elseif ($user->getEmpresaLaboral()) {
                $empresaName = $user->getEmpresaLaboral()->getNombreComercial();
            } elseif ($user->getAlumno() && $user->getAlumno()->getCandidaturas()->count() > 0) {
                 // Potentially fetched from active candidacy, but for registration we keep it simple
            }

            return new JsonResponse([
                'status' => 'success',
                'message' => 'User registered successfully',
                'user' => [
                    'id' => $user->getId(),
                    'email' => $user->getEmail(),
                    'nombre' => $user->getNombre(),
                    'role' => $roleStr,
                    'isAprobado' => $user->isAprobado(),
                    'grado' => $gradoName,
                    'centro' => $centroName,
                    'empresa' => $empresaName
                ]
            ], 201);

        } catch (\Exception $e) {
            return new JsonResponse([
                'status' => 'error',
                'message' => 'Could not register user: ' . $e->getMessage()
            ], 500);
        }
    }
}
