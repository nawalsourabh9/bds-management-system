#!/bin/bash

set -e

echo "🗄️  BDS Management System - Database Setup"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from example..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Created .env from env.example"
        echo "📝 Please edit .env file with your configuration before continuing"
        echo "   Press Enter to continue or Ctrl+C to edit .env first"
        read -r
    else
        echo "❌ No env.example file found. Please create .env file manually."
        exit 1
    fi
fi

# Load environment variables
source .env

echo "🔧 Setting up PostgreSQL database..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down postgres 2>/dev/null || true

# Remove existing PostgreSQL volume to start fresh
echo "🧹 Removing existing PostgreSQL data..."
docker volume rm bds-management-system_postgres_data 2>/dev/null || true

# Start PostgreSQL container
echo "🚀 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Check if schema files exist
if [ ! -f "database/schema/01-bds_schema.sql" ]; then
    echo "❌ Schema file not found: database/schema/01-bds_schema.sql"
    exit 1
fi

if [ ! -f "database/schema/02-seed_data.sql" ]; then
    echo "❌ Seed data file not found: database/schema/02-seed_data.sql"
    exit 1
fi

echo "📋 Database schema files found:"
echo "   ✅ database/schema/01-bds_schema.sql"
echo "   ✅ database/schema/02-seed_data.sql"

# Wait a bit more for initialization to complete
echo "⏳ Waiting for database initialization to complete..."
sleep 10

# Verify database setup
echo "🔍 Verifying database setup..."

# Check if tables exist
TABLES=$(docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | grep -E "(departments|users|tasks|documents)" | wc -l)

if [ "$TABLES" -ge 4 ]; then
    echo "✅ Database tables created successfully"
else
    echo "❌ Database tables not found. Checking logs..."
    docker-compose logs postgres
    exit 1
fi

# Check if data was inserted
USERS_COUNT=$(docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
DEPARTMENTS_COUNT=$(docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM departments;" 2>/dev/null | tr -d ' ')
TASKS_COUNT=$(docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM tasks;" 2>/dev/null | tr -d ' ')

echo "📊 Database statistics:"
echo "   👥 Users: $USERS_COUNT"
echo "   🏢 Departments: $DEPARTMENTS_COUNT"
echo "   📋 Tasks: $TASKS_COUNT"

# Test connection with admin user
echo "🔐 Testing admin login..."
ADMIN_EXISTS=$(docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM users WHERE email = 'admin@bds.com';" 2>/dev/null | tr -d ' ')

if [ "$ADMIN_EXISTS" -eq 1 ]; then
    echo "✅ Admin user created successfully"
else
    echo "❌ Admin user not found"
    exit 1
fi

echo ""
echo "🎉 Database setup completed successfully!"
echo ""
echo "📋 Database Information:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: $POSTGRES_DB"
echo "   Username: $POSTGRES_USER"
echo "   Password: $POSTGRES_PASSWORD"
echo ""
echo "🔑 Login Credentials:"
echo "   Email: admin@bds.com"
echo "   Password: admin123"
echo ""
echo "📁 Database Schema Files:"
echo "   Schema: database/schema/01-bds_schema.sql"
echo "   Seed Data: database/schema/02-seed_data.sql"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: ./setup-backend.sh"
echo "   2. Run: ./setup-frontend.sh"
echo "   3. Or run: ./deploy.sh (for full deployment)"
echo ""
