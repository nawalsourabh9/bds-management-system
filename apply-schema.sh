#!/bin/bash

# Apply database schema using the Azure backend API

BACKEND_URL="https://bds-backend.graystone-766c02c8.centralindia.azurecontainerapps.io"
SCHEMA_FILE="database/schema/04-recurring-parent-child.sql"

echo "🚀 Applying database schema to Azure PostgreSQL..."
echo "📄 Schema file: $SCHEMA_FILE"
echo "🔗 Backend URL: $BACKEND_URL"

# Check if schema file exists
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Schema file not found: $SCHEMA_FILE"
    exit 1
fi

# Read the schema file and apply it
echo "📖 Reading schema file..."
SQL_CONTENT=$(cat "$SCHEMA_FILE" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')

echo "🔧 Applying schema to database..."
RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/v1/execute-sql" \
    -H "Content-Type: application/json" \
    -d "{\"sql\": \"$SQL_CONTENT\"}")

# Check if the request was successful
if [ $? -eq 0 ]; then
    echo "✅ Schema applied successfully!"
    echo "📊 Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
else
    echo "❌ Failed to apply schema"
    exit 1
fi

echo "🎉 Database schema update completed!"
