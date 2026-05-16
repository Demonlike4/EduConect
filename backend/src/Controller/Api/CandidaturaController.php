<?php

namespace App\Controller\Api;

use App\Entity\Candidatura;
use App\Repository\UserRepository;
use App\Service\CandidaturaManager;
use Doctrine\ORM\EntityManagerInterface;
use Dompdf\Dompdf;
use Dompdf\Options;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

#[Route('/api/candidatura')]
class CandidaturaController extends AbstractController
{
    #[Route('/{id}/admitir', name: 'api_candidatura_admitir', methods: ['POST'])]
    #[IsGranted('ROLE_EMPRESA')]
    public function admitir(Candidatura $candidatura, CandidaturaManager $manager): JsonResponse
    {
        if ($candidatura->getEstado() === 'ADMITIDO' || $candidatura->getEstado() === 'VALIDADO') {
            return new JsonResponse(['message' => 'La candidatura ya está admitida', 'estado' => $candidatura->getEstado()]);
        }

        if ($candidatura->getEstado() !== 'POSTULADO') {
            return new JsonResponse(['error' => 'La candidatura no se puede admitir desde el estado ' . $candidatura->getEstado()], 400);
        }

        try {
            $manager->admitirAlumno($candidatura);
            
            return new JsonResponse([
                'message' => 'Candidatura admitida correctamente',
                'estado' => $candidatura->getEstado(),
                'tutor_centro' => $candidatura->getTutorCentro() ? $candidatura->getTutorCentro()->getEmail() : 'Pendiente',
                'tutor_empresa' => $candidatura->getTutorEmpresa() ? $candidatura->getTutorEmpresa()->getEmail() : 'Pendiente'
            ]);
        } catch (\Exception $e) {
            return new JsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    #[Route('/{id}/validar', name: 'api_candidatura_validar', methods: ['POST'])]
    #[IsGranted('ROLE_TUTOR_CENTRO')]
    public function validar(Request $request, Candidatura $candidatura, EntityManagerInterface $em, CandidaturaManager $manager): JsonResponse
    {
        if ($candidatura->getEstado() === 'VALIDADO') {
            return new JsonResponse(['message' => 'La candidatura ya está validada', 'estado' => $candidatura->getEstado()]);
        }

        if ($candidatura->getEstado() !== 'ADMITIDO') {
            return new JsonResponse(['error' => 'La candidatura debe estar ADMITIDA para ser validada. Estado actual: ' . $candidatura->getEstado()], 400);
        }

        $data = json_decode($request->getContent(), true);
        
        // Expected data: fechaInicio (Y-m-d), fechaFin (Y-m-d), tipoDuracion
        $fechaInicioStr = $data['fechaInicio'] ?? null;
        $fechaFinStr = $data['fechaFin'] ?? null;
        $tipoDuracion = $data['tipoDuracion'] ?? null;

        if (!$fechaInicioStr || !$fechaFinStr || !$tipoDuracion) {
            return new JsonResponse(['error' => 'Faltan datos obligatorios (fechaInicio, fechaFin, tipoDuracion)'], 400);
        }

        if ($fechaFin <= $fechaInicio) {
            return new JsonResponse(['error' => 'La fecha de fin debe ser posterior a la fecha de inicio'], 400);
        }

        try {
            $em->beginTransaction();
            
            $candidatura->setFechaInicio($fechaInicio);
            $candidatura->setFechaFin($fechaFin);
            $candidatura->setTipoDuracion($tipoDuracion);
            $candidatura->setEstado('VALIDADO');

            // ENABLE CHATS when convenio is validated
            $manager->createChatsForCandidatura($candidatura);

            $em->flush();
            $em->commit();

            return new JsonResponse(['message' => 'Candidatura validada correctamente', 'estado' => $candidatura->getEstado()]);
        } catch (\Exception $e) {
            $em->rollback();
            return new JsonResponse(['error' => 'Error al validar la candidatura: ' . $e->getMessage()], 500);
        }
    }

    #[Route('/{id}/seguimiento', name: 'api_candidatura_seguimiento', methods: ['GET'])]
    public function seguimiento(Candidatura $candidatura): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof \App\Entity\User) {
            throw new AccessDeniedException("Usuario no autenticado");
        }

        // Seguridad: Solo los participantes de la candidatura pueden ver el seguimiento
        $isAlumno = $candidatura->getAlumno()->getUser()->getId() === $user->getId();
        $isTutorEmpresa = $candidatura->getTutorEmpresa() && $candidatura->getTutorEmpresa()->getId() === $user->getId();
        $isTutorCentro = $candidatura->getTutorCentro() && $candidatura->getTutorCentro()->getId() === $user->getId();

        if (!$isAlumno && !$isTutorEmpresa && !$isTutorCentro) {
            throw new AccessDeniedException("No tienes permiso para ver el seguimiento de esta candidatura");
        }

        if ($candidatura->getEstado() !== 'VALIDADO') {
            return new JsonResponse(['error' => 'La candidatura no está validada'], 400);
        }

        $start = $candidatura->getFechaInicio();
        $end = $candidatura->getFechaFin();
        $now = new \DateTime();

        $totalDays = (int) $end->diff($start)->format('%a');
        $daysPassed = (int) $now->diff($start)->format('%a');
        
        if ($now < $start) {
            $daysPassed = 0;
        } elseif ($now > $end) {
            $daysPassed = $totalDays;
        }

        $percentage = $totalDays > 0 ? min(100, round(($daysPassed / $totalDays) * 100)) : 0;

        return new JsonResponse([
            'id' => $candidatura->getId(),
            'alumno' => $candidatura->getAlumno()->getUser()->getNombre() ?? $candidatura->getAlumno()->getUser()->getEmail(),
            'empresa' => $candidatura->getOferta()->getEmpresa()->getNombreComercial(),
            'fecha_inicio' => $start->format('Y-m-d'),
            'fecha_fin' => $end->format('Y-m-d'),
            'total_dias' => $totalDays,
            'dias_pasados' => $daysPassed,
            'porcentaje_progreso' => $percentage
        ]);
    }

    #[Route('/{id}/convenio', name: 'api_candidatura_convenio', methods: ['GET'])]
    public function generarConvenio(Candidatura $candidatura, CandidaturaManager $manager): Response
    {
        $user = $this->getUser();
        if (!$user instanceof \App\Entity\User) {
            throw new AccessDeniedException("Usuario no autenticado");
        }

        // Seguridad: Solo los participantes pueden generar el convenio
        $isAlumno = $candidatura->getAlumno()->getUser()->getId() === $user->getId();
        $isTutorEmpresa = $candidatura->getTutorEmpresa() && $candidatura->getTutorEmpresa()->getId() === $user->getId();
        $isTutorCentro = $candidatura->getTutorCentro() && $candidatura->getTutorCentro()->getId() === $user->getId();

        if (!$isAlumno && !$isTutorEmpresa && !$isTutorCentro) {
            throw new AccessDeniedException("No tienes permiso para generar este documento");
        }

        // Configure Dompdf
        $pdfOptions = new Options();
        $pdfOptions->set('defaultFont', 'Arial');
        $pdfOptions->set('isRemoteEnabled', true); // Necesario para cargar logos e imágenes externas
        $dompdf = new Dompdf($pdfOptions);

        $html = $manager->generateConvenioHtml($candidatura);

        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return new Response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="convenio_'.$candidatura->getId().'.pdf"',
        ]);
    }
}
