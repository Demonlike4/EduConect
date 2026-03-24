<?php

namespace App\Controller\Api;

use App\Entity\Notificacion;
use App\Repository\NotificacionRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/notificaciones')]
class NotificacionController extends AbstractController
{
    #[Route('', name: 'api_notificaciones_list', methods: ['POST'])]
    public function list(Request $request, UserRepository $userRepository, NotificacionRepository $notifRepository): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email) {
            return $this->json(['error' => 'Email requerido'], 400);
        }

        $user = $userRepository->findOneBy(['email' => $email]);
        if (!$user) {
            return $this->json(['error' => 'Usuario no encontrado'], 404);
        }

        $notificaciones = $notifRepository->findBy(
            ['user' => $user],
            ['createdAt' => 'DESC'],
            20 // max 20 notificaciones para no cargar demasiado
        );

        $result = [];
        foreach ($notificaciones as $n) {
            $result[] = [
                'id' => $n->getId(),
                'type' => $n->getTipo(),
                'title' => $n->getTitle(),
                'desc' => $n->getDescription(),
                'action' => $n->getActionText(),
                'icon' => $n->getIcon(),
                'leida' => $n->isLeida(),
                'date' => $n->getCreatedAt()->format('Y-m-d H:i:s'),
            ];
        }

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
