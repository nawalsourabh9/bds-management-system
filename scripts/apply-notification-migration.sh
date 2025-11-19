#!/bin/bash

# Apply migration to add task_id column to notifications table
# This script can be used with either psql or the backend API

MIGRATION_FILE="database/migrations/add-task-id-to-notifications-direct.sql"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

echo "🚀 Applying migration: Add task_id column to notifications table"
echo "📄 Migration file: $MIGRATION_FILE"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

USE_API=false
PSQL_SUCCESS=false

# Try using psql if available and not forced to use API
if [ "$USE_API" != "true" ] && command -v psql &> /dev/null; then
    echo "📊 Trying psql to apply migration..."
    
    # Check if DATABASE_URL is set
    if [ -n "$DATABASE_URL" ]; then
        echo "Using DATABASE_URL environment variable"
        if psql "$DATABASE_URL" -f "$MIGRATION_FILE" 2>&1; then
            PSQL_SUCCESS=true
        fi
    elif [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
        echo "Using DB_* environment variables"
        if PGPASSWORD="${DB_PASSWORD:-bds_password}" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE" 2>&1; then
            PSQL_SUCCESS=true
        fi
    else
        echo "⚠️  No database connection info found. Skipping psql..."
    fi
    
    if [ "$PSQL_SUCCESS" = "true" ]; then
        echo "✅ Migration applied successfully using psql!"
        exit 0
    else
        echo "⚠️  psql failed or not configured. Will try backend API..."
        USE_API=true
    fi
else
    USE_API=true
fi

# Fallback to backend API
if [ "$USE_API" = "true" ] || [ ! command -v psql &> /dev/null ] || [ -z "$DATABASE_URL" ]; then
    echo "📡 Using backend API to apply migration..."
    echo "🔗 Backend URL: $BACKEND_URL"
    
    # Read the migration file and create JSON payload
    echo "🔧 Applying migration via API..."
    RESPONSE=$(python3 <<PYTHON_SCRIPT
import json
import sys

with open("$MIGRATION_FILE", "r") as f:
    sql_content = f.read()

payload = {"sql": sql_content}
json_payload = json.dumps(payload)

import subprocess
result = subprocess.run(
    ["curl", "-s", "-w", "\nHTTP_CODE:%{http_code}", "-X", "POST", 
     "$BACKEND_URL/api/v1/execute-sql",
     "-H", "Content-Type: application/json",
     "-d", json_payload],
    capture_output=True,
    text=True
)
print(result.stdout)
sys.exit(result.returncode)
PYTHON_SCRIPT
)
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo "✅ Migration applied successfully via API!"
        echo "📊 Response:"
        echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
        exit 0
    else
        echo "❌ Failed to apply migration via API (HTTP $HTTP_CODE)"
        echo "Response: $BODY"
        exit 1
    fi
fi

echo "❌ Could not apply migration. Please check your database connection."
exit 1

