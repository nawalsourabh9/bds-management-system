#!/bin/bash

# Version verification script for BDS Management System
# Checks if all containers are running matching versions

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

# Function to get version from file
get_file_version() {
    local version_file=$1
    local component=$2
    
    if [ ! -f "$version_file" ]; then
        log_warning "$component version file not found: $version_file"
        echo "unknown"
        return
    fi
    
    local version=$(head -n 1 "$version_file" | tr -d '[:space:]')
    if [ -z "$version" ]; then
        log_warning "$component version file is empty: $version_file"
        echo "unknown"
        return
    fi
    
    # Validate timestamp format (YYYY.MM.DD.HHMM)
    if ! echo "$version" | grep -qE '^[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[0-9]{4}$'; then
        log_warning "$component version format is not timestamp-based: $version"
        echo "$version"
        return
    fi
    
    echo "$version"
}

# Function to get container image version
get_container_version() {
    local container_name=$1
    local image_name=$2
    
    # Get the current image from the container app (quiet mode)
    local current_image=$(az containerapp show \
        --name "$container_name" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.template.containers[0].image" \
        --output tsv 2>/dev/null | tr -d '[:space:]')
    
    if [ $? -ne 0 ] || [ -z "$current_image" ]; then
        log_error "Failed to get $container_name container image"
        echo "unknown"
        return
    fi
    
    # Extract version from image name (format: registry/image:version)
    local version=$(echo "$current_image" | sed "s/.*://")
    echo "$version"
}

# Function to get ACR image tags
get_acr_tags() {
    local image_name=$1
    
    log_info "Checking ACR tags for $image_name..."
    
    local tags=$(az acr repository show-tags \
        --name "$ACR_NAME" \
        --repository "$image_name" \
        --output tsv --orderby time_desc 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$tags" ]; then
        log_warning "No tags found for $image_name in ACR"
        return
    fi
    
    echo "$tags"
}

# Function to check version consistency
check_version_consistency() {
    log_info "=== BDS Management System Version Check ==="
    echo ""
    
    # Get file versions
    local backend_file_version=$(get_file_version "$BACKEND_VERSION_FILE" "Backend")
    local frontend_file_version=$(get_file_version "$FRONTEND_VERSION_FILE" "Frontend")
    
    # Get container versions
    local backend_container_version=$(get_container_version "bds-backend" "$BACKEND_IMAGE")
    local frontend_container_version=$(get_container_version "bds-frontend" "$FRONTEND_IMAGE")
    
    # Get ACR versions
    local backend_acr_tags=$(get_acr_tags "$BACKEND_IMAGE")
    local frontend_acr_tags=$(get_acr_tags "$FRONTEND_IMAGE")
    
    echo ""
    log_info "=== Version Summary ==="
    echo "Backend File Version:    $backend_file_version"
    echo "Backend Container:       $backend_container_version"
    echo "Frontend File Version:   $frontend_file_version"
    echo "Frontend Container:      $frontend_container_version"
    echo ""
    
    # Check consistency
    local issues_found=0
    
    # Check if file versions match
    if [ "$backend_file_version" != "$frontend_file_version" ]; then
        log_warning "File versions don't match: Backend($backend_file_version) vs Frontend($frontend_file_version)"
        issues_found=1
    fi
    
    # Check if container versions match file versions
    if [ "$backend_file_version" != "$backend_container_version" ]; then
        log_warning "Backend file version ($backend_file_version) doesn't match container version ($backend_container_version)"
        issues_found=1
    fi
    
    if [ "$frontend_file_version" != "$frontend_container_version" ]; then
        log_warning "Frontend file version ($frontend_file_version) doesn't match container version ($frontend_container_version)"
        issues_found=1
    fi
    
    # Check if container versions match each other
    if [ "$backend_container_version" != "$frontend_container_version" ]; then
        log_warning "Container versions don't match: Backend($backend_container_version) vs Frontend($frontend_container_version)"
        issues_found=1
    fi
    
    # Check if versions exist in ACR
    if [ -n "$backend_acr_tags" ]; then
        if ! echo "$backend_acr_tags" | grep -q "$backend_container_version"; then
            log_warning "Backend container version $backend_container_version not found in ACR"
            issues_found=1
        fi
    fi
    
    if [ -n "$frontend_acr_tags" ]; then
        if ! echo "$frontend_acr_tags" | grep -q "$frontend_container_version"; then
            log_warning "Frontend container version $frontend_container_version not found in ACR"
            issues_found=1
        fi
    fi
    
    echo ""
    if [ $issues_found -eq 0 ]; then
        log_success "All versions are consistent! ✅"
        echo ""
        log_info "Available ACR tags:"
        echo "Backend:  $backend_acr_tags"
        echo "Frontend: $frontend_acr_tags"
        
        # Display deployment history for timestamp versions
        if [ "$backend_file_version" != "unknown" ] && [ "$frontend_file_version" != "unknown" ]; then
            echo ""
            log_info "Deployment Information:"
            local deploy_date=$(echo "$backend_file_version" | cut -d. -f1-3 | tr '.' '-')
            local deploy_time=$(echo "$backend_file_version" | cut -d. -f4 | sed 's/\([0-9]\{2\}\)\([0-9]\{2\}\)/\1:\2/')
            echo "Deployment Date: $deploy_date"
            echo "Deployment Time: $deploy_time"
            echo "Version Format: YYYY.MM.DD.HHMM"
        fi
    else
        log_error "Version inconsistencies found! ❌"
        echo ""
        log_info "To fix version issues, run:"
        echo "  ./scripts/deploy-simple.sh --sync-versions"
        echo "  ./scripts/deploy-simple.sh --all --bump timestamp"
    fi
    
    return $issues_found
}

# Main function
main() {
    case "${1:-check}" in
        "check"|"")
            check_version_consistency
            ;;
        "help"|"--help"|"-h")
            echo "Usage: $0 [COMMAND]"
            echo ""
            echo "Commands:"
            echo "  check     Check version consistency (default)"
            echo "  help      Show this help message"
            echo ""
            echo "This script checks if all components (files, containers, ACR) have matching versions."
            ;;
        *)
            echo "Unknown command: $1"
            echo "Use 'help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
