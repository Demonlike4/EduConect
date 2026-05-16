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

    /**
     * Recupera todos los mensajes de un chat con Eager Loading del remitente y sus perfiles (Alumno/Empresa).
     */
    public function findMessagesConRemitentes(int $chatId): array
    {
        return $this->createQueryBuilder('m')
            ->select('m', 'r', 'a', 'e')
            ->join('m.remitente', 'r')
            ->leftJoin('r.alumno', 'a')
            ->leftJoin('r.empresa', 'e')
            ->where('m.chat = :chatId')
            ->setParameter('chatId', $chatId)
            ->orderBy('m.fechaEnvio', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Marca todos los mensajes de un chat como leídos para un usuario específico.
     * Utiliza Native SQL para evitar la hidratación de objetos y el consumo excesivo de RAM.
     */
    public function markAllUnreadAsReadForUser(int $chatId, int $userId): void
    {
        $conn = $this->getEntityManager()->getConnection();
        
        // Usamos una consulta nativa para actualizar el campo JSON leido_por
        // Esta sintaxis es específica para MySQL 5.7+ / MariaDB.
        // Si no está el ID del usuario, lo añade al array JSON.
        $sql = "
            UPDATE chat_message 
            SET leido_por = JSON_ARRAY_APPEND(IFNULL(leido_por, '[]'), '$', :userId)
            WHERE chat_id = :chatId 
            AND remitente_id != :userId
            AND NOT JSON_CONTAINS(IFNULL(leido_por, '[]'), JSON_QUOTE(CAST(:userId AS CHAR)), '$')
        ";

        $conn->executeStatement($sql, [
            'chatId' => $chatId,
            'userId' => $userId
        ]);
    }
}
