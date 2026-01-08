#!/bin/bash

# BDS QMS Platform Utilities
# This script provides essential functions for BDS QMS deployment and management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color


# Get target platform for Azure Container Apps
get_target_platform() {
    echo "linux/amd64"
}




# Check if current platform is compatible with target
is_platform_compatible() {
    local current_os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local current_arch=$(uname -m)
    
    # BDS QMS is designed to work on all major platforms
    case "$current_os" in
        linux*|darwin*|cygwin*|mingw*|msys*)
            return 0
            ;;
        *)
            log_warning "Unsupported OS: $current_os"
            return 1
            ;;
    esac
}


# Check Docker installation and permissions
check_docker_capabilities() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        return 1
    fi
    
    # Check for buildx support
    if docker buildx version &> /dev/null; then
        log_info "Docker Buildx is available"
        return 0
    else
        log_warning "Docker Buildx is not available, using legacy build"
        return 0
    fi
}


# Get build command with appropriate flags
get_build_command() {
    local image_name=$1
    local tag=$2
    local context=$3
    local build_args=$4
    
    local base_cmd="docker build"
    
    # Use buildx if available
    if docker buildx version &> /dev/null; then
        base_cmd="docker buildx build --platform linux/amd64 --load"
    fi
    
    # Add build arguments if provided
    if [ -n "$build_args" ]; then
        base_cmd="$base_cmd $build_args"
    fi
    
    # Add image tag and context
    echo "$base_cmd -t $image_name:$tag $context"
}


# Test network connectivity to a host
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
    if ping -c 1 -W "$timeout" "$host" &> /dev/null; then
        return 0
    fi
    
    log_warning "Cannot connect to $host:$port"
    return 1
}


# Test Azure services connectivity
test_azure_connectivity() {
    local success=true
    
    log_info "Testing Azure connectivity..."
    
    # Test Azure Container Registry
    if test_network_connectivity "${ACR_NAME}.azurecr.io" 443; then
        log_success "Azure Container Registry is accessible"
    else
        log_error "Cannot reach Azure Container Registry"
        success=false
    fi
    
    # Test Azure Database for PostgreSQL
    if test_network_connectivity "${POSTGRES_SERVER}.postgres.database.azure.com" 5432; then
        log_success "Azure Database for PostgreSQL is accessible"
    else
        log_warning "Cannot reach Azure Database for PostgreSQL"
        success=false
    fi
    
    # Test Azure CLI authentication
    if command -v az &> /dev/null; then
        if az account show &> /dev/null; then
            log_success "Azure CLI is authenticated"
        else
            log_error "Azure CLI not authenticated"
            success=false
        fi
    else
        log_warning "Azure CLI not installed"
        success=false
    fi
    
    if [ "$success" = true ]; then
        log_success "All Azure connectivity tests passed"
        return 0
    else
        log_error "Some Azure connectivity tests failed"
        return 1
    fi
}


# Get version from file with fallback
get_version_from_file() {
    local version_file=$1
    local default_version=${2:-0.1.0}
    
    # First check for package.json
    if [ -z "$version_file" ] || [ "$version_file" = "package.json" ]; then
        if [ -f "package.json" ]; then
            local version=$(jq -r '.version' package.json 2>/dev/null)
            if [ "$version" != "null" ] && [ -n "$version" ]; then
                echo "$version"
                return 0
            fi
        fi
    fi
    
    # Check specified file
    if [ -n "$version_file" ] && [ -f "$version_file" ]; then
        local version=$(grep -E '^VERSION=' "$version_file" 2>/dev/null | cut -d'=' -f2 | tr -d "'\"")
        if [ -n "$version" ]; then
            echo "$version"
            return 0
        fi
    fi
    
    # Return default if no version found
    echo "$default_version"
}


# Parse version string (POSIX compatible)
parse_version() {
    local version=$1
    local component=$2  # major, minor, patch
    
    # Remove leading 'v' if present
    version=${version#v}
    
    # Split by dots
    local major=$(echo "$version" | cut -d. -f1)
    local minor=$(echo "$version" | cut -d. -f2)
    local patch=$(echo "$version" | cut -d. -f3)
    
    case "$component" in
        "major")
            echo "$major"
            ;;
        "minor")
            echo "$minor"
            ;;
        "patch")
            echo "$patch"
            ;;
        *)
            echo "$major.$minor.$patch"
            ;;
    esac
}


# Validate version format
validate_version() {
    local version=$1
    
    # Remove leading 'v' if present
    version=${version#v}
    
    # Check if it matches semantic versioning pattern
    if echo "$version" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' > /dev/null; then
        return 0
    else
        return 1
    fi
}


# Calculate next version
calculate_next_version() {
    local current_version=$1
    local bump_type=$2
    
    # Remove leading 'v' if present
    current_version=${current_version#v}
    
    local major=$(parse_version "$current_version" "major")
    local minor=$(parse_version "$current_version" "minor")
    local patch=$(parse_version "$current_version" "patch")
    
    # Convert to integers (handle empty values)
    major=${major:-0}
    minor=${minor:-0}
    patch=${patch:-0}
    
    case "$bump_type" in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "patch")
            patch=$((patch + 1))
            ;;
        *)
            echo "Invalid bump type: $bump_type" >&2
            return 1
            ;;
    esac
    
    echo "$major.$minor.$patch"
}


