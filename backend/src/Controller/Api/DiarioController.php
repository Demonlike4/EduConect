<?php

namespace App\Controller\Api;

use App\Entity\Candidatura;
use App\Entity\DiarioActividad;
use App\Entity\User;
use App\Entity\Notificacion;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/diario')]
class DiarioController extends AbstractController
{
    #[Route('/alumno/list', name: 'api_diario_alumno_list', methods: ['POST'])]
    public function listAlumno(Request $request, EntityManagerInterface $em): JsonResponse
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
        $activeCandidatura = null;
        foreach ($alumno->getCandidaturas() as $c) {
            if ($c->getEstado() === 'VALIDADO') {
                $activeCandidatura = $c;
                break;
            }
        }

        if (!$activeCandidatura) {
            return $this->json(['error' => 'No tienes prácticas validadas activas'], 403);
        }

        $actividades = $activeCandidatura->getActividadesDiarias();
        $dataActividades = [];
        $totalHoras = 0;

        foreach ($actividades as $act) {
            $dataActividades[] = [
                'id' => $act->getId(),
                'fecha' => $act->getFecha()->format('Y-m-d'),
                'actividad' => $act->getActividad(),
                'horas' => $act->getHoras(),
                'estado' => $act->getEstado(),
                'observaciones' => $act->getObservacionesTutor(),
            ];
            if ($act->getEstado() === 'APROBADO') {
                $totalHoras += $act->getHoras();
            }
        }

        return $this->json([
            'candidatura_id' => $activeCandidatura->getId(),
            'actividades' => array_reverse($dataActividades),
            'totalHoras' => $totalHoras,
            'objetivoHoras' => 370
        ]);
    }

    #[Route('/alumno/create', name: 'api_diario_alumno_create', methods: ['POST'])]
    public function createAlumno(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;
        $fecha = $data['fecha'] ?? null;
        $actividadDesc = $data['actividad'] ?? null;
        $horas = $data['horas'] ?? null;

        if (!$email || !$fecha || !$actividadDesc || !$horas) {
            return $this->json(['error' => 'Faltan datos'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if (!$user || !$user->getAlumno()) {
            return $this->json(['error' => 'Alumno not found'], 404);
        }

        $alumno = $user->getAlumno();
        $activeCandidatura = null;
        foreach ($alumno->getCandidaturas() as $c) {
            if ($c->getEstado() === 'VALIDADO') {
                $activeCandidatura = $c;
                break;
            }
        }

        if (!$activeCandidatura) {
            return $this->json(['error' => 'No tienes prácticas validadas'], 403);
        }

        $diario = new DiarioActividad();
        $diario->setCandidatura($activeCandidatura);
        $diario->setFecha(new \DateTime($fecha));
        $diario->setActividad($actividadDesc);
        $diario->setHoras((float)$horas);
        $diario->setEstado('PENDIENTE');

        $em->persist($diario);
        
        // Notify Tutor Empresa or Empresa
        $tutorEmpresa = $activeCandidatura->getTutorEmpresa();
        $empresaGestor = $activeCandidatura->getOferta() ? $activeCandidatura->getOferta()->getEmpresa()->getUser() : null;
        
        $receptor = $tutorEmpresa ?? $empresaGestor;

        if ($receptor) {
            $noti = new Notificacion();
            $noti->setUser($receptor);
            $noti->setTipo('neutral');
            $noti->setTitle('Nueva Hoja de Diario');
            $noti->setDescription('El alumno ' . ($user->getNombre() ?? $user->getEmail()) . ' ha guardado una nueva actividad del día ' . $fecha . ' y espera tu revisión.');
            $noti->setActionText('Revisar Diario');
            $noti->setIcon('auto_stories');
            $em->persist($noti);
        }

        $em->flush();

        return $this->json(['status' => 'success', 'id' => $diario->getId()]);
    }

    #[Route('/tutor/candidatura/{id}', name: 'api_diario_tutor_list', methods: ['GET'])]
    public function listTutor(int $id, EntityManagerInterface $em): JsonResponse
    {
        $candidatura = $em->getRepository(Candidatura::class)->find($id);
        if (!$candidatura) {
            return $this->json(['error' => 'Candidatura not found'], 404);
        }

        $actividades = $candidatura->getActividadesDiarias();
        $dataActividades = [];
        $totalAprobadas = 0;

        foreach ($actividades as $act) {
            $dataActividades[] = [
                'id' => $act->getId(),
                'fecha' => $act->getFecha()->format('Y-m-d'),
                'actividad' => $act->getActividad(),
                'horas' => $act->getHoras(),
                'estado' => $act->getEstado(),
                'observaciones' => $act->getObservacionesTutor(),
            ];
            if ($act->getEstado() === 'APROBADO') {
                $totalAprobadas += $act->getHoras();
            }
        }

        return $this->json([
            'actividades' => array_reverse($dataActividades),
            'totalAprobadas' => $totalAprobadas
        ]);
    }

    #[Route('/tutor/validar/{id}', name: 'api_diario_tutor_validar', methods: ['POST'])]
    public function validarTutor(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $estado = $data['estado'] ?? null; // APROBADO, RECHAZADO
        $observaciones = $data['observaciones'] ?? null;

        if (!$estado || !in_array($estado, ['APROBADO', 'RECHAZADO'])) {
            return $this->json(['error' => 'Estado no válido'], 400);
        }

        $diario = $em->getRepository(DiarioActividad::class)->find($id);
        if (!$diario) {
            return $this->json(['error' => 'Entrada no encontrada'], 404);
        }

        $diario->setEstado($estado);
        $diario->setObservacionesTutor($observaciones);

        // Notify Alumno
        $alumnoUser = $diario->getCandidatura() && $diario->getCandidatura()->getAlumno() ? $diario->getCandidatura()->getAlumno()->getUser() : null;
        if ($alumnoUser) {
            $noti = new Notificacion();
            $noti->setUser($alumnoUser);
            $noti->setTipo($estado === 'APROBADO' ? 'success' : 'danger');
            $noti->setTitle('Diario Evaluado');
            $noti->setDescription('Tu tutor de empresa ha ' . ($estado === 'APROBADO' ? 'aprobado' : 'rechazado') . ' tu actividad del día ' . $diario->getFecha()->format('d/m/Y') . '.');
            $noti->setActionText('Ver Diario');
            $noti->setIcon('fact_check');
            $em->persist($noti);
        }

        $em->flush();

        return $this->json(['status' => 'success']);
    }
}
