<?php

namespace App\Repository;

use App\Entity\Alumno;
use App\Entity\User;
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

    /**
     * Devuelve TODOS los alumnos de un centro (uso interno, NO usar en dashboard de tutor).
     *
     * @return Alumno[]
     */
    public function findAlumnosActivos(?int $centroId = null): array
    {
        $qb = $this->createQueryBuilder('a')
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

    /**
     * SEGURO: Devuelve ÚNICAMENTE los alumnos cuyo tutor_centro_id coincide
     * con el ID del tutor autenticado. Filtrado por clave foránea directa.
     *
     * @param User $tutor El usuario tutor autenticado (obtenido con $this->getUser())
     * @return Alumno[]
     */
    public function findByTutor(User $tutor): array
    {
        return $this->createQueryBuilder('a')
            ->innerJoin('a.user', 'u')
            // Filtro de seguridad: clave foránea directa, usando el ID para evitar
            // problemas con proxies de Doctrine y garantizar el JOIN correcto.
            ->andWhere('a.tutorCentro = :tutorId')
            ->setParameter('tutorId', $tutor->getId())
            ->orderBy('u.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * SEGURO: Devuelve los alumnos pendientes de aprobación de un tutor concreto.
     * Usable para el contador de "Pendientes" del dashboard.
     *
     * @param User $tutor El usuario tutor autenticado
     * @return Alumno[]
     */
    public function findPendingByTutor(User $tutor): array
    {
        return $this->createQueryBuilder('a')
            ->innerJoin('a.user', 'u')
            ->andWhere('a.tutorCentro = :tutorId')
            ->andWhere('u.isAprobado = false')
            ->setParameter('tutorId', $tutor->getId())
            ->orderBy('u.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
