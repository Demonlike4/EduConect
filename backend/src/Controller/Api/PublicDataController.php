<?php

namespace App\Controller\Api;

use App\Repository\CentroRepository;
use App\Repository\GradoRepository;
use App\Repository\EmpresaRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/public', name: 'api_public_')]
class PublicDataController extends AbstractController
{
    #[Route('/centros', name: 'centros', methods: ['GET'])]
    public function getCentros(CentroRepository $centroRepository): JsonResponse
    {
        $centros = $centroRepository->findAll();
        $data = [];

        foreach ($centros as $centro) {
            $data[] = [
                'id' => $centro->getId(),
                'nombre' => $centro->getNombre(),
                'direccion' => $centro->getDireccion(),
            ];
        }

        return $this->json($data);
    }

    #[Route('/empresas', name: 'empresas', methods: ['GET'])]
    public function getEmpresas(EmpresaRepository $empresaRepository): JsonResponse
    {
        $empresas = $empresaRepository->findAll();
        $data = [];

        foreach ($empresas as $empresa) {
            $data[] = [
                'id' => $empresa->getId(),
                'nombre' => $empresa->getNombreComercial(),
            ];
        }

        return $this->json($data);
    }

    #[Route('/centros/{id}/grados', name: 'centro_grados', methods: ['GET'])]
    public function getGradosByCentro(int $id, CentroRepository $centroRepository): JsonResponse
    {
        $centro = $centroRepository->find($id);

        if (!$centro) {
            return $this->json(['error' => 'Centro no encontrado'], 404);
        }

        $grados = $centro->getGrados();
        $data = [];

        foreach ($grados as $grado) {
            $data[] = [
                'id' => $grado->getId(),
                'nombre' => $grado->getNombre(),
            ];
        }

        return $this->json($data);
    }
    #[Route('/centros/{id}/tutores', name: 'centro_tutores', methods: ['GET'])]
    public function getTutoresByCentro(int $id, CentroRepository $centroRepository): JsonResponse
    {
        $centro = $centroRepository->find($id);

        if (!$centro) {
            return $this->json(['error' => 'Centro no encontrado'], 404);
        }

        $tutores = [];
        // Use getTutores() instead of getUsers() as per Centro entity definition
        foreach ($centro->getTutores() as $user) {
            // Ensure the user has the correct role (though the relationship should largely enforce this, it's safer to check)
            if (in_array('ROLE_TUTOR_CENTRO', $user->getRoles())) {
                // Safely handle potential nulls if getNombre() or getApellidos() don't exist or return null
                $nombre = $user->getNombre() ?? $user->getEmail();
                $tutores[] = [
                    'id' => $user->getId(),
                    'nombre' => trim($nombre),
                ];
            }
        }

        return $this->json($tutores);
    }
}
