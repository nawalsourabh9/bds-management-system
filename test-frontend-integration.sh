#!/bin/bash

echo "🧪 BDS Management System - Frontend Integration Tests"
echo "====================================================="

# Configuration
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:8002"
API_BASE="${BACKEND_URL}/api/v1"

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
        echo "Response: ${response:0:200}..."
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} (Expected: ${expected_status}, Got: ${status_code})"
        echo "Response: ${response:0:200}..."
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo -e "\n${YELLOW}🌐 Testing Frontend Accessibility${NC}"

# Test 1: Frontend homepage
run_test "Frontend Homepage" "curl -s ${FRONTEND_URL}" "200"

# Test 2: Frontend static assets
run_test "Frontend Static Assets" "curl -s ${FRONTEND_URL}/assets" "200"

# Test 3: Frontend API configuration
echo -e "\n${BLUE}Test 3: Frontend API Configuration${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
frontend_html=$(curl -s "${FRONTEND_URL}")
if echo "$frontend_html" | grep -q "localhost:8002\|api"; then
    echo -e "${GREEN}✅ Frontend contains API configuration${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Frontend missing API configuration${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -e "\n${YELLOW}🔗 Testing Frontend-Backend Integration${NC}"

# Test 4: CORS headers
echo -e "\n${BLUE}Test 4: CORS Headers${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
cors_headers=$(curl -s -I -H "Origin: ${FRONTEND_URL}" "${API_BASE}/users")
if echo "$cors_headers" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✅ CORS headers present${NC}"
    echo "CORS Headers: $(echo "$cors_headers" | grep -i "access-control")"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ CORS headers missing${NC}"
    echo "Headers: ${cors_headers}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 5: API endpoints accessible from frontend
run_test "Users API from Frontend Origin" "curl -s -H 'Origin: ${FRONTEND_URL}' ${API_BASE}/users" "200"
run_test "Departments API from Frontend Origin" "curl -s -H 'Origin: ${FRONTEND_URL}' ${API_BASE}/departments" "200"
run_test "Tasks API from Frontend Origin" "curl -s -H 'Origin: ${FRONTEND_URL}' ${API_BASE}/tasks" "200"

echo -e "\n${YELLOW}📱 Testing Frontend Routes${NC}"

# Test 6: Check if frontend routes are properly configured
echo -e "\n${BLUE}Test 6: Frontend Route Configuration${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
frontend_html=$(curl -s "${FRONTEND_URL}")
if echo "$frontend_html" | grep -q "react\|router\|app"; then
    echo -e "${GREEN}✅ Frontend appears to be a React SPA${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Frontend may not be properly configured${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 7: Check for JavaScript errors (basic check)
echo -e "\n${BLUE}Test 7: JavaScript Bundle${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
js_files=$(curl -s "${FRONTEND_URL}" | grep -o 'src="[^"]*\.js[^"]*"' | head -3)
if [ -n "$js_files" ]; then
    echo -e "${GREEN}✅ JavaScript files found${NC}"
    echo "JS Files: ${js_files}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ No JavaScript files found${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -e "\n${YELLOW}🔧 Testing API Service Integration${NC}"

# Test 8: Test API service endpoints
echo -e "\n${BLUE}Test 8: API Service Endpoints${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test if the API service is working by checking the response format
api_response=$(curl -s "${API_BASE}/users")
if echo "$api_response" | jq -e '.users' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API service returns proper JSON format${NC}"
    user_count=$(echo "$api_response" | jq -r '.users | length')
    echo "Users count: ${user_count}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ API service format issue${NC}"
    echo "Response: ${api_response:0:200}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 9: Test task API service
echo -e "\n${BLUE}Test 9: Task API Service${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
task_api_response=$(curl -s "${API_BASE}/tasks")
if echo "$task_api_response" | jq -e '.tasks' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Task API service returns proper JSON format${NC}"
    task_count=$(echo "$task_api_response" | jq -r '.tasks | length')
    echo "Tasks count: ${task_count}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Task API service format issue${NC}"
    echo "Response: ${task_api_response:0:200}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -e "\n${YELLOW}🎯 Testing User Management Integration${NC}"

