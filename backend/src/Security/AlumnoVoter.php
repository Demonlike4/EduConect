<?php

namespace App\Security;

use App\Entity\Alumno;
use App\Entity\Empresa;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class AlumnoVoter extends Voter
{
    const VIEW = 'view_profile';

    protected function supports(string $attribute, $subject): bool
    {
        // if the attribute is VIEW and the subject is an Alumno-type application object
        if ($attribute != self::VIEW) {
            return false;
        }

        if (!$subject instanceof Alumno) {
            return false;
        }

        return true;
    }

    protected function voteOnAttribute(string $attribute, $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (!$user instanceof User) {
            // the user must be logged in; if not, deny access
            return false;
        }

        /** @var Alumno $alumno */
        $alumno = $subject;
        
        // 1. Own profile
        if ($alumno->getUser() === $user) {
            return true;
        }

        $roles = $user->getRoles();

        // 2. ROLE_EMPRESA
        if (in_array('ROLE_EMPRESA', $roles)) {
            // Check if user is linked to an Empresa entity?
            // The prompt says "Roles de Empresa o Tutores".
            // A simple role check might be enough, but usually we check if they have connection via Candidatura?
            // "Implementa que el perfil del Alumno solo sea accesible para usuarios con roles de Empresa o Tutores"
            // Let's assume broad access for these roles for MVP, or restrict to related candidatures if needed.
            // But prompt implies role-based global access, "The others students cannot see it".
            return true;
        }

        // 3. ROLE_TUTOR_CENTRO
        if (in_array('ROLE_TUTOR_CENTRO', $roles)) {
            return true;
        }

        // 4. ROLE_TUTOR_EMPRESA
        if (in_array('ROLE_TUTOR_EMPRESA', $roles)) {
            return true;
        }
        
        // 5. ROLE_ADMIN (Usually has access)
        if (in_array('ROLE_ADMIN', $roles)) {
            return true;
        }

        return false;
    }
}
