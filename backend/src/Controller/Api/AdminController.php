<?php

namespace App\Controller\Api;

use App\Entity\Centro;
use App\Entity\Grado;
use App\Entity\User;
use App\Entity\Notificacion;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/admin')]
class AdminController extends AbstractController
{
    #[Route('/tutores/pending', name: 'api_admin_tutores_pending', methods: ['GET'])]
    public function getPendingCentros(EntityManagerInterface $em): JsonResponse
    {
        $tutores = $em->getRepository(User::class)->findBy(['isAprobado' => false]);
        $data = [];
        
        foreach ($tutores as $t) {
            if (in_array('ROLE_TUTOR_CENTRO', $t->getRoles())) {
                $data[] = [
                    'id' => $t->getId(),
                    'nombre' => $t->getNombre() ?? $t->getEmail(),
                    'email' => $t->getEmail(),
                    'centro' => $t->getCentroEducativo() ? $t->getCentroEducativo()->getNombre() : 'Sin centro'
                ];
            }
        }
        
        return $this->json(['tutores' => $data]);
    }

    #[Route('/tutores/{id}/approve', name: 'api_admin_approve_tutor', methods: ['POST'])]
    public function approveTutorCentro(int $id, EntityManagerInterface $em): JsonResponse
    {
        $tutor = $em->getRepository(User::class)->find($id);
        
        if (!$tutor || !in_array('ROLE_TUTOR_CENTRO', $tutor->getRoles())) {
            return $this->json(['error' => 'Tutor de centro no encontrado'], 404);
        }
        
        $tutor->setIsAprobado(true);

        $noti = new Notificacion();
        $noti->setUser($tutor);
        $noti->setTipo('success');
        $noti->setTitle('Cuenta de Institución Validada');
        $noti->setDescription('El SuperAdministrador ha validado tu identidad como responsable de tu centro educativo. Ya puedes acceder.');
        $noti->setActionText('Entrar ahora');
        $noti->setIcon('verified_user');
        $em->persist($noti);

        $em->flush();
        
        return $this->json(['status' => 'success']);
    }

    #[Route('/grados/create', name: 'api_admin_create_grado', methods: ['POST'])]
    public function createGrado(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (empty($data['nombre'])) {
            return $this->json(['error' => 'Nombre es requerido'], 400);
        }
        
        $grado = new Grado();
        $grado->setNombre($data['nombre']);
        $em->persist($grado);

        if (!empty($data['centroId'])) {
            $centro = $em->getRepository(Centro::class)->find($data['centroId']);
            if ($centro) {
                $centro->addGrado($grado);
            }
        }
        
        $em->flush();
        
        return $this->json(['status' => 'success', 'grado' => ['id' => $grado->getId(), 'nombre' => $grado->getNombre()]]);
    }

    #[Route('/centros/create', name: 'api_admin_create_centro', methods: ['POST'])]
    public function createCentro(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (empty($data['nombre'])) {
            return $this->json(['error' => 'Nombre es requerido'], 400);
        }
        
        $centro = new Centro();
        $centro->setNombre($data['nombre']);
        $centro->setDireccion($data['direccion'] ?? '');
        
        $em->persist($centro);
        $em->flush();
        
        return $this->json(['status' => 'success', 'centro' => ['id' => $centro->getId(), 'nombre' => $centro->getNombre()]]);
    }

    #[Route('/centros/full', name: 'api_admin_centros_full', methods: ['GET'])]
    public function getCentrosFull(EntityManagerInterface $em): JsonResponse
    {
        $centros = $em->getRepository(Centro::class)->findAll();
        $data = [];
        foreach ($centros as $centro) {
            $gradosData = [];
            foreach ($centro->getGrados() as $grado) {
                $gradosData[] = ['id' => $grado->getId(), 'nombre' => $grado->getNombre()];
            }
            $data[] = [
                'id' => $centro->getId(),
                'nombre' => $centro->getNombre(),
                'grados' => $gradosData
            ];
        }
        return $this->json($data);
    }

    #[Route('/centros/{id}', name: 'api_admin_update_centro', methods: ['PUT'])]
    public function updateCentro(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $centro = $em->getRepository(Centro::class)->find($id);
        if (!$centro) return $this->json(['error' => 'No encontrado'], 404);
        
        $data = json_decode($request->getContent(), true);
        if (!empty($data['nombre'])) $centro->setNombre($data['nombre']);
        $em->flush();
        return $this->json(['status' => 'success']);
    }

    #[Route('/centros/{id}', name: 'api_admin_delete_centro', methods: ['DELETE'])]
    public function deleteCentro(int $id, EntityManagerInterface $em): JsonResponse
    {
        $centro = $em->getRepository(Centro::class)->find($id);
        if (!$centro) return $this->json(['error' => 'No encontrado'], 404);
        
        try {
            $em->remove($centro);
            $em->flush();
            return $this->json(['status' => 'success']);
        } catch (\Exception $e) {
            return $this->json(['error' => 'No se puede eliminar este centro (asegúrate de que no tenga grados o alumnos asignados).'], 400);
        }
    }

    #[Route('/grados/{id}', name: 'api_admin_update_grado', methods: ['PUT'])]
    public function updateGrado(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $grado = $em->getRepository(Grado::class)->find($id);
        if (!$grado) return $this->json(['error' => 'No encontrado'], 404);
        
        $data = json_decode($request->getContent(), true);
        if (!empty($data['nombre'])) $grado->setNombre($data['nombre']);
        $em->flush();
        return $this->json(['status' => 'success']);
    }

    #[Route('/grados/{id}', name: 'api_admin_delete_grado', methods: ['DELETE'])]
    public function deleteGrado(int $id, EntityManagerInterface $em): JsonResponse
    {
        $grado = $em->getRepository(Grado::class)->find($id);
        if (!$grado) return $this->json(['error' => 'No encontrado'], 404);
        
        try {
            $em->remove($grado);
            $em->flush();
            return $this->json(['status' => 'success']);
        } catch (\Exception $e) {
            return $this->json(['error' => 'No se puede eliminar este grado porque contiene alumnos asociados.'], 400);
        }
    }
}
