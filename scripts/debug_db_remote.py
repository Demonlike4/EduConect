import paramiko

def debug_database():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('ssh-educonect.alwaysdata.net', 22, 'educonect', 'Astroman1234_2005_')

    php_code = r"""<?php
require 'vendor/autoload.php';
use App\Kernel;
use App\Entity\User;
use App\Entity\Empresa;
use Symfony\Component\Dotenv\Dotenv;

(new Dotenv())->load(__DIR__.'/.env', __DIR__.'/.env.local');

$kernel = new Kernel('prod', false);
$kernel->boot();
$em = $kernel->getContainer()->get('doctrine')->getManager();

echo "--- EMPRESAS ---\n";
$empresas = $em->getRepository(Empresa::class)->findAll();
foreach ($empresas as $e) {
    $owner = $e->getUser();
    echo "ID: " . $e->getId() . " | Nombre: " . $e->getNombreComercial() . " | Owner_Email: " . ($owner ? $owner->getEmail() : 'NONE') . "\n";
}

echo "\n--- USUARIOS TUTORES EMPRESA ---\n";
$users = $em->getRepository(User::class)->findAll();
foreach ($users as $u) {
    if (in_array('ROLE_TUTOR_EMPRESA', $u->getRoles())) {
        $el = $u->getEmpresaLaboral();
        echo "Email: " . $u->getEmail() . " | Nombre: " . $u->getNombre() . " | EmpresaLaboral_ID: " . ($el ? $el->getId() : 'NULL') . " | Aprobado: " . ($u->isAprobado() ? 'YES' : 'NO') . "\n";
    }
}
?>"""
    
    sftp = ssh.open_sftp()
    with sftp.open('/home/educonect/www/debug_db.php', 'w') as f:
        f.write(php_code)
    sftp.close()

    stdin, stdout, stderr = ssh.exec_command('php /home/educonect/www/debug_db.php')
    print(stdout.read().decode())
    
    ssh.exec_command('rm /home/educonect/www/debug_db.php')
    ssh.close()

if __name__ == "__main__":
    debug_database()
