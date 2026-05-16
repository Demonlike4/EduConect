import paramiko
import os
import sys

host = "ssh-educonect.alwaysdata.net"
port = 22
username = "educonect"
password = "Astroman1234_2005_"

local_file = r"c:\2 DAW\PF\EDUCONECT\backend_educonect.zip"
remote_dir = "/home/educonect/www/"
remote_file = remote_dir + "backend_educonect.zip"

print("Starting SSH connection...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(host, port, username, password)
    print("SSH connected successfully!")

    # Create directory if it doesn't exist
    stdin, stdout, stderr = ssh.exec_command(f'mkdir -p {remote_dir}')
    print(stdout.read().decode())
    
    # Upload file
    print("Uploading zip file... This may take a minute.")
    sftp = ssh.open_sftp()
    sftp.put(local_file, remote_file)
    sftp.close()
    print("Upload complete!")

    # Execute commands remotely
    commands = [
        f'cd {remote_dir} && unzip -o backend_educonect.zip',
        f'cd {remote_dir} && composer install --no-dev --optimize-autoloader',
        f'cd {remote_dir} && php bin/console doctrine:database:create --env=prod --if-not-exists',
        f'cd {remote_dir} && php bin/console doctrine:migrations:migrate --env=prod -n',
        f'cd {remote_dir} && php bin/console lexik:jwt:generate-keypair --skip-if-exists',
        f'cd {remote_dir} && php bin/console cache:clear --env=prod'
    ]

    for cmd in commands:
        print(f"Executing: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        # Read output line by line as it comes in
        # We wait for command to finish
        exit_status = stdout.channel.recv_exit_status() 
        print(stdout.read().decode())
        err = stderr.read().decode()
        if err:
            print(f"STDERR: {err}")
        print(f"Exit status: {exit_status}\n")

except Exception as e:
    print(f"Error: {e}")
finally:
    ssh.close()
    print("Deployment script finished.")
