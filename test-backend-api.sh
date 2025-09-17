#!/bin/bash

echo "🧪 BDS Management System - Backend API Tests"
echo "============================================="

# Configuration
BASE_URL="http://localhost:8002"
API_BASE="${BASE_URL}/api/v1"
TEST_USER_EMAIL="test.user.$(date +%s)@bdsmanufacturing.in"
TEST_USER_ID=""
TEST_TASK_ID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}Test ${TOTAL_TESTS}: ${test_name}${NC}"
    echo "Command: ${test_command}"
    
    # Run the test command and capture response
    response=$(eval "$test_command" 2>/dev/null)
    status_code=$(eval "$test_command" -w "%{http_code}" -o /dev/null -s 2>/dev/null)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED${NC} (Status: ${status_code})"
        echo "Response: ${response}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} (Expected: ${expected_status}, Got: ${status_code})"
        echo "Response: ${response}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Function to extract JSON field
extract_field() {
    local json="$1"
    local field="$2"
    echo "$json" | jq -r ".$field" 2>/dev/null || echo "null"
}

echo -e "\n${YELLOW}🔍 Testing Backend Health${NC}"
run_test "Health Check" "curl -s ${BASE_URL}/health" "200"

echo -e "\n${YELLOW}👥 Testing User Management APIs${NC}"

# Test 1: Get all users
echo -e "\n${BLUE}Test 1: Get all users${NC}"
users_response=$(curl -s "${API_BASE}/users")
user_count=$(echo "$users_response" | jq -r '.users | length' 2>/dev/null || echo "0")
echo "Found ${user_count} users in database"

# Test 2: Get departments
echo -e "\n${BLUE}Test 2: Get departments${NC}"
departments_response=$(curl -s "${API_BASE}/departments")
department_count=$(echo "$departments_response" | jq -r '.departments | length' 2>/dev/null || echo "0")
echo "Found ${department_count} departments"

# Test 3: Create a new user
echo -e "\n${BLUE}Test 3: Create new user${NC}"
create_user_payload='{
    "email": "'${TEST_USER_EMAIL}'",
    "first_name": "Test",
    "last_name": "User",
    "role": "user",
    "department_id": null,
    "is_active": true
}'

create_response=$(curl -s -X POST "${API_BASE}/users" \
    -H "Content-Type: application/json" \
    -d "$create_user_payload")

TEST_USER_ID=$(echo "$create_response" | jq -r '.user.id' 2>/dev/null || echo "")
if [ -n "$TEST_USER_ID" ] && [ "$TEST_USER_ID" != "null" ]; then
    echo -e "${GREEN}✅ User created successfully${NC}"
    echo "User ID: ${TEST_USER_ID}"
    echo "Response: ${create_response}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ User creation failed${NC}"
    echo "Response: ${create_response}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 4: Get specific user
if [ -n "$TEST_USER_ID" ] && [ "$TEST_USER_ID" != "null" ]; then
    echo -e "\n${BLUE}Test 4: Get specific user${NC}"
    user_response=$(curl -s "${API_BASE}/users/${TEST_USER_ID}")
    user_email=$(echo "$user_response" | jq -r '.email' 2>/dev/null || echo "null")
    
    if [ "$user_email" = "$TEST_USER_EMAIL" ]; then
        echo -e "${GREEN}✅ User retrieved successfully${NC}"
        echo "Email: ${user_email}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ User retrieval failed${NC}"
        echo "Expected: ${TEST_USER_EMAIL}, Got: ${user_email}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Test 5: Update user
if [ -n "$TEST_USER_ID" ] && [ "$TEST_USER_ID" != "null" ]; then
    echo -e "\n${BLUE}Test 5: Update user${NC}"
    update_payload='{
        "first_name": "Updated",
        "last_name": "User",
        "role": "manager",
        "is_active": true
    }'
    
    update_response=$(curl -s -X PUT "${API_BASE}/users/${TEST_USER_ID}" \
        -H "Content-Type: application/json" \
        -d "$update_payload")
    
    updated_first_name=$(echo "$update_response" | jq -r '.user.first_name' 2>/dev/null || echo "null")
    
    if [ "$updated_first_name" = "Updated" ]; then
        echo -e "${GREEN}✅ User updated successfully${NC}"
        echo "Updated name: ${updated_first_name}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ User update failed${NC}"
        echo "Response: ${update_response}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

echo -e "\n${YELLOW}📋 Testing Task Management APIs${NC}"

# Test 6: Get all tasks
echo -e "\n${BLUE}Test 6: Get all tasks${NC}"
tasks_response=$(curl -s "${API_BASE}/tasks")
task_count=$(echo "$tasks_response" | jq -r '.tasks | length' 2>/dev/null || echo "0")
echo "Found ${task_count} tasks in database"

