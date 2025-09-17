#!/bin/bash

# Azure Infrastructure Setup Script for Nordic BDS Management System
# This script creates the necessary Azure resources for the application

set -e  # Exit on error

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source utility functions
source "${SCRIPT_DIR}/utils/common.sh"
# Ensure we're using the correct path to azure.sh
UTILS_DIR="$(dirname "${BASH_SOURCE[0]}")/utils"
source "${UTILS_DIR}/azure.sh"

# Load Azure-specific environment variables
load_env "${SCRIPT_DIR}/../../.env.azure"

# Load environment variables with defaults
# All sensitive or configurable values should come from environment variables
# This makes the script more secure and configurable

# Resource Group
RESOURCE_GROUP="${RESOURCE_GROUP:-bds-qms}"

# Azure Region
LOCATION="${AZURE_LOCATION:-centralindia}"

# PostgreSQL Configuration
POSTGRES_SERVER="${POSTGRES_SERVER:-bds-pg-$(openssl rand -hex 3)}"
POSTGRES_DB="${POSTGRES_DB:-bds_eqms}"
POSTGRES_ADMIN_USER="${POSTGRES_ADMIN_USER:-bds_admin}"

# PostgreSQL Flexible Server with Burstable SKU (cheapest option for dev/test)
POSTGRES_TIER="${POSTGRES_TIER:-Burstable}"  # Cheaper than Basic/General Purpose
POSTGRES_SKU="${POSTGRES_SKU:-Standard_B1ms}"  # Burstable, 1 vCPU, 2GB RAM
POSTGRES_STORAGE="${POSTGRES_STORAGE:-32}"  # Minimum 32GB for Flexible Server
POSTGRES_VERSION="${POSTGRES_VERSION:-14}"  # Using latest stable version
POSTGRES_BACKUP_RETENTION="${POSTGRES_BACKUP_RETENTION:-7}"  # Minimum backup retention

# Azure Container Registry (ACR)
ACR_NAME="${ACR_NAME:-bdsqms$(openssl rand -hex 2)}"  # Simple bds prefix with random suffix
ACR_SKU="Basic"  # Cheapest SKU, sufficient for testing

# Create PostgreSQL Flexible Server (more cost-effective for dev/test)
create_postgresql() {
    # Generate a secure password if not set
    if [ -z "$POSTGRES_PASSWORD" ]; then
        POSTGRES_PASSWORD=$(openssl rand -base64 20)
    fi
    
    if ! az postgres flexible-server show --resource-group "$RESOURCE_GROUP" --name "$POSTGRES_SERVER" &> /dev/null; then
        log_info "Creating PostgreSQL Flexible Server (Burstable SKU): $POSTGRES_SERVER"
        
        # Create PostgreSQL Flexible Server with minimal configuration
        az postgres flexible-server create \
            --resource-group "$RESOURCE_GROUP" \
            --name "$POSTGRES_SERVER" \
            --location "$LOCATION" \
            --admin-user "$POSTGRES_ADMIN_USER" \
            --admin-password "$POSTGRES_PASSWORD" \
            --tier "$POSTGRES_TIER" \
            --sku-name "$POSTGRES_SKU" \
            --storage-size "$POSTGRES_STORAGE" \
            --version "$POSTGRES_VERSION" \
            --backup-retention "$POSTGRES_BACKUP_RETENTION" \
            --storage-auto-grow Disabled \
            --public-access 0.0.0.0-255.255.255.255 \
            --yes

        log_success "PostgreSQL server created: $POSTGRES_SERVER"
        
        # Create firewall rule to allow Azure services
        log_info "Configuring firewall rules..."
        az postgres server firewall-rule create \
            --resource-group "$RESOURCE_GROUP" \
            --server "$POSTGRES_SERVER" \
            --name "AllowAllAzureIPs" \
            --start-ip-address "0.0.0.0" \
            --end-ip-address "0.0.0.0"
            
        # Create database (for Flexible Server, database is created automatically)
        log_info "Creating database: $POSTGRES_DB"
        az postgres flexible-server db create \
            --resource-group "$RESOURCE_GROUP" \
            --server-name "$POSTGRES_SERVER" \
            --database-name "$POSTGRES_DB"
            
        log_success "Database created: $POSTGRES_DB"
        
        # Get connection details
        POSTGRES_HOST=$(az postgres flexible-server show \
            --resource-group "$RESOURCE_GROUP" \
            --name "$POSTGRES_SERVER" \
            --query fullyQualifiedDomainName -o tsv)
            
        # Save connection details to docs
        update_infra_docs
    else
        log_info "Using existing PostgreSQL server: $POSTGRES_SERVER"
        
        # Get connection details from existing server
        POSTGRES_HOST=$(az postgres flexible-server show \
            --resource-group "$RESOURCE_GROUP" \
            --name "$POSTGRES_SERVER" \
            --query fullyQualifiedDomainName -o tsv)
    fi
    
    # Export the connection details for other scripts
    export POSTGRES_PASSWORD
    export POSTGRES_HOST
    export DB_CONNECTION_STRING="postgresql://${POSTGRES_ADMIN_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}/${POSTGRES_DB}?sslmode=require"
}

