<?php

namespace App\EventListener;

use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationSuccessEvent;
use Symfony\Component\Security\Core\User\UserInterface;

class AuthenticationSuccessListener
{
    public function onAuthenticationSuccessResponse(AuthenticationSuccessEvent $event): void
    {
        $data = $event->getData();
        $user = $event->getUser();

        if (!$user instanceof UserInterface) {
            return;
        }

        // Determinar el rol principal del usuario
        $roles = $user->getRoles();
        $primaryRole = 'ROLE_USER';
        foreach (['ROLE_SUPERADMIN', 'ROLE_ADMIN', 'ROLE_TUTOR_CENTRO', 'ROLE_TUTOR_EMPRESA', 'ROLE_EMPRESA', 'ROLE_ALUMNO'] as $r) {
            if (in_array($r, $roles, true)) {
                $primaryRole = $r;
                break;
            }
        }
        $roleNormalized = str_replace('ROLE_', '', $primaryRole);

        // Extraer campos de manera segura usando method_exists
        $foto = method_exists($user, 'getFoto') ? $user->getFoto() : null;
        
        $empresa = null;
        if (method_exists($user, 'getEmpresa')) {
            $empresaObj = $user->getEmpresa();
            if (is_object($empresaObj)) {
                if (method_exists($empresaObj, 'getNombre')) {
                    $empresa = $empresaObj->getNombre();
                } elseif (method_exists($empresaObj, '__toString')) {
                    $empresa = (string) $empresaObj;
                }
            } else {
                $empresa = $empresaObj;
            }
        }

        // Construir la respuesta final esperada por el frontend
        $event->setData([
            'token' => $data['token'] ?? null,
            'user' => [
                'id' => method_exists($user, 'getId') ? $user->getId() : null,
                'email' => method_exists($user, 'getEmail') ? $user->getEmail() : $user->getUserIdentifier(),
                'nombre' => method_exists($user, 'getNombre') ? $user->getNombre() : null,
                'role' => $roleNormalized,
                'foto' => $foto,
                'empresa' => $empresa,
            ]
        ]);
    }
}
