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

            echo "=== DIAGNÓSTICO DE DATOS ===\n\n";

            // 1. Check Center
            $centroRepo = $em->getRepository(Centro::class);
            $hl = $centroRepo->findOneBy(['nombre' => 'IES Politécnico Hermenegildo Lanz']);
            
            if (!$hl) {
                // Try fuzzy search
                $res = $centroRepo->createQueryBuilder('c')
                    ->where('c.nombre LIKE :n')
                    ->setParameter('n', '%Hermenegildo%')
                    ->getQuery()
                    ->getResult();
                $hl = $res[0] ?? null;
            }

            if ($hl) {
                echo "[OK] Centro encontrado: " . $hl->getNombre() . " (ID: " . $hl->getId() . ")\n";
                $alumnos = $hl->getAlumnos();
                echo "     Número de alumnos en BD: " . count($alumnos) . "\n";
                foreach ($alumnos as $a) {
                    echo "     - " . $a->getUser()->getNombre() . " (" . $a->getUser()->getEmail() . ")\n";
                }
            } else {
                echo "[ERROR] No se encuentra el IES Politécnico Hermenegildo Lanz\n";
            }

            echo "\n2. Check Tutores (ROLE_TUTOR_CENTRO)\n";
            $users = $em->getRepository(User::class)->findAll();
            $tutorsFound = false;
            foreach ($users as $user) {
                if (in_array('ROLE_TUTOR_CENTRO', $user->getRoles())) {
                    $tutorsFound = true;
                    $centro = $user->getCentroEducativo();
                    echo "   - Tutor: " . $user->getEmail() . " | Nombre: " . $user->getNombre() . "\n";
                    echo "     Centro asignado: " . ($centro ? $centro->getNombre() . " (ID: " . $centro->getId() . ")" : "NINGUNO [!!!]") . "\n";
                }
            }
            if (!$tutorsFound) echo "   No hay tutores registrados.\n";

            echo "\n==============================\n";
        }
    };
};
