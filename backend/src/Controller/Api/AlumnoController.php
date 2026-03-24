<?php

namespace App\Controller\Api;

use App\Entity\Alumno;
use App\Entity\User;
use App\Entity\Oferta;
use App\Entity\Candidatura;
use App\Entity\Notificacion;
use App\Repository\OfertaRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/alumno')]
class AlumnoController extends AbstractController
{
    #[Route('/account/delete', name: 'api_alumno_account_delete', methods: ['POST'])]
    public function deleteAccount(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email) {
            return $this->json(['error' => 'Email requerido'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if (!$user || !in_array('ROLE_ALUMNO', $user->getRoles())) {
            return $this->json(['error' => 'Usuario no válido'], 404);
        }

        $alumno = $user->getAlumno();
        if ($alumno) {
            $tutorCentro = $alumno->getTutorCentro();
            if ($tutorCentro) {
                $noti = new Notificacion();
                $noti->setUser($tutorCentro);
                $noti->setTipo('neutral');
                $noti->setTitle('Baja voluntaria de Alumno');
                $noti->setDescription('El alumno ' . ($user->getNombre() ?? $user->getEmail()) . ' ha desactivado su perfil y ha sido dado de baja de todas las listas.');
                $noti->setActionText('Ver asignaciones');
                $noti->setIcon('person_remove');
                $em->persist($noti);
            }

            foreach ($alumno->getCandidaturas() as $c) {
                $em->remove($c);
            }
        }
        
        $notificaciones = $em->getRepository(\App\Entity\Notificacion::class)->findBy(['user' => $user]);
        foreach ($notificaciones as $n) {
            $em->remove($n);
        }

        $em->remove($user);
        $em->flush();

        return $this->json(['status' => 'success', 'message' => 'Tu cuenta ha sido eliminada por completo.']);
    }

    #[Route('/dashboard', name: 'api_alumno_dashboard', methods: ['POST'])]
    public function dashboard(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email) {
            return $this->json(['error' => 'Email required'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);

        if (!$user) {
            return $this->json(['error' => 'Usuario no encontrado'], 404);
        }

        if (!$user->getAlumno()) {
            return $this->json(['error' => 'Perfil de alumno no encontrado'], 403);
        }

        $alumno = $user->getAlumno();
        
        // Find active candidatura
        $activeCandidatura = null;
        foreach ($alumno->getCandidaturas() as $candidatura) {
            if ($candidatura->getEstado() !== 'RECHAZADO') {
                $activeCandidatura = $candidatura;
                break;
            }
        }

        $dashboardData = [
            'nombre' => $user->getNombre(),
            'grado' => $alumno->getGrado() ? $alumno->getGrado()->getNombre() : 'Sin grado',
            'estado_practicas' => $activeCandidatura ? $activeCandidatura->getEstado() : 'Sin solicitud',
            'empresa' => $activeCandidatura && $activeCandidatura->getOferta() ? $activeCandidatura->getOferta()->getEmpresa()->getNombreComercial() : null,
            'puesto' => $activeCandidatura && $activeCandidatura->getOferta() ? $activeCandidatura->getOferta()->getTitulo() : null,
            'tutor_empresa' => $activeCandidatura && $activeCandidatura->getTutorEmpresa() ? ($activeCandidatura->getTutorEmpresa()->getNombre() ?? $activeCandidatura->getTutorEmpresa()->getEmail()) : null,
            'tutor_centro' => $activeCandidatura && $activeCandidatura->getTutorCentro() ? ($activeCandidatura->getTutorCentro()->getNombre() ?? $activeCandidatura->getTutorCentro()->getEmail()) : null,
            'fecha_inicio' => $activeCandidatura && $activeCandidatura->getFechaInicio() ? $activeCandidatura->getFechaInicio()->format('Y-m-d') : null,
            'fecha_fin' => $activeCandidatura && $activeCandidatura->getFechaFin() ? $activeCandidatura->getFechaFin()->format('Y-m-d') : null,
            'candidatura_id' => $activeCandidatura ? $activeCandidatura->getId() : null,
        ];

        return $this->json($dashboardData);
    }

    #[Route('/ofertas', name: 'api_alumno_ofertas', methods: ['GET'])]
    public function listOfertas(OfertaRepository $ofertaRepository): JsonResponse
    {
        $ofertas = $ofertaRepository->findAll(); // In a real app, filter by active/visible
        $data = [];

        foreach ($ofertas as $oferta) {
            $data[] = [
                'id' => $oferta->getId(),
                'titulo' => $oferta->getTitulo(),
                'descripcion' => $oferta->getDescripcion(),
                'empresa' => $oferta->getEmpresa()->getNombreComercial(),
                'ubicacion' => 'Granada', // Mock location if not in entity
                'fecha' => 'Reciente',
                'tags' => ['React', 'Symfony'] // Mock tags
            ];
        }

        return $this->json(['ofertas' => $data]);
    }

    #[Route('/candidaturas/apply', name: 'api_alumno_apply', methods: ['POST'])]
    public function apply(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;
        $ofertaId = $data['oferta_id'] ?? null;

        if (!$email || !$ofertaId) {
            return $this->json(['error' => 'Missing data'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if (!$user || !$user->getAlumno()) {
            return $this->json(['error' => 'Alumno not found'], 404);
        }

        $oferta = $em->getRepository(Oferta::class)->find($ofertaId);
        if (!$oferta) {
            return $this->json(['error' => 'Oferta not found'], 404);
        }

        // Check if already applied
        foreach ($user->getAlumno()->getCandidaturas() as $c) {
            if ($c->getOferta()->getId() === $oferta->getId()) {
                 return $this->json(['error' => 'Ya has aplicado a esta oferta'], 400);
            }
        }

        $candidatura = new Candidatura();
        $candidatura->setAlumno($user->getAlumno());
        $candidatura->setOferta($oferta);
        $candidatura->setEstado('POSTULADO');
        $candidatura->setTipoDuracion('1_mes'); // Default, user could choose

        $em->persist($candidatura);

        $empresa = $oferta->getEmpresa();
        if ($empresa && $empresa->getUser()) {
            $notaEmpresa = new Notificacion();
            $notaEmpresa->setUser($empresa->getUser());
            $notaEmpresa->setTipo('neutral');
            $notaEmpresa->setTitle('Nueva Candidatura');
            $notaEmpresa->setDescription(($user->getNombre() ?? $user->getEmail()) . ' ha postulado a tu oferta: ' . $oferta->getTitulo());
            $notaEmpresa->setActionText('Ver candidatos');
            $notaEmpresa->setIcon('group_add');

            $em->persist($notaEmpresa);
        }
        $em->flush();

        return $this->json(['status' => 'success', 'message' => 'Candidatura enviada']);
    }

    #[Route('/profile', name: 'api_alumno_profile_get', methods: ['POST'])]
    public function getProfile(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email) {
             return $this->json(['error' => 'Email required'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);

        if (!$user || !$user->getAlumno()) {
            return $this->json(['error' => 'Alumno not found'], 404);
        }

        $alumno = $user->getAlumno();

        return $this->json([
            'nombre' => $user->getNombre(),
            'email' => $user->getEmail(),
            'grado' => $alumno->getGrado() ? $alumno->getGrado()->getNombre() : '',
            'bio' => 'Estudiante apasionado...', // Mock or add field to Entity
            'habilidades' => $alumno->getHabilidades() ? explode(',', $alumno->getHabilidades()) : [],
            'cv' => $alumno->getCvPdf(),
            'centro' => $alumno->getCentro() ? $alumno->getCentro()->getNombre() : ''
        ]);
    }

    #[Route('/profile/update', name: 'api_alumno_profile_update', methods: ['POST'])]
    public function updateProfile(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email) {
             return $this->json(['error' => 'Email required'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);

        if (!$user || !$user->getAlumno()) {
            return $this->json(['error' => 'Alumno not found'], 404);
        }

        $alumno = $user->getAlumno();
        
        if (isset($data['habilidades'])) {
            $habilidades = is_array($data['habilidades']) ? implode(',', $data['habilidades']) : $data['habilidades'];
            $alumno->setHabilidades($habilidades);
        }

        $em->flush();

        return $this->json(['status' => 'success', 'message' => 'Perfil actualizado']);
    }

    #[Route('/profile/cv', name: 'api_alumno_profile_cv', methods: ['POST'])]
    public function uploadCv(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $email = $request->request->get('email');
        $file = $request->files->get('cv');

        if (!$email || !$file) {
            return $this->json(['error' => 'Faltan datos o archivo'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if (!$user || !$user->getAlumno()) {
            return $this->json(['error' => 'Alumno no encontrado'], 404);
        }

        $alumno = $user->getAlumno();

        // Validar formato PDF
        if ($file->getMimeType() !== 'application/pdf') {
            return $this->json(['error' => 'Solo se permiten archivos PDF'], 400);
        }

        $uploadDir = $this->getParameter('cv_uploads_directory');
        $fileName = uniqid() . '.' . $file->guessExtension();

        try {
            $file->move($uploadDir, $fileName);
            $alumno->setCvPdf($fileName);
            $em->flush();
            return $this->json([
                'status' => 'success', 
                'message' => 'Curriculum subido correctamente',
                'cv' => $fileName
            ]);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Error al guardar el archivo: ' . $e->getMessage()], 500);
        }
    }
}
