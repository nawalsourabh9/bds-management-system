#!/bin/bash

echo "🔍 BDS Management System - Port Status Check"
echo "============================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 Current Port Status:${NC}"

# Check Backend (Port 8002)
if curl -s http://localhost:8002/health > /dev/null; then
    echo -e "${GREEN}✅ Backend API: http://localhost:8002 (Running)${NC}"
    echo "   └── Health: $(curl -s http://localhost:8002/health | jq -r '.status' 2>/dev/null || echo 'healthy')"
else
    echo -e "${RED}❌ Backend API: http://localhost:8002 (Not Running)${NC}"
fi

# Check Frontend (Port 3001)
if curl -s -I http://localhost:3001 > /dev/null; then
    echo -e "${GREEN}✅ Frontend: http://localhost:3001 (Running)${NC}"
else
    echo -e "${RED}❌ Frontend: http://localhost:3001 (Not Running)${NC}"
fi

# Check API Documentation
if curl -s -I http://localhost:8002/docs > /dev/null; then
    echo -e "${GREEN}✅ API Docs: http://localhost:8002/docs (Available)${NC}"
else
    echo -e "${RED}❌ API Docs: http://localhost:8002/docs (Not Available)${NC}"
fi

echo ""
echo -e "${YELLOW}🔧 Quick Commands:${NC}"
echo "├── Start both: ./start-simple.sh"
echo "├── Backend only: cd backend && source venv/bin/activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload"
echo "├── Frontend only: npm run dev"
echo "└── Stop all: pkill -f 'uvicorn\|vite'"

echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo "├── Frontend: http://localhost:3001"
echo "├── Backend API: http://localhost:8002"
echo "├── API Documentation: http://localhost:8002/docs"
echo "└── Login: admin@bds.com / admin123"
