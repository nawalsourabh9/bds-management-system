#!/bin/bash

# BDS Management System - Docker Setup Script
# Simple setup using Docker Compose with consolidated seed data

set -e

echo "🚀 BDS Management System - Docker Setup"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Stop any existing containers
print_status "Stopping any existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p database/backups
mkdir -p uploads

# Start Docker containers
print_status "Starting Docker containers..."
docker-compose up -d postgres redis pgadmin

# Wait for PostgreSQL to be ready
print_status "Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U bds_user -d bds_management; do
    print_status "PostgreSQL is starting up..."
    sleep 5
done

print_success "PostgreSQL is ready!"

# Wait a bit more for full initialization
sleep 10

# Run the main schema file
print_status "Setting up BDS schema..."
docker-compose exec -T postgres psql -U bds_user -d bds_management -f /docker-entrypoint-initdb.d/01-bds_schema.sql

# Run the seed data file
print_status "Loading BDS seed data with Indian names..."
docker-compose exec -T postgres psql -U bds_user -d bds_management -f /docker-entrypoint-initdb.d/02-seed_data.sql

# Verify the setup
print_status "Verifying database setup..."

echo ""
print_status "Database Statistics:"
docker-compose exec -T postgres psql -U bds_user -d bds_management -c "
SELECT 
    'Tables created:' as info,
    COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public';
"

docker-compose exec -T postgres psql -U bds_user -d bds_management -c "
SELECT 
    'Users created:' as info,
    COUNT(*) as count 
FROM users;
"

docker-compose exec -T postgres psql -U bds_user -d bds_management -c "
SELECT 
    'Tasks created:' as info,
    COUNT(*) as count 
FROM tasks;
"

docker-compose exec -T postgres psql -U bds_user -d bds_management -c "
SELECT 
    'Departments created:' as info,
    COUNT(*) as count 
FROM departments;
"

# Show container status
echo ""
print_status "Container Status:"
docker-compose ps

echo ""
print_success "🎉 Docker setup completed successfully!"
echo ""
echo "📊 Access Information:"
echo "   PostgreSQL: localhost:5432"
echo "   Database: bds_management"
echo "   Username: bds_user"
echo "   Password: bds_password_2024"
echo ""
echo "🌐 PgAdmin (Database Management):"
echo "   URL: http://localhost:8080"
echo "   Email: admin@bds.com"
echo "   Password: admin123"
echo ""
echo "🔗 Connection String:"
echo "   postgresql://bds_user:bds_password_2024@localhost:5432/bds_management"
echo ""
echo "👥 Test Users (Password: admin123):"
echo "   Admin: admin@bds.com"
echo "   Executive: sourabh.nawal@bdsmanufacturing.in"
echo "   Quality Manager: priya.sharma@bdsmanufacturing.in"
echo "   Production Manager: rajesh.kumar@bdsmanufacturing.in"
echo ""
echo "📁 Useful Commands:"
echo "   View logs: docker-compose logs -f postgres"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Backup database: docker-compose exec postgres pg_dump -U bds_user bds_management > backup.sql"
echo ""
print_success "🚀 Ready to test the BDS Management System!"
