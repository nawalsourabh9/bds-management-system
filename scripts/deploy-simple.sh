#!/bin/bash

# Simplified deployment script for BDS Management System
# Focuses on core functionality without complex prerequisites

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ACR_NAME="bdsqmsacr"
RESOURCE_GROUP="bds-qms"
FRONTEND_IMAGE="bds-frontend"
BACKEND_IMAGE="bds-backend"
ENVIRONMENT_NAME="bds-qms-env"

# Version files
BACKEND_VERSION_FILE="VERSION-backend"
FRONTEND_VERSION_FILE="VERSION-frontend"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to detect platform
detect_platform() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m | tr '[:upper:]' '[:lower:]')
    
    case "$arch" in
        x86_64) arch="amd64" ;;
        aarch64) arch="arm64" ;;
        armv7l) arch="arm" ;;
    esac
    
    echo "${os}_${arch}"
}

# Function to get target platform
get_target_platform() {
    echo "linux/amd64"
}

# Function to generate timestamp-based version
generate_timestamp_version() {
    # Format: YYYY.MM.DD.HHMM (e.g., 2025.09.17.1430)
    date +"%Y.%m.%d.%H%M"
}

# Function to create version file if it doesn't exist
create_version_file() {
    local version_file=$1
    local component=$2
    
    if [ ! -f "$version_file" ]; then
        log_info "Creating version file: $version_file"
        local initial_version=$(generate_timestamp_version)
        echo "$initial_version" > "$version_file"
        log_success "Created $component version file with initial version: $initial_version"
    fi
}

# Function to get version
get_version() {
    local component=$1
    local version_file
    
    if [ "$component" = "backend" ]; then
        version_file="$BACKEND_VERSION_FILE"
    else
        version_file="$FRONTEND_VERSION_FILE"
    fi
    
    create_version_file "$version_file" "$component"
    
    local version=$(head -n 1 "$version_file" | tr -d '[:space:]')
    if [ -z "$version" ]; then
        version=$(generate_timestamp_version)
        echo "$version" > "$version_file"
    fi
    
    echo "$version"
}

# Function to sync versions between backend and frontend
sync_versions() {
    local target_version=$1
    local backend_version=$(get_version "backend")
    local frontend_version=$(get_version "frontend")
    
    log_info "Current versions - Backend: $backend_version, Frontend: $frontend_version"
    
    if [ "$backend_version" != "$frontend_version" ]; then
        log_warning "Version mismatch detected! Syncing to latest version..."
        
        # Use the higher version or target version
        if [ -n "$target_version" ]; then
            local sync_version="$target_version"
        else
            # Compare timestamp versions and use the higher one
            local sync_version="$backend_version"
            if [ "$frontend_version" \> "$backend_version" ]; then
                sync_version="$frontend_version"
            fi
        fi
        
        log_info "Syncing both components to version: $sync_version"
        echo "$sync_version" > "$BACKEND_VERSION_FILE"
        echo "$sync_version" > "$FRONTEND_VERSION_FILE"
        log_success "Versions synchronized to: $sync_version"
    else
        log_success "Versions are already synchronized: $backend_version"
    fi
}

# Function to bump version (timestamp-based)
bump_version() {
    local component=$1
    local bump_type=${2:-"timestamp"}  # timestamp, custom
    local version_file
    local current_version
    
    if [ "$component" = "backend" ]; then
        version_file="$BACKEND_VERSION_FILE"
    else
        version_file="$FRONTEND_VERSION_FILE"
    fi
    
    current_version=$(get_version "$component")
    log_info "Current $component version: $current_version"
    
    # Generate new timestamp-based version
    local new_version=$(generate_timestamp_version)
    
    # Ensure we don't have the same timestamp (wait 1 second if needed)
    while [ "$new_version" = "$current_version" ]; do
        log_info "Waiting 1 second to ensure unique timestamp..."
        sleep 1
        new_version=$(generate_timestamp_version)
    done
    
    echo "$new_version" > "$version_file"
    log_success "$component version bumped from $current_version to $new_version"
    
    # Sync both components to the new version
    sync_versions "$new_version"
    
    echo "$new_version"
}

