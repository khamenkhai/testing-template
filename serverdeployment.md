## Deploying Node.js & PostgreSQL Stack on VPS

---

- Preparing the VPS Environment
- Setting Up the PostgreSQL Database
- Deploying the Express and Node.js Backend
- Configuring Nginx as a Reverse Proxy
- Setting Up SSL Certificates

---

### 1. Preparing the VPS Environment

Log in to Your VPS in Terminal:

```bash
ssh root@your_vps_ip
```

Update and Upgrade Your System:

```bash
sudo apt update && sudo apt upgrade -y
```

Install Node.js and npm (using NVM):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

\. "$HOME/.nvm/nvm.sh"

nvm install 24
```

Install Git:

```bash
sudo apt install -y git
```

### 2. Setting Up the PostgreSQL Database

Install PostgreSQL:

```bash
sudo apt install postgresql postgresql-contrib -y
```

Start and Enable PostgreSQL Service:

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Configure a New Database and User:

```bash
# Switch to the postgres user
sudo -i -u postgres

# Enter the PostgreSQL prompt
psql

# Create database, user, and grant privileges
CREATE DATABASE your_db_name;
CREATE USER your_user WITH ENCRYPTED PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE your_db_name TO your_user;

# Exit psql and the postgres user
\q
exit
```

### 3. Deploying the Express and Node.js Backend

#### Configure SSH for GitHub (skip if using HTTPS)

Generate an SSH key pair on your VPS:

````bash
ssh-keygen -t ed25519

Press Enter to accept the default file location and optionally set a passphrase.

Start the SSH agent and add your key:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
````

Display the public key and copy it:

```bash
cat ~/.ssh/id_ed25519.pub
```

Add this key to your GitHub account under **Settings > SSH and GPG keys > New SSH key**. Then test the connection:

```bash
ssh -T git@github.com
```

Clone Your Backend Repository:

```bash
mkdir -p /var/www
cd /var/www
git clone git@github.com:yourusername/your-repo.git
cd your-repo/backend
```

Install Dependencies:

```bash
npm install
```

Create `.env` file and configure Environment Variables:

```bash
nano .env
```

> **Note:** Ensure your `DATABASE_URL` matches the credentials created in Step 2 (e.g., `postgresql://your_user:your_password@localhost:5432/your_db_name`).

Installing PM2 to Start Backend:

```bash
npm install -g pm2
pm2 start server.js --name project-backend
pm2 startup
pm2 save
```

Allowing backend port in firewall:

```bash
sudo ufw allow 4000
sudo ufw allow 'OpenSSH'
sudo ufw enable
```

### 4. Testing DNS Resolution Between Server and Domain

Before configuring Nginx, verify your domain resolves to the correct VPS IP:

```bash
dig +short api.yourdomain.com
```

This should return your VPS IP address. If your domain uses Cloudflare, query Cloudflare's DNS directly:

```bash
dig +short api.yourdomain.com @1.1.1.1
```

If it returns a Cloudflare IP (not your VPS IP), your proxy (orange cloud) is enabled. If it returns your VPS IP, DNS is correctly pointing to your server. Update your domain's DNS A record if needed and wait for propagation.

---

### 5. Configuring Nginx as a Reverse Proxy

Install Nginx:

```bash
sudo apt install -y nginx
sudo ufw allow 'Nginx Full'
```

Create Nginx Configuration for your Domain/API:

```bash
nano /etc/nginx/sites-available/api.yourdomain.com.conf
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

or

server {
    listen 80;
    server_name docker-test.buildstack.site;

    location / {
        proxy_pass http://localhost:3000; # This matches your Docker port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Standard headers to pass the real user's IP to Node.js
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and restart Nginx:

```bash
# Create the link
sudo ln -s /etc/nginx/sites-available/docker-test.buildstack.site /etc/nginx/sites-enabled/

# Test the syntax for errors
sudo nginx -t

# If it says 'syntax is ok', restart Nginx
sudo systemctl restart nginx

```

### 6. Setting Up SSL Certificates

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Obtain SSL Certificate:

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Verify Auto-Renewal:

```bash
sudo certbot renew --dry-run
```

---
