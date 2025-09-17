#!/bin/bash

echo "🔄 Testing Recurring Tasks Without Celery Workers"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API base URL
API_BASE="http://localhost:8002"

echo -e "${BLUE}📋 Testing Recurring Task Generation${NC}"
echo ""

# Function to make API calls
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X $method \
             -H "Content-Type: application/json" \
             -d "$data" \
             "$API_BASE$endpoint"
    else
        curl -s -X $method "$API_BASE$endpoint"
    fi
}

# Test 1: Check API health
echo -e "${YELLOW}1. Checking API Health...${NC}"
health_response=$(make_request "GET" "/health")
echo "$health_response" | jq '.' 2>/dev/null || echo "$health_response"
echo ""

# Test 2: Create a recurring task
echo -e "${YELLOW}2. Creating a Recurring Task...${NC}"
task_data='{
    "title": "Daily Standup Meeting",
    "description": "Daily team standup meeting",
    "department": "Engineering",
    "assignee": "john.doe@company.com",
    "priority": "medium",
    "due_date": "2024-01-15T10:00:00Z",
    "is_recurring": true,
    "recurring_frequency": "daily",
    "is_customer_related": false,
    "attachments_required": "none"
}'

create_response=$(make_request "POST" "/api/v1/tasks" "$task_data")
echo "$create_response" | jq '.' 2>/dev/null || echo "$create_response"
echo ""

# Test 3: Get all tasks to see the created task
echo -e "${YELLOW}3. Getting All Tasks...${NC}"
tasks_response=$(make_request "GET" "/api/v1/tasks")
echo "$tasks_response" | jq '.' 2>/dev/null || echo "$tasks_response"
echo ""

# Test 4: Update task status to completed (this should trigger recurring generation)
echo -e "${YELLOW}4. Marking Task as Completed (should trigger recurring generation)...${NC}"
task_id=$(echo "$create_response" | jq -r '.task_id' 2>/dev/null)
if [ "$task_id" != "null" ] && [ -n "$task_id" ]; then
    update_data='{
        "status": "completed"
    }'
    update_response=$(make_request "PUT" "/api/v1/tasks/$task_id" "$update_data")
    echo "$update_response" | jq '.' 2>/dev/null || echo "$update_response"
else
    echo -e "${RED}❌ Could not get task ID from create response${NC}"
fi
echo ""

# Test 5: Check if new recurring task was generated
echo -e "${YELLOW}5. Checking for Generated Recurring Task...${NC}"
tasks_response=$(make_request "GET" "/api/v1/tasks")
echo "$tasks_response" | jq '.' 2>/dev/null || echo "$tasks_response"
echo ""

# Test 6: Manually trigger recurring task generation
echo -e "${YELLOW}6. Manually Triggering Recurring Task Generation...${NC}"
trigger_response=$(make_request "POST" "/api/v1/tasks/trigger-recurring")
echo "$trigger_response" | jq '.' 2>/dev/null || echo "$trigger_response"
echo ""

echo -e "${GREEN}✅ Recurring Task Test Complete!${NC}"
echo ""
echo -e "${BLUE}📝 How Recurring Tasks Work Without Celery:${NC}"
echo "1. Database triggers automatically fire when task status changes to 'completed'"
echo "2. PostgreSQL function 'generate_next_recurring_task()' creates new instances"
echo "3. No external workers needed - everything happens in the database"
echo "4. Manual trigger endpoint available for testing: POST /api/v1/tasks/trigger-recurring"
echo ""
echo -e "${YELLOW}💡 To test in the frontend:${NC}"
echo "1. Create a recurring task"
echo "2. Mark it as completed"
echo "3. Check if a new instance appears automatically"

