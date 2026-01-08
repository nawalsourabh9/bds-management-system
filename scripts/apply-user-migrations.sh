#!/bin/bash

# Apply migrations for making last_name and email optional
# This script can be used with either psql or the backend API

set -e

# Load .env file if it exists (check both project root and backend folder)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_ROOT="$PROJECT_ROOT/backend"

# Load .env files in order (later ones override earlier ones)
ENV_LOADED=false

# Project root .env files
for env_file in "$PROJECT_ROOT/.env.local" "$PROJECT_ROOT/.env.azure" "$PROJECT_ROOT/.env"; do
  if [ -f "$env_file" ]; then
    echo "✅ Loading $env_file"
    set -a
    source "$env_file"
    set +a
    ENV_LOADED=true
  fi
done

# Backend folder .env files (override project root)
for env_file in "$BACKEND_ROOT/.env.local" "$BACKEND_ROOT/.env.azure" "$BACKEND_ROOT/.env"; do
  if [ -f "$env_file" ]; then
    echo "✅ Loading $env_file"
    set -a
    source "$env_file"
    set +a
    ENV_LOADED=true
  fi
done

if [ "$ENV_LOADED" = false ]; then
  echo "⚠️  No .env file found. Using system environment variables."
fi

MIGRATION_FILES=(
  "database/migrations/make-last-name-nullable.sql"
  "database/migrations/make-email-optional.sql"
)

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

echo "🚀 Applying user-related migrations"
echo "📄 Migration files:"
for file in "${MIGRATION_FILES[@]}"; do
  echo "   - $file"
done

USE_API=false
PSQL_SUCCESS=false

# Try using psql if available and not forced to use API
if [ "$USE_API" != "true" ] && command -v psql &> /dev/null; then
  echo ""
  echo "📊 Trying psql to apply migrations..."
  
  # Construct DATABASE_URL if not set but individual vars are
  if [ -z "$DATABASE_URL" ]; then
    DB_HOST="${DB_HOST:-${POSTGRES_HOST:-${POSTGRES_SERVER:-localhost}}}"
    DB_PORT="${DB_PORT:-${POSTGRES_PORT:-5432}}"
    DB_NAME="${DB_NAME:-${POSTGRES_DB:-${POSTGRES_DATABASE:-bds_management}}}"
    DB_USER="${DB_USER:-${POSTGRES_USER:-${POSTGRES_ADMIN_USER:-postgres}}}"
    DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"
    
    if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
      DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
      echo "📊 Constructed DATABASE_URL from individual environment variables"
    fi
  fi
  
  # Check if DATABASE_URL is set
  if [ -n "$DATABASE_URL" ]; then
    echo "Using DATABASE_URL environment variable"
    for migration_file in "${MIGRATION_FILES[@]}"; do
      if [ ! -f "$migration_file" ]; then
        echo "❌ Migration file not found: $migration_file"
        exit 1
      fi
      echo "Applying $migration_file..."
      if psql "$DATABASE_URL" -f "$migration_file" 2>&1; then
        echo "✅ $migration_file applied successfully!"
      else
        echo "❌ Failed to apply $migration_file"
        PSQL_SUCCESS=false
        break
      fi
    done
    PSQL_SUCCESS=true
  elif [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
    echo "Using DB_* environment variables"
    DB_HOST="${DB_HOST:-${POSTGRES_HOST:-${POSTGRES_SERVER:-localhost}}}"
    DB_PORT="${DB_PORT:-${POSTGRES_PORT:-5432}}"
    DB_NAME="${DB_NAME:-${POSTGRES_DB:-${POSTGRES_DATABASE:-bds_management}}}"
    DB_USER="${DB_USER:-${POSTGRES_USER:-${POSTGRES_ADMIN_USER:-postgres}}}"
    DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"
    
    for migration_file in "${MIGRATION_FILES[@]}"; do
      if [ ! -f "$migration_file" ]; then
        echo "❌ Migration file not found: $migration_file"
        exit 1
      fi
      echo "Applying $migration_file..."
      if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" 2>&1; then
        echo "✅ $migration_file applied successfully!"
      else
        echo "❌ Failed to apply $migration_file"
        PSQL_SUCCESS=false
        break
      fi
    done
    PSQL_SUCCESS=true
  else
    echo "⚠️  No database connection info found. Skipping psql..."
  fi
  
  if [ "$PSQL_SUCCESS" = "true" ]; then
    echo ""
    echo "✅ All migrations applied successfully using psql!"
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
  echo ""
  echo "📡 Using backend API to apply migrations..."
  echo "🔗 Backend URL: $BACKEND_URL"
  
  for migration_file in "${MIGRATION_FILES[@]}"; do
    if [ ! -f "$migration_file" ]; then
      echo "❌ Migration file not found: $migration_file"
      exit 1
    fi
    
    echo ""
    echo "🔧 Applying $migration_file via API..."
    
    RESPONSE=$(python3 <<PYTHON_SCRIPT
import json
import sys

with open("$migration_file", "r") as f:
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
      echo "✅ $migration_file applied successfully via API!"
      echo "📊 Response:"
      echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    else
      echo "❌ Failed to apply $migration_file via API (HTTP $HTTP_CODE)"
      echo "Response: $BODY"
      exit 1
    fi
  done
  
  echo ""
  echo "✅ All migrations applied successfully via API!"
  exit 0
fi

echo "❌ Could not apply migrations. Please check your database connection."
exit 1

