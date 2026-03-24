<?php

namespace App\Command;

use App\Entity\Centro;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:debug-hermenegildo',
    description: 'Diagnoses state of IES Politécnico Hermenegildo Lanz',
)]
class DebugHermenegildoCommand extends Command
{
    private EntityManagerInterface $entityManager;

    public function __construct(EntityManagerInterface $entityManager)
    {
        $this->entityManager = $entityManager;
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $centroRepo = $this->entityManager->getRepository(Centro::class);
        
        $centro = $centroRepo->findOneBy(['nombre' => 'IES Politécnico Hermenegildo Lanz']);

        if (!$centro) {
            $io->error('IES Politécnico Hermenegildo Lanz NOT FOUND!');
            return Command::FAILURE;
        }

        $io->success("Centro Found: " . $centro->getNombre() . " (ID: " . $centro->getId() . ")");

        // Check Alumnos
        $alumnos = $centro->getAlumnos();
        $io->section("Alumnos (" . count($alumnos) . ")");
        foreach ($alumnos as $alumno) {
            $user = $alumno->getUser();
            $io->text("- " . ($user ? $user->getNombre() : '???') . " (" . ($user ? $user->getEmail() : '???') . ")");
        }

        // Check Tutors (Inverse side)
        $tutores = $centro->getTutores(); 
        // Note: Check Entity/Centro.php if getTutores() exists? 
        // If not, use manual query.
        
        $io->section("Tutores Found via Repository Query");
        $userRepo = $this->entityManager->getRepository(\App\Entity\User::class);
        $tutores = $userRepo->findBy(['centroEducativo' => $centro]);

        foreach ($tutores as $tutor) {
             $roles = implode(', ', $tutor->getRoles());
             $io->text("Tutor: " . $tutor->getEmail() . " (ID: " . $tutor->getId() . ") - Roles: $roles");
        }

        return Command::SUCCESS;
    }
}