# Function to build Docker image
build_image() {
    local component=$1
    local version=$2
    local context=$3
    local dockerfile=$4
    
    local image_name="$ACR_NAME.azurecr.io/$component"
    
    log_info "Building $component image version $version..."
    log_info "Image name: $image_name:$version"
    log_info "Context: $context"
    log_info "Dockerfile: $dockerfile"
    log_info "Target platform: $(get_target_platform)"
    
    # Build command
    local build_cmd="docker build --platform $(get_target_platform) -t $image_name:$version"
    
    # Add build arguments for frontend
    if [ "$component" = "bds-frontend" ]; then
        local backend_url="https://bds-backend.graystone-766c02c8.centralindia.azurecontainerapps.io"
        build_cmd="$build_cmd --build-arg VITE_API_BASE_URL=$backend_url"
        build_cmd="$build_cmd --build-arg VITE_APP_NAME='BDS Management System'"
        build_cmd="$build_cmd --build-arg VITE_APP_ENV=production"
        log_info "Adding frontend build arguments with backend URL: $backend_url"
    fi
    
    if [ -n "$dockerfile" ]; then
        build_cmd="$build_cmd -f $dockerfile"
    fi
    
    build_cmd="$build_cmd $context"
    
    log_info "Build command: $build_cmd"
    
    if eval "$build_cmd"; then
        log_success "$component Docker build completed successfully"
        return 0
    else
        log_error "$component Docker build failed"
        return 1
    fi
}

# Function to push Docker image
push_image() {
    local component=$1
    local version=$2
    
    log_info "Pushing $component image (version: $version)..."
    
    local image_name="$ACR_NAME.azurecr.io/$component:$version"
    
    if docker push "$image_name"; then
        log_success "$component image pushed successfully"
        return 0
    else
        log_error "Failed to push $component image"
        return 1
    fi
}

