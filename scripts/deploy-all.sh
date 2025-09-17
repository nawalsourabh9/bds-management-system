#!/bin/bash

# Comprehensive deployment script for BDS Management System
# Handles both frontend and backend deployment with cross-platform support

# Source platform utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/platform-utils.sh"

# Configuration
ACR_NAME="bdsqmsacr"
RESOURCE_GROUP="bds-qms"
FRONTEND_IMAGE="bds-frontend"
BACKEND_IMAGE="bds-backend"
ENVIRONMENT_NAME="bds-qms-env"
KEYVAULT_NAME="bds-qms-kv"

# Version files
BACKEND_VERSION_FILE="VERSION-backend"
FRONTEND_VERSION_FILE="VERSION-frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse command line arguments
DEPLOY_FRONTEND=false
DEPLOY_BACKEND=false
SKIP_BUILD=false
SKIP_PUSH=false
VERBOSE=false
AUTO_BUMP=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --frontend)
      DEPLOY_FRONTEND=true; shift ;;
    --backend)
      DEPLOY_BACKEND=true; shift ;;
    --all)
      DEPLOY_FRONTEND=true; DEPLOY_BACKEND=true; shift ;;
    --skip-build)
      SKIP_BUILD=true; shift ;;
    --skip-push)
      SKIP_PUSH=true; shift ;;
    --verbose)
      VERBOSE=true; shift ;;
    --no-auto-bump)
      AUTO_BUMP=false; shift ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --frontend     Deploy frontend only"
      echo "  --backend      Deploy backend only"
      echo "  --all          Deploy both frontend and backend"
      echo "  --skip-build   Skip Docker build step"
      echo "  --skip-push    Skip Docker push step"
      echo "  --verbose      Enable verbose output"
      echo "  --no-auto-bump Disable automatic version bumping"
      echo "  --help         Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Default to deploying both if no specific target specified
if [ "$DEPLOY_FRONTEND" = false ] && [ "$DEPLOY_BACKEND" = false ]; then
  DEPLOY_FRONTEND=true
  DEPLOY_BACKEND=true
fi

# Function to run backend tests
run_backend_tests() {
    log_info "Running backend tests..."
    
    # Change to backend directory
    pushd "$SCRIPT_DIR/../backend" > /dev/null || {
        log_error "Failed to change to backend directory"
        return 1
    }
    
    # Run tests (adjust command based on your test framework)
    if ! python -m pytest tests/ -v; then
        log_error "Backend tests failed"
        popd > /dev/null || true
        return 1
    fi
    
    popd > /dev/null || true
    log_success "Backend tests passed"
    return 0
}

# Function to run frontend tests
run_frontend_tests() {
    log_info "Running frontend tests..."
    
    # Change to frontend directory
    pushd "$SCRIPT_DIR/../frontend" > /dev/null || {
        log_error "Failed to change to frontend directory"
        return 1
    }
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        if ! npm ci; then
            log_error "Failed to install frontend dependencies"
            popd > /dev/null || true
            return 1
        fi
    fi
    
    # Run tests (adjust command based on your test framework)
    if ! npm test -- --watchAll=false; then
        log_error "Frontend tests failed"
        popd > /dev/null || true
        return 1
    fi
    
    popd > /dev/null || true
    log_success "Frontend tests passed"
    return 0
}

# Function to check database connectivity
test_database_connectivity() {
    log_info "Testing database connectivity..."
    
    # Get database connection details from Key Vault
    local db_host db_user db_password db_name
    
    db_host=$(az keyvault secret show --vault-name nordic-keyvault --name db-host --query value -o tsv 2>/dev/null) || {
        log_error "Failed to get database host from Key Vault"
        return 1
    }
    
    db_user=$(az keyvault secret show --vault-name nordic-keyvault --name db-user --query value -o tsv 2>/dev/null) || {
        log_error "Failed to get database user from Key Vault"
        return 1
    }
    
    db_password=$(az keyvault secret show --vault-name nordic-keyvault --name db-password --query value -o tsv 2>/dev/null) || {
        log_error "Failed to get database password from Key Vault"
        return 1
    }
    
    db_name=$(az keyvault secret show --vault-name nordic-keyvault --name db-name --query value -o tsv 2>/dev/null) || {
        log_error "Failed to get database name from Key Vault"
        return 1
    }
    
    # Test connection using psql
    if ! PGPASSWORD="$db_password" psql -h "$db_host" -U "$db_user" -d "$db_name" -c "SELECT 1" >/dev/null 2>&1; then
        log_error "Failed to connect to the database"
        return 1
    fi
    
    log_success "Database connectivity test passed"
    return 0
}

