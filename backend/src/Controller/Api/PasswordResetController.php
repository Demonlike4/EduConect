<?php
namespace App\Controller\Api;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

#[Route('/api/auth')]
class PasswordResetController extends AbstractController
{
    #[Route('/forgot-password', name: 'api_forgot_password', methods: ['POST'])]
    public function forgotPassword(Request $request, EntityManagerInterface $em, MailerInterface $mailer): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $emailAddress = $data['email'] ?? null;

        if (!$emailAddress) {
            return $this->json(['error' => 'El correo es obligatorio'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $emailAddress]);

        if (!$user) {
            return $this->json(['status' => 'success', 'message' => 'Si el correo existe, recibirás un enlace de recuperación.']);
        }

        $token = Uuid::v4()->toRfc4122();
        $user->setResetToken($token);
        $user->setResetTokenExpiry(new \DateTime('+1 hour'));

        $em->flush();

        $resetLink = 'http://localhost:5173/restaurar-password/' . $token;
        $email = (new Email())
            ->from('no-reply@educonect.com')
            ->to($user->getEmail())
            ->subject('Recuperación de Contraseña - EduConect')
            ->html("<p>Has solicitado restablecer tu contraseña en EduConect.</p><p><a href='$resetLink'>Haz clic aquí para crear una nueva contraseña</a></p><p>Este enlace caducará en 1 hora.</p>");

        try {
            $mailer->send($email);
        } catch (\Exception $e) {
            // Error en desarrollo (dsn nulo), ignorar
        }

        return $this->json([
            'status' => 'success', 
            'message' => 'Si el correo existe, recibirás un enlace de recuperación.',
            'dev_mode_token' => $token,
            'dev_mode_link' => $resetLink
        ]);
    }

    #[Route('/reset-password', name: 'api_reset_password', methods: ['POST'])]
    public function resetPassword(Request $request, EntityManagerInterface $em, UserPasswordHasherInterface $passwordHasher): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $token = $data['token'] ?? null;
        $newPassword = $data['password'] ?? null;

        if (!$token || !$newPassword) {
            return $this->json(['error' => 'Faltan datos'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['resetToken' => $token]);

        if (!$user) {
            return $this->json(['error' => 'El enlace no es válido o está corrupto.'], 400);
        }

        if ($user->getResetTokenExpiry() < new \DateTime()) {
            return $this->json(['error' => 'El enlace ha caducado. Vuelve a solicitar la recuperación.'], 400);
        }

        $user->setPassword($passwordHasher->hashPassword($user, $newPassword));
        $user->setResetToken(null);
        $user->setResetTokenExpiry(null);

        $em->flush();

        return $this->json(['status' => 'success', 'message' => 'Contraseña actualizada correctamente.']);
    }
}
