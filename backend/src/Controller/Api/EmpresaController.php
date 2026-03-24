<?php

namespace App\Controller\Api;

use App\Entity\Oferta;
use App\Entity\Candidatura;
use App\Entity\Empresa;
use App\Entity\User;
use App\Entity\Notificacion;
use App\Service\CandidaturaManager;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/empresa')]
class EmpresaController extends AbstractController
{
    #[Route('/ofertas', name: 'api_empresa_ofertas_list', methods: ['POST'])]
    public function listOfertas(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email) {
            return $this->json(['error' => 'Email required'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        
        if (!$user) {
             return $this->json(['error' => 'User not found'], 404);
        }
        
        $empresa = $user->getEmpresa();

        if (!$empresa) {
            // It might be that the user has ROLE_EMPRESA but no associated Empresa entity yet (unlikely if registered correctly)
             return $this->json(['error' => 'Empresa profile not found'], 404);
        }

        $ofertas = $empresa->getOfertas();
        $ofertasData = [];

        foreach ($ofertas as $oferta) {
            $ofertasData[] = [
                'id' => $oferta->getId(),
                'titulo' => $oferta->getTitulo(),
                'descripcion' => $oferta->getDescripcion(),
                'tipo' => $oferta->getTipo(),
                'tecnologias' => $oferta->getTecnologias(),
                'ubicacion' => $oferta->getUbicacion(),
                'jornada' => $oferta->getJornada(),
                'estado' => $oferta->getEstado(),
                'candidatos' => $oferta->getCandidaturas()->count(),
                'fecha' => 'Reciente'
            ];
        }

        return $this->json(['ofertas' => $ofertasData, 'empresa' => $empresa->getNombreComercial()]);
    }

    #[Route('/ofertas/create', name: 'api_empresa_ofertas_create', methods: ['POST'])]
    public function createOferta(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;
        
        if (!$email) {
            return $this->json(['error' => 'Email required'], 400);
        }
        
        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
         
        if (!$user || !$user->getEmpresa()) {
             return $this->json(['error' => 'Empresa not found'], 404);
        }
         
        $oferta = new Oferta();
        $oferta->setTitulo($data['titulo'] ?? 'Sin título');
        $oferta->setDescripcion($data['descripcion'] ?? 'Sin descripción');
        $oferta->setTipo($data['tipo'] ?? 'Prácticas');
        $oferta->setTecnologias($data['tecnologias'] ?? '');
        $oferta->setUbicacion($data['ubicacion'] ?? 'No especificada');
        $oferta->setJornada($data['jornada'] ?? 'Completa');
        $oferta->setEstado('Activa');
        $oferta->setEmpresa($user->getEmpresa());
         
        $em->persist($oferta);
        $em->flush();
         
        return $this->json(['status' => 'success', 'id' => $oferta->getId()], 201);
    }

    #[Route('/candidatos', name: 'api_empresa_candidatos', methods: ['POST'])]
    public function getCandidatos(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email) {
            return $this->json(['error' => 'Email required'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        
        if (!$user || !$user->getEmpresa()) {
             return $this->json(['error' => 'Empresa not found'], 404);
        }

        $empresa = $user->getEmpresa();
        $candidatesData = [];

        foreach ($empresa->getOfertas() as $oferta) {
            foreach ($oferta->getCandidaturas() as $candidatura) {
                $alumnoObj = $candidatura->getAlumno();
                $alumnoUser = $alumnoObj->getUser();
                
                $candidatesData[] = [
                    'id' => $candidatura->getId(),
                    'nombre' => $alumnoUser->getNombre() ?? $alumnoUser->getEmail(),
                    'email' => $alumnoUser->getEmail(),
                    'puesto' => $oferta->getTitulo(),
                    'fecha' => 'N/A', 
                    'estado' => $candidatura->getEstado(),
                    'habilidades' => $alumnoObj->getHabilidades(),
                    'cv' => $alumnoObj->getCvPdf(),
                    'centro' => $alumnoObj->getCentro() ? $alumnoObj->getCentro()->getNombre() : 'No asignado',
                    'grado' => $alumnoObj->getGrado() ? $alumnoObj->getGrado()->getNombre() : 'No asignado',
                    'fecha_inicio' => $candidatura->getFechaInicio() ? $candidatura->getFechaInicio()->format('Y-m-d') : null,
                    'fecha_fin' => $candidatura->getFechaFin() ? $candidatura->getFechaFin()->format('Y-m-d') : null,
                    'tutor_empresa' => $candidatura->getTutorEmpresa() ? ($candidatura->getTutorEmpresa()->getNombre() ?? $candidatura->getTutorEmpresa()->getEmail()) : null,
                    'tutor_centro' => $candidatura->getTutorCentro() ? ($candidatura->getTutorCentro()->getNombre() ?? $candidatura->getTutorCentro()->getEmail()) : null,
                ];
            }
        }

        return $this->json(['candidatos' => $candidatesData]);
    }

    #[Route('/candidatos/action', name: 'api_empresa_candidatos_action', methods: ['POST'])]
    public function actionCandidato(Request $request, EntityManagerInterface $em, CandidaturaManager $manager): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $id = $data['candidatura_id'] ?? null;
        $action = $data['action'] ?? null;

        if (!$id || !$action) {
            return $this->json(['error' => 'Missing data'], 400);
        }

        $candidatura = $em->getRepository(Candidatura::class)->find($id);
        if (!$candidatura) {
            return $this->json(['error' => 'Candidatura not found'], 404);
        }

        if ($action === 'ADMITIDO') {
            $candidatura->setTipoDuracion($data['tipoDuracion'] ?? '1_mes');
            $candidatura->setHorario($data['horario'] ?? 'manana');
            
            // By admitting, we assign random tutors (logic should be in manager)
            $manager->admitirAlumno($candidatura);
        } elseif ($action === 'RECHAZADO') {
            $candidatura->setEstado('RECHAZADO');
            
            // Notify Alumno
            $alumnoUser = $candidatura->getAlumno() ? $candidatura->getAlumno()->getUser() : null;
            if ($alumnoUser) {
                $noti = new Notificacion();
                $noti->setUser($alumnoUser);
                $noti->setTipo('danger');
                $noti->setTitle('Candidatura Rechazada');
                $noti->setDescription('Lamentablemente tu candidatura para la oferta "' . $candidatura->getOferta()->getTitulo() . '" ha sido descartada.');
                $noti->setActionText('Ver ofertas');
                $noti->setIcon('cancel');
                $em->persist($noti);
            }
            
            $em->flush();
        }

        return $this->json(['status' => 'success']);
    }

    #[Route('/candidaturas/{id}/aprobar', name: 'api_empresa_aprobar_candidatura', methods: ['POST'])]
    public function aprobarCandidatura(int $id, EntityManagerInterface $em, CandidaturaManager $manager): JsonResponse
    {
        $candidatura = $em->getRepository(Candidatura::class)->find($id);

        if (!$candidatura) {
            return $this->json(['error' => 'Candidatura not found'], 404);
        }

        try {
            $manager->admitirAlumno($candidatura);
            return $this->json(['status' => 'success', 'message' => 'Candidato admitido y tutores asignados']);
        } catch (\Exception $e) {
            return $this->json(['error' => $e->getMessage()], 500);
        }
    }

    #[Route('/tutores/list', name: 'api_empresa_tutores_list', methods: ['POST'])]
    public function getTutoresEmpresa(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email) return $this->json(['error' => 'Email required'], 400);

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if (!$user || !$user->getEmpresa()) return $this->json(['error' => 'Empresa not found'], 404);

        $empresa = $user->getEmpresa();
        
        $tutores = $em->getRepository(User::class)->findBy([
            'empresaLaboral' => $empresa
        ]);

        $tutoresData = [];
        foreach ($tutores as $t) {
            // Only include users with ROLE_TUTOR_EMPRESA
            if (in_array('ROLE_TUTOR_EMPRESA', $t->getRoles())) {
                $tutoresData[] = [
                    'id' => $t->getId(),
                    'nombre' => $t->getNombre(),
                    'email' => $t->getEmail(),
                    'isAprobado' => $t->isAprobado()
                ];
            }
        }

        return $this->json(['tutores' => $tutoresData]);
    }

    #[Route('/tutores/{id}/aprobar', name: 'api_empresa_aprobar_tutor', methods: ['POST'])]
    public function aprobarTutor(int $id, EntityManagerInterface $em): JsonResponse
    {
        $tutor = $em->getRepository(User::class)->find($id);

        if (!$tutor) {
            return $this->json(['error' => 'Tutor not found'], 404);
        }

        $tutor->setIsAprobado(true);
        
        $notiTutor = new Notificacion();
        $notiTutor->setUser($tutor);
        $notiTutor->setTipo('success');
        $notiTutor->setTitle('Cuenta Aprobada');
        $notiTutor->setDescription('La empresa ha verificado y activado tu cuenta como tutor corporativo. Ya puedes acceder.');
        $notiTutor->setActionText('Ir al inicio');
        $notiTutor->setIcon('verified_user');
        $em->persist($notiTutor);

        $em->flush();

        return $this->json(['status' => 'success', 'message' => 'Tutor aprobado correctamente']);
    }
}
