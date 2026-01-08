#!/bin/bash

# Azure utilities for BDS Management System scripts

# Source common utilities
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

# Check if Azure CLI is installed and logged in
check_azure_cli() {
    if ! command_exists az; then
        log_error "Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    fi
    
    if ! az account show &> /dev/null; then
        log_info "Logging in to Azure..."
        az login --use-device-code
    fi
    
    log_info "Connected to Azure as $(az account show --query user.name -o tsv)"
    return 0
}

# Create a resource group if it doesn't exist
ensure_resource_group() {
    local resource_group="$1"
    local location="${2:-westeurope}"
    
    if ! az group show --name "$resource_group" &> /dev/null; then
        log_info "Creating resource group: $resource_group in $location"
        az group create --name "$resource_group" --location "$location"
        log_success "Resource group created: $resource_group"
    else
        log_info "Using existing resource group: $resource_group"
    fi
}

# Create an Azure Container Registry if it doesn't exist
ensure_acr() {
    local acr_name="$1"
    local resource_group="$2"
    local sku="${3:-Basic}"
    
    if ! az acr show --name "$acr_name" --resource-group "$resource_group" &> /dev/null; then
        log_info "Creating Azure Container Registry: $acr_name"
        az acr create --resource-group "$resource_group" --name "$acr_name" --sku "$sku" --admin-enabled true
        log_success "Azure Container Registry created: $acr_name"
    else
        log_info "Using existing Azure Container Registry: $acr_name"
    fi
}

# Login to Azure Container Registry
login_to_acr() {
    local acr_name="$1"
    log_info "Logging in to Azure Container Registry: $acr_name"
    az acr login --name "$acr_name"
}

# Export functions
export -f check_azure_cli ensure_resource_group ensure_acr login_to_acr
