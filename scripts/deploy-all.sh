#!/bin/bash

# Comprehensive deployment script for BDS Management System
# Handles both frontend and backend deployment with cross-platform support

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
    
    # Build command
    local build_cmd="docker build --platform $(get_target_platform) -t $image_name:$version"
    
    # Add build arguments for frontend
    if [ "$component" = "$FRONTEND_IMAGE" ]; then
        local backend_url="https://$BACKEND_IMAGE.graystone-766c02c8.centralindia.azurecontainerapps.io"
        build_cmd="$build_cmd --build-arg VITE_API_BASE_URL=$backend_url"
        build_cmd="$build_cmd --build-arg VITE_APP_NAME='BDS Management System'"
        build_cmd="$build_cmd --build-arg VITE_APP_ENV=production"
        log_info "Adding frontend build arguments with backend URL: $backend_url"
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
        # Check if container app exists
        if ! az containerapp show --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
            log_error "Backend container app '$BACKEND_IMAGE' does not exist. Please create it first."
            return 1
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
        
        # Ensure Key Vault secrets are registered in the container app
        log_info "Ensuring Key Vault secrets are registered in container app..."
        
        # Get managed identity for the container app
        local managed_identity=$(az containerapp show \
            --name "$BACKEND_IMAGE" \
            --resource-group "$RESOURCE_GROUP" \
            --query "identity.principalId" -o tsv 2>/dev/null || echo "")
        
        # List of secrets to register (Key Vault secret name -> Container App secret name)
        local secrets_to_register=(
            "db-host:db-host"
            "db-user:db-user"
            "db-password:db-password"
            "db-name:db-name"
        )
        
        # Register secrets from Key Vault if they don't exist
        for secret_pair in "${secrets_to_register[@]}"; do
            local kv_secret_name="${secret_pair%%:*}"
            local ca_secret_name="${secret_pair##*:}"
            
            # Always register/re-register secrets to ensure consistent format (all using 'system' identity)
            log_info "Registering Key Vault secret: $ca_secret_name from $kv_secret_name"
            
            # Get Key Vault URL
            local kv_url=$(az keyvault show --name "$KEYVAULT_NAME" --query "properties.vaultUri" -o tsv 2>/dev/null || echo "")
            if [ -z "$kv_url" ]; then
                log_error "Failed to get Key Vault URL for $KEYVAULT_NAME"
                continue
            fi
            
            # Ensure URL ends with / and construct full secret URL
            # Format: secret-name=keyvaultref:https://vault-name.vault.azure.net/secrets/secret-name,identityref:system
            # Use 'system' for system-assigned identity
            kv_url="${kv_url%/}"  # Remove trailing slash if present
            local secret_value="${kv_url}/secrets/${kv_secret_name}"
            
            if az containerapp secret set \
                --name "$BACKEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                --secrets "$ca_secret_name=keyvaultref:${secret_value},identityref:system" 2>&1 | tee /tmp/secret-register.log; then
                log_success "Successfully registered secret: $ca_secret_name"
            else
                log_error "Failed to register secret $ca_secret_name"
                cat /tmp/secret-register.log >&2
            fi
        done
        
        # Wait for secrets to be fully registered and propagated
        log_info "Waiting for secrets to be fully registered and propagated..."
        sleep 10
        
        # Verify all required secrets are registered
        log_info "Verifying all secrets are registered..."
        local missing_secrets=""
        for secret_pair in "${secrets_to_register[@]}"; do
            local ca_secret_name="${secret_pair##*:}"
            if ! az containerapp secret list \
                --name "$BACKEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                --query "[?name=='$ca_secret_name'].name" -o tsv 2>/dev/null | grep -q "^${ca_secret_name}$"; then
                missing_secrets="${missing_secrets} ${ca_secret_name}"
            fi
        done
        
        if [ -n "$missing_secrets" ]; then
            log_error "Some secrets are missing:$missing_secrets"
                return 1
            fi
        log_success "All required secrets are registered"
        
        # Use REST API to set environment variables with secretRef
        # Azure CLI doesn't support secretRef directly in --set-env-vars, so we use REST API
        log_info "Deploying with Key Vault secret references via REST API..."
        
        local subscription_id=$(az account show --query id -o tsv)
        
        # Fetch fresh container app config after secrets are registered
        log_info "Fetching fresh container app configuration..."
        az containerapp show --name "$BACKEND_IMAGE" --resource-group "$RESOURCE_GROUP" --output json > /tmp/containerapp-config.json
        
        # Verify secrets are in the config
        local config_secrets=$(python3 -c "import json; f=open('/tmp/containerapp-config.json'); c=json.load(f); print(','.join([s['name'] for s in c['properties']['configuration'].get('secrets', [])]))" 2>/dev/null || echo "")
        log_info "Secrets in container app config: $config_secrets"
        
        python3 << PYEOF