# Test 7: Create a new task
echo -e "\n${BLUE}Test 7: Create new task${NC}"
create_task_payload='{
    "title": "Test Task '$(date +%s)'",
    "description": "This is a test task created by API test",
    "priority": "medium",
    "status": "pending",
    "due_date": "'$(date -d '+7 days' -Iseconds 2>/dev/null || date -v+7d -Iseconds 2>/dev/null || echo "2025-09-12T00:00:00")'",
    "assigned_to": null,
    "department_id": null,
    "recurring_frequency": "none"
}'

create_task_response=$(curl -s -X POST "${API_BASE}/tasks" \
    -H "Content-Type: application/json" \
    -d "$create_task_payload")

TEST_TASK_ID=$(echo "$create_task_response" | jq -r '.id' 2>/dev/null || echo "")
if [ -n "$TEST_TASK_ID" ] && [ "$TEST_TASK_ID" != "null" ]; then
    echo -e "${GREEN}✅ Task created successfully${NC}"
    echo "Task ID: ${TEST_TASK_ID}"
    echo "Response: ${create_task_response}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Task creation failed${NC}"
    echo "Response: ${create_task_response}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 8: Get specific task
if [ -n "$TEST_TASK_ID" ] && [ "$TEST_TASK_ID" != "null" ]; then
    echo -e "\n${BLUE}Test 8: Get specific task${NC}"
    task_response=$(curl -s "${API_BASE}/tasks/${TEST_TASK_ID}")
    task_title=$(echo "$task_response" | jq -r '.title' 2>/dev/null || echo "null")
    
    if [ "$task_title" != "null" ] && [ -n "$task_title" ]; then
        echo -e "${GREEN}✅ Task retrieved successfully${NC}"
        echo "Title: ${task_title}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ Task retrieval failed${NC}"
        echo "Response: ${task_response}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Test 9: Update task
if [ -n "$TEST_TASK_ID" ] && [ "$TEST_TASK_ID" != "null" ]; then
    echo -e "\n${BLUE}Test 9: Update task${NC}"
    update_task_payload='{
        "title": "Updated Test Task",
        "description": "This task has been updated",
        "priority": "high",
        "status": "in-progress"
    }'
    
    update_task_response=$(curl -s -X PUT "${API_BASE}/tasks/${TEST_TASK_ID}" \
        -H "Content-Type: application/json" \
        -d "$update_task_payload")
    
    updated_title=$(echo "$update_task_response" | jq -r '.title' 2>/dev/null || echo "null")
    
    if [ "$updated_title" = "Updated Test Task" ]; then
        echo -e "${GREEN}✅ Task updated successfully${NC}"
        echo "Updated title: ${updated_title}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ Task update failed${NC}"
        echo "Response: ${update_task_response}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Test 10: Delete task
if [ -n "$TEST_TASK_ID" ] && [ "$TEST_TASK_ID" != "null" ]; then
    echo -e "\n${BLUE}Test 10: Delete task${NC}"
    delete_response=$(curl -s -X DELETE "${API_BASE}/tasks/${TEST_TASK_ID}")
    
    # Check if task was deleted by trying to get it
    get_deleted_response=$(curl -s "${API_BASE}/tasks/${TEST_TASK_ID}")
    status_code=$(curl -s -w "%{http_code}" -o /dev/null "${API_BASE}/tasks/${TEST_TASK_ID}")
    
    if [ "$status_code" = "404" ]; then
        echo -e "${GREEN}✅ Task deleted successfully${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ Task deletion failed${NC}"
        echo "Status code: ${status_code}"
        echo "Response: ${get_deleted_response}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Test 11: Delete user
if [ -n "$TEST_USER_ID" ] && [ "$TEST_USER_ID" != "null" ]; then
    echo -e "\n${BLUE}Test 11: Delete user${NC}"
    delete_user_response=$(curl -s -X DELETE "${API_BASE}/users/${TEST_USER_ID}")
    
    # Check if user was deleted
    get_deleted_user_response=$(curl -s "${API_BASE}/users/${TEST_USER_ID}")
    status_code=$(curl -s -w "%{http_code}" -o /dev/null "${API_BASE}/users/${TEST_USER_ID}")
    
    if [ "$status_code" = "404" ]; then
        echo -e "${GREEN}✅ User deleted successfully${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ User deletion failed${NC}"
        echo "Status code: ${status_code}"
        echo "Response: ${get_deleted_user_response}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Test 12: Test error handling
echo -e "\n${BLUE}Test 12: Error handling${NC}"
error_response=$(curl -s "${API_BASE}/users/nonexistent-id")
status_code=$(curl -s -w "%{http_code}" -o /dev/null "${API_BASE}/users/nonexistent-id")

if [ "$status_code" = "404" ]; then
    echo -e "${GREEN}✅ Error handling works correctly${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Error handling failed${NC}"
    echo "Expected 404, got: ${status_code}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Summary
echo -e "\n${YELLOW}📊 Test Summary${NC}"
echo "=================="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Backend API is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Check the issues above.${NC}"
    exit 1
fi
