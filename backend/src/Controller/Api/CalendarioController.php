<?php

namespace App\Controller\Api;

use App\Entity\Candidatura;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/calendario')]
class CalendarioController extends AbstractController
{
    #[Route('/dias-practicas/{id}', name: 'api_calendario_dias', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function obtenerDiasPracticas(Candidatura $candidatura): JsonResponse
    {
        // Calculate days between start and end
        $fechaInicio = $candidatura->getFechaInicio();
        $fechaFin = $candidatura->getFechaFin();

        if (!$fechaInicio || !$fechaFin) {
            return $this->json(['error' => 'Fechas no definidas'], 400);
        }

        $interval = $fechaInicio->diff($fechaFin);
        $days = $interval->days; // Total calendar days

        return $this->json([
            'fecha_inicio' => $fechaInicio->format('Y-m-d'),
            'fecha_fin' => $fechaFin->format('Y-m-d'),
            'dias_totales' => $days,
            // Assuming business days logic for frontend calendar filling
        ]);
    }

    #[Route('/progreso/{id}', name: 'api_calendario_progreso', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function obtenerProgreso(Candidatura $candidatura): JsonResponse
    {
        $fechaInicio = $candidatura->getFechaInicio();
        $fechaFin = $candidatura->getFechaFin();

        if (!$fechaInicio || !$fechaFin) {
             return $this->json(['porcentaje' => 0, 'mensaje' => 'Fechas no definidas']);
        }

        $hoy = new \DateTime();
        
        // If not started yet
        if ($hoy < $fechaInicio) {
            return $this->json(['porcentaje' => 0, 'estado' => 'No iniciado']);
        }

        // If finished
        if ($hoy > $fechaFin) {
            return $this->json(['porcentaje' => 100, 'estado' => 'Finalizado']);
        }

        // Calculate progress
        $totalDias = $fechaInicio->diff($fechaFin)->days;
        $diasTranscurridos = $fechaInicio->diff($hoy)->days;

        if ($totalDias == 0) {
            return $this->json(['porcentaje' => 100]); // Edge case same day start/end
        }

        $porcentaje = ($diasTranscurridos / $totalDias) * 100;

        return $this->json([
            'porcentaje' => round($porcentaje, 2),
            'dias_transcurridos' => $diasTranscurridos,
            'dias_totales' => $totalDias
        ]);
    }
}
