#!/bin/bash

# Azure Container Apps Revision Management Script
# Manages revisions with timestamp-based versioning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
RESOURCE_GROUP="bds-qms"
BACKEND_APP="bds-backend"
FRONTEND_APP="bds-frontend"

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

# Function to list revisions with timestamp information
list_revisions() {
    local app_name=$1
    local app_type=$2
    
    log_info "Listing revisions for $app_type ($app_name):"
    echo ""
    
    # Get revisions with detailed information
    az containerapp revision list \
        --name "$app_name" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[].{
            Name:name,
            Image:properties.template.containers[0].image,
            Active:properties.active,
            ProvisioningState:properties.provisioningState,
            CreatedTime:properties.createdTime,
            TrafficWeight:properties.trafficWeight
        }" \
        --output table
    
    echo ""
    
    # Extract timestamp from image tags and display deployment info
    local revisions=$(az containerapp revision list --name "$app_name" --resource-group "$RESOURCE_GROUP" --query "[].{Name:name,Image:properties.template.containers[0].image,Active:properties.active}" --output json)
    
    echo "$revisions" | jq -r '.[] | select(.Active == true) | .Image' | while read -r image; do
        if [[ $image =~ :([0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[0-9]{4})$ ]]; then
            local timestamp="${BASH_REMATCH[1]}"
            local deploy_date=$(echo "$timestamp" | cut -d. -f1-3 | tr '.' '-')
            local deploy_time=$(echo "$timestamp" | cut -d. -f4 | sed 's/\([0-9]\{2\}\)\([0-9]\{2\}\)/\1:\2/')
            log_info "Active deployment: $deploy_date at $deploy_time (version: $timestamp)"
        fi
    done
}

# Function to rollback to a specific timestamp version
rollback_to_version() {
    local app_name=$1
    local target_version=$2
    local app_type=$3
    
    log_info "Rolling back $app_type ($app_name) to version: $target_version"
    
    # Convert timestamp to revision suffix format
    local revision_suffix=$(echo "$target_version" | tr '.' '-')
    
    # Find the revision with the matching image tag
    local target_revision=$(az containerapp revision list \
        --name "$app_name" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[?contains(properties.template.containers[0].image, '$target_version')].name" \
        --output tsv | head -n1)
    
    if [ -z "$target_revision" ]; then
        log_error "No revision found with version $target_version"
        return 1
    fi
    
    log_info "Found target revision: $target_revision"
    
    # Route 100% traffic to the target revision
    if az containerapp ingress traffic set \
        --name "$app_name" \
        --resource-group "$RESOURCE_GROUP" \
        --revision-weight "$target_revision=100"; then
        log_success "Successfully rolled back $app_type to version $target_version"
        log_info "Active revision: $target_revision"
    else
        log_error "Failed to rollback $app_type to version $target_version"
        return 1
    fi
}

# Function to show deployment history with timestamps
show_deployment_history() {
    log_info "=== Deployment History ==="
    echo ""
    
    # Backend history
    log_info "Backend Deployment History:"
    az containerapp revision list \
        --name "$BACKEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[].{
            Revision:name,
            Image:properties.template.containers[0].image,
            Active:properties.active,
            Created:properties.createdTime
        }" \
        --output table | head -10
    
    echo ""
    
    # Frontend history
    log_info "Frontend Deployment History:"
    az containerapp revision list \
        --name "$FRONTEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[].{
            Revision:name,
            Image:properties.template.containers[0].image,
            Active:properties.active,
            Created:properties.createdTime
        }" \
        --output table | head -10
    
    echo ""
    log_info "Use 'rollback' command to revert to a specific timestamp version"
}

# Function to clean up old revisions (keep last 5)
cleanup_old_revisions() {
    local app_name=$1
    local app_type=$2
    local keep_count=${3:-5}
    
    log_info "Cleaning up old revisions for $app_type (keeping last $keep_count)..."
    
    # Get inactive revisions sorted by creation time (oldest first)
    local old_revisions=$(az containerapp revision list \
        --name "$app_name" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[?properties.active == \`false\`].{Name:name,Created:properties.createdTime}" \
        --output json | jq -r 'sort_by(.Created) | .[0:-'$keep_count'] | .[].Name')
    
    if [ -z "$old_revisions" ]; then
        log_info "No old revisions to clean up for $app_type"
        return 0
    fi
    
    echo "$old_revisions" | while read -r revision; do
        if [ -n "$revision" ]; then
            log_info "Removing old revision: $revision"
            az containerapp revision deactivate \
                --name "$app_name" \
                --resource-group "$RESOURCE_GROUP" \
                --revision "$revision" || log_warning "Failed to remove revision: $revision"
        fi
    done
    
    log_success "Cleanup completed for $app_type"
}

# Main function
main() {
    case "${1:-help}" in
        "list")
            if [ "$2" = "backend" ] || [ "$2" = "all" ]; then
                list_revisions "$BACKEND_APP" "Backend"
            fi
            if [ "$2" = "frontend" ] || [ "$2" = "all" ]; then
                list_revisions "$FRONTEND_APP" "Frontend"
            fi
            if [ -z "$2" ]; then
                list_revisions "$BACKEND_APP" "Backend"
                echo ""
                list_revisions "$FRONTEND_APP" "Frontend"
            fi
            ;;
        "rollback")
            if [ -z "$2" ] || [ -z "$3" ]; then
                log_error "Usage: $0 rollback <backend|frontend|all> <timestamp_version>"
                log_info "Example: $0 rollback backend 2025.09.18.0035"
                exit 1
            fi
            
            local target_version="$3"
            
            if [ "$2" = "backend" ] || [ "$2" = "all" ]; then
                rollback_to_version "$BACKEND_APP" "$target_version" "Backend"
            fi
            if [ "$2" = "frontend" ] || [ "$2" = "all" ]; then
                rollback_to_version "$FRONTEND_APP" "$target_version" "Frontend"
            fi
            ;;
        "history")
            show_deployment_history
            ;;
        "cleanup")
            local keep_count=${2:-5}
            cleanup_old_revisions "$BACKEND_APP" "Backend" "$keep_count"
            cleanup_old_revisions "$FRONTEND_APP" "Frontend" "$keep_count"
            ;;
        "help"|"--help"|"-h")
            echo "Azure Container Apps Revision Management"
            echo ""
            echo "Usage: $0 <COMMAND> [OPTIONS]"
            echo ""
            echo "Commands:"
            echo "  list [backend|frontend|all]    List revisions with timestamp info"
            echo "  rollback <app> <version>       Rollback to specific timestamp version"
            echo "  history                       Show deployment history"
            echo "  cleanup [count]               Clean up old revisions (default: keep 5)"
            echo "  help                          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 list all                   # List all revisions"
            echo "  $0 rollback backend 2025.09.18.0035  # Rollback backend"
            echo "  $0 rollback all 2025.09.18.0035      # Rollback both apps"
            echo "  $0 history                    # Show deployment history"
            echo "  $0 cleanup 3                  # Keep only last 3 revisions"
            echo ""
            echo "Version Format: YYYY.MM.DD.HHMM (e.g., 2025.09.18.1430)"
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
