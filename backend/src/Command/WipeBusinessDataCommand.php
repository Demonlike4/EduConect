<?php

namespace App\Command;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Doctrine\ORM\EntityManagerInterface;

#[AsCommand(
    name: 'app:wipe-business-data',
    description: 'Deletes all business data: tutors, companies, students and related records.',
)]
class WipeBusinessDataCommand extends Command
{
    private EntityManagerInterface $entityManager;

    public function __construct(EntityManagerInterface $entityManager)
    {
        parent::__construct();
        $this->entityManager = $entityManager;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $conn = $this->entityManager->getConnection();

        $io->title('Wiping Business Data');

        try {
            // Disable foreign key checks
            $conn->executeStatement('SET FOREIGN_KEY_CHECKS = 0;');

            // Tables to truncate/delete
            $tables = [
                'chat_message',
                'chat_user',
                'chat',
                'candidatura',
                'oferta',
                'alumno',
                'empresa',
                'user_grado', // Junction table for tutores and grados
                'user',
            ];

            foreach ($tables as $table) {
                try {
                    $conn->executeStatement("DELETE FROM `$table`;");
                    $io->writeln("Deleted data from $table");
                } catch (\Exception $e) {
                    $io->warning("Could not delete from $table (might not exist): " . $e->getMessage());
                }
            }

            // Re-enable foreign key checks
            $conn->executeStatement('SET FOREIGN_KEY_CHECKS = 1;');

            $io->success('Business data wiped successfully.');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $io->error('An error occurred: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