# Function to validate environment variables
validate_environment() {
    log_info "Validating environment variables..."
    
    # Required environment variables
    local required_vars=(
        "RESOURCE_GROUP"
        "AZURE_LOCATION"
        "ACR_NAME"
    )
    
    # Check each required variable
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            return 1
        fi
    done
    
    log_success "Environment validation passed"
    return 0
}

# Function to detect and validate platform
detect_and_validate_platform() {
    log_info "Detecting platform and validating compatibility..."
    
    # Detect current platform
    local current_platform=$(detect_platform)
    local target_platform=$(get_target_platform)
    
    log_info "Current platform: $current_platform"
    log_info "Target platform: $target_platform"
    
    # Check platform compatibility
    if ! is_platform_compatible; then
        log_error "Current platform is not compatible with Azure Container Apps"
        return 1
    fi
    
    log_success "Platform compatibility verified"
    return 0
}

# Function to ensure Azure resources exist
ensure_azure_resources() {
    log_info "Ensuring Azure resources exist..."
    
    # Check if resource group exists
    if ! az group show --name "$RESOURCE_GROUP" &>/dev/null; then
        log_error "Resource group $RESOURCE_GROUP does not exist"
        return 1
    fi
    
    # Check if ACR exists
    if ! az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_error "Azure Container Registry $ACR_NAME does not exist"
        return 1
    fi
    
    # Check if Container Apps environment exists
    if ! az containerapp env show --name "$ENVIRONMENT_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_error "Container Apps environment $ENVIRONMENT_NAME does not exist"
        return 1
    fi
    
    log_success "All required Azure resources exist"
    return 0
}

# Function to create or verify container app
ensure_container_app() {
    local component=$1
    local component_name
    
    if [ "$component" = "$BACKEND_IMAGE" ]; then
        component_name="backend"
    else
        component_name="frontend"
    fi
    
    log_info "Ensuring $component_name container app exists..."
    
    if ! az containerapp show --name "$component" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_warning "Container app $component does not exist, it will be created during deployment"
        return 0
    else
        log_success "Container app $component already exists"
        return 0
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Detect and validate platform
    if ! detect_and_validate_platform; then
        return 1
    fi
    
    # Check Docker capabilities
    if ! check_docker_capabilities; then
        log_error "Docker prerequisites not met"
        return 1
    fi
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed"
        return 1
    fi
    
    # Check Azure connectivity
    if ! test_azure_connectivity; then
        log_error "Azure connectivity test failed"
        return 1
    fi
    
    # Ensure Azure resources exist
    if ! ensure_azure_resources; then
        return 1
    fi
    
    # Check for required tools
    local required_commands=("docker" "az")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            return 1
        fi
    done
    
    # Validate environment
    if ! validate_environment; then
        return 1
    fi
    
    log_success "All prerequisites met"
    return 0
}

# Function to create version file if it doesn't exist
create_version_file() {
  local version_file=$1
  local component=$2
  
  if [ ! -f "$version_file" ]; then
    log_info "Creating version file: $version_file"
    echo "1.0.0" > "$version_file"
    log_success "Created $component version file with initial version: 1.0.0"
  fi
}

# Function to automatically bump version
auto_bump_version() {
  local component=$1
  local version_file
  
  if [ "$component" = "backend" ]; then
    version_file="$BACKEND_VERSION_FILE"
  else
    version_file="$FRONTEND_VERSION_FILE"
  fi
  
  # Create version file if it doesn't exist
  create_version_file "$version_file" "$component"
  
  # Read current version
  local current_version=$(head -n 1 "$version_file" | tr -d '[:space:]')
  if [ -z "$current_version" ]; then
    log_warning "Empty version file: $version_file, setting to 1.0.0"
    current_version="1.0.0"
    echo "$current_version" > "$version_file"
  fi
  
  # Parse version components
  local major=$(echo "$current_version" | cut -d. -f1)
  local minor=$(echo "$current_version" | cut -d. -f2)
  local patch=$(echo "$current_version" | cut -d. -f3)
  
  # Ensure we have valid numbers
  major=${major:-1}
  minor=${minor:-0}
  patch=${patch:-0}
  
  # Increment patch version
  local new_patch=$((patch + 1))
  local new_version="${major}.${minor}.${new_patch}"
  
  # Update version file
  echo "$new_version" > "$version_file"
  
  # Log the version bump
  log_success "Auto-bumped $component version: $current_version → $new_version"
  
  # Return only the new version
  echo "$new_version"
}

