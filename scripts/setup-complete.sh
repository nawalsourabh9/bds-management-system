#!/bin/bash

# BDS Management System - Complete Setup Script
# Handles Database → Backend → Frontend setup in order

set -e

echo "🚀 BDS Management System - Complete Setup"
echo "========================================="

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

# Check dependencies
print_status "Checking dependencies..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check pip
if ! command -v pip3 &> /dev/null; then
    print_error "pip3 is not installed. Please install pip3 first."
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "All dependencies are installed!"

# Step 1: Database Setup
echo ""
print_status "Step 1: Setting up Database..."
print_status "Stopping any existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

print_status "Creating necessary directories..."
mkdir -p database/backups
mkdir -p uploads

print_status "Starting Docker containers..."
docker-compose up -d postgres redis pgadmin

print_status "Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U bds_user -d bds_management; do
    print_status "PostgreSQL is starting up..."
    sleep 5
done

print_success "PostgreSQL is ready!"

# Wait a bit more for full initialization
sleep 10

print_status "Setting up BDS schema..."
docker-compose exec -T postgres psql -U bds_user -d bds_management -f /docker-entrypoint-initdb.d/01-init.sql

print_status "Loading BDS seed data with Indian names..."
docker-compose exec -T postgres psql -U bds_user -d bds_management -f /docker-entrypoint-initdb.d/02-seed.sql

# Verify database setup
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

print_success "Database setup completed!"

# Step 2: Backend Setup
echo ""
print_status "Step 2: Setting up Python Backend..."

# Check if backend directory exists
if [ ! -d "backend" ]; then
    print_error "Backend directory not found!"
    exit 1
fi

print_status "Installing Python dependencies..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
print_status "Installing backend dependencies..."
source venv/bin/activate
pip install -r requirements.txt

# Create .env file for backend
print_status "Creating backend environment file..."
cat > .env << EOF
DATABASE_URL=postgresql://bds_user:bds_password_2024@localhost:5432/bds_management
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-super-secret-key-change-in-production
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
STORAGE_TYPE=local
UPLOAD_DIR=./uploads
LOG_LEVEL=INFO
DEFAULT_TIMEZONE=Asia/Kolkata
EOF

cd ..
print_success "Backend setup completed!"

# Step 3: Frontend Setup
echo ""
print_status "Step 3: Setting up Frontend..."

# Check if frontend dependencies are installed
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
else
    print_status "Frontend dependencies already installed."
fi

# Create environment file for frontend
print_status "Creating frontend environment file..."
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=BDS Management System
EOF

print_success "Frontend setup completed!"

# Step 4: Start Services
echo ""
print_status "Step 4: Starting all services..."

# Start backend
print_status "Starting Python backend server..."
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5

# Start frontend
print_status "Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 10

print_success "All services started!"

# Final Summary
echo ""
print_success "🎉 BDS Management System setup completed successfully!"
echo ""
echo "📊 Access Information:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo "   API Documentation: http://localhost:8000/docs"
echo "   PostgreSQL: localhost:5432"
echo "   PgAdmin: http://localhost:8080"
echo ""
echo "👥 Test Users (Password: admin123):"
echo "   SuperAdmin: admin@bdsmanufacturing.in"
echo "   Admin: sourabh.nawal@bdsmanufacturing.in"
echo "   Quality Manager: priya.sharma@bdsmanufacturing.in"
echo "   Production Manager: rajesh.kumar@bdsmanufacturing.in"
echo ""
echo "🔧 API Endpoints:"
echo "   Health Check: http://localhost:8000/health"
echo "   Users: http://localhost:8000/api/v1/users"
echo "   Tasks: http://localhost:8000/api/v1/tasks"
echo "   Departments: http://localhost:8000/api/v1/departments"
echo ""
echo "📁 Useful Commands:"
echo "   Stop all services: pkill -f 'uvicorn' && pkill -f 'vite' && docker-compose down"
echo "   View logs: docker-compose logs -f"
echo "   Restart backend: cd backend && source venv/bin/activate && python -m uvicorn app.main:app --reload"
echo "   Restart frontend: npm run dev"
echo ""
print_success "🚀 Ready to test the BDS Management System!"

# Keep script running to maintain services
echo ""
print_status "Press Ctrl+C to stop all services..."
wait
