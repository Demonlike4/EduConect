<?php

namespace App\Repository;

use App\Entity\DiarioActividad;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DiarioActividad>
 *
 * @method DiarioActividad|null find($id, $lockMode = null, $lockVersion = null)
 * @method DiarioActividad|null findOneBy(array $criteria, array $orderBy = null)
 * @method DiarioActividad[]    findAll()
 * @method DiarioActividad[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class DiarioActividadRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DiarioActividad::class);
    }

    public function save(DiarioActividad $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(DiarioActividad $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
