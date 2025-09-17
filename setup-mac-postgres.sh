#!/bin/bash

echo "🍎 Setting up BDS Management System with Mac PostgreSQL"
echo "======================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Current Setup:${NC}"
echo "├── Mac PostgreSQL 17: Running on localhost:5432"
echo "├── Docker PostgreSQL: Stopped"
echo "└── Need to configure backend to use Mac PostgreSQL"
echo ""

echo -e "${YELLOW}🔧 Configuration Steps:${NC}"
echo ""

# Step 1: Create database
echo "1. Creating database on Mac PostgreSQL..."
psql -h localhost -U $(whoami) -d postgres -c "CREATE DATABASE bds_management;" 2>/dev/null || echo "   Database might already exist, continuing..."

# Step 2: Update backend configuration
echo ""
echo "2. Updating backend configuration..."
cat > backend/.env << EOF
# Mac PostgreSQL Configuration
DATABASE_URL=postgresql://$(whoami)@localhost:5432/bds_management

# Redis (still using Docker)
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-super-secret-key-change-in-production
JWT_SECRET=your-jwt-secret-key-change-in-production

# Storage
STORAGE_TYPE=local
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=INFO
LOG_FILE=./logs/app.log

# Timezone
DEFAULT_TIMEZONE=Asia/Kolkata

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:3002

# Celery
CELERY_WORKER=false
EOF

echo "   ✅ Backend configuration updated"

# Step 3: Update docker-compose to exclude PostgreSQL
echo ""
echo "3. Creating docker-compose override for Mac PostgreSQL..."
cat > docker-compose.override.yml << EOF
version: '3.8'

services:
  # Remove PostgreSQL and pgAdmin services
  postgres:
    profiles:
      - disabled
  
  pgadmin:
    profiles:
      - disabled
  
  # Update backend to use host network for Mac PostgreSQL
  backend:
    environment:
      - DATABASE_URL=postgresql://$(whoami)@host.docker.internal:5432/bds_management
    extra_hosts:
      - "host.docker.internal:host-gateway"
EOF

echo "   ✅ Docker Compose override created"

# Step 4: Run database migrations
echo ""
echo "4. Setting up database schema..."
echo "   You can run the database setup script:"
echo "   ./setup-database.sh"

echo ""
echo -e "${GREEN}✅ Configuration Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Run database setup: ./setup-database.sh"
echo "2. Start services: docker-compose up -d backend frontend redis"
echo "3. Access frontend: http://localhost:3000"
echo "4. Access backend: http://localhost:8002"
echo ""
echo -e "${YELLOW}💡 Benefits of using Mac PostgreSQL:${NC}"
echo "├── Faster database access"
echo "├── No Docker container overhead"
echo "├── Direct access to database files"
echo "├── Use your existing PostgreSQL tools"
echo "└── Better performance for development"
echo ""
echo -e "${BLUE}🔧 To revert to Docker PostgreSQL:${NC}"
echo "├── Remove docker-compose.override.yml"
echo "├── Restart: docker-compose up -d"
echo "└── Update backend/.env to use Docker PostgreSQL"

