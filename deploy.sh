#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest code
cd /var/www/your-project
git pull origin main

# Build and restart containers
docker compose down
docker compose up -d --build

# Run migrations
docker exec -it nest-api npx prisma migrate deploy

# Verify
docker compose ps
echo "✅ Deployment complete"
