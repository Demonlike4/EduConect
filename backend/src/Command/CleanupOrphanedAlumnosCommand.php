<?php

namespace App\Command;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:cleanup-orphaned-alumnos',
    description: 'Deletes Alumno records with missing User association using raw SQL',
)]
class CleanupOrphanedAlumnosCommand extends Command
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
        
        $conn = $this->entityManager->getConnection();
        
        // Count before
        $count = $conn->fetchOne('SELECT COUNT(*) FROM alumno WHERE user_id NOT IN (SELECT id FROM user)');
        
        if ($count > 0) {
            $io->warning("Found $count orphaned Alumno records.");
            
            $sql = 'DELETE FROM alumno WHERE user_id NOT IN (SELECT id FROM user)';
            $affected = $conn->executeStatement($sql);
            
            $io->success("Deleted $affected orphaned Alumno records.");
        } else {
            $io->success("No orphaned Alumno records found.");
        }

        return Command::SUCCESS;
    }
}
