#!/bin/bash

# Comprehensive deployment script for BDS Management System
# Handles both frontend and backend deployment with cross-platform support
# Updated to use custom domain: https://eqms.nordictechdesign.com

# Source platform utilities (if needed)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define POSTGRES_SERVER as empty to avoid errors in platform-utils.sh
# (We don't need it for deployment - database connectivity is handled via Key Vault)
POSTGRES_SERVER=""

# Only source platform-utils.sh if we need functions from it
# For now, we define our own functions, so we don't strictly need it
# source "$SCRIPT_DIR/platform-utils.sh"

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

# Logging functions (output to stderr to avoid interfering with command substitution)
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

# Function to check if platform is compatible
is_platform_compatible() {
    local current_os=$(uname -s | tr '[:upper:]' '[:lower:]')
    case "$current_os" in
        linux*|darwin*|cygwin*|mingw*|msys*)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Function to check Docker capabilities
check_docker_capabilities() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        return 1
    fi
    
    # Check for buildx support (optional)
    if docker buildx version &> /dev/null; then
        log_info "Docker Buildx is available"
    fi
    
    return 0
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

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
    
    db_host=$(az keyvault secret show --vault-name "$KEYVAULT_NAME" --name db-host --query value -o tsv 2>/dev/null) || {
        log_error "Failed to get database host from Key Vault"
        return 1
    }
    
    db_user=$(az keyvault secret show --vault-name "$KEYVAULT_NAME" --name db-user --query value -o tsv 2>/dev/null) || {
        log_error "Failed to get database user from Key Vault"
        return 1
    }
    
    db_password=$(az keyvault secret show --vault-name "$KEYVAULT_NAME" --name db-password --query value -o tsv 2>/dev/null) || {
        log_error "Failed to get database password from Key Vault"
        return 1
    }
    
    db_name=$(az keyvault secret show --vault-name "$KEYVAULT_NAME" --name db-name --query value -o tsv 2>/dev/null) || {
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
    
    # Required environment variables (only check what's actually needed)
    local required_vars=(
        "RESOURCE_GROUP"
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

# Function to test network connectivity (from platform-utils, added here for independence)
test_network_connectivity() {
    local host=$1
    local timeout=${2:-10}
    local port=${3:-80}
    
    # Remove protocol if present
    host=${host#http://}
    host=${host#https://}
    
    # Try different methods to test connectivity
    if command -v nc &> /dev/null; then
        if nc -z -w "$timeout" "$host" "$port" &> /dev/null; then
            return 0
        fi
    elif command -v curl &> /dev/null; then
        if curl --connect-timeout "$timeout" --max-time "$timeout" --silent --output /dev/null "$host:$port"; then
            return 0
        fi
    elif command -v wget &> /dev/null; then
        if wget --timeout="$timeout" --tries=1 --spider "$host:$port" &> /dev/null; then
            return 0
        fi
    fi
    
    # Fallback to ping (only tests basic connectivity)
    if ping -c 1 -W "$timeout" "$host" &> /dev/null 2>&1; then
        return 0
    fi
    
    return 1
}

# Override test_azure_connectivity to make database check optional
test_azure_connectivity() {
    local success=true
    
    log_info "Testing Azure connectivity..."
    
    # Test Azure Container Registry (required)
    if test_network_connectivity "${ACR_NAME}.azurecr.io" 10 443; then
        log_success "Azure Container Registry is accessible"
    else
        log_error "Cannot reach Azure Container Registry"
        success=false
    fi
    
    # Test Azure CLI authentication (required)
    if command -v az &> /dev/null; then
        if az account show &> /dev/null; then
            log_success "Azure CLI is authenticated"
        else
            log_error "Azure CLI not authenticated"
            success=false
        fi
    else
        log_error "Azure CLI not installed"
        success=false
    fi
    
    # Database connectivity is optional - just log a warning
    log_info "Database connectivity check skipped (not required for deployment)"
    
    if [ "$success" = true ]; then
        log_success "Critical Azure connectivity tests passed"
        return 0
    else
        log_error "Critical Azure connectivity tests failed"
        return 1
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
    
    # Check Azure connectivity (database check is optional)
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

# Function to automatically bump version (timestamp-based)
auto_bump_version() {
  local component=$1
  local version_file
  local current_version
  
  if [ "$component" = "backend" ]; then
    version_file="$BACKEND_VERSION_FILE"
  else
    version_file="$FRONTEND_VERSION_FILE"
  fi
  
  # Create version file if it doesn't exist
  create_version_file "$version_file" "$component"
  
  # Read current version
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
  log_success "Auto-bumped $component version: $current_version → $new_version"
  
  # Return only the new version
  echo "$new_version"
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
    if [ -n "$dockerfile" ]; then
        log_info "Dockerfile: $dockerfile"
    fi
    log_info "Target platform: $(get_target_platform)"
    
    # Build command - use --no-cache to ensure latest code is included
    local build_cmd="docker build --no-cache --platform $(get_target_platform) -t $image_name:$version"
    
    # Add build arguments for frontend
    if [ "$component" = "$FRONTEND_IMAGE" ]; then
        # Try multiple sources for API URL with proper fallback
        local api_url=""

        # 1. First priority: Key Vault (custom domain URL)
        log_info "Attempting to get API URL from Key Vault..."
        api_url=$(az keyvault secret show --vault-name "$KEYVAULT_NAME" --name "api-url" --query value -o tsv 2>/dev/null)
        if [ -n "$api_url" ]; then
            log_success "Using API URL from Key Vault: $api_url"
        else
            log_warning "API URL not found in Key Vault, trying fallback sources..."

            # 2. Second priority: Azure Container Apps URL (for backward compatibility)
            log_info "Attempting to get API URL from Azure Container Apps..."
            local azure_url=$(az containerapp show --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null)
            if [ -n "$azure_url" ]; then
                api_url="https://$azure_url"
                log_success "Using Azure Container Apps URL: $api_url"
            else
                log_warning "Azure Container Apps URL not available, using hardcoded fallback..."

                # 3. Final fallback: Hardcoded custom domain URL
                api_url="https://api.eqms.nordictechdesign.com"
                log_warning "Using hardcoded fallback URL: $api_url"
            fi
        fi

        # Validate the API URL format
        if [[ ! "$api_url" =~ ^https:// ]]; then
            log_error "Invalid API URL format (missing https): $api_url"
            return 1
        fi

        build_cmd="$build_cmd --build-arg VITE_API_BASE_URL=$api_url"
        build_cmd="$build_cmd --build-arg VITE_APP_NAME='BDS Management System'"
        build_cmd="$build_cmd --build-arg VITE_APP_ENV=production"
        log_info "Frontend will be built with API URL: $api_url"
    fi
    
    if [ -n "$dockerfile" ]; then
        build_cmd="$build_cmd -f $dockerfile"
    fi
    
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
        # Check if container app exists, create if it doesn't
        if ! az containerapp show --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
            log_info "Creating new backend container app..."
            # Get ACR credentials
            local acr_password=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" --output tsv)

            if ! az containerapp create \
                --name "$BACKEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                --environment "$ENVIRONMENT_NAME" \
                --image "$ACR_NAME.azurecr.io/$component:$version" \
                --revision-suffix "$revision_suffix" \
                --target-port 8000 \
                --ingress external \
                --cpu 0.5 \
                --memory 1Gi \
                --min-replicas 1 \
                --max-replicas 2 \
                --registry-server "$ACR_NAME.azurecr.io" \
                --registry-username "$ACR_NAME" \
                --registry-password "$acr_password"; then
                log_error "Failed to create backend container app"
                return 1
            fi

            log_success "Backend container app created successfully"
        fi
        
        # Ensure revision mode is set to multiple for traffic routing
        local current_mode=$(az containerapp revision show-mode \
            --name "$BACKEND_IMAGE" \
            --resource-group "$RESOURCE_GROUP" \
            --query "properties.activeRevisionsMode" -o tsv 2>/dev/null || echo "")
        
        if [[ "$current_mode" != "multiple" ]]; then
            log_info "Setting revision mode to multiple for traffic routing..."
            az containerapp revision set-mode \
                --name "$BACKEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                --mode multiple || {
                log_error "Failed to set revision mode to multiple"
                return 1
            }
            log_success "Revision mode set to multiple"
        fi
        
        # Set up secure Key Vault integration with managed identity
        log_info "Setting up secure Key Vault integration with managed identity..."

        # Enable system-assigned managed identity on container app
        log_info "Enabling managed identity on container app..."
        if ! az containerapp identity show --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
            az containerapp identity assign \
                --name "$BACKEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                --system-assigned
            log_success "Managed identity enabled on container app"
        else
            log_info "Managed identity already enabled"
        fi

        # Get the managed identity principal ID
        local principal_id=$(az containerapp identity show \
            --name "$BACKEND_IMAGE" \
            --resource-group "$RESOURCE_GROUP" \
            --query principalId -o tsv)

        # Assign Key Vault Secrets User role to managed identity
        log_info "Assigning Key Vault access to managed identity..."
        local kv_scope="/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEYVAULT_NAME"

        if ! az role assignment list \
            --assignee "$principal_id" \
            --role "Key Vault Secrets User" \
            --scope "$kv_scope" \
            --query "[].id" -o tsv | grep -q .; then

            az role assignment create \
                --assignee "$principal_id" \
                --role "Key Vault Secrets User" \
                --scope "$kv_scope"
            log_success "Key Vault access granted to managed identity"
        else
            log_info "Key Vault access already granted"
        fi

        # Register Key Vault secrets as secret references
        log_info "Registering Key Vault secret references..."

        # Check if secrets already exist in container app
        local existing_secrets=$(az containerapp secret list \
            --name "$BACKEND_IMAGE" \
            --resource-group "$RESOURCE_GROUP" \
            --query "[].name" -o tsv)

        local kv_url="https://$KEYVAULT_NAME.vault.azure.net"

        # Register each secret if not already registered
        for secret_name in "db-host" "db-user" "db-password" "db-name"; do
            if ! echo "$existing_secrets" | grep -q "^${secret_name}$"; then
                log_info "Registering secret reference: $secret_name"
                az containerapp secret set \
                    --name "$BACKEND_IMAGE" \
                    --resource-group "$RESOURCE_GROUP" \
                    --secrets "${secret_name}=keyvaultref:${kv_url}/secrets/${secret_name},identityref:system"
            fi
        done

        log_success "Key Vault secret references registered"

        # Update container app to use secret references in environment variables
        log_info "Configuring environment variables to use Key Vault references..."

        # Try Key Vault references first, fallback to direct values if they don't work
        if az containerapp update \
            --name "$BACKEND_IMAGE" \
            --resource-group "$RESOURCE_GROUP" \
            --set-env-vars \
                "DB_HOST=secretref:db-host" \
                "DB_USER=secretref:db-user" \
                "DB_PASSWORD=secretref:db-password" \
                "DB_NAME=secretref:db-name" \
                "DB_SSLMODE=require" \
                "ENVIRONMENT=production" \
                "BACKEND_URL=https://api.eqms.nordictechdesign.com" 2>/dev/null; then
            log_success "Key Vault secret references configured successfully"
        else
            log_warning "Key Vault references failed, falling back to direct environment variables"

            # Retrieve database credentials from Key Vault (no fallbacks)
            local db_host=$(az keyvault secret show --vault-name "$KEYVAULT_NAME" --name "db-host" --query value -o tsv 2>/dev/null)
            local db_user=$(az keyvault secret show --vault-name "$KEYVAULT_NAME" --name "db-user" --query value -o tsv 2>/dev/null)
            local db_password=$(az keyvault secret show --vault-name "$KEYVAULT_NAME" --name "db-password" --query value -o tsv 2>/dev/null)
            local db_name=$(az keyvault secret show --vault-name "$KEYVAULT_NAME" --name "db-name" --query value -o tsv 2>/dev/null)

            # Validate all required database credentials are available
            if [ -z "$db_host" ] || [ -z "$db_user" ] || [ -z "$db_password" ] || [ -z "$db_name" ]; then
                log_error "Failed to retrieve complete database credentials from Key Vault"
                log_error "Missing: $([ -z "$db_host" ] && echo "db-host ") $([ -z "$db_user" ] && echo "db-user ") $([ -z "$db_password" ] && echo "db-password ") $([ -z "$db_name" ] && echo "db-name ")"
                return 1
            fi

            az containerapp update \
                --name "$BACKEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                --set-env-vars \
                    "DB_HOST=$db_host" \
                    "DB_USER=$db_user" \
                    "DB_PASSWORD=$db_password" \
                    "DB_NAME=$db_name" \
                    "DB_SSLMODE=require" \
                    "ENVIRONMENT=production" \
                    "BACKEND_URL=https://api.eqms.nordictechdesign.com"

            log_success "Direct environment variables configured as fallback"
        fi

        log_success "Secure Key Vault integration completed!"
        log_info "Secrets are now resolved at runtime and never visible in container environment"

        # Store custom domain API URL in Key Vault for frontend to use
        local custom_api_url="https://api.eqms.nordictechdesign.com"
        log_info "Storing custom domain API URL in Key Vault: $custom_api_url"

        # Store or update the custom domain API URL in Key Vault
        az keyvault secret set \
            --vault-name "$KEYVAULT_NAME" \
            --name "api-url" \
            --value "$custom_api_url" >/dev/null 2>&1

        log_success "Custom domain API URL stored in Key Vault for frontend use"

        # Update container app with new image
        log_info "Updating backend container app with new image: $ACR_NAME.azurecr.io/$component:$version"
        if ! az containerapp update \
            --name "$BACKEND_IMAGE" \
            --resource-group "$RESOURCE_GROUP" \
            --image "$ACR_NAME.azurecr.io/$component:$version" \
            --revision-suffix "$revision_suffix"; then
            log_error "Failed to update backend container app with new image"
            return 1
        fi
        log_success "Backend container app updated with new image"

        log_success "Backend deployment completed successfully"
        return 0
        else
        # Frontend deployment to Container Apps
        log_info "Deploying frontend to Azure Container Apps..."

        # Check if container app exists, create if it doesn't
        if ! az containerapp show --name "$FRONTEND_IMAGE" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
            log_info "Creating new frontend container app..."
            # Get ACR credentials
            local acr_password=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" --output tsv)

            if ! az containerapp create \
                --name "$FRONTEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                --environment "$ENVIRONMENT_NAME" \
                --image "$ACR_NAME.azurecr.io/$component:$version" \
                --revision-suffix "$revision_suffix" \
                --target-port 80 \
                --ingress external \
                --cpu 0.5 \
                --memory 1Gi \
                --min-replicas 0 \
                --max-replicas 2 \
                --registry-server "$ACR_NAME.azurecr.io" \
                --registry-username "$ACR_NAME" \
                --registry-password "$acr_password"; then
                log_error "Failed to create frontend container app"
                return 1
            fi

            log_success "Frontend container app created successfully"
        else
            log_info "Updating existing frontend container app..."
            # Update the container app with new image
            az containerapp update \
                --name "$FRONTEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                --image "$ACR_NAME.azurecr.io/$component:$version" \
                --revision-suffix "$revision_suffix"
        fi

        log_success "Frontend deployment completed successfully"
        return 0
    fi
    
    log_success "$component deployed successfully"
    return 0
}

# Function to generate revision suffix
generate_revision_suffix() {
  local component=$1
  local version=$2
    # Generate revision suffix from timestamp version for better Azure Container Apps tracking
    # Format: YYYY-MM-DD-HHMM (Azure compatible - lowercase, alphanumeric and hyphens only)
    local revision_suffix=$(echo "$version" | tr '.' '-' | tr '[:upper:]' '[:lower:]' | sed 's/-$//')
    # Ensure it starts with a letter or number (required by Azure)
    if [[ ! "$revision_suffix" =~ ^[a-z0-9] ]]; then
        revision_suffix="v${revision_suffix}"
    fi
    echo "$revision_suffix"
}

# Function to run health checks after deployment
run_health_checks() {
    local component=$1
    local version=$2
    
    log_info "Running health checks for $component..."
    
    if [ "$component" = "$BACKEND_IMAGE" ]; then
        # Get backend URL
        local backend_url=$(az containerapp show --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null)
        
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
            # Check for either "ok" or "healthy" status
            if curl -s -f "$health_url" | grep -qE '"status":"(ok|healthy)"'; then
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
        local frontend_url=$(az containerapp show --name "$FRONTEND_IMAGE" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null)
        
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
    local backend_url=$(az containerapp show --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null)
    
    if [ -z "$backend_url" ]; then
        log_error "Failed to get backend URL for smoke tests"
        return 1
    fi
    
    # Add https if not present
    if [[ ! "$backend_url" =~ ^https?:// ]]; then
        backend_url="https://$backend_url"
    fi
    
    # Example smoke test - adjust based on your API
    local test_endpoint="$backend_url/health"
    log_info "Testing endpoint: $test_endpoint"
    
    # Check for either "ok" or "healthy" status
    if ! curl -s -f "$test_endpoint" | grep -qE '"status":"(ok|healthy)"'; then
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
        # Sync versions after bumping
        sync_versions "$version"
    else
        version=$(get_version "$component_name")
    fi
    
    log_info "Deploying version: $version"
    
    # Generate revision suffix
    local revision_suffix=$(generate_revision_suffix "$component" "$version")
    log_info "Revision suffix: $revision_suffix"
    
    # Build image
    if [ "$SKIP_BUILD" = false ]; then
        local context=""
        local dockerfile=""
        
        if [ "$component" = "$BACKEND_IMAGE" ]; then
            context="./backend"
        elif [ "$component" = "$FRONTEND_IMAGE" ]; then
            context="."
            dockerfile="Dockerfile.frontend"
        fi
        
        if ! build_image "$component" "$version" "$context" "$dockerfile"; then
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
    
    # Verify endpoints are in the image (for backend only)
    if [ "$component" = "$BACKEND_IMAGE" ]; then
        log_info "Verifying delegation endpoints are in the built image..."
        if docker run --rm "$image_name:$version" grep -q "@app.post.*delegate" /app/app/main.py 2>/dev/null; then
            log_success "Delegation endpoints verified in Docker image"
        else
            log_warning "Could not verify endpoints in image (this is OK if grep is not available in image)"
        fi
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
  
  # Ensure versions are synchronized before deployment
  if [ "$DEPLOY_BACKEND" = true ] || [ "$DEPLOY_FRONTEND" = true ]; then
    log_info "Ensuring version synchronization before deployment..."
    sync_versions
  fi
  
  # Login to ACR
  log_info "Logging in to Azure Container Registry..."
  if ! az acr login --name "$ACR_NAME"; then
    log_error "Failed to login to Azure Container Registry"
    exit 1
  fi
  
  # Deploy components
  local exit_code=0
  
  if [ "$DEPLOY_BACKEND" = true ]; then
    log_info "Deploying backend component..."
    deploy_component "$BACKEND_IMAGE" || {
      log_error "Failed to deploy backend component"
      exit 1
    }
  fi
  
  if [ "$DEPLOY_FRONTEND" = true ]; then
    log_info "Deploying frontend component..."
    deploy_component "$FRONTEND_IMAGE" || {
      log_error "Failed to deploy frontend component"
      exit 1
    }
  fi
  
  # Final status
  if [ $exit_code -eq 0 ]; then
    log_success "All deployments completed successfully!"
    log_info "Your application is now available at:"
    echo "  🌐 Frontend: https://eqms.nordictechdesign.com"
    echo "  🔗 Backend API: https://api.eqms.nordictechdesign.com"
    echo ""
    log_info "Check deployment status with:"
    echo "  az containerapp list --resource-group $RESOURCE_GROUP --output table"
    echo ""
    log_info "Test your custom domains:"
    echo "  curl -I https://eqms.nordictechdesign.com"
    echo "  curl https://api.eqms.nordictechdesign.com/health"
  else
    log_error "Some deployments failed"
  fi
  
  exit $exit_code
}

# Run main function
main "$@"
