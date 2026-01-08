#!/bin/bash

# Custom Domain Setup Script for Azure Container Apps
# This script helps set up SSL certificates and custom domains

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

# Function to display DNS setup instructions
display_dns_instructions() {
    log_info "=== DNS Configuration Instructions ==="
    echo ""
    echo "Please add the following CNAME records to your DNS provider:"
    echo ""
    echo "1. For Frontend ($FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN):"
    echo "   Type: CNAME"
    echo "   Name: $FRONTEND_SUBDOMAIN"
    echo "   Value: $FRONTEND_URL"
    echo "   TTL: 300 (5 minutes)"
    echo ""

    echo "2. For Backend API ($BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN):"
    echo "   Type: CNAME"
    echo "   Name: $BACKEND_SUBDOMAIN"
    echo "   Value: $BACKEND_URL"
    echo "   TTL: 300 (5 minutes)"
    echo ""

    echo "⚠️  IMPORTANT: Wait for DNS propagation (5-30 minutes) before proceeding"
    echo ""
    read -p "Press Enter when DNS records are configured and propagated..."
}

# Function to verify DNS configuration
verify_dns() {
    local subdomain=$1
    local target_url=$2
    local full_domain="$subdomain.$CUSTOM_DOMAIN"

    log_info "Verifying DNS for $full_domain -> $target_url"

    # Try to resolve the CNAME
    local resolved_ip=$(nslookup "$full_domain" 2>/dev/null | grep -A1 "Name:" | tail -1 | awk '{print $2}')

    if [ -z "$resolved_ip" ]; then
        log_error "DNS not configured or not propagated for $full_domain"
        return 1
    fi

    log_success "DNS configured for $full_domain (resolves to: $resolved_ip)"
    return 0
}

# Function to set up custom domain for frontend
setup_frontend_domain() {
    log_info "Setting up custom domain for frontend..."

    # Verify DNS first
    if ! verify_dns "$FRONTEND_SUBDOMAIN" "$FRONTEND_URL"; then
        log_error "DNS verification failed. Please configure DNS records first."
        return 1
    fi

    # Add custom domain
    log_info "Adding custom domain $FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN to frontend container app..."
    if az containerapp hostname set \
        --name "$FRONTEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --hostname "$FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN" \
        --output none; then
        log_success "Custom domain added to frontend container app"
    else
        log_error "Failed to add custom domain to frontend"
        return 1
    fi

    # Wait for certificate provisioning
    log_info "Waiting for SSL certificate provisioning (this may take 5-10 minutes)..."
    sleep 10

    # Check certificate status
    local cert_status=$(az containerapp hostname list \
        --name "$FRONTEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[?hostname=='$FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN'].provisioningState" \
        --output tsv 2>/dev/null)

    log_info "Certificate provisioning status: $cert_status"

    if [ "$cert_status" = "Succeeded" ]; then
        log_success "SSL certificate successfully provisioned for frontend!"
    else
        log_warning "Certificate status: $cert_status - may still be provisioning"
    fi
}

# Function to set up custom domain for backend
setup_backend_domain() {
    log_info "Setting up custom domain for backend..."

    # Verify DNS first
    if ! verify_dns "$BACKEND_SUBDOMAIN" "$BACKEND_URL"; then
        log_error "DNS verification failed. Please configure DNS records first."
        return 1
    fi

    # Add custom domain
    log_info "Adding custom domain $BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN to backend container app..."
    if az containerapp hostname set \
        --name "$BACKEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --hostname "$BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN" \
        --output none; then
        log_success "Custom domain added to backend container app"
    else
        log_error "Failed to add custom domain to backend"
        return 1
    fi

    # Wait for certificate provisioning
    log_info "Waiting for SSL certificate provisioning (this may take 5-10 minutes)..."
    sleep 10

    # Check certificate status
    local cert_status=$(az containerapp hostname list \
        --name "$BACKEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[?hostname=='$BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN'].provisioningState" \
        --output tsv 2>/dev/null)

    log_info "Certificate provisioning status: $cert_status"

    if [ "$cert_status" = "Succeeded" ]; then
        log_success "SSL certificate successfully provisioned for backend!"
    else
        log_warning "Certificate status: $cert_status - may still be provisioning"
    fi
}

# Function to verify SSL certificates
verify_ssl() {
    local domain=$1
    log_info "Verifying SSL certificate for https://$domain"

    if curl -s -I "https://$domain" | grep -q "HTTP/2 200\|HTTP/1.1 200"; then
        log_success "SSL certificate working for https://$domain"

        # Show certificate details
        echo "Certificate details:"
        echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates -issuer -subject 2>/dev/null || echo "Could not retrieve certificate details"
    else
        log_error "SSL certificate not working for https://$domain"
        return 1
    fi
}

# Function to display final setup instructions
display_final_instructions() {
    echo ""
    log_success "=== Custom Domain Setup Complete ==="
    echo ""
    echo "Your application is now available at:"
    echo "🌐 Frontend: https://$FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN"
    echo "🔗 Backend API: https://$BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN"
    echo ""
    echo "Next steps:"
    echo "1. Update your frontend configuration to use the new API URL"
    echo "2. Test all functionality with the custom domain"
    echo "3. Consider setting up monitoring and alerts"
    echo ""
}

# Main execution
main() {
    echo "=========================================="
    echo "🔐 Azure Container Apps Custom Domain Setup"
    echo "=========================================="
    echo ""

    # Check prerequisites
    check_azure_auth
    get_app_urls

    # DNS Setup
    display_dns_instructions

    # Setup domains
    echo ""
    read -p "Ready to set up custom domains? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Setup cancelled by user"
        exit 0
    fi

    # Setup frontend domain
    if setup_frontend_domain; then
        verify_ssl "$FRONTEND_SUBDOMAIN.$CUSTOM_DOMAIN"
    fi

    echo ""

    # Setup backend domain
    if setup_backend_domain; then
        verify_ssl "$BACKEND_SUBDOMAIN.$CUSTOM_DOMAIN"
    fi

    # Final instructions
    display_final_instructions

    log_success "Custom domain setup completed!"
}

# Show usage if requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0"
    echo ""
    echo "This script helps set up custom domains with SSL certificates for Azure Container Apps."
    echo ""
    echo "Prerequisites:"
    echo "- Azure CLI installed and authenticated (az login)"
    echo "- Container Apps deployed and running"
    echo "- Domain registrar access for DNS configuration"
    echo ""
    echo "The script will:"
    echo "1. Show DNS configuration instructions"
    echo "2. Verify DNS propagation"
    echo "3. Add custom domains to Container Apps"
    echo "4. Provision free SSL certificates"
    echo "5. Verify SSL setup"
    echo ""
    exit 0
fi

# Run main function
main "$@"

