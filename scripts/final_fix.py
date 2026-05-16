import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("ssh-educonect.alwaysdata.net", 22, "educonect", "Astroman1234_2005_")

# 1. Update .env.local with the confirmed correct credentials
new_env = """APP_ENV=prod
APP_DEBUG=0
DATABASE_URL="mysql://educonect:Astroman1234_2005_@mysql-educonect.alwaysdata.net/educonect_db?serverVersion=11.4.0-MariaDB&charset=utf8mb4"
CORS_ALLOW_ORIGIN=^https?://educonect-app\\\\.web\\\\.app$
"""
sftp = ssh.open_sftp()
with sftp.open('/home/educonect/www/.env.local', 'w') as f:
    f.write(new_env)

# 2. Run migrations on the correct database
stdin, stdout, stderr = ssh.exec_command('cd /home/educonect/www/ && php bin/console doctrine:migrations:migrate --env=prod -n')
print("MIGRATIONS:", stdout.read().decode())

# 3. Insert Admin using PDO with correct credentials
pdo_php = """<?php
$dsn = "mysql:host=mysql-educonect.alwaysdata.net;dbname=educonect_db;charset=utf8mb4";
$pdo = new PDO($dsn, 'educonect', 'Astroman1234_2005_');

$email = 'admin@test.com';
$roles = '["ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_SUPERADMIN", "ROLE_USER"]';
$hashed_pw = password_hash('123456', PASSWORD_BCRYPT);

$sql = "INSERT INTO user (email, roles, password, nombre, is_aprobado) 
        VALUES (?, ?, ?, 'Super Administrador', 1) 
        ON DUPLICATE KEY UPDATE roles = ?, is_aprobado = 1, password = ?";
$stmt= $pdo->prepare($sql);
$stmt->execute([$email, $roles, $hashed_pw, $roles, $hashed_pw]);
echo "ADMIN_CREATED";
"""
with sftp.open('/home/educonect/www/insert_admin.php', 'w') as f:
    f.write(pdo_php)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('php /home/educonect/www/insert_admin.php')
print("RESULT:", stdout.read().decode())

ssh.exec_command('rm /home/educonect/www/insert_admin.php')
ssh.close()