# Test 10: Create user via API (simulating frontend)
echo -e "\n${BLUE}Test 10: User Creation Integration${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
test_user_email="integration.test.$(date +%s)@bdsmanufacturing.in"
create_user_payload='{
    "email": "'${test_user_email}'",
    "first_name": "Integration",
    "last_name": "Test",
    "role": "user",
    "department_id": null,
    "is_active": true
}'

create_response=$(curl -s -X POST "${API_BASE}/users" \
    -H "Content-Type: application/json" \
    -H "Origin: ${FRONTEND_URL}" \
    -d "$create_user_payload")

created_user_id=$(echo "$create_response" | jq -r '.user.id' 2>/dev/null || echo "")
if [ -n "$created_user_id" ] && [ "$created_user_id" != "null" ]; then
    echo -e "${GREEN}✅ User creation integration works${NC}"
    echo "Created user ID: ${created_user_id}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Clean up - delete the test user
    curl -s -X DELETE "${API_BASE}/users/${created_user_id}" > /dev/null
    echo "Test user cleaned up"
else
    echo -e "${RED}❌ User creation integration failed${NC}"
    echo "Response: ${create_response}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -e "\n${YELLOW}📋 Testing Task Management Integration${NC}"

# Test 11: Create task via API (simulating frontend)
echo -e "\n${BLUE}Test 11: Task Creation Integration${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
create_task_payload='{
    "title": "Integration Test Task '$(date +%s)'",
    "description": "This is a test task for integration testing",
    "priority": "medium",
    "status": "pending",
    "due_date": "'$(date -d '+7 days' -Iseconds 2>/dev/null || date -v+7d -Iseconds 2>/dev/null || echo "2025-09-12T00:00:00")'",
    "assigned_to": null,
    "department_id": null,
    "recurring_frequency": "none"
}'

create_task_response=$(curl -s -X POST "${API_BASE}/tasks" \
    -H "Content-Type: application/json" \
    -H "Origin: ${FRONTEND_URL}" \
    -d "$create_task_payload")

created_task_id=$(echo "$create_task_response" | jq -r '.id' 2>/dev/null || echo "")
if [ -n "$created_task_id" ] && [ "$created_task_id" != "null" ]; then
    echo -e "${GREEN}✅ Task creation integration works${NC}"
    echo "Created task ID: ${created_task_id}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Clean up - delete the test task
    curl -s -X DELETE "${API_BASE}/tasks/${created_task_id}" > /dev/null
    echo "Test task cleaned up"
else
    echo -e "${RED}❌ Task creation integration failed${NC}"
    echo "Response: ${create_task_response}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -e "\n${YELLOW}🔍 Testing Error Handling${NC}"

# Test 12: Test error handling
echo -e "\n${BLUE}Test 12: Error Handling${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
error_response=$(curl -s -H "Origin: ${FRONTEND_URL}" "${API_BASE}/users/nonexistent-id")
status_code=$(curl -s -w "%{http_code}" -o /dev/null -H "Origin: ${FRONTEND_URL}" "${API_BASE}/users/nonexistent-id")

if [ "$status_code" = "404" ]; then
    echo -e "${GREEN}✅ Error handling works correctly${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Error handling failed${NC}"
    echo "Expected 404, got: ${status_code}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 13: Test malformed requests
echo -e "\n${BLUE}Test 13: Malformed Request Handling${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
malformed_response=$(curl -s -X POST "${API_BASE}/users" \
    -H "Content-Type: application/json" \
    -H "Origin: ${FRONTEND_URL}" \
    -d '{"invalid": "data"}')

status_code=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${API_BASE}/users" \
    -H "Content-Type: application/json" \
    -H "Origin: ${FRONTEND_URL}" \
    -d '{"invalid": "data"}')

if [ "$status_code" = "400" ] || [ "$status_code" = "422" ]; then
    echo -e "${GREEN}✅ Malformed request handling works${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Malformed request handling failed${NC}"
    echo "Expected 400/422, got: ${status_code}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Summary
echo -e "\n${YELLOW}📊 Frontend Integration Test Summary${NC}"
echo "======================================"
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All frontend integration tests passed!${NC}"
    echo -e "${GREEN}Frontend and backend are properly integrated.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some frontend integration tests failed.${NC}"
    echo -e "${YELLOW}Check the issues above and fix them.${NC}"
    exit 1
fi
