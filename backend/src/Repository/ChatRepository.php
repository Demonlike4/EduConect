<?php

namespace App\Repository;

use App\Entity\Chat;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Chat>
 */
class ChatRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Chat::class);
    }

    /**
     * Obtiene los chats de un usuario optimizando el rendimiento mediante Eager Loading
     * e inyectando el último mensaje sin cargar la colección completa.
     * Retorna un array de arrays con la entidad Chat y los campos escalares del último mensaje.
     */
    public function findChatsForUserOptimized(\App\Entity\User $user): array
    {
        return $this->createQueryBuilder('c')
            ->select('c', 'p', 'cand', 'o', 'e', 'pa', 'pe', 'lastMsg.contenido as lastContent', 'lastMsg.fechaEnvio as lastDate')
            ->join('c.participantes', 'part') // Filtro de pertenencia
            ->leftJoin('c.participantes', 'p') // Hidratación de todos los participantes
            ->leftJoin('p.alumno', 'pa') // Perfil alumno para la foto
            ->leftJoin('p.empresa', 'pe') // Perfil empresa para el logo
            ->leftJoin('c.candidatura', 'cand')
            ->leftJoin('cand.oferta', 'o')
            ->leftJoin('o.empresa', 'e')
            // Subconsulta para obtener el último mensaje en una sola query SQL
            ->leftJoin('App\Entity\ChatMessage', 'lastMsg', 'WITH', 'lastMsg.id = (
                SELECT MAX(m2.id) 
                FROM App\Entity\ChatMessage m2 
                WHERE m2.chat = c
            )')
            ->where('part.id = :userId')
            ->setParameter('userId', $user->getId())
            ->getQuery()
            ->getResult();
    }
}
