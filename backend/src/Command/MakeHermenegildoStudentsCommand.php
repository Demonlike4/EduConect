<?php

namespace App\Command;

use App\Entity\Centro;
use App\Entity\User;
use App\Entity\Alumno;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:make-hermenegildo-students',
    description: 'Creates test students for IES Hermenegildo Lanz',
)]
class MakeHermenegildoStudentsCommand extends Command
{
    private EntityManagerInterface $entityManager;
    private UserPasswordHasherInterface $hasher;

    public function __construct(EntityManagerInterface $entityManager, UserPasswordHasherInterface $hasher)
    {
        $this->entityManager = $entityManager;
        $this->hasher = $hasher;
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $centroRepo = $this->entityManager->getRepository(Centro::class);
        
        $centro = $centroRepo->findOneBy(['nombre' => 'IES Politécnico Hermenegildo Lanz']);

        if (!$centro) {
            $io->error('No se encontró el IES Politécnico Hermenegildo Lanz.');
            return Command::FAILURE;
        }

        $io->success('Centro encontrado: ' . $centro->getNombre());

        $alumnosData = [
            ['nombre' => 'Javier Martínez', 'email' => 'javier.martinez@alumno.edu', 'grado' => 'Mecatrónica Industrial'],
            ['nombre' => 'Lucía Fernández', 'email' => 'lucia.fernandez@alumno.edu', 'grado' => 'Automoción'],
            ['nombre' => 'Pedro Sánchez', 'email' => 'pedro.sanchez@alumno.edu', 'grado' => 'Mecatrónica Industrial'],
            ['nombre' => 'Marta López', 'email' => 'marta.lopez@alumno.edu', 'grado' => 'Automoción']
        ];

        foreach ($alumnosData as $data) {
            $existingUser = $this->entityManager->getRepository(User::class)->findOneBy(['email' => $data['email']]);
            if ($existingUser) {
                $io->note("El usuario {$data['email']} ya existe.");
                continue;
            }

            $user = new User();
            $user->setEmail($data['email']);
            $user->setNombre($data['nombre']);
            $user->setRoles(['ROLE_ALUMNO']);
            $user->setPassword($this->hasher->hashPassword($user, 'password123'));
            
            $alumno = new Alumno();
            $alumno->setUser($user);
            $alumno->setCentro($centro);

            $gradoEncontrado = null;
            foreach ($centro->getGrados() as $g) {
                if ($g->getNombre() === $data['grado']) {
                    $gradoEncontrado = $g;
                    break;
                }
            }

            if ($gradoEncontrado) {
                $alumno->setGrado($gradoEncontrado);
            } else {
                $io->warning("Grado {$data['grado']} no encontrado para {$data['nombre']}");
            }

            $this->entityManager->persist($user);
            $this->entityManager->persist($alumno);
            $io->text("Creando: {$data['nombre']}");
        }

        $this->entityManager->flush();
        $io->success('Alumnos creados correctamente.');

        return Command::SUCCESS;
    }
}
