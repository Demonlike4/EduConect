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

        $chatsData = array_map(function(Chat $chat) use ($user) {
            $otherParticipant = null;
            foreach ($chat->getParticipantes() as $p) {
                if ($p->getId() !== $user->getId()) {
                    $otherParticipant = $p;
                    break;
                }
            }

            $lastMsg = $chat->getMessages()->last();
            
            return [
                'id' => $chat->getId(),
                'nombre' => (count($chat->getParticipantes()) <= 2 && $otherParticipant) 
                            ? $otherParticipant->getNombre() . ' (' . $chat->getCandidatura()->getOferta()->getTitulo() . ')'
                            : ($chat->getNombre() ?? 'Seguimiento') . ' - ' . $chat->getCandidatura()->getOferta()->getTitulo(),
                'candidatura_id' => $chat->getCandidatura()->getId(),
                'empresa' => $chat->getCandidatura()->getOferta()->getEmpresa()->getNombreComercial(),
                'ultimo_mensaje' => $lastMsg ? $lastMsg->getContenido() : 'Comienza el chat...',
                'ultima_vez' => $lastMsg ? $lastMsg->getFechaEnvio()->format('H:i') : '12:00',
                'participantes' => array_map(function(User $u) {
                    return [
                        'nombre' => $u->getNombre() ?? $u->getEmail(),
                        'foto' => $u->getAlumno() ? $u->getAlumno()->getFoto() : ($u->getEmpresa() ? $u->getEmpresa()->getLogo() : null)
                    ];
                }, $chat->getParticipantes()->toArray())
            ];
        }, $chats);

        return $this->json($chatsData);
    }

    #[Route('/{id}/messages', name: 'api_chat_messages', methods: ['GET'])]
    public function getMessages(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $chat = $em->getRepository(Chat::class)->find($id);
        if (!$chat) {
            return $this->json(['error' => 'Chat not found'], 404);
        }

        // 1. Generar el ETag ultra-ligero sin hidratar todos los mensajes
        $etag = $em->getRepository(ChatMessage::class)->getChatETag($id);
        
        $response = new JsonResponse();
        $response->setEtag($etag);
        $response->setPublic(); // Opcional, pero define que la caché es pública para esta URL
        
        // 2. Comprobar si el ETag coincide con la cabecera 'If-None-Match' del cliente (Axios)
        if ($response->isNotModified($request)) {
            // ¡MAGIA! Cortocircuitamos la petición y respondemos INMEDIATAMENTE un 304 Not Modified vacío.
            return $response; 
        }

        // 3. Solo si no coinciden los ETags, hacemos la consulta pesada
        $messages = $chat->getMessages();
        $numParticipantes = count($chat->getParticipantes());
        $messagesData = array_map(function(ChatMessage $msg) use ($numParticipantes) {
            return [
                'id' => $msg->getId(),
                'remitente' => $msg->getRemitente()->getNombre(),
                'remitente_email' => $msg->getRemitente()->getEmail(),
                'remitente_foto' => $msg->getRemitente()->getAlumno() ? $msg->getRemitente()->getAlumno()->getFoto() : ($msg->getRemitente()->getEmpresa() ? $msg->getRemitente()->getEmpresa()->getLogo() : null),
                'contenido' => $msg->getContenido(),
                'fecha' => $msg->getFechaEnvio()->format('c'),
                'leido_por_todos' => count($msg->getLeidoPor()) >= ($numParticipantes - 1)
            ];
        }, $messages->toArray());

        $response->setData($messagesData);
        return $response;
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

    #[Route('/{id}/read', name: 'api_chat_read', methods: ['POST'])]
    public function markAsRead(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $chat = $em->getRepository(Chat::class)->find($id);
        $email = $data['email'] ?? null;

        if (!$chat || !$email) {
            return $this->json(['error' => 'Missing data'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        $userId = $user->getId();
        $messages = $chat->getMessages();
        foreach ($messages as $msg) {
            if ($msg->getRemitente()->getId() !== $userId) {
                $msg->addLector($userId);
            }
        }

        $em->flush();
        return $this->json(['status' => 'success']);
    }

    #[Route('/message/{messageId}', name: 'api_chat_delete_message', methods: ['DELETE'])]
    public function deleteMessage(int $messageId, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;
        
        $message = $em->getRepository(ChatMessage::class)->find($messageId);
        
        if (!$message) {
            return $this->json(['error' => 'Message not found'], 404);
        }

        // Verify sender
        if ($message->getRemitente()->getEmail() !== $email) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $em->remove($message);
        $em->flush();

        return $this->json(['status' => 'success']);
    }
}
