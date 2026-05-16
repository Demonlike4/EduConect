import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("ssh-educonect.alwaysdata.net", 22, "educonect", "Astroman1234_2005_")

# PHP script using 127.0.0.1 and simplified user
pdo_php = """<?php
$host = '127.0.0.1'; 
$db   = 'educonect_educonect_db';
// Probamos con el usuario base de la cuenta
$user = 'educonect';
$pass = 'Astroman1234_2005_';

$dsn = "mysql:host=$host;port=3306;dbname=$db;charset=utf8mb4";
try {
     $pdo = new PDO($dsn, $user, $pass);
} catch (\\PDOException $e) {
     die("FAIL:" . $e->getMessage());
}

$email = 'admin@test.com';
$roles = '["ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_SUPERADMIN", "ROLE_USER"]';
$hashed_pw = password_hash('123456', PASSWORD_BCRYPT);

$sql = "INSERT INTO user (email, roles, password, nombre, is_aprobado) 
        VALUES (?, ?, ?, 'Super Administrador', 1) 
        ON DUPLICATE KEY UPDATE roles = ?, is_aprobado = 1, password = ?";
$stmt= $pdo->prepare($sql);
$stmt->execute([$email, $roles, $hashed_pw, $roles, $hashed_pw]);

echo "ADMIN_READY";
"""

sftp = ssh.open_sftp()
with sftp.open('/home/educonect/www/insert_admin.php', 'w') as f:
    f.write(pdo_php)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('php /home/educonect/www/insert_admin.php')
print(stdout.read().decode())
print(stderr.read().decode())

# ssh.exec_command('rm /home/educonect/www/insert_admin.php')
ssh.close()
