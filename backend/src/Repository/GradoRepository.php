<?php

namespace App\Repository;

use App\Entity\Grado;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Grado>
 *
 * @method Grado|null find($id, $lockMode = null, $lockVersion = null)
 * @method Grado|null findOneBy(array $criteria, array $orderBy = null)
 * @method Grado[]    findAll()
 * @method Grado[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class GradoRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Grado::class);
    }
}
