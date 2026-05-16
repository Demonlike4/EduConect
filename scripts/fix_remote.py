import paramiko

host = "ssh-educonect.alwaysdata.net"
username = "educonect"
password = "Astroman1234_2005_"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, 22, username, password)

cmds = [
    "chmod -R 777 /home/educonect/www/var",
    "cd /home/educonect/www/ && php bin/console doctrine:migrations:migrate --env=prod -n",
    "cd /home/educonect/www/ && php bin/console cache:clear --env=prod"
]

for cmd in cmds:
    print(f"Running: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())
    print(stderr.read().decode())

ssh.close()
