#!/bin/bash

echo "🧪 BDS Management System - Comprehensive Test Suite"
echo "==================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test results
BACKEND_TESTS_PASSED=0
BACKEND_TESTS_FAILED=0
FRONTEND_TESTS_PASSED=0
FRONTEND_TESTS_FAILED=0

echo -e "\n${PURPLE}🚀 Starting Comprehensive Test Suite${NC}"
echo "============================================="

# Check if services are running
echo -e "\n${BLUE}🔍 Checking Service Status${NC}"
echo "=============================="

# Check backend
if curl -f http://localhost:8002/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
    backend_health=$(curl -s http://localhost:8002/health | jq -r '.database.status, .database.user_count' 2>/dev/null || echo "unknown")
    echo "   Database: ${backend_health}"
else
    echo -e "${RED}❌ Backend is not running${NC}"
    echo -e "${YELLOW}Please start the backend first: ./start-local.sh${NC}"
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend is not running${NC}"
    echo -e "${YELLOW}Please start the frontend first: ./start-local.sh${NC}"
    exit 1
fi

# Run backend tests
echo -e "\n${PURPLE}🔧 Running Backend API Tests${NC}"
echo "================================"
if ./test-backend-api.sh; then
    echo -e "${GREEN}✅ Backend tests completed successfully${NC}"
    BACKEND_TESTS_PASSED=1
else
    echo -e "${RED}❌ Backend tests failed${NC}"
    BACKEND_TESTS_FAILED=1
fi

# Run frontend tests
echo -e "\n${PURPLE}🌐 Running Frontend Integration Tests${NC}"
echo "======================================="
if ./test-frontend-integration.sh; then
    echo -e "${GREEN}✅ Frontend tests completed successfully${NC}"
    FRONTEND_TESTS_PASSED=1
else
    echo -e "${RED}❌ Frontend tests failed${NC}"
    FRONTEND_TESTS_FAILED=1
fi

# Generate detailed report
echo -e "\n${PURPLE}📊 Comprehensive Test Report${NC}"
echo "============================="

echo -e "\n${BLUE}Backend API Tests:${NC}"
if [ $BACKEND_TESTS_PASSED -eq 1 ]; then
    echo -e "  ${GREEN}✅ All backend API tests passed${NC}"
    echo -e "  ${GREEN}  - User management APIs working${NC}"
    echo -e "  ${GREEN}  - Task management APIs working${NC}"
    echo -e "  ${GREEN}  - Error handling working${NC}"
    echo -e "  ${GREEN}  - Database connectivity working${NC}"
else
    echo -e "  ${RED}❌ Backend API tests failed${NC}"
    echo -e "  ${YELLOW}  - Check backend logs: docker-compose logs backend${NC}"
    echo -e "  ${YELLOW}  - Check database connection${NC}"
    echo -e "  ${YELLOW}  - Verify API endpoints are implemented${NC}"
fi

echo -e "\n${BLUE}Frontend Integration Tests:${NC}"
if [ $FRONTEND_TESTS_PASSED -eq 1 ]; then
    echo -e "  ${GREEN}✅ All frontend integration tests passed${NC}"
    echo -e "  ${GREEN}  - Frontend accessible${NC}"
    echo -e "  ${GREEN}  - CORS configured correctly${NC}"
    echo -e "  ${GREEN}  - API integration working${NC}"
    echo -e "  ${GREEN}  - Error handling working${NC}"
else
    echo -e "  ${RED}❌ Frontend integration tests failed${NC}"
    echo -e "  ${YELLOW}  - Check frontend logs: docker-compose logs frontend${NC}"
    echo -e "  ${YELLOW}  - Check CORS configuration${NC}"
    echo -e "  ${YELLOW}  - Verify API service integration${NC}"
fi

# Overall status
echo -e "\n${BLUE}Overall Status:${NC}"
if [ $BACKEND_TESTS_PASSED -eq 1 ] && [ $FRONTEND_TESTS_PASSED -eq 1 ]; then
    echo -e "  ${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "  ${GREEN}  Your BDS Management System is working correctly!${NC}"
    echo -e "\n${GREEN}✅ Ready for production use:${NC}"
    echo -e "  ${GREEN}  - Frontend: http://localhost:3000${NC}"
    echo -e "  ${GREEN}  - Backend API: http://localhost:8002${NC}"
    echo -e "  ${GREEN}  - API Docs: http://localhost:8002/docs${NC}"
    exit 0
else
    echo -e "  ${RED}⚠️  SOME TESTS FAILED${NC}"
    echo -e "  ${YELLOW}  Please fix the issues above before proceeding.${NC}"
    
    # Provide specific recommendations
    echo -e "\n${YELLOW}🔧 Recommended Actions:${NC}"
    
    if [ $BACKEND_TESTS_FAILED -eq 1 ]; then
        echo -e "  ${YELLOW}Backend Issues:${NC}"
        echo -e "    - Check backend container: docker-compose logs backend"
        echo -e "    - Verify database connection"
        echo -e "    - Check API endpoint implementations"
        echo -e "    - Restart backend: docker-compose restart backend"
    fi
    
    if [ $FRONTEND_TESTS_FAILED -eq 1 ]; then
        echo -e "  ${YELLOW}Frontend Issues:${NC}"
        echo -e "    - Check frontend container: docker-compose logs frontend"
        echo -e "    - Verify CORS configuration in backend"
        echo -e "    - Check API service configuration"
        echo -e "    - Restart frontend: docker-compose restart frontend"
    fi
    
    echo -e "\n${YELLOW}🔄 Try running: ./start-local.sh${NC}"
    exit 1
fi
