#!/bin/bash

# Update Frontend API URL Script
# Updates the frontend to use the custom domain API URL

# Configuration
RESOURCE_GROUP="bds-qms"
KEYVAULT_NAME="bds-qms-kv"
FRONTEND_APP="bds-frontend"
BACKEND_APP="bds-backend"
CUSTOM_DOMAIN="nordictechdesign.com"
BACKEND_SUBDOMAIN="api.eqms"
CUSTOM_API_URL="https://$BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Function to check Azure CLI authentication
check_azure_auth() {
    log_info "Checking Azure CLI authentication..."
    if ! az account show &>/dev/null; then
        log_error "Azure CLI not authenticated. Please run: az login"
        exit 1
    fi
    log_success "Azure CLI authenticated"
}

# Function to verify custom domain is working
verify_custom_domain() {
    log_info "Verifying custom domain API is accessible..."

    if curl -s -f "$CUSTOM_API_URL/health" | grep -q '"status":"ok"'; then
        log_success "Custom domain API is working: $CUSTOM_API_URL"
        return 0
    else
        log_error "Custom domain API is not accessible: $CUSTOM_API_URL"
        return 1
    fi
}

# Function to update Key Vault with new API URL
update_keyvault_api_url() {
    log_info "Updating Key Vault with new API URL..."

    if az keyvault secret set \
        --vault-name "$KEYVAULT_NAME" \
        --name "api-url" \
        --value "$CUSTOM_API_URL" \
        --output none; then
        log_success "API URL updated in Key Vault"
    else
        log_error "Failed to update API URL in Key Vault"
        return 1
    fi
}

# Function to trigger frontend redeployment
trigger_frontend_redeployment() {
    log_info "Triggering frontend redeployment to use new API URL..."

    # Get current image version
    local current_image=$(az containerapp show \
        --name "$FRONTEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.template.containers[0].image" \
        --output tsv 2>/dev/null)

    if [ -z "$current_image" ]; then
        log_error "Failed to get current frontend image"
        return 1
    fi

    log_info "Current image: $current_image"

    # Update container app (this will trigger a redeployment with new build args)
    if az containerapp update \
        --name "$FRONTEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --image "$current_image" \
        --output none; then
        log_success "Frontend redeployment triggered"
    else
        log_error "Failed to trigger frontend redeployment"
        return 1
    fi
}

# Function to verify frontend is using new API URL
verify_frontend_update() {
    log_info "Verifying frontend is using new API URL..."

    # Get frontend URL
    local frontend_url=$(az containerapp show \
        --name "$FRONTEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.configuration.ingress.fqdn" \
        --output tsv 2>/dev/null)

    if [ -z "$frontend_url" ]; then
        log_error "Failed to get frontend URL"
        return 1
    fi

    frontend_url="https://$frontend_url"

    # Check if frontend is loading (basic connectivity test)
    if curl -s -I "$frontend_url" | grep -q "HTTP/2 200\|HTTP/1.1 200"; then
        log_success "Frontend is accessible at: $frontend_url"
        log_info "Please manually verify the frontend is using the correct API URL"
        return 0
    else
        log_error "Frontend is not accessible at: $frontend_url"
        return 1
    fi
}

# Main execution
main() {
    echo "========================================"
    echo "🔄 Update Frontend API URL to Custom Domain"
    echo "========================================"
    echo ""

    # Check prerequisites
    check_azure_auth

    # Verify custom domain
    if ! verify_custom_domain; then
        log_error "Custom domain API is not working. Please run setup-custom-domain.sh first."
        exit 1
    fi

    # Update Key Vault
    if ! update_keyvault_api_url; then
        exit 1
    fi

    # Trigger redeployment
    if ! trigger_frontend_redeployment; then
        exit 1
    fi

    # Wait for deployment
    log_info "Waiting for frontend redeployment (this may take 2-3 minutes)..."
    sleep 30

    # Verify update
    if verify_frontend_update; then
        echo ""
        log_success "=== Frontend API URL Update Complete ==="
        echo ""
        echo "Your frontend should now use the custom domain API URL:"
        echo "🔗 API URL: $CUSTOM_API_URL"
        echo ""
        echo "Next steps:"
        echo "1. Test your application with the custom domain"
        echo "2. Update any bookmarks or documentation"
        echo "3. Monitor for any issues"
        echo ""
    fi
}

# Show usage if requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0"
    echo ""
    echo "This script updates the frontend to use the custom domain API URL."
    echo ""
    echo "Prerequisites:"
    echo "- Custom domain setup completed (run setup-custom-domain.sh first)"
    echo "- Azure CLI installed and authenticated (az login)"
    echo ""
    echo "The script will:"
    echo "1. Verify custom domain API is working"
    echo "2. Update Key Vault with new API URL"
    echo "3. Trigger frontend redeployment"
    echo "4. Verify the update"
    echo ""
    exit 0
fi

# Run main function
main "$@"