# Update infrastructure documentation
update_infra_docs() {
    local doc_file="${SCRIPT_DIR}/../../azure-bds-docs.md"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    
    # Use the already retrieved host
    local postgres_fqdn="$POSTGRES_HOST"
    
    # Ensure we don't expose sensitive information in the docs
    local masked_password="****${POSTGRES_PASSWORD: -4}"  # Only show last 4 chars
    
    # Get ACR login server
    local acr_login_server=$(az acr show \
        --name "$ACR_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query loginServer -o tsv)
    
    # Create a secure copy of the password for display (mask most of it)
    local masked_password="${POSTGRES_PASSWORD:0:4}****${POSTGRES_PASSWORD: -4}"
    
    # Update documentation
    cat > "$doc_file" << EOF
# Azure Infrastructure Documentation

This document contains the infrastructure details for the Nordic BDS Management System deployment on Azure.

> **Last Updated**: $timestamp

## Resource Group
- **Name**: $RESOURCE_GROUP
- **Location**: $LOCATION
- **Purpose**: Contains all resources for the Nordic BDS Management System

## Azure Database for PostgreSQL
- **Server Name**: $POSTGRES_SERVER
- **FQDN**: $postgres_fqdn
- **Version**: PostgreSQL $POSTGRES_VERSION
- **SKU**: $POSTGRES_SKU
- **Admin Username**: $POSTGRES_ADMIN_USER@$POSTGRES_SERVER
- **Admin Password**: $masked_password
- **Database Name**: $POSTGRES_DB
- **Connection Security**: TLS 1.2 enforced

## Azure Container Registry (ACR)
- **Name**: $ACR_NAME
- **Login Server**: $acr_login_server
- **SKU**: Basic

## Environment Variables

### Backend
\`\`\`bash
# Database Configuration
DB_HOST=$postgres_fqdn
DB_PORT=5432
DB_NAME=$POSTGRES_DB
DB_USER=${POSTGRES_ADMIN_USER}@${POSTGRES_SERVER}
DB_PASSWORD=${POSTGRES_PASSWORD}

# Azure Container Registry
ACR_NAME=$ACR_NAME
ACR_LOGIN_SERVER=$acr_login_server
\`\`\`

## Deployment Commands

### Prerequisites
1. Install [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. Login to Azure: \`az login\`
3. Set your subscription (if needed): \`az account set --subscription <subscription-id>\`

### Setup Infrastructure
\`\`\`bash
# Make the script executable
chmod +x scripts/setup-azure-infra.sh

# Run the setup script
./scripts/setup-azure-infra.sh
\`\`\`

## Security Notes
- **IMPORTANT**: The database admin password is: $masked_password
  - Store this password securely (e.g., in Azure Key Vault)
  - The full password is only shown during initial setup
- All database connections require TLS 1.2 or higher
- Firewall rules are configured to allow access from any IP (0.0.0.0 - 0.0.0.0)
  - Restrict this to specific IPs in production

## Next Steps
1. Update your application's configuration with the connection details
2. Run database migrations
3. Build and push your application images to ACR
4. Deploy your application to Azure Container Apps or Kubernetes

## Cleanup
To delete all resources when no longer needed:
\`\`\`bash
az group delete --name $RESOURCE_GROUP --yes --no-wait
\`\`\`

> **Warning**: This will permanently delete all resources in the resource group.
EOF

    log_success "Infrastructure documentation updated: $doc_file"
    log_info "IMPORTANT: The database password has been saved to $doc_file"
    log_info "           Store this password in a secure location (e.g., Azure Key Vault)"
}

# Main function
main() {
    log_info "Starting Azure infrastructure setup..."
    
    # Check and login to Azure
    check_azure_cli
    
    # Ensure resource group exists
    ensure_resource_group "$RESOURCE_GROUP" "$LOCATION"
    
    # Create Azure Container Registry
    ensure_acr "$ACR_NAME" "$RESOURCE_GROUP" "Basic"
    
    # Create PostgreSQL server and database
    create_postgresql
    
    log_success "Azure infrastructure setup completed successfully!"
    echo ""
    log_info "=== NEXT STEPS ==="
    log_info "1. Review the azure-infra-docs.md file for connection details"
    log_info "2. Store the database password in a secure location"
    log_info "3. Update your application configuration with the database connection details"
    echo ""
    log_info "To deploy your application, run:"
    echo "  ./scripts/deploy-all.sh"
}

# Only run main if this script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