# Function to ensure Key Vault secrets are configured
ensure_key_vault_secrets() {
    log_info "Ensuring Key Vault secrets are configured..."
    
    # Check if container app exists and has Key Vault secrets configured
    if az containerapp show --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        local secrets_count=$(az containerapp show --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.secrets | length(@)" --output tsv 2>/dev/null || echo "0")
        
        if [ "$secrets_count" -lt 4 ]; then
            log_info "Configuring Key Vault secrets for existing container app..."
            az containerapp update --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" \
                --set-env-vars "DB_HOST=secretref:db-host" "DB_NAME=secretref:db-name" "DB_USER=secretref:db-user" "DB_PASSWORD=secretref:db-password" \
                --remove-env-vars "ENVIRONMENT" 2>/dev/null || true
        fi
    fi
}

# Function to deploy backend
deploy_backend() {
    local version=$1
    
    log_info "Deploying backend version $version..."
    
    # Generate revision suffix from timestamp version for better Azure Container Apps tracking
    local revision_suffix=$(echo "$version" | tr '.' '-' | sed 's/-$//')
    log_info "Using revision suffix: $revision_suffix"
    
    # Ensure Key Vault secrets are configured
    ensure_key_vault_secrets
    
    # Check if container app exists
    if az containerapp show --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_info "Updating existing backend container app with timestamp-based revision..."
        
        if ! az containerapp update \
            --name "$BACKEND_IMAGE" \
            --resource-group "$RESOURCE_GROUP" \
            --image "$ACR_NAME.azurecr.io/$BACKEND_IMAGE:$version" \
            --revision-suffix "$revision_suffix" \
            --min-replicas 1 \
            --max-replicas 10; then
            log_error "Failed to update backend"
            return 1
        fi
    else
        log_info "Creating new backend container app..."
        
        # Get ACR credentials
        local acr_password=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" --output tsv)
        
        if ! az containerapp create \
            --name "$BACKEND_IMAGE" \
            --resource-group "$RESOURCE_GROUP" \
            --environment "$ENVIRONMENT_NAME" \
            --image "$ACR_NAME.azurecr.io/$BACKEND_IMAGE:$version" \
            --revision-suffix "$revision_suffix" \
            --target-port 8000 \
            --ingress external \
            --cpu 0.5 \
            --memory 1Gi \
            --min-replicas 1 \
            --max-replicas 10 \
            --registry-server "$ACR_NAME.azurecr.io" \
            --registry-username "$ACR_NAME" \
            --registry-password "$acr_password"; then
            log_error "Failed to create backend"
            return 1
        fi
    fi
    
    # Ensure traffic is routed to the latest revision (Azure Container Apps best practice)
    log_info "Routing traffic to latest revision..."
    if ! az containerapp ingress traffic set \
        --name "$BACKEND_IMAGE" \
        --resource-group "$RESOURCE_GROUP" \
        --revision-weight latest=100; then
        log_warning "Failed to set traffic routing, but deployment succeeded"
    fi
    
    log_success "Backend deployed successfully with revision suffix: $revision_suffix"
    return 0
}

# Function to deploy frontend
deploy_frontend() {
    local version=$1
    
    log_info "Deploying frontend version $version..."
    
    # Generate revision suffix from timestamp version for better Azure Container Apps tracking
    local revision_suffix=$(echo "$version" | tr '.' '-' | sed 's/-$//')
    log_info "Using revision suffix: $revision_suffix"
    
    # Get backend URL
    local backend_domain=$(az containerapp env show --name "$ENVIRONMENT_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.defaultDomain" --output tsv 2>/dev/null)
    local backend_url="https://$BACKEND_IMAGE.$backend_domain"
    
    log_info "Backend URL: $backend_url"
    
    # Check if container app exists
    if az containerapp show --name "$FRONTEND_IMAGE" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_info "Updating existing frontend container app with timestamp-based revision..."
        
        if ! az containerapp update \
            --name "$FRONTEND_IMAGE" \
            --resource-group "$RESOURCE_GROUP" \
            --image "$ACR_NAME.azurecr.io/$FRONTEND_IMAGE:$version" \
            --revision-suffix "$revision_suffix" \
            --min-replicas 1 \
            --max-replicas 10; then
            log_error "Failed to update frontend"
            return 1
        fi
    else
        log_info "Creating new frontend container app..."
        
        # Get ACR credentials
        local acr_password=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" --output tsv)
        
        if ! az containerapp create \
            --name "$FRONTEND_IMAGE" \
            --resource-group "$RESOURCE_GROUP" \
            --environment "$ENVIRONMENT_NAME" \
            --image "$ACR_NAME.azurecr.io/$FRONTEND_IMAGE:$version" \
            --revision-suffix "$revision_suffix" \
            --target-port 80 \
            --ingress external \
            --cpu 0.5 \
            --memory 1Gi \
            --min-replicas 1 \
            --max-replicas 10 \
            --registry-server "$ACR_NAME.azurecr.io" \
            --registry-username "$ACR_NAME" \
            --registry-password "$acr_password"; then
            log_error "Failed to create frontend"
            return 1
        fi
    fi
    
    # Ensure traffic is routed to the latest revision (Azure Container Apps best practice)
    log_info "Routing traffic to latest revision..."
    if ! az containerapp ingress traffic set \
        --name "$FRONTEND_IMAGE" \
        --resource-group "$RESOURCE_GROUP" \
        --revision-weight latest=100; then
        log_warning "Failed to set traffic routing, but deployment succeeded"
    fi
    
    log_success "Frontend deployed successfully with revision suffix: $revision_suffix"
    return 0
}

# Main function
main() {
    local deploy_backend_flag=false
    local deploy_frontend_flag=false
    local bump_version_flag=false
    local bump_type="patch"
    local sync_versions_flag=false
    local no_bump_flag=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend)
                deploy_backend_flag=true
                shift
                ;;
            --frontend)
                deploy_frontend_flag=true
                shift
                ;;
            --all)
                deploy_backend_flag=true
                deploy_frontend_flag=true
                shift
                ;;
            --bump)
                bump_version_flag=true
                bump_type=${2:-"timestamp"}
                shift 2
                ;;
            --sync-versions)
                sync_versions_flag=true
                shift
                ;;
            --no-bump)
                no_bump_flag=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --backend              Deploy backend only"
                echo "  --frontend             Deploy frontend only"
                echo "  --all                  Deploy both backend and frontend (default)"
                echo "  --bump [timestamp|custom]  Bump version before deployment (default: timestamp)"
                echo "  --no-bump             Skip version bumping (versions auto-increment by default)"
                echo "  --sync-versions        Sync versions between backend and frontend"
                echo "  --help                 Show this help message"
                echo ""
                echo "Version Format: YYYY.MM.DD.HHMM (e.g., 2025.09.17.1430)"
                echo ""
                echo "Examples:"
                echo "  $0 --all --bump timestamp # Deploy both with timestamp version"
                echo "  $0 --backend             # Deploy backend with auto timestamp version"
                echo "  $0 --sync-versions       # Just sync versions without deploying"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Default to both if nothing specified and not just syncing versions
    if [ "$deploy_backend_flag" = false ] && [ "$deploy_frontend_flag" = false ] && [ "$sync_versions_flag" = false ]; then
        deploy_backend_flag=true
        deploy_frontend_flag=true
    fi
    
    # Handle version synchronization
    if [ "$sync_versions_flag" = true ]; then
        log_info "Syncing versions between backend and frontend..."
        sync_versions
        log_success "Version synchronization completed"
        
        # If no deployment flags are set, exit after syncing
        if [ "$deploy_backend_flag" = false ] && [ "$deploy_frontend_flag" = false ]; then
            exit 0
        fi
    fi
    
    # Handle version bumping - auto-increment by default unless --no-bump is specified
    if [ "$no_bump_flag" = true ]; then
        log_info "Skipping version bump (--no-bump specified)"
    elif [ "$bump_version_flag" = false ]; then
        # Auto-increment timestamp version by default
        log_info "Auto-incrementing version (type: timestamp)..."
        local new_version=$(bump_version "backend" "timestamp")
        log_success "Version auto-incremented to: $new_version"
    else
        log_info "Bumping version (type: $bump_type)..."
        local new_version=$(bump_version "backend" "$bump_type")
        log_success "Version bumped to: $new_version"
    fi
    
    # Ensure versions are synchronized before deployment
    if [ "$deploy_backend_flag" = true ] || [ "$deploy_frontend_flag" = true ]; then
        log_info "Ensuring version synchronization before deployment..."
        sync_versions
    fi
    
    log_info "Starting BDS Management System deployment..."
    log_info "Current Platform: $(detect_platform)"
    log_info "Target Platform: $(get_target_platform)"
    log_info "Resource Group: $RESOURCE_GROUP"
    log_info "ACR Name: $ACR_NAME"
    log_info "Environment: $ENVIRONMENT_NAME"
    
    # Display current versions
    local backend_version=$(get_version "backend")
    local frontend_version=$(get_version "frontend")
    log_info "Backend Version: $backend_version"
    log_info "Frontend Version: $frontend_version"
    
    # Login to ACR
    log_info "Logging in to Azure Container Registry..."
    if ! az acr login --name "$ACR_NAME"; then
        log_error "Failed to login to Azure Container Registry"
        exit 1
    fi
    
    # Deploy backend
    if [ "$deploy_backend_flag" = true ]; then
        log_info "=== Deploying Backend ==="
        
        local backend_version=$(get_version "backend")
        log_info "Backend version: $backend_version"
        
        # Build backend
        if ! build_image "$BACKEND_IMAGE" "$backend_version" "./backend" ""; then
            log_error "Backend build failed"
            exit 1
        fi
        
        # Push backend
        if ! push_image "$BACKEND_IMAGE" "$backend_version"; then
            log_error "Backend push failed"
            exit 1
        fi
        
        # Deploy backend
        if ! deploy_backend "$backend_version"; then
            log_error "Backend deployment failed"
            exit 1
        fi
        
        log_success "=== Backend deployment completed ==="
    fi
    
    # Deploy frontend
    if [ "$deploy_frontend_flag" = true ]; then
        log_info "=== Deploying Frontend ==="
        
        local frontend_version=$(get_version "frontend")
        log_info "Frontend version: $frontend_version"
        
        # Build frontend
        if ! build_image "$FRONTEND_IMAGE" "$frontend_version" "." "Dockerfile.frontend"; then
            log_error "Frontend build failed"
            exit 1
        fi
        
        # Push frontend
        if ! push_image "$FRONTEND_IMAGE" "$frontend_version"; then
            log_error "Frontend push failed"
            exit 1
        fi
        
        # Deploy frontend
        if ! deploy_frontend "$frontend_version"; then
            log_error "Frontend deployment failed"
            exit 1
        fi
        
        log_success "=== Frontend deployment completed ==="
    fi
    
    log_success "All deployments completed successfully!"
    
    # Display URLs
    log_info "=== Deployment URLs ==="
    local backend_url=$(az containerapp show --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" --output tsv 2>/dev/null)
    local frontend_url=$(az containerapp show --name "$FRONTEND_IMAGE" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" --output tsv 2>/dev/null)
    
    if [ -n "$backend_url" ]; then
        log_info "Backend URL: https://$backend_url"
    fi
    
    if [ -n "$frontend_url" ]; then
        log_info "Frontend URL: https://$frontend_url"
    fi
    
    log_info "======================="
}

# Run main function
main "$@"
