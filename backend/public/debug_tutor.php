<?php

use App\Kernel;
use App\Entity\User;
use App\Entity\Centro;
use Doctrine\ORM\EntityManagerInterface;

require_once dirname(__DIR__) . '/vendor/autoload_runtime.php';

return function (array $context) {
    $kernel = new Kernel($context['APP_ENV'], (bool) $context['APP_DEBUG']);

    return new class($kernel) {
        private $kernel;

        public function __construct($kernel)
        {
            $this->kernel = $kernel;
        }

        public function __invoke()
        {
            $this->kernel->boot();
            $container = $this->kernel->getContainer();
            /** @var EntityManagerInterface $em */
            $em = $container->get('doctrine')->getManager();
            
            $email = 'tutorCentro1@gmail.com'; // THE TUTOR THAT SHOULD WORK
            echo "Testing for Tutor: $email\n";

            $tutor = $em->getRepository(User::class)->findOneBy(['email' => $email]);
            
            if (!$tutor) {
                echo "[FAIL] Tutor not found.\n";
                return;
            }

            echo "[OK] Tutor found (ID: " . $tutor->getId() . ")\n";
            $roles = $tutor->getRoles();
            echo "     Roles: " . implode(', ', $roles) . "\n";

            $centro = $tutor->getCentroEducativo();
            if (!$centro) {
                echo "[FAIL] Tutor has no Centro assigned.\n";
                return;
            }

            echo "[OK] Centro assigned: " . $centro->getNombre() . " (ID: " . $centro->getId() . ")\n";

            $alumnos = $centro->getAlumnos();
            echo "     Alumnos Count: " . count($alumnos) . "\n";

            foreach ($alumnos as $alumno) {
                $user = $alumno->getUser();
                $nombre = $user ? $user->getNombre() : 'NULL USER';
                $email = $user ? $user->getEmail() : 'NULL EMAIL';
                echo "     - $nombre ($email)\n";
            }
        }
    };
};
