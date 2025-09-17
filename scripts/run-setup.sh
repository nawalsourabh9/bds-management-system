#!/bin/bash

echo "🚀 BDS Management System - Complete Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if we're in the right directory
if [ ! -f "setup-project.sh" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting complete setup process..."

# Step 1: Run main project setup
print_status "Step 1: Setting up project structure and dependencies..."
./setup-project.sh

if [ $? -ne 0 ]; then
    print_error "Project setup failed"
    exit 1
fi

# Step 2: Setup backend
print_status "Step 2: Setting up backend..."
./setup-backend.sh

if [ $? -ne 0 ]; then
    print_error "Backend setup failed"
    exit 1
fi

# Step 3: Setup frontend
print_status "Step 3: Setting up frontend..."
./setup-frontend.sh

if [ $? -ne 0 ]; then
    print_error "Frontend setup failed"
    exit 1
fi

# Step 4: Setup database
print_status "Step 4: Setting up database..."
./setup-database.sh

if [ $? -ne 0 ]; then
    print_error "Database setup failed"
    exit 1
fi

# Step 5: Make startup script executable
chmod +x start-dev.sh

print_success "🎉 Complete setup finished successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Start the development servers:"
echo "   ./start-dev.sh"
echo ""
echo "2. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "3. Default login credentials:"
echo "   Email: admin@bds.com"
echo "   Password: admin123"
echo ""
echo "4. For Azure deployment:"
echo "   ./setup-azure.sh"
echo ""
print_status "Happy coding! 🚀"
