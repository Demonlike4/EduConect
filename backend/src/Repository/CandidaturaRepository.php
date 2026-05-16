<?php

namespace App\Repository;

use App\Entity\Candidatura;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Candidatura>
 */
class CandidaturaRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Candidatura::class);
    }

    /**
     * @return array<Candidatura>
     */
    public function findCandidaturasActivasByEmpresa(int $empresaId): array
    {
        return $this->createQueryBuilder('c')
            ->addSelect('a', 'u_alumno', 'o', 'e', 'u_empresa')
            ->innerJoin('c.alumno', 'a')
            ->innerJoin('a.user', 'u_alumno')
            ->innerJoin('c.oferta', 'o')
            ->innerJoin('o.empresa', 'e')
            ->innerJoin('e.user', 'u_empresa')
            ->where('e.id = :empresaId')
            ->setParameter('empresaId', $empresaId)
            ->orderBy('c.fechaInicio', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Recupera el listado de candidaturas súper ligero, ideal para la API de los Dashboards.
     */
    public function findListadosDashboardActivos(array $filtros = []): array
    {
        $qb = $this->createQueryBuilder('c')
            ->addSelect('a', 'o')
            ->innerJoin('c.alumno', 'a')
            ->innerJoin('c.oferta', 'o');

        if (isset($filtros['empresa_id'])) {
            $qb->innerJoin('o.empresa', 'e')
               ->andWhere('e.id = :empresaId')
               ->setParameter('empresaId', $filtros['empresa_id']);
        }

        if (isset($filtros['alumno_id'])) {
            $qb->andWhere('a.id = :alumnoId')
               ->setParameter('alumnoId', $filtros['alumno_id']);
        }

        return $qb->orderBy('c.id', 'DESC')
            ->getQuery()
            ->getResult(); 
    }
}
