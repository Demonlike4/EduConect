<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Doctrine\ORM\EntityManagerInterface;

class LoginController extends AbstractController
{
    #[Route('/api/login', name: 'api_login', methods: ['POST'])]
    public function login(): JsonResponse
    {
        // Este método puede estar vacío; Symfony interceptará la petición
        // gracias a la configuración json_login en security.yaml.
        return $this->json(['error' => 'Petición no interceptada por el firewall']);
    }

    #[Route('/api/logout', name: 'app_logout', methods: ['GET', 'POST'])]
    public function logout(): void
    {
        // Symfony gestiona el cierre de sesión automáticamente.
        throw new \Exception('Este código no debería ejecutarse.');
    }
}
