<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Doctrine\ORM\EntityManagerInterface;

class LoginController extends AbstractController
{
    #[Route('/api/setup-admin', name: 'api_setup_admin', methods: ['GET'])]
    public function setupAdmin(EntityManagerInterface $em, UserPasswordHasherInterface $passwordHasher): JsonResponse
    {
        $admin = $em->getRepository(User::class)->findOneBy(['email' => 'admin@gmail.com']);
        if (!$admin) {
            $admin = new User();
            $admin->setEmail('admin@gmail.com');
            $admin->setRoles(['ROLE_SUPERADMIN']);
            $admin->setNombre('Director EduConect');
            $admin->setIsAprobado(true);
        }
        $admin->setPassword($passwordHasher->hashPassword($admin, '123456'));
        $em->persist($admin);
        $em->flush();

        return $this->json(['status' => 'Admin account created']);
    }

    #[Route('/api/login', name: 'api_login', methods: ['POST'])]
    public function login(
        Request $request,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['email'], $data['password'])) {
            return new JsonResponse(['error' => 'Missing email or password'], 400);
        }

        $user = $userRepository->findOneBy(['email' => $data['email']]);

        if (!$user || !$passwordHasher->isPasswordValid($user, $data['password'])) {
            return new JsonResponse(['error' => 'Invalid credentials'], 401);
        }

        // Allow login but let the frontend handle the isAprobado state
        // to show pending messages or the option to delete the account.
        $role = null;
        if (in_array('ROLE_SUPERADMIN', $user->getRoles())) $role = 'SUPERADMIN';
        elseif (in_array('ROLE_ALUMNO', $user->getRoles())) $role = 'ALUMNO';
        elseif (in_array('ROLE_EMPRESA', $user->getRoles())) $role = 'EMPRESA';
        elseif (in_array('ROLE_TUTOR_CENTRO', $user->getRoles())) $role = 'TUTOR_CENTRO';
        elseif (in_array('ROLE_TUTOR_EMPRESA', $user->getRoles())) $role = 'TUTOR_EMPRESA';

        if (!$role) $role = 'ALUMNO'; // Fallback to Alumno if none found (regular USER)

        return new JsonResponse([
            'status' => 'success',
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'nombre' => $user->getNombre(),
                'role' => $role,
                'isAprobado' => $user->isAprobado(),
                'grado' => $user->getAlumno() ? $user->getAlumno()->getGrado()?->getNombre() : null,
                'centro' => $user->getCentroEducativo() ? $user->getCentroEducativo()->getNombre() : ($user->getAlumno() && $user->getAlumno()->getCentro() ? $user->getAlumno()->getCentro()->getNombre() : null)
            ]
        ]);
    }
}