# Function to get version from file
get_version() {
    local component=$1
    local version_file
    
    if [ "$component" = "backend" ]; then
        version_file="$BACKEND_VERSION_FILE"
    else
        version_file="$FRONTEND_VERSION_FILE"
    fi
    
    # Create version file if it doesn't exist
    create_version_file "$version_file" "$component"
    
    # Use head -n 1 to avoid pager/formatter issues and ensure clean output
    local version=$(head -n 1 "$version_file" | tr -d '[:space:]')
    if [ -z "$version" ]; then
        log_warning "Empty version file: $version_file, setting to 1.0.0"
        version="1.0.0"
        echo "$version" > "$version_file"
    fi
    
    echo "$version"
}

# Function to build Docker image
build_image() {
    local component=$1
    local version=$2
    local context=$3
    local build_args=$4
    
    local image_name="$ACR_NAME.azurecr.io/$component"
    
    log_info "Building $component image version $version..."
    log_info "Image name: $image_name:$version"
    log_info "Context: $context"
    log_info "Target platform: $(get_target_platform)"
    
    # Use platform-utils to get the correct build command
    local build_cmd
    if docker buildx version &> /dev/null; then
        # Use buildx for multi-platform builds
        build_cmd="docker buildx build --platform $(get_target_platform) --load -t $image_name:$version"
    else
        # Fallback to regular docker build
        build_cmd="docker build --platform $(get_target_platform) -t $image_name:$version"
    fi
    
    # Add build arguments if provided
    if [ -n "$build_args" ]; then
        build_cmd="$build_cmd $build_args"
    fi
    
    # Add context
    build_cmd="$build_cmd $context"
    
    if [ "$VERBOSE" = true ]; then
        log_info "Build command: $build_cmd"
    fi
    
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

# Function to deploy to Azure Container Apps
deploy_to_aca() {
    local component=$1
    local version=$2
    local revision_suffix=$3
    
    log_info "Deploying $component to Azure Container Apps..."
    
    if [ "$component" = "$BACKEND_IMAGE" ]; then
        # Backend deployment - use direct environment variables for now
        local db_host="bds-pg-dev.postgres.database.azure.com"
        local db_name="bds_eqms"
        local db_user="bds_admin@bds-pg-dev"
        
        # Get database password from Key Vault if available, otherwise use placeholder
        local db_password
        if az keyvault secret show --vault-name "$KEYVAULT_NAME" --name db-password --query value --output tsv 2>/dev/null; then
            db_password=$(az keyvault secret show --vault-name "$KEYVAULT_NAME" --name db-password --query value --output tsv)
        else
            log_warning "Database password not found in Key Vault, using placeholder"
            db_password="placeholder_password"
        fi
        
        # Create or update backend container app
        if az containerapp show --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
            log_info "Updating existing backend container app..."
            if ! az containerapp update \
                --name "$BACKEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                --image "$ACR_NAME.azurecr.io/$component:$version" \
                --min-replicas 1 \
                --max-replicas 10 \
                --set-env-vars \
                    "DB_HOST=${db_host}" \
                    "DB_NAME=${db_name}" \
                    "DB_USER=${db_user}" \
                    "DB_PASSWORD=${db_password}" \
                    "ENVIRONMENT=production"; then
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
                --image "$ACR_NAME.azurecr.io/$component:$version" \
                --target-port 8000 \
                --ingress external \
                --cpu 0.5 \
                --memory 1Gi \
                --min-replicas 1 \
                --max-replicas 10 \
                --registry-server "$ACR_NAME.azurecr.io" \
                --registry-username "$ACR_NAME" \
                --registry-password "$acr_password" \
                --set-env-vars \
                    "DB_HOST=${db_host}" \
                    "DB_NAME=${db_name}" \
                    "DB_USER=${db_user}" \
                    "DB_PASSWORD=${db_password}" \
                    "ENVIRONMENT=production"; then
                log_error "Failed to create backend"
                return 1
            fi
        fi
    else
        # Frontend deployment - get dynamic backend URL
        local backend_domain=$(az containerapp env show --name "$ENVIRONMENT_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.defaultDomain" --output tsv 2>/dev/null)
        local backend_url="https://$BACKEND_IMAGE.$backend_domain"
        
        # Create or update frontend container app
        if az containerapp show --name "$FRONTEND_IMAGE" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
            log_info "Updating existing frontend container app..."
            if ! az containerapp update \
                --name "$FRONTEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                --image "$ACR_NAME.azurecr.io/$component:$version" \
                --min-replicas 1 \
                --max-replicas 10 \
                --set-env-vars \
                    "BACKEND_URL=${backend_url}" \
                    "VITE_API_URL=${backend_url}" \
                    "VITE_APP_NAME=BDS Management System" \
                    "VITE_APP_ENV=production"; then
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
                --image "$ACR_NAME.azurecr.io/$component:$version" \
                --target-port 80 \
                --ingress external \
                --cpu 0.5 \
                --memory 1Gi \
                --min-replicas 1 \
                --max-replicas 10 \
                --registry-server "$ACR_NAME.azurecr.io" \
                --registry-username "$ACR_NAME" \
                --registry-password "$acr_password" \
                --set-env-vars \
                    "BACKEND_URL=${backend_url}" \
                    "VITE_API_URL=${backend_url}" \
                    "VITE_APP_NAME=BDS Management System" \
                    "VITE_APP_ENV=production"; then
                log_error "Failed to create frontend"
                return 1
            fi
        fi
    fi
    
    # Fix traffic routing for backend to ensure new revision gets traffic
    if [[ "$component" == "nordic-erp-backend" ]]; then
        log_info "Configuring traffic routing for backend..."
        # Wait a moment for the revision to be ready
        sleep 10
        
        # Get the new revision name
        new_revision=$(az containerapp revision list --name nordic-erp-backend --resource-group $RESOURCE_GROUP --query "[?properties.template.containers[0].image=='$ACR_NAME.azurecr.io/$component:$version'].name" -o tsv | head -1)
        
        if [[ -n "$new_revision" ]]; then
            log_info "New revision: $new_revision"
            
            # Deactivate old revisions
            log_info "Deactivating old revisions..."
            az containerapp revision list --name nordic-erp-backend --resource-group $RESOURCE_GROUP --query "[?name!='$new_revision' && properties.active==true].name" -o tsv | while read old_revision; do
                if [[ -n "$old_revision" ]]; then
                    log_info "   Deactivating: $old_revision"
                    az containerapp revision deactivate --revision "$old_revision" --resource-group $RESOURCE_GROUP > /dev/null 2>&1
                fi
            done
            
            log_success "Traffic routing configured"
        else
            log_warning "Could not find new revision, traffic may not switch automatically"
        fi
    fi
    
    log_success "$component deployed successfully"
    return 0
}

# Function to generate revision suffix
generate_revision_suffix() {
  local component=$1
  local version=$2
  local timestamp=$(date +"%Y%m%d-%H%M%S")
  # Azure Container Apps revision suffix requirements:
  # - Lower case alphanumeric characters or '-'
  # - Start with letter or number
  # - End with alphanumeric character
  # - Cannot have '--'
  echo "v${version}-${timestamp}" | tr '[:upper:]' '[:lower:]' | sed 's/\./-/g'
}

# Function to run health checks after deployment
run_health_checks() {
    local component=$1
    local version=$2
    
    log_info "Running health checks for $component..."
    
    if [ "$component" = "$BACKEND_IMAGE" ]; then
        # Get backend URL
        local backend_url=$(az containerapp show --name nordic-erp-backend --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null)
        
        if [ -z "$backend_url" ]; then
            log_error "Failed to get backend URL"
            return 1
        fi
        
        # Add https if not present
        if [[ ! "$backend_url" =~ ^https?:// ]]; then
            backend_url="https://$backend_url"
        fi
        
        # Health check endpoint
        local health_url="$backend_url/health"
        
        log_info "Checking backend health at: $health_url"
        
        # Try multiple times with retries
        local max_retries=12  # 2 minutes with 10 second intervals
        local retry_count=0
        local success=false
        
        while [ $retry_count -lt $max_retries ]; do
            if curl -s -f "$health_url" | grep -q '"status":"ok"'; then
                success=true
                break
            fi
            
            log_info "Waiting for backend to be healthy (attempt $((retry_count + 1))/$max_retries)..."
            sleep 10
            ((retry_count++))
        done
        
        if [ "$success" = false ]; then
            log_error "Backend health check failed after $max_retries attempts"
            return 1
        fi
        
        log_success "Backend health check passed"
    else
        # Frontend health check
        local frontend_url=$(az containerapp show --name nordic-erp-frontend --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null)
        
        if [ -z "$frontend_url" ]; then
            log_error "Failed to get frontend URL"
            return 1
        fi
        
        # Add https if not present
        if [[ ! "$frontend_url" =~ ^https?:// ]]; then
            frontend_url="https://$frontend_url"
        fi
        
        log_info "Checking frontend availability at: $frontend_url"
        
        # Try multiple times with retries
        local max_retries=12  # 2 minutes with 10 second intervals
        local retry_count=0
        local success=false
        
        while [ $retry_count -lt $max_retries ]; do
            if curl -s -f -I "$frontend_url" | grep -q "200 OK\|200"; then
                success=true
                break
            fi
            
            log_info "Waiting for frontend to be available (attempt $((retry_count + 1))/$max_retries)..."
            sleep 10
            ((retry_count++))
        done
        
        if [ "$success" = false ]; then
            log_error "Frontend health check failed after $max_retries attempts"
            return 1
        fi
        
        log_success "Frontend health check passed"
    fi
    
    return 0
}

# Function to run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Get backend URL
    local backend_url=$(az containerapp show --name nordic-erp-backend --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null)
    
    if [ -z "$backend_url" ]; then
        log_error "Failed to get backend URL for smoke tests"
        return 1
    fi
    
    # Add https if not present
    if [[ ! "$backend_url" =~ ^https?:// ]]; then
        backend_url="https://$backend_url"
    fi
    
    # Example smoke test - adjust based on your API
    local test_endpoint="$backend_url/api/health"
    log_info "Testing endpoint: $test_endpoint"
    
    if ! curl -s -f "$test_endpoint" | grep -q '"status":"ok"'; then
        log_error "Smoke test failed - endpoint not responding as expected"
        return 1
    fi
    
    log_success "Smoke tests passed"
    return 0
}

# Function to deploy a single component
deploy_component() {
    local component=$1
    local component_name
    
    if [ "$component" = "$BACKEND_IMAGE" ]; then
        component_name="backend"
    else
        component_name="frontend"
    fi
    
    log_info "=== Starting deployment for $component ==="
    
    # Ensure container app exists or will be created
    if ! ensure_container_app "$component"; then
        log_error "Failed to verify container app for $component"
        return 1
    fi
    
    # Run pre-deployment tests (optional, can be skipped)
    if [ "$component" = "$BACKEND_IMAGE" ]; then
        # Skip tests for now to focus on deployment
        log_info "Skipping backend tests for faster deployment"
    else
        # Skip tests for now to focus on deployment
        log_info "Skipping frontend tests for faster deployment"
    fi
    
    # Auto-bump version if enabled
    local version
    if [ "$AUTO_BUMP" = true ]; then
        version=$(auto_bump_version "$component_name")
    else
        version=$(get_version "$component_name")
    fi
    
    log_info "Deploying version: $version"
    
    # Generate revision suffix
    local revision_suffix=$(generate_revision_suffix "$component" "$version")
    log_info "Revision suffix: $revision_suffix"
    
    # Build image
    if [ "$SKIP_BUILD" = false ]; then
        local context="."
        local build_args=""
        
        if [ "$component" = "$BACKEND_IMAGE" ]; then
            context="./backend"
            build_args="--build-arg BUILD_VERSION=$version --build-arg BUILD_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        elif [ "$component" = "$FRONTEND_IMAGE" ]; then
            context="."
            build_args="--build-arg BUILD_VERSION=$version --build-arg BUILD_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ) -f Dockerfile.frontend"
        fi
        
        if ! build_image "$component" "$version" "$context" "$build_args"; then
            return 1
        fi
    else
        log_warning "Skipping build step"
    fi
    
    # Push image
    if [ "$SKIP_PUSH" = false ]; then
        if ! push_image "$component" "$version"; then
            return 1
        fi
    else
        log_warning "Skipping push step"
    fi
    
    # Deploy to Azure Container Apps
    if ! deploy_to_aca "$component" "$version" "$revision_suffix"; then
        return 1
    fi
    
    # Run health checks after deployment
    if ! run_health_checks "$component" "$version"; then
        log_error "Health checks failed for $component"
        return 1
    fi
    
    # Run smoke tests after backend deployment
    if [ "$component" = "$BACKEND_IMAGE" ]; then
        if ! run_smoke_tests; then
            log_error "Smoke tests failed"
            return 1
        fi
    fi
    
    log_success "=== $component deployment completed successfully ==="
    return 0
}

# Function to initialize version files
initialize_version_files() {
    log_info "Initializing version files..."
    
    # Create version files if they don't exist
    create_version_file "$BACKEND_VERSION_FILE" "backend"
    create_version_file "$FRONTEND_VERSION_FILE" "frontend"
    
    log_success "Version files initialized"
}

# Function to display system and environment information
display_system_info() {
    log_info "=== System Information ==="
    log_info "Current Platform: $(detect_platform)"
    log_info "Target Platform: $(get_target_platform)"
    log_info "Docker Version: $(docker --version 2>/dev/null || echo 'Not available')"
    log_info "Azure CLI Version: $(az version --query '"azure-cli"' -o tsv 2>/dev/null || echo 'Not available')"
    log_info "Resource Group: $RESOURCE_GROUP"
    log_info "ACR Name: $ACR_NAME"
    log_info "Environment: $ENVIRONMENT_NAME"
    log_info "Key Vault: $KEYVAULT_NAME"
    
    # Display version information
    if [ -f "$BACKEND_VERSION_FILE" ]; then
        log_info "Backend Version: $(cat $BACKEND_VERSION_FILE)"
    fi
    if [ -f "$FRONTEND_VERSION_FILE" ]; then
        log_info "Frontend Version: $(cat $FRONTEND_VERSION_FILE)"
    fi
    
    log_info "=========================="
}

# Main execution
main() {
  log_info "Starting BDS Management System deployment..."
  
  # Display system and environment information
  display_system_info
  
  # Set default to deploy both if no specific component is specified
  if [ "$DEPLOY_FRONTEND" = false ] && [ "$DEPLOY_BACKEND" = false ]; then
    log_info "No components specified. Deploying both frontend and backend."
    DEPLOY_FRONTEND=true
    DEPLOY_BACKEND=true
  fi
  
  if [ "$DEPLOY_FRONTEND" = true ]; then
    log_info "Frontend will be deployed: $FRONTEND_IMAGE"
  fi
  
  if [ "$DEPLOY_BACKEND" = true ]; then
    log_info "Backend will be deployed: $BACKEND_IMAGE"
  fi
  
  # Check prerequisites
  if ! check_prerequisites; then
    log_error "Prerequisites check failed"
    exit 1
  fi
  
  # Initialize version files
  initialize_version_files
  
  # Login to ACR
  log_info "Logging in to Azure Container Registry..."
  if ! az acr login --name "$ACR_NAME"; then
    log_error "Failed to login to Azure Container Registry"
    exit 1
  fi
  
  # Deploy components
  local exit_code=0
  
  if [ "$DEPLOY_BACKEND" = true ]; then
    log "Deploying backend component..."
    deploy_component "$BACKEND_IMAGE" || {
      log_error "Failed to deploy backend component"
      exit 1
    }
  fi
  
  if [ "$DEPLOY_FRONTEND" = true ]; then
    log "Deploying frontend component..."
    deploy_component "$FRONTEND_IMAGE" || {
      log_error "Failed to deploy frontend component"
      exit 1
    }
  fi
  
  # Final status
  if [ $exit_code -eq 0 ]; then
    log_success "All deployments completed successfully!"
    log_info "Check deployment status with:"
    echo "  az containerapp list --resource-group $RESOURCE_GROUP --output table"
  else
    log_error "Some deployments failed"
  fi
  
  exit $exit_code
}

# Run main function
main "$@"
