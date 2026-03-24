<?php

namespace App\Controller\Api;

use App\Entity\Chat;
use App\Entity\ChatMessage;
use App\Entity\User;
use App\Repository\ChatRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/chat')]
class ChatController extends AbstractController
{
    #[Route('/list', name: 'api_chat_list', methods: ['POST'])]
    public function listChats(Request $request, EntityManagerInterface $em): JsonResponse
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

        // Fetch chats where user is participant
        $qb = $em->getRepository(Chat::class)->createQueryBuilder('c');
        $qb->join('c.participantes', 'p')
           ->where('p.id = :userId')
           ->setParameter('userId', $user->getId());
        
        $chats = $qb->getQuery()->getResult();

        $chatsData = array_map(function(Chat $chat) {
            return [
                'id' => $chat->getId(),
                'nombre' => $chat->getNombre(),
                'candidatura_id' => $chat->getCandidatura()->getId(),
                'empresa' => $chat->getCandidatura()->getOferta()->getEmpresa()->getNombreComercial(),
                'participantes' => array_map(fn(User $u) => $u->getNombre() ?? $u->getEmail(), $chat->getParticipantes()->toArray())
            ];
        }, $chats);

        return $this->json($chatsData);
    }

    #[Route('/{id}/messages', name: 'api_chat_messages', methods: ['GET'])]
    public function getMessages(int $id, EntityManagerInterface $em): JsonResponse
    {
        $chat = $em->getRepository(Chat::class)->find($id);
        if (!$chat) {
            return $this->json(['error' => 'Chat not found'], 404);
        }

        $messages = $chat->getMessages();
        $messagesData = array_map(function(ChatMessage $msg) {
            return [
                'id' => $msg->getId(),
                'remitente' => $msg->getRemitente()->getNombre(),
                'remitente_email' => $msg->getRemitente()->getEmail(),
                'contenido' => $msg->getContenido(),
                'fecha' => $msg->getFechaEnvio()->format('c')
            ];
        }, $messages->toArray());

        return $this->json($messagesData);
    }

    #[Route('/{id}/send', name: 'api_chat_send', methods: ['POST'])]
    public function sendMessage(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $chat = $em->getRepository(Chat::class)->find($id);
        $email = $data['email'] ?? null;
        $contenido = $data['contenido'] ?? null;

        if (!$chat || !$email || !$contenido) {
            return $this->json(['error' => 'Missing data'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        $message = new ChatMessage();
        $message->setChat($chat);
        $message->setRemitente($user);
        $message->setContenido($contenido);

        $em->persist($message);
        $em->flush();

        return $this->json(['status' => 'success']);
    }
}
