<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * Used to upgrade (rehash) the user's password automatically over time.
     */
    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $user->setPassword($newHashedPassword);
        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();
    }

//    /**
//     * @return User[] Returns an array of User objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('u')
//            ->andWhere('u.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('u.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?User
//    {
//        return $this->createQueryBuilder('u')
//            ->andWhere('u.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
    /**
     * @return User[] Returns an array of User objects who are tutors for a specific center and degree
     */
    public function findTutoresCentro($centro, $grado): array
    {
        return $this->createQueryBuilder('u')
            ->join('u.gradosImpartidos', 'g')
            ->andWhere('u.centroEducativo = :centro')
            ->andWhere('g.id = :grado')
            ->andWhere('u.roles LIKE :role')
            ->setParameter('centro', $centro)
            ->setParameter('grado', $grado)
            ->setParameter('role', '%"ROLE_TUTOR_CENTRO"%')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return User[] Returns an array of User objects who are tutors for a specific company
     */
    public function findTutoresEmpresa($empresa): array
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.empresaLaboral = :empresa') // Note: Using empresaLaboral as defined in User entity for employees
            ->andWhere('u.roles LIKE :role')
            ->setParameter('empresa', $empresa)
            ->setParameter('role', '%"ROLE_TUTOR_EMPRESA"%')
            ->getQuery()
            ->getResult();
    }
}
