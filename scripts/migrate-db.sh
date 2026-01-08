#!/bin/bash

# BDS QMS - Database Migration Wrapper Script
# This script sets up the Python environment and runs the database migration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Python 3
if ! command_exists python3; then
    echo -e "${RED}Error: Python 3 is required but not installed.${NC}" >&2
    exit 1
fi

# Set up Python virtual environment
VENV_DIR=".venv"
if [ ! -d "$VENV_DIR" ]; then
    log "Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate virtual environment
log "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Install dependencies
log "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements-db.txt

# Set environment variables
if [ -f "../.env.azure" ]; then
    log "Loading Azure environment variables..."
    export $(grep -v '^#' ../.env.azure | xargs)
fi

# Set source and target database configurations
SOURCE_PREFIX="LOCAL_"
TARGET_PREFIX="AZURE_"

# Export source database variables (local)
export LOCAL_POSTGRES_HOST=${LOCAL_POSTGRES_HOST:-"localhost"}
export LOCAL_POSTGRES_PORT=${LOCAL_POSTGRES_PORT:-"5432"}
export LOCAL_POSTGRES_DB=${LOCAL_POSTGRES_DB:-"bds_management"}
export LOCAL_POSTGRES_USER=${LOCAL_POSTGRES_USER:-"postgres"}
export LOCAL_POSTGRES_PASSWORD=${LOCAL_POSTGRES_PASSWORD:-"postgres"}

# Export target database variables (Azure)
export AZURE_POSTGRES_HOST=${POSTGRES_SERVER:?POSTGRES_SERVER not set}.postgres.database.azure.com
export AZURE_POSTGRES_PORT="5432"
export AZURE_POSTGRES_DB=${POSTGRES_DB:?POSTGRES_DB not set}
export AZURE_POSTGRES_USER=${POSTGRES_ADMIN_USER:?POSTGRES_ADMIN_USER not set}
export AZURE_POSTGRES_PASSWORD=${POSTGRES_PASSWORD:?POSTGRES_PASSWORD not set}

# Run the migration
log "Starting database migration..."
python3 migrate_db_schema.py \
    --source-prefix "$SOURCE_PREFIX" \
    --target-prefix "$TARGET_PREFIX" \
    --debug

log "Database migration completed successfully!"
log "Target database: ${AZURE_POSTGRES_USER}@${AZURE_POSTGRES_HOST}:${AZURE_POSTGRES_PORT}/${AZURE_POSTGRES_DB}"