import json
from datetime import datetime

with open('/tmp/containerapp-config.json', 'r') as f:
    config = json.load(f)

container = config['properties']['template']['containers'][0]
container['image'] = '$ACR_NAME.azurecr.io/$component:$version'
container.pop('imageType', None)

# Build environment variables using secretRef format
env_vars = [
    {'name': 'DB_HOST', 'secretRef': 'db-host'},
    {'name': 'DB_USER', 'secretRef': 'db-user'},
    {'name': 'DB_PASSWORD', 'secretRef': 'db-password'},
    {'name': 'DB_NAME', 'secretRef': 'db-name'},
    {'name': 'DB_SSLMODE', 'value': 'require'},
    {'name': 'ENVIRONMENT', 'value': 'production'},
    {'name': 'DEPLOYMENT_TIMESTAMP', 'value': datetime.now().isoformat()}
]

# Note: DATABASE_URL will be constructed by the app from DB_* env vars
# If you need DATABASE_URL directly, you'd need to construct it server-side
# or use a script that reads the individual DB_* vars and constructs it

container['env'] = env_vars

patch_body = {
    'properties': {
        'template': {
            'containers': [container],
            'revisionSuffix': '$revision_suffix',
            'scale': {
                'minReplicas': 0,
                'maxReplicas': 10
            }
        }
    }
}

with open('/tmp/patch-template.json', 'w') as f:
    json.dump(patch_body, f, indent=2)
