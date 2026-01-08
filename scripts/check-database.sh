#!/bin/bash

echo "🗄️ BDS Management System - Database Check"
echo "========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://localhost:8002"

echo -e "${BLUE}📊 Database Status Check:${NC}"

# Check if backend is running
if ! curl -s $API_BASE/health > /dev/null; then
    echo -e "${RED}❌ Backend is not running. Please start the backend first.${NC}"
    exit 1
fi

# Get health status
echo -e "${BLUE}🔍 Health Check:${NC}"
HEALTH_RESPONSE=$(curl -s $API_BASE/health)
echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"

echo ""
echo -e "${BLUE}🗄️ Database Details:${NC}"
DB_STATUS=$(curl -s $API_BASE/api/v1/database/status)
echo "$DB_STATUS" | jq '.' 2>/dev/null || echo "$DB_STATUS"

echo ""
echo -e "${BLUE}📋 Data Tables:${NC}"

# Check Users
echo -e "${YELLOW}👥 Users:${NC}"
USERS_RESPONSE=$(curl -s $API_BASE/api/v1/users)
USERS_COUNT=$(echo "$USERS_RESPONSE" | jq '.users | length' 2>/dev/null || echo "0")
echo "   └── Count: $USERS_COUNT"
echo "$USERS_RESPONSE" | jq '.users[] | {id, email, first_name, last_name}' 2>/dev/null || echo "   └── No users found"

# Check Tasks
echo -e "${YELLOW}📝 Tasks:${NC}"
TASKS_RESPONSE=$(curl -s $API_BASE/api/v1/tasks)
TASKS_COUNT=$(echo "$TASKS_RESPONSE" | jq '.tasks | length' 2>/dev/null || echo "0")
echo "   └── Count: $TASKS_COUNT"
echo "$TASKS_RESPONSE" | jq '.tasks[] | {id, title, status, priority}' 2>/dev/null || echo "   └── No tasks found"

# Check Departments
echo -e "${YELLOW}🏢 Departments:${NC}"
DEPT_RESPONSE=$(curl -s $API_BASE/api/v1/departments)
DEPT_COUNT=$(echo "$DEPT_RESPONSE" | jq '.departments | length' 2>/dev/null || echo "0")
echo "   └── Count: $DEPT_COUNT"
echo "$DEPT_RESPONSE" | jq '.departments[] | {id, name}' 2>/dev/null || echo "   └── No departments found"

echo ""
echo -e "${BLUE}🔧 Database Operations:${NC}"
echo "├── Health Check: curl $API_BASE/health"
echo "├── Database Status: curl $API_BASE/api/v1/database/status"
echo "├── Get Users: curl $API_BASE/api/v1/users"
echo "├── Get Tasks: curl $API_BASE/api/v1/tasks"
echo "├── Get Departments: curl $API_BASE/api/v1/departments"
echo "└── API Documentation: $API_BASE/docs"

echo ""
echo -e "${YELLOW}⚠️  Current Database Type:${NC}"
echo "├── Type: In-memory (SimpleDB)"
echo "├── Persistence: None (data lost on restart)"
echo "├── Production Ready: No"
echo "└── Next Step: Integrate PostgreSQL"

echo ""
echo -e "${GREEN}✅ Database check completed!${NC}"
