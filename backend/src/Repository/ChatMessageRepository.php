<?php

namespace App\Repository;

use App\Entity\ChatMessage;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ChatMessage>
 */
class ChatMessageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ChatMessage::class);
    }

    /**
     * Genera un identificador único (ETag) basado en el estado actual de los mensajes del chat.
     * Es ultra-ligero porque no hidrata entidades, solo obtiene escalares con funciones agregadas.
     */
    public function getChatETag(int $chatId): string
    {
        $qb = $this->createQueryBuilder('m')
            ->select('COUNT(m.id) as total', 'MAX(m.id) as maxId')
            ->where('m.chat = :chatId')
            ->setParameter('chatId', $chatId);

        $result = $qb->getQuery()->getSingleResult();

        $total = $result['total'] ?? 0;
        $maxId = $result['maxId'] ?? 0;

        return md5(sprintf('%d-%d', $total, $maxId));
    }
}
