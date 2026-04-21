<?php

namespace App\Repository;

use App\Entity\Alumno;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Alumno>
 */
class AlumnoRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Alumno::class);
    }

//    /**
//     * @return Alumno[] Returns an array of Alumno objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('a')
//            ->andWhere('a.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('a.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?Alumno
//    {
//        return $this->createQueryBuilder('a')
//            ->andWhere('a.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }

    /**
     * @return Alumno[] Devuelve un listado completo evitando el N+1 iterativo
     */
    public function findAlumnosActivos(?int $centroId = null): array
    {
        $qb = $this->createQueryBuilder('a')
            ->addSelect('u', 'c') // Hidrata User y Candidaturas en la 1ª query
            ->innerJoin('a.user', 'u')
            ->leftJoin('a.candidaturas', 'c'); 

        if ($centroId) {
            $qb->andWhere('a.centro = :centroId')
               ->setParameter('centroId', $centroId);
        }

        return $qb->orderBy('u.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
