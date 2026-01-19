#!/bin/bash

# Simple deployment script for ShugoVision
# To be run on the production VM

set -e

echo "🚀 Starting deployment..."

# 1. Pull latest changes from git
echo "📥 Pulling latest code changes..."
git pull origin main

# 2. Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found! Creating from .env.example..."
    cp .env.example .env
    echo "🚨 Please edit .env and run this script again."
    exit 1
fi

# 3. Pull/Build and restart containers
echo "🏗️  Rebuilding and restarting containers (Production Mode)..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 4. Clean up old images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "✅ Deployment finished successfully!"
echo "📍 Access your app at: http://server-monitor.ushuaia.gob.ar"
