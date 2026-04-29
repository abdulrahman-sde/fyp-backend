# HireFlow Backend

## Development (Docker)

From `backend/`:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yaml up -d --build
```

Apply migrations (dev DB in compose):

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yaml exec backend npx prisma migrate deploy
```

## Production on EC2 (Docker Compose + Nginx + RDS)

This assumes:

- You have an Ubuntu EC2 instance
- Your Postgres is on RDS
- DNS points `api.yourdomain.com` to this EC2 public IP
- Nginx runs on the EC2 host and proxies to the backend container on `127.0.0.1:4000`

### 1) Install Docker + Compose on EC2

On the EC2 host:

```bash
sudo apt update
sudo apt -y upgrade

sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

docker --version
docker compose version
```

(Recommended) allow running docker without sudo:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 2) Clone repo and set production env

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www

cd /var/www
git clone <YOUR_REPO_URL> hireflow
cd /var/www/hireflow/backend

cp .env.prod.example .env.prod
nano .env.prod
```

Fill at least:

- `DATABASE_URL` (your RDS connection string)
- `FRONTEND_ORIGIN` (your Vercel domain)
- `JWT_SECRET`
- `LIVEKIT_*`
- `AGENT_WEBHOOK_SECRET`
- provider keys (`GROQ_API_KEY`, `OPENAI_API_KEY`, etc.)

### 3) Build + run the production container

```bash
cd /var/www/hireflow/backend

docker compose --env-file .env.prod -f docker-compose.prod.yaml up -d --build

docker compose --env-file .env.prod -f docker-compose.prod.yaml ps
```

### 4) Run Prisma migrations against RDS

This uses the `migrate` tool service (it includes the Prisma CLI):

```bash
cd /var/www/hireflow/backend

docker compose --env-file .env.prod -f docker-compose.prod.yaml --profile tools run --rm migrate
```

### 5) Install and configure Nginx on EC2

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

Create an Nginx site config:

```bash
sudo tee /etc/nginx/sites-available/hireflow-backend >/dev/null <<'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

Enable it:

```bash
sudo ln -sf /etc/nginx/sites-available/hireflow-backend /etc/nginx/sites-enabled/hireflow-backend
sudo nginx -t
sudo systemctl restart nginx
```

### 6) Add HTTPS (Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### 7) Verify

Local container port (host-only):

```bash
curl -i http://127.0.0.1:4000
```

Public API domain:

```bash
curl -i https://api.yourdomain.com
```

### Useful ops commands

```bash
cd /var/www/hireflow/backend

docker compose --env-file .env.prod -f docker-compose.prod.yaml logs -f

docker compose --env-file .env.prod -f docker-compose.prod.yaml pull

docker compose --env-file .env.prod -f docker-compose.prod.yaml up -d --build
```
