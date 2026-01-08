#!/bin/bash

echo "🐳 Starting BDS Management System with Docker"
echo "=============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install it first."
    exit 1
fi

# Check for .env file
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

echo "🔧 Building and starting all services..."
docker-compose --env-file .env up --build -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "📊 Checking service status..."
docker-compose ps

echo ""
echo "✅ Services started successfully!"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend:     http://localhost:3001"
echo "   Backend API:  http://localhost:8002"
echo "   API Docs:     http://localhost:8002/docs"
echo "   PostgreSQL:   localhost:5432"
echo "   Redis:        localhost:6379"
echo ""
echo "🔑 Login Credentials:"
echo "   Email:    admin@bds.com"
echo "   Password: admin123"
echo ""
echo "📝 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:       docker-compose restart"
echo ""
echo "�� System is ready!"
