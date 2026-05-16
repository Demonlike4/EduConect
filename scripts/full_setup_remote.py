import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("ssh-educonect.alwaysdata.net", 22, "educonect", "Astroman1234_2005_")

# Script PHP robusto que se sube via SFTP
setup_php = """<?php
require 'vendor/autoload.php';
use App\\Kernel;
use App\\Entity\\User;
use Symfony\\Bundle\\FrameworkBundle\\Console\\Application;
use Symfony\\Component\\Console\\Input\\ArrayInput;
use Symfony\\Component\\Console\\Output\\BufferedOutput;

$kernel = new Kernel('prod', false);
$kernel->boot();

// 1. Crear esquema de tablas si no existe
$application = new Application($kernel);
$application->setAutoExit(false);

$input = new ArrayInput([
    'command' => 'doctrine:schema:create',
    '--env' => 'prod',
]);
$output = new BufferedOutput();
$application->run($input, $output);
echo "SCHEMA: " . $output->fetch() . "\\n";

// 2. Crear admin
$container = $kernel->getContainer();
$em = $container->get('doctrine')->getManager();
$hasher = $container->get('security.password_hasher_factory')->getPasswordHasher(User::class);

$user = new User();
$user->setEmail('admin@test.com');
$user->setNombre('Super Admin');
$user->setRoles(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_SUPERADMIN']);
$user->setIsAprobado(true);
$user->setPassword($hasher->hash('123456'));

$em->persist($user);
$em->flush();
echo "ADMIN_CREATED\\n";
"""

sftp = ssh.open_sftp()
with sftp.open('/home/educonect/www/full_setup.php', 'w') as f:
    f.write(setup_php)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('cd /home/educonect/www/ && php full_setup.php')
print(stdout.read().decode())
print(stderr.read().decode())

ssh.exec_command('rm /home/educonect/www/full_setup.php')
ssh.close()
