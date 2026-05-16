<?php

namespace App\Controller\Api;

use App\Entity\Notificacion;
use App\Repository\NotificacionRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/notificaciones')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class NotificacionController extends AbstractController
{
    #[Route('', name: 'api_notificaciones_list', methods: ['GET', 'POST'])]
    public function list(NotificacionRepository $notifRepository): JsonResponse
    {
        $user = $this->getUser();

        if (!$user) {
            return $this->json(['error' => 'Usuario no autenticado'], 401);
        }

        $notificaciones = $notifRepository->findBy(
            ['user' => $user],
            ['createdAt' => 'DESC'],
            20
        );

        $result = array_map(fn($n) => [
            'id' => $n->getId(),
            'type' => $n->getTipo(),
            'title' => $n->getTitle(),
            'desc' => $n->getDescription(),
            'action' => $n->getActionText(),
            'icon' => $n->getIcon(),
            'leida' => $n->isLeida(),
            'date' => $n->getCreatedAt()->format('Y-m-d H:i:s'),
        ], $notificaciones);

        return $this->json(['notificaciones' => $result]);
    }

    #[Route('/{id}/read', name: 'api_notificaciones_read', methods: ['POST'])]
    public function markAsRead(int $id, NotificacionRepository $notifRepository, EntityManagerInterface $em): JsonResponse
    {
        $notificacion = $notifRepository->find($id);

        if (!$notificacion) {
            return $this->json(['error' => 'Notificacion no encontrada'], 404);
        }

        $notificacion->setLeida(true);
        $em->flush();

        return $this->json(['success' => true]);
    }
}