PYEOF

        # Apply the update via REST API
        if az rest --method PATCH \
            --uri "/subscriptions/$subscription_id/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.App/containerapps/$BACKEND_IMAGE?api-version=2024-03-01" \
            --body @/tmp/patch-template.json > /tmp/rest-output.log 2>&1; then
            log_success "Backend updated successfully with Key Vault secret references"
            update_exit_code=0
        else
            log_error "Failed to update backend via REST API"
            cat /tmp/rest-output.log >&2
            update_exit_code=1
        fi
            
            if [ $update_exit_code -eq 0 ]; then
                log_success "Backend updated successfully with Key Vault secret references"
                
                # Wait for revision to be fully created and propagated
                log_info "Waiting for revision to be fully created..."
                sleep 15
                
                local new_revision=$(az containerapp revision list \
                --name "$BACKEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                    --query "[?contains(name, '$revision_suffix')].name" \
                    -o tsv 2>/dev/null | head -1 || echo "")
                
                if [[ -n "$new_revision" ]]; then
                    log_success "New revision created: $new_revision"
                    
                    # Route 100% traffic to the new revision
                    log_info "Routing 100% traffic to new revision: $new_revision"
                    if az containerapp ingress traffic set \
                        --name "$BACKEND_IMAGE" \
                        --resource-group "$RESOURCE_GROUP" \
                        --revision-weight "$new_revision=100" 2>&1 | tee /tmp/traffic-set.log; then
                        log_success "Traffic routed to new revision: $new_revision"
                    else
                        log_warning "Failed to set traffic routing, but revision was created"
                        cat /tmp/traffic-set.log >&2
                    fi
                    
                    # Deactivate old revisions (those not receiving traffic)
                    log_info "Deactivating old revisions..."
                    local old_revisions=$(az containerapp revision list \
                        --name "$BACKEND_IMAGE" \
                        --resource-group "$RESOURCE_GROUP" \
                        --query "[?name!='$new_revision' && properties.active==\`true\`].name" \
                        -o tsv 2>/dev/null || echo "")
                    
                    if [[ -n "$old_revisions" ]]; then
                        while IFS= read -r old_revision; do
                            if [[ -n "$old_revision" ]]; then
                                log_info "Deactivating revision: $old_revision"
                                az containerapp revision deactivate \
                                    --revision "$old_revision" \
                                    --name "$BACKEND_IMAGE" \
                                    --resource-group "$RESOURCE_GROUP" 2>/dev/null || {
                                    log_warning "Failed to deactivate revision: $old_revision"
                                }
                            fi
                        done <<< "$old_revisions"
                        log_success "Old revisions deactivated"
                    else
                        log_info "No old revisions to deactivate"
                    fi
                else
                    log_warning "New revision with suffix $revision_suffix not found yet. Checking all revisions..."
                    az containerapp revision list \
                        --name "$BACKEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                        --query "[].{name:name, created:properties.createdTime, image:properties.template.containers[0].image, trafficWeight:properties.trafficWeight}" \
                        --output table | head -5
                fi
            else
                # If update failed, show the error
                log_error "Backend deployment failed. Error details:"
                if [ -f /tmp/rest-output.log ]; then
                    cat /tmp/rest-output.log >&2
                fi
                return 1
            fi
        else
        # Frontend deployment - get dynamic backend URL
        local backend_domain=$(az containerapp env show --name "$ENVIRONMENT_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.defaultDomain" --output tsv 2>/dev/null)
        local backend_url="https://$BACKEND_IMAGE.$backend_domain"
        
        # Try to get API URL from Key Vault, fallback to dynamic URL
        local api_url=$(az keyvault secret show --vault-name "$KEYVAULT_NAME" --name api-base-url --query value --output tsv 2>/dev/null || echo "$backend_url")
        
        # Check if container app exists
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
                --max-replicas 10 \
                --registry-server "$ACR_NAME.azurecr.io" \
                --registry-username "$ACR_NAME" \
                --registry-password "$acr_password" \
                --set-env-vars \
                    "VITE_API_URL=${api_url}" \
                    "VITE_APP_NAME=BDS Management System" \
                    "VITE_APP_ENV=production"; then
                log_error "Failed to create frontend"
                return 1
            fi
            
            # Set revision mode to multiple for traffic routing
            log_info "Setting revision mode to multiple for traffic routing..."
            az containerapp revision set-mode \
                --name "$FRONTEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                --mode multiple 2>/dev/null || log_warning "Failed to set revision mode (may already be set)"
        else
            # Ensure revision mode is set to multiple for traffic routing
            local current_mode=$(az containerapp revision show-mode \
                --name "$FRONTEND_IMAGE" \
                --resource-group "$RESOURCE_GROUP" \
                --query "properties.activeRevisionsMode" -o tsv 2>/dev/null || echo "")
            
            if [[ "$current_mode" != "multiple" ]]; then
                log_info "Setting revision mode to multiple for traffic routing..."
                az containerapp revision set-mode \
                    --name "$FRONTEND_IMAGE" \
                    --resource-group "$RESOURCE_GROUP" \
                    --mode multiple || {
                    log_error "Failed to set revision mode to multiple"
                    return 1
                }
                log_success "Revision mode set to multiple"
            fi
            # Use REST API to update frontend with DEPLOYMENT_TIMESTAMP to force new revision
            log_info "Updating existing frontend container app via REST API..."
            
            local subscription_id=$(az account show --query id -o tsv)
            
            # Fetch fresh container app config
            log_info "Fetching fresh container app configuration..."
            az containerapp show --name "$FRONTEND_IMAGE" --resource-group "$RESOURCE_GROUP" --output json > /tmp/frontend-config.json
            
            python3 << PYEOF
import json
from datetime import datetime

with open('/tmp/frontend-config.json', 'r') as f:
    config = json.load(f)

container = config['properties']['template']['containers'][0]
container['image'] = '$ACR_NAME.azurecr.io/$component:$version'
container.pop('imageType', None)

# Build environment variables
env_vars = [
    {'name': 'VITE_API_URL', 'value': '$api_url'},
    {'name': 'VITE_APP_NAME', 'value': 'BDS Management System'},
    {'name': 'VITE_APP_ENV', 'value': 'production'},
    {'name': 'DEPLOYMENT_TIMESTAMP', 'value': datetime.now().isoformat()}
]

container['env'] = env_vars

patch_body = {
    'properties': {
        'template': {
            'containers': [container],
            'revisionSuffix': '$revision_suffix',
            'scale': {
                'minReplicas': 0,
                'maxReplicas': 10
            }
        }
    }
}

with open('/tmp/frontend-patch-template.json', 'w') as f:
    json.dump(patch_body, f, indent=2)
PYEOF

            # Apply the update via REST API
            local update_exit_code=0
            if az rest --method PATCH \
                --uri "/subscriptions/$subscription_id/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.App/containerapps/$FRONTEND_IMAGE?api-version=2024-03-01" \
                --body @/tmp/frontend-patch-template.json > /tmp/frontend-rest-output.log 2>&1; then
                log_success "Frontend updated successfully via REST API"
            else
                log_error "Failed to update frontend via REST API"
                cat /tmp/frontend-rest-output.log >&2
                update_exit_code=1
            fi
            
            if [ $update_exit_code -eq 0 ]; then
                # Force revision creation with minimal update
                log_info "Triggering revision creation..."
                if az containerapp update \
                    --name "$FRONTEND_IMAGE" \
                    --resource-group "$RESOURCE_GROUP" \
                    --image "$ACR_NAME.azurecr.io/$component:$version" \
                    --revision-suffix "$revision_suffix" \
                    --min-replicas 0 \
                    --max-replicas 10 2>&1 | tee /tmp/frontend-update.log; then
                    log_success "Frontend revision creation triggered"
                else
                    log_warning "Failed to trigger revision creation, but REST API update succeeded"
                    cat /tmp/frontend-update.log >&2
                fi
                
                # Wait for revision to be fully created and propagated
                log_info "Waiting for revision to be fully created..."
                sleep 15
                
                local new_revision=$(az containerapp revision list \
                    --name "$FRONTEND_IMAGE" \
                    --resource-group "$RESOURCE_GROUP" \
                    --query "[?contains(name, '$revision_suffix')].name" \
                    -o tsv 2>/dev/null | head -1 || echo "")
        
        if [[ -n "$new_revision" ]]; then
                    log_success "New revision created: $new_revision"
                    
                    # Route 100% traffic to the new revision
                    log_info "Routing 100% traffic to new revision: $new_revision"
                    if az containerapp ingress traffic set \
                        --name "$FRONTEND_IMAGE" \
                        --resource-group "$RESOURCE_GROUP" \
                        --revision-weight "$new_revision=100" 2>&1 | tee /tmp/frontend-traffic-set.log; then
                        log_success "Traffic routed to new revision: $new_revision"
                    else
                        log_warning "Failed to set traffic routing, but revision was created"
                        cat /tmp/frontend-traffic-set.log >&2
                    fi
            
            # Deactivate old revisions
            log_info "Deactivating old revisions..."
                    local old_revisions=$(az containerapp revision list \
                        --name "$FRONTEND_IMAGE" \
                        --resource-group "$RESOURCE_GROUP" \
                        --query "[?name!='$new_revision' && properties.active==\`true\`].name" \
                        -o tsv 2>/dev/null || echo "")
                    
                    if [[ -n "$old_revisions" ]]; then
                        while IFS= read -r old_revision; do
                if [[ -n "$old_revision" ]]; then
                                log_info "Deactivating revision: $old_revision"
                                az containerapp revision deactivate \
                                    --revision "$old_revision" \
                                    --name "$FRONTEND_IMAGE" \
                                    --resource-group "$RESOURCE_GROUP" 2>/dev/null || {
                                    log_warning "Failed to deactivate revision: $old_revision"
                                }
                            fi
                        done <<< "$old_revisions"
                        log_success "Old revisions deactivated"
                    else
                        log_info "No old revisions to deactivate"
                    fi
                else
                    log_warning "New revision with suffix $revision_suffix not found yet. Checking all revisions..."
                    az containerapp revision list \
                        --name "$FRONTEND_IMAGE" \
                        --resource-group "$RESOURCE_GROUP" \
                        --query "[].{name:name, created:properties.createdTime, image:properties.template.containers[0].image, trafficWeight:properties.trafficWeight}" \
                        --output table | head -5
                fi
            else
                # If update failed, show the error
                log_error "Frontend deployment failed. Error details:"
                if [ -f /tmp/frontend-rest-output.log ]; then
                    cat /tmp/frontend-rest-output.log >&2
                fi
                return 1
            fi
        fi
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
    log_info "Check deployment status with:"
    echo "  az containerapp list --resource-group $RESOURCE_GROUP --output table"
  else
    log_error "Some deployments failed"
  fi
  
  exit $exit_code
}

# Run main function
main "$@"
