<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Entity\Candidatura;
use App\Repository\UserRepository;
use App\Service\CandidaturaManager;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class TutorEmpresaController extends AbstractController
{
    #[Route('/api/tutor-empresa/dashboard', name: 'api_tutor_empresa_dashboard', methods: ['POST'])]
    public function getDashboard(Request $request, UserRepository $userRepository): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email) {
            return $this->json(['error' => 'Email required'], 400);
        }

        $user = $userRepository->findOneBy(['email' => $email]);

        if (!$user || !in_array('ROLE_TUTOR_EMPRESA', $user->getRoles())) {
            return $this->json(['error' => 'Tutor not found'], 404);
        }

        $candidaturas = $user->getCandidaturasTutorEmpresa();
        $alumnos = [];

        foreach ($candidaturas as $candidatura) {
            $alumno = $candidatura->getAlumno();
            $userAlumno = $alumno->getUser();
            
            $alumnos[] = [
                'id' => $alumno->getId(),
                'nombre' => $userAlumno->getNombre() ?? 'Sin nombre',
                'email' => $userAlumno->getEmail(),
                'foto' => $alumno->getFoto(),
                'grado' => $alumno->getGrado() ? $alumno->getGrado()->getNombre() : 'Sin grado',
                'centro' => $alumno->getCentro() ? $alumno->getCentro()->getNombre() : 'Sin centro',
                'candidatura' => [
                    'id' => $candidatura->getId(),
                    'estado' => $candidatura->getEstado(),
                    'fechaInicio' => $candidatura->getFechaInicio()?->format('Y-m-d'),
                    'fechaFin' => $candidatura->getFechaFin()?->format('Y-m-d'),
                    'horario' => $candidatura->getHorario(),
                    'tipoDuracion' => $candidatura->getTipoDuracion(),
                ]
            ];
        }

        return $this->json([
            'alumnos' => $alumnos
        ]);
    }

    #[Route('/api/tutor-empresa/candidaturas/{id}/firmar', name: 'api_tutor_empresa_firmar', methods: ['POST'])]
    public function firmarConvenio(int $id, Request $request, EntityManagerInterface $em, CandidaturaManager $manager): JsonResponse
    {
        $candidatura = $em->getRepository(Candidatura::class)->find($id);

        if (!$candidatura) {
            return $this->json(['error' => 'Candidatura not found'], 404);
        }

        if ($candidatura->getEstado() !== 'PENDIENTE_FIRMA_EMPRESA') {
            return $this->json(['error' => 'La candidatura no está lista para ser firmada por la empresa (Estado actual: ' . $candidatura->getEstado() . ')'], 400);
        }

        $data = json_decode($request->getContent(), true);
        $firma = $data['firma'] ?? null;

        if (!$firma) {
            return $this->json(['error' => 'La firma es obligatoria'], 400);
        }

        try {
            $manager->validarPorEmpresa($candidatura, $firma);
            return $this->json(['status' => 'success', 'message' => 'Convenio firmado correctamente. El proceso ha finalizado.']);
        } catch (\Exception $e) {
            return $this->json(['error' => $e->getMessage()], 500);
        }
    }
}
