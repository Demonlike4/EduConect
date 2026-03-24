<?php

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:list-users',
    description: 'Lists all users in the database',
)]
class ListUsersCommand extends Command
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
        $users = $this->entityManager->getRepository(User::class)->findAll();

        $rows = [];
        foreach ($users as $user) {
            $roles = implode(', ', $user->getRoles());
            $centro = $user->getCentroEducativo() ? $user->getCentroEducativo()->getNombre() : '---';
            $alumnoCentro = $user->getAlumno() && $user->getAlumno()->getCentro() ? $user->getAlumno()->getCentro()->getNombre() : '---';
            
            $rows[] = [
                $user->getId(),
                $user->getEmail(),
                $roles,
                $centro . (strpos($roles, 'ALUMNO') !== false ? " (Alumno via: $alumnoCentro)" : "")
            ];
        }

        $io->table(['ID', 'Email', 'Roles', 'Centro'], $rows);

        return Command::SUCCESS;
    }
}
