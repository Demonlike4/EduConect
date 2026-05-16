import paramiko

host = "ssh-leticiamartinez.alwaysdata.net"
port = 22
username = "leticiamartinez"
password = "Astroman1234_2005_"
remote_dir = "/home/leticiamartinez/www/educonect/"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port, username, password)

commands = [
    # Fix the DBAL serverVersion string
    f'sed -i "s/serverVersion=mariadb-11.4/serverVersion=11.4.0-MariaDB/g" {remote_dir}.env.local',
    # Rerun doctrine and cache commands
    f'cd {remote_dir} && php bin/console doctrine:database:create --env=prod --if-not-exists',
    f'cd {remote_dir} && php bin/console doctrine:migrations:migrate --env=prod -n',
    f'cd {remote_dir} && php bin/console lexik:jwt:generate-keypair --skip-if-exists',
    f'cd {remote_dir} && php bin/console cache:clear --env=prod'
]

for cmd in commands:
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    exit_status = stdout.channel.recv_exit_status() 
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print(f"STDERR: {err}")
    print(f"Exit status: {exit_status}\n")

ssh.close()
