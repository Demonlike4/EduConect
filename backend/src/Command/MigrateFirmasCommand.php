<?php

namespace App\Command;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:migrate-firmas',
    description: 'Migra los datos Base64 de las candidaturas a la nueva tabla 1:1 antes del diff de Doctrine.'
)]
class MigrateFirmasCommand extends Command
{
    public function __construct(private EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $conn = $this->em->getConnection();

        $io->title('Migración Previa Estructural: Firmas 1:1');

        $conn->beginTransaction();

        try {
            // 1. Forzar creación de la tabla destino si no existe
            $io->text('1. Creando tabla candidatura_firma...');
            $conn->executeStatement("
                CREATE TABLE IF NOT EXISTS candidatura_firma (
                    id INT AUTO_INCREMENT NOT NULL, 
                    firma_tutor_centro LONGTEXT DEFAULT NULL, 
                    firma_tutor_empresa LONGTEXT DEFAULT NULL, 
                    PRIMARY KEY(id)
                ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
            ");

            // 2. Crear foreign key en candidatura
            $io->text('2. Verificando columna firmas_id en candidatura...');
            $schemaManager = $conn->createSchemaManager();
            $columns = $schemaManager->listTableColumns('candidatura');
            
            if (!isset($columns['firmas_id'])) {
                $conn->executeStatement("ALTER TABLE candidatura ADD firmas_id INT DEFAULT NULL");
                $conn->executeStatement("ALTER TABLE candidatura ADD CONSTRAINT FK_CANDIDATURA_FIRMAS FOREIGN KEY (firmas_id) REFERENCES candidatura_firma (id) ON DELETE SET NULL");
                $conn->executeStatement("CREATE UNIQUE INDEX UNIQ_CANDIDATURA_FIRMAS ON candidatura (firmas_id)");
                $io->text('   -> Columna y Foreign Key creadas.');
            }

            // 3. Migrar los datos reales (blobs)
            $io->text('3. Escaneando registros antiguos con firmas...');
            $firmas = $conn->fetchAllAssociative("SELECT id, firma_tutor_centro, firma_tutor_empresa FROM candidatura WHERE firma_tutor_centro IS NOT NULL OR firma_tutor_empresa IS NOT NULL");
            
            $io->text('   -> Encontradas ' . count($firmas) . ' rúbricas para migrar.');

            $migrados = 0;
            foreach ($firmas as $firmaData) {
                $candidaturaId = $firmaData['id'];
                $check = $conn->fetchOne("SELECT firmas_id FROM candidatura WHERE id = :id", ['id' => $candidaturaId]);
                
                if (!$check) {
                    $conn->executeStatement("
                        INSERT INTO candidatura_firma (firma_tutor_centro, firma_tutor_empresa) 
                        VALUES (:centro, :empresa)
                    ", [
                        'centro' => $firmaData['firma_tutor_centro'],
                        'empresa' => $firmaData['firma_tutor_empresa']
                    ]);
                    
                    $firmaId = $conn->lastInsertId();
                    
                    $conn->executeStatement("
                        UPDATE candidatura SET firmas_id = :firmaId WHERE id = :candidaturaId
                    ", [
                        'firmaId' => $firmaId,
                        'candidaturaId' => $candidaturaId
                    ]);
                    $migrados++;
                }
            }
            
            $conn->commit();
            $io->success("¡Migración completada! Se han trasladado $migrados firmas pesadas.");
            $io->note("Ya puedes ejecutar: php bin/console doctrine:migrations:diff\nDoctrine detectará que las firmas están a salvo y solo generará el DROP de las columnas obsoletas.");

        } catch (\Exception $e) {
            $conn->rollBack();
            $io->error('Error crítico durante la migración: ' . $e->getMessage());
            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }
}
