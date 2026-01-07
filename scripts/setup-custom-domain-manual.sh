#!/bin/bash

# Manual Custom Domain Setup Script
# Provides step-by-step instructions for manual setup

# Configuration
RESOURCE_GROUP="bds-qms"
ENVIRONMENT_NAME="bds-qms-env"
FRONTEND_APP="bds-frontend"
BACKEND_APP="bds-backend"
CUSTOM_DOMAIN="nordictechdesign.com"
FRONTEND_SUBDOMAIN="eqms"
BACKEND_SUBDOMAIN="api.eqms"

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

# Function to get Container App URLs
get_app_urls() {
    log_info "Retrieving Container App URLs..."

    FRONTEND_URL=$(az containerapp show \
        --name "$FRONTEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.configuration.ingress.fqdn" \
        --output tsv 2>/dev/null)

    BACKEND_URL=$(az containerapp show \
        --name "$BACKEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.configuration.ingress.fqdn" \
        --output tsv 2>/dev/null)

    if [ -z "$FRONTEND_URL" ]; then
        log_error "Failed to retrieve frontend URL"
        exit 1
    fi

    if [ -z "$BACKEND_URL" ]; then
        log_error "Failed to retrieve backend URL"
        exit 1
    fi

    log_success "Frontend URL: https://$FRONTEND_URL"
    log_success "Backend URL: https://$BACKEND_URL"
}

# Function to display manual setup instructions
display_manual_instructions() {
    echo ""
    echo "=========================================="
    echo "🔧 MANUAL CUSTOM DOMAIN SETUP INSTRUCTIONS"
    echo "=========================================="
    echo ""

    echo "Since Azure CLI is having issues, follow these manual steps:"
    echo ""

    echo "📋 STEP 1: DNS Configuration"
    echo "Add these CNAME records to your DNS provider:"
    echo ""
    echo "• Type: CNAME"
    echo "  Name: $FRONTEND_SUBDOMAIN"
    echo "  Value: $FRONTEND_URL"
    echo "  TTL: 300 (5 minutes)"
    echo ""
    echo "• Type: CNAME"
    echo "  Name: $BACKEND_SUBDOMAIN"
    echo "  Value: $BACKEND_URL"
    echo "  TTL: 300 (5 minutes)"
    echo ""

    echo "📋 STEP 2: Azure Portal Setup"
    echo "1. Go to Azure Portal: https://portal.azure.com"
    echo "2. Navigate to your Resource Group: $RESOURCE_GROUP"
    echo "3. Find your Container Apps:"
    echo "   • $FRONTEND_APP"
    echo "   • $BACKEND_APP"
    echo ""

    echo "📋 STEP 3: Add Custom Domains"
    echo "For each Container App:"
    echo "1. Go to Container App → Settings → Custom domains"
    echo "2. Click 'Add custom domain'"
    echo "3. Enter the domain:"
    echo "   • Frontend: $FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN"
    echo "   • Backend: $BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN"
    echo "4. Select 'Enable SSL binding'"
    echo "5. Choose 'App Service Managed Certificate' (free)"
    echo "6. Click 'Add'"
    echo ""

    echo "📋 STEP 4: Domain Verification"
    echo "Azure will show a TXT record to add for domain verification:"
    echo "• Add the TXT record to your DNS"
    echo "• Wait for verification (5-10 minutes)"
    echo "• Certificate will be provisioned automatically"
    echo ""

    echo "📋 STEP 5: Update Frontend Configuration"
    echo "After domains are working:"
    echo "1. Run: ./scripts/update-frontend-api-url.sh"
    echo ""

    echo "=========================================="
    echo "🔍 VERIFICATION COMMANDS"
    echo "=========================================="
    echo ""
    echo "Check DNS:"
    echo "nslookup $FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN"
    echo "nslookup $BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN"
    echo ""
    echo "Test SSL:"
    echo "curl -I https://$FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN"
    echo "curl -I https://$BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN/health"
    echo ""
}

# Function to verify DNS configuration
verify_dns_manual() {
    echo ""
    echo "=========================================="
    echo "🔍 DNS VERIFICATION"
    echo "=========================================="
    echo ""

    log_info "Testing DNS resolution..."

    # Test frontend DNS
    echo "Testing $FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN..."
    if nslookup "$FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN" 2>/dev/null | grep -q "74\.225\."; then
        log_success "✅ Frontend DNS configured correctly"
    else
        log_warning "⚠️  Frontend DNS not configured or not propagated"
        echo "Expected: CNAME $FRONTEND_SUBDOMAIN → $FRONTEND_URL"
    fi

    # Test backend DNS
    echo "Testing $BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN..."
    if nslookup "$BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN" 2>/dev/null | grep -q "74\.225\."; then
        log_success "✅ Backend DNS configured correctly"
    else
        log_warning "⚠️  Backend DNS not configured or not propagated"
        echo "Expected: CNAME $BACKEND_SUBDOMAIN → $BACKEND_URL"
    fi

    echo ""
    echo "💡 If DNS is not working:"
    echo "1. Check your DNS provider's control panel"
    echo "2. Ensure records are added correctly"
    echo "3. Wait 5-30 minutes for propagation"
    echo "4. Some DNS providers require the full domain (including subdomain)"
    echo ""
}

# Function to check current Azure domains
check_current_domains() {
    echo ""
    echo "=========================================="
    echo "📊 CURRENT AZURE DOMAINS"
    echo "=========================================="
    echo ""

    echo "Frontend App ($FRONTEND_APP):"
    az containerapp hostname list \
        --name "$FRONTEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[].{Hostname:hostname, Status:provisioningState}" \
        --output table 2>/dev/null || echo "Could not retrieve frontend domains"

    echo ""
    echo "Backend App ($BACKEND_APP):"
    az containerapp hostname list \
        --name "$BACKEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[].{Hostname:hostname, Status:provisioningState}" \
        --output table 2>/dev/null || echo "Could not retrieve backend domains"
}

# Main execution
main() {
    echo "=========================================="
    echo "🔧 Manual Custom Domain Setup Guide"
    echo "=========================================="
    echo ""

    # Check prerequisites
    check_azure_auth
    get_app_urls

    # Show current status
    check_current_domains
    verify_dns_manual

    # Show manual instructions
    display_manual_instructions

    echo ""
    log_success "Manual setup guide provided above!"
    echo ""
    echo "After completing the Azure Portal steps:"
    echo "1. Run: ./scripts/check-dns-status.sh"
    echo "2. Run: ./scripts/update-frontend-api-url.sh"
    echo ""
}

# Show usage if requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0"
    echo ""
    echo "Provides manual step-by-step instructions for custom domain setup."
    echo ""
    echo "Use this when Azure CLI commands are not working."
    echo ""
    echo "This script:"
    echo "- Checks current DNS and Azure domain status"
    echo "- Provides detailed manual setup instructions"
    echo "- Shows verification commands"
    echo ""
    exit 0
fi

# Run main function
main "$@"
