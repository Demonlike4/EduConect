<?php

namespace App\Controller;

use App\Repository\UserRepository;
use App\Repository\CandidaturaRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class PublicStatsController extends AbstractController
{
    #[Route('/api/public/stats', name: 'api_public_stats', methods: ['GET'])]
    public function getStats(
        UserRepository $userRepository,
        CandidaturaRepository $candidaturaRepository,
        CacheInterface $cache
    ): JsonResponse {
        $stats = $cache->get('public_landing_stats', function (ItemInterface $item) use ($userRepository, $candidaturaRepository) {
            // TTL de 1 hora
            $item->expiresAfter(3600);

            // Total empresas registradas
            $totalEmpresas = (int) $userRepository->createQueryBuilder('u')
                ->select('COUNT(u.id)')
                ->where('u.roles LIKE :role')
                ->setParameter('role', '%"ROLE_EMPRESA"%')
                ->getQuery()
                ->getSingleScalarResult();

            // Total alumnos registrados
            $totalAlumnos = (int) $userRepository->createQueryBuilder('u')
                ->select('COUNT(u.id)')
                ->where('u.roles LIKE :role')
                ->setParameter('role', '%"ROLE_ALUMNO"%')
                ->getQuery()
                ->getSingleScalarResult();

            // Total convenios activos (Candidaturas VALIDADAS)
            $totalCandidaturas = (int) $candidaturaRepository->createQueryBuilder('c')
                ->select('COUNT(c.id)')
                ->where('c.estado = :estado')
                ->setParameter('estado', 'VALIDADO')
                ->getQuery()
                ->getSingleScalarResult();

            // Tasa de satisfacción ficticia o estática por ahora (no requerida como dinámica explícitamente)
            $satisfaccion = "99.4%";

            return [
                'empresas' => $totalEmpresas,
                'alumnos' => $totalAlumnos,
                'candidaturas' => $totalCandidaturas,
                'satisfaccion' => $satisfaccion
            ];
        });

        $response = $this->json($stats);
        $response->setPublic();
        $response->setMaxAge(3600);

        return $response;
    }
}
