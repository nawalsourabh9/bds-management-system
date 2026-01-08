#!/bin/bash

# BDS Management System - Complete Setup Script
set -e

echo "🚀 Starting BDS Management System Setup..."

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

# Check requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install Python 3.9+ first."
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL is not installed. Will install it..."
        install_postgresql
    fi
    
    if ! command -v redis-server &> /dev/null; then
        print_warning "Redis is not installed. Will install it..."
        install_redis
    fi
    
    print_success "System requirements check completed"
}

# Install PostgreSQL
install_postgresql() {
    print_status "Installing PostgreSQL..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! command -v brew &> /dev/null; then
            print_error "Homebrew is not installed. Please install Homebrew first."
            exit 1
        fi
        brew install postgresql@15
        brew services start postgresql@15
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    else
        print_error "Unsupported operating system"
        exit 1
    fi
    
    print_success "PostgreSQL installed and started"
}

# Install Redis
install_redis() {
    print_status "Installing Redis..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install redis
        brew services start redis
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install -y redis-server
        sudo systemctl start redis-server
        sudo systemctl enable redis-server
    else
        print_error "Unsupported operating system"
        exit 1
    fi
    
    print_success "Redis installed and started"
}

# Create project structure
create_project_structure() {
    print_status "Creating project structure..."
    
    # Create backend and database directories
    mkdir -p backend
    mkdir -p database
    mkdir -p scripts
    mkdir -p docs
    mkdir -p docker
    
    # Backend structure
    mkdir -p backend/app/{models,schemas,api/v1,services,core,utils}
    mkdir -p backend/{alembic,tests,logs}
    
    # Database structure
    mkdir -p database/{migrations,seeds,backups}
    
    print_success "Project structure created"
}

# Setup database
setup_database() {
    print_status "Setting up PostgreSQL database..."
    
    psql -U postgres -c "CREATE DATABASE bds_management;" 2>/dev/null || print_warning "Database might already exist"
    psql -U postgres -c "CREATE USER bds_user WITH PASSWORD 'bds_password_2024';" 2>/dev/null || print_warning "User might already exist"
    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE bds_management TO bds_user;" 2>/dev/null || true
    psql -U postgres -c "ALTER USER bds_user CREATEDB;" 2>/dev/null || true
    
    print_success "Database setup completed"
}

# Setup backend
setup_backend() {
    print_status "Setting up Python backend..."
    
    cd backend
    
    python3 -m venv venv
    source venv/bin/activate
    
    # Create requirements.txt
    cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
psycopg2-binary==2.9.9
redis==5.0.1
celery==5.3.4
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
aiofiles==23.2.1
azure-storage-blob==12.19.0
azure-identity==1.15.0
prometheus-client==0.19.0
loguru==0.7.2
pytz==2023.3
python-dateutil==2.8.2
EOF
    
    pip install -r requirements.txt
    
    # Create .env file
    cat > .env << 'EOF'
DATABASE_URL=postgresql://bds_user:bds_password_2024@localhost:5432/bds_management
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
STORAGE_TYPE=local
UPLOAD_DIR=./uploads
LOG_LEVEL=INFO
LOG_FILE=./logs/app.log
DEFAULT_TIMEZONE=Asia/Kolkata
EOF
    
    cd ..
    print_success "Backend setup completed"
}

# Setup frontend (update existing frontend in root)
setup_frontend() {
    print_status "Setting up React frontend..."
    
    # Install additional dependencies for the existing frontend
    npm install @tanstack/react-query react-router-dom lucide-react clsx tailwind-merge class-variance-authority
    npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs
    npm install @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-accordion @radix-ui/react-alert-dialog
    npm install @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-label @radix-ui/react-popover
    npm install @radix-ui/react-progress @radix-ui/react-scroll-area @radix-ui/react-separator @radix-ui/react-slider
    npm install @radix-ui/react-switch @radix-ui/react-tooltip react-hook-form @hookform/resolvers zod
    npm install date-fns recharts sonner tailwindcss-animate @types/node --save-dev
    
    # Create .env file
    cat > .env << 'EOF'
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
VITE_APP_NAME=BDS Management System
EOF
    
    print_success "Frontend setup completed"
}

# Create startup scripts
create_startup_scripts() {
    print_status "Creating startup scripts..."
    
    cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting BDS Management System in Development Mode..."

# Start backend
echo "Starting Backend API..."
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend (in root directory)
echo "Starting Frontend..."
npm run dev &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID
EOF
    
    chmod +x start-dev.sh
    
    print_success "Startup scripts created"
}

# Main execution
main() {
    check_requirements
    create_project_structure
    setup_database
    setup_backend
    setup_frontend
    create_startup_scripts
    
    print_success "🎉 BDS Management System setup completed successfully!"
    print_status "Next steps:"
    print_status "1. Start development servers: ./start-dev.sh"
    print_status "2. Access the application at http://localhost:3000"
    print_status "3. API documentation at http://localhost:8000/docs"
}

main "$@"
