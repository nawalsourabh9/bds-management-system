#!/bin/bash
# Script to fetch database password from Azure Key Vault and update .env file
# This should be run once to sync the password, then the .env file will be used

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
ENV_FILE="$BACKEND_DIR/.env"

# Azure Key Vault configuration
KEYVAULT_NAME="bds-qms-kv"
SECRET_NAME="db-password"

echo "🔐 Fetching database password from Azure Key Vault: $KEYVAULT_NAME"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install it: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Fetch password from Key Vault
PASSWORD=$(az keyvault secret show \
    --vault-name "$KEYVAULT_NAME" \
    --name "$SECRET_NAME" \
    --query "value" \
    -o tsv 2>/dev/null)

if [ -z "$PASSWORD" ]; then
    echo "⚠️  Failed to fetch password from Key Vault. Keeping existing password in .env file."
    exit 1
fi

echo "✅ Successfully retrieved password from Key Vault"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found at $ENV_FILE"
    exit 1
fi

# Backup the .env file
cp "$ENV_FILE" "$ENV_FILE.backup"
echo "📋 Created backup: $ENV_FILE.backup"

# Update DB_PASSWORD in .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/^DB_PASSWORD=.*/DB_PASSWORD=$PASSWORD/" "$ENV_FILE"
else
    # Linux
    sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$PASSWORD/" "$ENV_FILE"
fi

echo "✅ Updated DB_PASSWORD in $ENV_FILE"
echo "💡 Restart your backend server to use the new password"

