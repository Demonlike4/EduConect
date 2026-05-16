import paramiko

def run_remote_deploy():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('ssh-educonect.alwaysdata.net', 22, 'educonect', 'Astroman1234_2005_')

    # 1. Crear el esquema mediante Symfony Console
    print('Creando tablas de base de datos...')
    stdin, stdout, stderr = ssh.exec_command('cd /home/educonect/www/ && php bin/console doctrine:schema:create --env=prod --no-interaction')
    print(stdout.read().decode())
    print(stderr.read().decode())

    # 2. Crear administrador mediante script PHP subido
    print('Generando cuenta de administrador...')
    pdo_php = """<?php
    $dsn = 'mysql:host=mysql-educonect.alwaysdata.net;dbname=educonect_db;charset=utf8mb4';
    $pdo = new PDO($dsn, 'educonect', 'Astroman1234_2005_');
    $email = 'admin@test.com';
    $roles = '["ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_SUPERADMIN", "ROLE_USER"]';
    $hashed_pw = password_hash('123456', PASSWORD_BCRYPT);
    $sql = 'INSERT INTO user (email, roles, password, nombre, is_aprobado) VALUES (?, ?, ?, "Super Administrador", 1) ON DUPLICATE KEY UPDATE is_aprobado=1';
    $stmt= $pdo->prepare($sql);
    $stmt->execute([$email, $roles, $hashed_pw]);
    echo "SUCCESS_ADMIN_INJECTED";
    """
    
    sftp = ssh.open_sftp()
    with sftp.open('/home/educonect/www/final_step.php', 'w') as f:
        f.write(pdo_php)
    sftp.close()

    stdin, stdout, stderr = ssh.exec_command('php /home/educonect/www/final_step.php')
    print(stdout.read().decode())
    
    ssh.exec_command('rm /home/educonect/www/final_step.php')
    ssh.close()

if __name__ == "__main__":
    run_remote_deploy()
