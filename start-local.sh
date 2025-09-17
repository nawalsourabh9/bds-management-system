#!/bin/bash

echo "🚀 Starting BDS Management System - Local Development (Simplified)"
echo "=================================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

# Check if local PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ Local PostgreSQL is not running. Please start it first:"
    echo "   brew services start postgresql@17"
    exit 1
fi

echo "✅ Docker is running"
echo "✅ docker-compose is available"
echo "✅ Local PostgreSQL is running"

# Stop any existing containers and clean up
echo "🛑 Stopping existing containers..."
docker-compose down

# Kill any processes using our ports
echo "🔍 Checking for port conflicts..."
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Port 3000 is in use, killing process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

if lsof -ti:8002 > /dev/null 2>&1; then
    echo "⚠️  Port 8002 is in use, killing process..."
    lsof -ti:8002 | xargs kill -9 2>/dev/null || true
fi

# Remove any orphaned containers
echo "🧹 Cleaning up orphaned containers..."
docker-compose down --remove-orphans

# Remove any dangling images
echo "🧹 Cleaning up dangling images..."
docker image prune -f

# Generate build timestamp and version
BUILD_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BUILD_VERSION="v1.0.0-${BUILD_TIMESTAMP}"

echo "🔨 Building and starting services..."
echo "📦 Build Version: ${BUILD_VERSION}"
echo "🕐 Build Timestamp: $(date)"

# Build with version tags
docker-compose build --build-arg BUILD_VERSION="${BUILD_VERSION}" --build-arg BUILD_TIMESTAMP="${BUILD_TIMESTAMP}"

# Start services
docker-compose up -d

# Tag images with version
echo "🏷️  Tagging images with version..."
docker tag bds-management-system-backend:latest bds-management-system-backend:${BUILD_VERSION} 2>/dev/null || true
docker tag bds-management-system-frontend:latest bds-management-system-frontend:${BUILD_VERSION} 2>/dev/null || true

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check service health
echo "🔍 Checking service health..."

# Create build log entry
BUILD_LOG_FILE="builds.log"
echo "${BUILD_TIMESTAMP}|${BUILD_VERSION}|$(date)|STARTED" >> ${BUILD_LOG_FILE}

# Check Backend
BACKEND_STATUS="❌"
if curl -f http://localhost:8002/health > /dev/null 2>&1; then
    echo "✅ Backend is ready"
    BACKEND_STATUS="✅"
    
    # Get backend health details
    BACKEND_HEALTH=$(curl -s http://localhost:8002/health | jq -r '.database.status, .database.user_count' 2>/dev/null || echo "unknown")
    echo "   Database: ${BACKEND_HEALTH}"
else
    echo "❌ Backend is not ready"
    echo "   Check logs: docker-compose logs backend"
fi

# Check Frontend
FRONTEND_STATUS="❌"
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is ready"
    FRONTEND_STATUS="✅"
else
    echo "❌ Frontend is not ready"
    echo "   Check logs: docker-compose logs frontend"
fi

# Log build results
echo "${BUILD_TIMESTAMP}|${BUILD_VERSION}|$(date)|COMPLETED|${BACKEND_STATUS}|${FRONTEND_STATUS}" >> ${BUILD_LOG_FILE}

echo ""
echo "🎉 BDS Management System is ready!"
echo ""
echo "📋 Service URLs:"
echo "  Frontend:    http://localhost:3000"
echo "  Backend:     http://localhost:8002"
echo "  Database:    Local Mac PostgreSQL (taklu:0071@localhost:5432/bds_management_system)"
echo ""
echo "📦 Build Information:"
echo "  Version:     ${BUILD_VERSION}"
echo "  Timestamp:   ${BUILD_TIMESTAMP}"
echo "  Status:      Backend: ${BACKEND_STATUS} | Frontend: ${FRONTEND_STATUS}"
echo ""
echo "🔧 Useful commands:"
echo "  View logs:    docker-compose logs -f [service_name]"
echo "  Stop all:     docker-compose down"
echo "  Restart:      docker-compose restart [service_name]"
echo "  Shell access: docker-compose exec [service_name] sh"
echo "  Build history: cat builds.log"
echo "  Image versions: docker images | grep bds-management-system"
echo ""
echo "📊 To view logs: docker-compose logs -f"
echo ""
echo "🧪 Test the application:"
echo "  - Open http://localhost:3000 in your browser"
echo "  - Check user management functionality"
echo "  - Test API endpoints at http://localhost:8002/docs"
echo ""
echo "📈 Build tracking enabled - check builds.log for history"

