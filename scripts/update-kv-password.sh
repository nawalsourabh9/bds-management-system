#!/bin/bash
# Script to update database password in Azure Key Vault
# Usage: ./update-kv-password.sh <new-password>

set -e

KEYVAULT_NAME="bds-qms-kv"
SECRET_NAME="db-password"

if [ -z "$1" ]; then
    echo "❌ Error: Password not provided"
    echo "Usage: $0 <new-password>"
    echo ""
    echo "Example:"
    echo "  $0 'MyNewPassword123!'"
    exit 1
fi

NEW_PASSWORD="$1"

echo "🔐 Updating database password in Azure Key Vault: $KEYVAULT_NAME"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install it: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Update password in Key Vault
az keyvault secret set \
    --vault-name "$KEYVAULT_NAME" \
    --name "$SECRET_NAME" \
    --value "$NEW_PASSWORD" \
    > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Successfully updated password in Azure Key Vault"
    echo ""
    echo "💡 Next steps:"
    echo "  1. Run: python scripts/update-db-password-from-kv.py"
    echo "  2. Restart your backend server"
else
    echo "❌ Failed to update password in Key Vault"
    exit 1
fi