# Logging functions with timestamp
log() {
    local level=$1
    local message=$2
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    case "$level" in
        "INFO")
            echo -e "[${timestamp}] ${BLUE}ℹ️  INFO:${NC} $message"
            ;;
        "SUCCESS")
            echo -e "[${timestamp}] ${GREEN}✅ SUCCESS:${NC} $message"
            ;;
        "WARNING")
            echo -e "[${timestamp}] ${YELLOW}⚠️  WARNING:${NC} $message" >&2
            ;;
        "ERROR")
            echo -e "[${timestamp}] ${RED}❌ ERROR:${NC} $message" >&2
            ;;
        *)
            echo -e "[${timestamp}] $message"
            ;;
    esac
}

log_info() {
    log "INFO" "$1"
}


log_success() {
    log "SUCCESS" "$1"
}


log_warning() {
    log "WARNING" "$1"
}


log_error() {
    log "ERROR" "$1"
}


# Check if running in CI/CD environment
is_ci_environment() {
    [ -n "${CI:-}" ] || 
    [ -n "${GITHUB_ACTIONS:-}" ] || 
    [ -n "${AZURE_PIPELINES:-}" ] ||
    [ -n "${GITLAB_CI:-}" ] ||
    [ -n "${TRAVIS:-}" ]
}


# Get optimal number of build workers
get_build_workers() {
    local cpu_count=1
    
    # Try different methods to get CPU count
    if command -v nproc &> /dev/null; then
        cpu_count=$(nproc 2>/dev/null)
    elif command -v sysctl &> /dev/null; then
        cpu_count=$(sysctl -n hw.ncpu 2>/dev/null)
    fi
    
    # Ensure we have a valid number
    if ! [[ "$cpu_count" =~ ^[0-9]+$ ]] || [ "$cpu_count" -lt 1 ]; then
        cpu_count=1
    fi
    
    # Limit to reasonable number for CI environments
    if is_ci_environment; then
        cpu_count=$((cpu_count > 2 ? 2 : cpu_count))
    fi
    
    echo "$cpu_count"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to log messages with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Function to run a command with error handling
run_command() {
    local cmd="$1"
    local msg="${2:-Running: $cmd}"
    
    log "$msg"
    if ! eval "$cmd"; then
        log "❌ Error: Failed to execute: $cmd"
        return 1
    fi
}

# Function to load environment variables from .env file
load_env_file() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        # Export all variables from .env file
        set -a
        source "$env_file"
        set +a
        log "✅ Loaded environment variables from $env_file"
    else
        log "⚠️  Warning: $env_file not found"
        return 1
    fi
}

# Function to check if running in a CI environment
is_ci_environment() {
    [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ] || [ -n "${GITLAB_CI:-}" ]
}

# Function to check if running in a container
is_container_environment() {
    [ -f /.dockerenv ] || [ -f /run/.containerenv ] || [ -n "${container:-}" ]
}

# Function to get the current git branch
git_current_branch() {
    git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"
}

# Function to get the current git commit hash
git_current_commit() {
    git rev-parse --short HEAD 2>/dev/null || echo "unknown"
}

# Function to check if the working directory is clean
git_is_clean() {
    git diff --quiet && git diff --cached --quiet
}

# Function to get the current version from package.json
get_package_version() {
    if [ -f "package.json" ]; then
        jq -r '.version' package.json 2>/dev/null || echo "0.0.0"
    else
        echo "0.0.0"
    fi
}

# Function to validate required environment variables
validate_required_vars() {
    local missing_vars=()
    for var in "$@"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log "❌ Error: The following required environment variables are not set:"
        for var in "${missing_vars[@]}"; do
            log "  - $var"
        done
        return 1
    fi
    
    return 0
}

# Function to confirm action
confirm_action() {
    local message="${1:-Are you sure?}"
    local default_confirm="${2:-y}"
    
    # Auto-confirm in CI environments
    if is_ci_environment; then
        log "Running in CI environment, auto-confirming action: $message"
        return 0
    fi
    
    read -p "$message [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to detect the current platform
detect_platform() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m | tr '[:upper:]' '[:lower:]')
    
    # Map architecture to standard names
    case "$arch" in
        x86_64) arch="amd64" ;;
        aarch64) arch="arm64" ;;
        armv7l) arch="arm" ;;
    esac
    
    echo "${os}_${arch}"
}

# Function to check if a port is in use
port_in_use() {
    local port=$1
    if command_exists lsof; then
        lsof -i ":$port" >/dev/null 2>&1
    elif command_exists netstat; then
        netstat -tuln | grep -q ":$port "
    elif command_exists ss; then
        ss -tuln | grep -q ":$port "
    else
        log "⚠️  Could not check if port $port is in use (no suitable command found)"
        return 1
    fi
}

# Function to wait for a service to be available
wait_for_service() {
    local host=$1
    local port=$2
    local max_attempts=${3:-30}
    local wait_seconds=${4:-2}
    
    log "⏳ Waiting for $host:$port to be available..."
    
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            log "✅ Service $host:$port is available"
            return 0
        fi
        
        log "⏳ Attempt $attempt/$max_attempts - waiting ${wait_seconds}s..."
        sleep $wait_seconds
        attempt=$((attempt + 1))
    done
    
    log "❌ Timed out waiting for $host:$port to be available"
    return 1
}
