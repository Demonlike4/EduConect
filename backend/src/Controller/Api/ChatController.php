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
    #[Route('/list', name: 'api_chat_list', methods: ['GET'])]
    public function listChats(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        // Usamos el repositorio optimizado para cargar relaciones en una sola query (JOIN)
        /** @var ChatRepository $chatRepo */
        $chatRepo = $em->getRepository(Chat::class);
        $results = $chatRepo->findChatsForUserOptimized($user);

        $chatsData = array_map(function(array $row) use ($user) {
            /** @var Chat $chat */
            $chat = $row[0];
            $lastContent = $row['lastContent'];
            /** @var \DateTimeInterface|null $lastDate */
            $lastDate = $row['lastDate'];

            $otherParticipant = null;
            foreach ($chat->getParticipantes() as $p) {
                if ($p->getId() !== $user->getId()) {
                    $otherParticipant = $p;
                    break;
                }
            }
            
            return [
                'id' => $chat->getId(),
                'nombre' => (count($chat->getParticipantes()) <= 2 && $otherParticipant) 
                            ? $otherParticipant->getNombre() . ' (' . $chat->getCandidatura()->getOferta()->getTitulo() . ')'
                            : ($chat->getNombre() ?? 'Seguimiento') . ' - ' . $chat->getCandidatura()->getOferta()->getTitulo(),
                'candidatura_id' => $chat->getCandidatura()->getId(),
                'empresa' => $chat->getCandidatura()->getOferta()->getEmpresa()->getNombreComercial(),
                'ultimo_mensaje' => $lastContent ?? 'Comienza el chat...',
                'ultima_vez' => $lastDate ? $lastDate->format('H:i') : '12:00',
                'participantes' => array_map(function(User $u) {
                    return [
                        'id' => $u->getId(),
                        'nombre' => $u->getNombre() ?? $u->getEmail(),
                        'is_empresa' => (bool)$u->getEmpresa(),
                        'foto' => $u->getAlumno() ? $u->getAlumno()->getFoto() : ($u->getEmpresa() ? $u->getEmpresa()->getLogo() : null)
                    ];
                }, $chat->getParticipantes()->toArray())
            ];
        }, $results);

        return $this->json($chatsData);
    }

    #[Route('/{id}/messages', name: 'api_chat_messages', methods: ['GET'])]
    public function getMessages(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $chat = $em->getRepository(Chat::class)->find($id);
        if (!$chat) {
            return $this->json(['error' => 'Chat not found'], 404);
        }

        // Generar ETag ligero
        /** @var ChatMessageRepository $msgRepo */
        $msgRepo = $em->getRepository(ChatMessage::class);
        $etag = $msgRepo->getChatETag($id);
        
        $response = new JsonResponse();
        $response->setEtag($etag);
        $response->setPublic();
        
        if ($response->isNotModified($request)) {
            return $response; 
        }

        // Usamos el repositorio optimizado para evitar N+1 en remitentes y sus perfiles
        $messages = $msgRepo->findMessagesConRemitentes($id);
        $numParticipantes = count($chat->getParticipantes());
        
        $messagesData = array_map(function(ChatMessage $msg) use ($numParticipantes) {
            return [
                'id' => $msg->getId(),
                'remitente' => $msg->getRemitente()->getNombre(),
                'remitente_email' => $msg->getRemitente()->getEmail(),
                'remitente_foto' => $msg->getRemitente()->getAlumno() ? $msg->getRemitente()->getAlumno()->getFoto() : ($msg->getRemitente()->getEmpresa() ? $msg->getRemitente()->getEmpresa()->getLogo() : null),
                'remitente_is_empresa' => (bool)$msg->getRemitente()->getEmpresa(),
                'contenido' => $msg->getContenido(),
                'fecha' => $msg->getFechaEnvio()->format('c'),
                'leido_por_todos' => count($msg->getLeidoPor()) >= ($numParticipantes - 1)
            ];
        }, $messages);

        $response->setData($messagesData);
        return $response;
    }

    #[Route('/{id}/send', name: 'api_chat_send', methods: ['POST'])]
    public function sendMessage(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        $data = json_decode($request->getContent(), true);
        $chat = $em->getRepository(Chat::class)->find($id);
        $contenido = $data['contenido'] ?? null;

        if (!$chat || !$contenido) {
            return $this->json(['error' => 'Missing data'], 400);
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
    public function markAsRead(int $id, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        /** @var ChatMessageRepository $msgRepo */
        $msgRepo = $em->getRepository(ChatMessage::class);
        
        // Marcado masivo mediante Native SQL para evitar colapso de RAM (Sin hidratar entidades)
        $msgRepo->markAllUnreadAsReadForUser($id, $user->getId());

        return $this->json(['status' => 'success']);
    }

    #[Route('/message/{messageId}', name: 'api_chat_delete_message', methods: ['DELETE'])]
    public function deleteMessage(int $messageId, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }
        
        $message = $em->getRepository(ChatMessage::class)->find($messageId);
        
        if (!$message) {
            return $this->json(['error' => 'Message not found'], 404);
        }

        // Verificación de autoría mediante el contexto de seguridad
        if ($message->getRemitente()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $em->remove($message);
        $em->flush();

        return $this->json(['status' => 'success']);
    }
}
