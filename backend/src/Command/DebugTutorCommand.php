<?php

namespace App\Command;

use App\Entity\User;
use App\Entity\Centro;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:debug-tutor',
    description: 'Debugs the tutor link to students',
)]
class DebugTutorCommand extends Command
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
        
        $email = 'tutorCentro1@gmail.com'; 
        $io->title("Debugging Tutor: $email");

        $tutor = $this->entityManager->getRepository(User::class)->findOneBy(['email' => $email]);

        if (!$tutor) {
            $io->error("Tutor not found!");
            return Command::FAILURE;
        }

        $io->success("Tutor Found (ID: " . $tutor->getId() . ")");
        $io->text("Roles: " . implode(', ', $tutor->getRoles()));

        $centro = $tutor->getCentroEducativo();
        
        if (!$centro) {
            $io->error("Tutor has NO Centro assigned via getCentroEducativo()!");
            return Command::FAILURE;
        }

        $io->success("Centro Assigned: " . $centro->getNombre() . " (ID: " . $centro->getId() . ")");

        $alumnos = $centro->getAlumnos();
        $io->section("Alumnos in this Center (" . count($alumnos) . ")");

        if (count($alumnos) === 0) {
            $io->warning("No students found in this center.");
        }

        foreach ($alumnos as $alumno) {
            $user = $alumno->getUser();
            $io->text("- " . ($user ? $user->getNombre() : 'Unknown') . " (" . ($user ? $user->getEmail() : 'No Email') . ")");
        }

        return Command::SUCCESS;
    }
}
