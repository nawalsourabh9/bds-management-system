#!/bin/bash

# DNS Status Check Script
# Helps verify DNS configuration for custom domains

# Configuration
CUSTOM_DOMAIN="nordictechdesign.com"
FRONTEND_SUBDOMAIN="eqms"
BACKEND_SUBDOMAIN="api.eqms"
RESOURCE_GROUP="bds-qms"
FRONTEND_APP="bds-frontend"
BACKEND_APP="bds-backend"

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

# Function to check DNS resolution
check_dns() {
    local subdomain=$1
    local expected_target=$2
    local full_domain="$subdomain.$CUSTOM_DOMAIN"

    log_info "Checking DNS for $full_domain..."

    # Try to resolve the domain
    local resolved_ip=$(nslookup "$full_domain" 2>/dev/null | grep -A1 "Name:" | tail -1 | awk '{print $2}')

    if [ -z "$resolved_ip" ]; then
        log_error "❌ DNS not configured for $full_domain"
        return 1
    fi

    # Check if it resolves to Azure Container Apps
    if echo "$resolved_ip" | grep -q "\.azurecontainerapps\.io\|\.trafficmanager\.net"; then
        log_success "✅ $full_domain correctly resolves to Azure Container Apps"
        return 0
    else
        log_warning "⚠️  $full_domain resolves to $resolved_ip (not Azure Container Apps)"
        return 1
    fi
}

# Function to check Azure Container App domains
check_azure_domains() {
    log_info "Checking Azure Container App custom domains..."

    # Frontend domains
    echo "Frontend domains:"
    az containerapp hostname list \
        --name "$FRONTEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[].{Hostname:hostname, Status:provisioningState}" \
        --output table 2>/dev/null || echo "Failed to get frontend domains"

    echo ""

    # Backend domains
    echo "Backend domains:"
    az containerapp hostname list \
        --name "$BACKEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[].{Hostname:hostname, Status:provisioningState}" \
        --output table 2>/dev/null || echo "Failed to get backend domains"
}

# Function to test SSL
test_ssl() {
    local domain=$1
    log_info "Testing SSL for https://$domain"

    if curl -s -I "https://$domain" | grep -q "HTTP/2 200\|HTTP/1.1 200\|HTTP/2 301\|HTTP/1.1 301"; then
        log_success "✅ SSL working for https://$domain"
        return 0
    else
        log_error "❌ SSL not working for https://$domain"
        return 1
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "🔍 DNS & SSL Status Check"
    echo "=========================================="
    echo ""

    # Get Azure Container App URLs
    log_info "Getting Azure Container App URLs..."
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

    echo ""
    echo "Expected DNS configuration:"
    echo "• $FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN → $FRONTEND_URL"
    echo "• $BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN → $BACKEND_URL"
    echo ""

    # Check DNS
    echo "DNS Resolution Check:"
    check_dns "$FRONTEND_SUBDOMAIN" "$FRONTEND_URL"
    check_dns "$BACKEND_SUBDOMAIN" "$BACKEND_URL"

    echo ""

    # Check Azure domains
    check_azure_domains

    echo ""

    # Test SSL
    echo "SSL Certificate Check:"
    test_ssl "$FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN"
    test_ssl "$BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN"

    echo ""
    echo "=========================================="
    echo "📋 Next Steps:"
    echo "=========================================="
    echo ""
    echo "If DNS is not configured:"
    echo "1. Add CNAME records at your DNS provider"
    echo "2. Wait 5-30 minutes for propagation"
    echo "3. Run this script again"
    echo ""
    echo "If DNS is configured but Azure domains missing:"
    echo "1. Run: ./scripts/setup-custom-domain.sh"
    echo ""
    echo "If everything is working:"
    echo "1. Run: ./scripts/update-frontend-api-url.sh"
    echo ""
}

# Show usage if requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0"
    echo ""
    echo "Checks DNS configuration and SSL status for custom domains."
    echo ""
    echo "This script:"
    echo "- Verifies DNS resolution"
    echo "- Checks Azure Container App custom domains"
    echo "- Tests SSL certificate functionality"
    echo "- Provides next steps guidance"
    echo ""
    exit 0
fi

# Run main function
main "$@"
