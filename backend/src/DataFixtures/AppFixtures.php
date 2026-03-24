<?php

namespace App\DataFixtures;

use App\Entity\Alumno;
use App\Entity\Centro;
use App\Entity\Empresa;
use App\Entity\Grado;
use App\Entity\Oferta;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    private UserPasswordHasherInterface $passwordHasher;

    public function __construct(UserPasswordHasherInterface $passwordHasher)
    {
        $this->passwordHasher = $passwordHasher;
    }

    public function load(ObjectManager $manager): void
    {
        // Configuración solicitada por el usuario
        $gradosConfig = [
            'IES Zaidín-Vergeles' => [
                ['nombre' => 'DAW - Desarrollo de App Web'], 
                ['nombre' => 'DAM - Desarrollo de App Multiplataforma']
            ],
            'IES Aynadamar' => [
                ['nombre' => 'Cuidados Auxiliares de Enfermería'], 
                ['nombre' => 'Laboratorio Clínico y Biomédico']
            ],
            'IES Virgen de las Nieves' => [
                ['nombre' => 'Administración y Finanzas'], 
                ['nombre' => 'Gestión Administrativa']
            ],
            'IES Politécnico Hermenegildo Lanz' => [
                ['nombre' => 'Mecatrónica Industrial'], 
                ['nombre' => 'Automoción'],
                ['nombre' => 'DAW - Desarrollo de App Web'],
                ['nombre' => 'DAM - Desarrollo de App Multiplataforma']
            ],
        ];

        foreach ($gradosConfig as $centroNombre => $gradosList) {
            // Crear Centro
            $centro = new Centro();
            $centro->setNombre($centroNombre);
            // Añadimos una dirección por defecto para evitar errores si el campo es obligatorio
            $centro->setDireccion('Granada'); 
            $manager->persist($centro);
            
            foreach ($gradosList as $gradoData) {
                // Crear Grado
                $grado = new Grado();
                $grado->setNombre($gradoData['nombre']);
                $centro->addGrado($grado); // Vincula el grado al centro
                $manager->persist($grado);
            }
        }

        $manager->flush();
    }
}

