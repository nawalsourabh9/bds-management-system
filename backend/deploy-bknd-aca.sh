#!/bin/bash

# Backend Deployment Script for Azure Container Apps
# Usage: ./deploy-bknd-aca.sh

set -e

# Load configuration from file
if [ -f "../deployment-config.env" ]; then
    source ../deployment-config.env
else
    print_error "deployment-config.env file not found. Please create it with your deployment settings."
    exit 1
fi

# Configuration (with fallbacks)
RESOURCE_GROUP=${RESOURCE_GROUP:-"bds"}
ACR_NAME=${ACR_NAME:-"acrnordic"}
CONTAINER_APP_NAME=${CONTAINER_APP_NAME_BACKEND:-"bds-backend"}
ENVIRONMENT_NAME=${ENVIRONMENT_NAME:-"bds-env"}
IMAGE_NAME=${IMAGE_NAME_BACKEND:-"bds-backend"}
LOCATION=${LOCATION:-"southindia"}

# Database configuration (using existing nordic database)
NORDIC_DB_HOST=${NORDIC_DB_HOST:-"nordic-db.postgres.database.azure.com"}
NORDIC_DB_NAME=${NORDIC_DB_NAME:-"nordic"}
NORDIC_DB_USER=${NORDIC_DB_USER:-"nodicuser"}
KEYVAULT_NAME=${KEYVAULT_NAME:-"bds-keyvault"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check if logged into Azure
    if ! az account show &> /dev/null; then
        print_error "Not logged into Azure. Please run 'az login' first."
        exit 1
    fi
    
    print_status "Prerequisites check passed!"
}

# Function to get current version
get_current_version() {
    node -p "require('./package.json').version"
}

# Function to create Azure resources if they don't exist
create_azure_resources() {
    print_status "Checking/Creating Azure resources..."
    
    # Check if resource group exists
    if ! az group show --name $RESOURCE_GROUP &> /dev/null; then
        print_status "Creating resource group: $RESOURCE_GROUP"
        az group create --name $RESOURCE_GROUP --location $LOCATION
    fi
    
    # Check if ACR exists (it's shared with Nordic, so it exists in nordic resource group)
    if ! az acr show --name $ACR_NAME &> /dev/null; then
        print_status "Creating Azure Container Registry: $ACR_NAME"
        az acr create \
            --resource-group $RESOURCE_GROUP \
            --name $ACR_NAME \
            --sku Basic \
            --admin-enabled true
    else
        print_status "Using existing Azure Container Registry: $ACR_NAME"
    fi
    
    # Check if Container Apps environment exists
    if ! az containerapp env show --name $ENVIRONMENT_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        print_status "Creating Container Apps environment: $ENVIRONMENT_NAME"
        az containerapp env create \
            --name $ENVIRONMENT_NAME \
            --resource-group $RESOURCE_GROUP \
            --location $LOCATION
    fi
    
    # Check if Key Vault exists
    if ! az keyvault show --name $KEYVAULT_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        print_status "Creating Key Vault: $KEYVAULT_NAME"
        az keyvault create \
            --name $KEYVAULT_NAME \
            --resource-group $RESOURCE_GROUP \
            --location $LOCATION \
            --sku standard
    fi
}

# Function to setup secrets in Key Vault
setup_secrets() {
    print_status "Checking secrets in Key Vault..."
    
    # Check if secrets already exist
    if az keyvault secret show --vault-name $KEYVAULT_NAME --name "DBPASSWORD" &> /dev/null && \
       az keyvault secret show --vault-name $KEYVAULT_NAME --name "JWT-SECRET" &> /dev/null; then
        print_status "Secrets already exist in Key Vault. Skipping setup."
        return
    fi
    
    print_status "Setting up missing secrets in Key Vault..."
    
    # Only prompt for database password if it doesn't exist
    if ! az keyvault secret show --vault-name $KEYVAULT_NAME --name "DBPASSWORD" &> /dev/null; then
        echo -n "Enter the database password for user 'nodicuser': "
        read -s db_password
        echo
        az keyvault secret set --vault-name $KEYVAULT_NAME --name "DBPASSWORD" --value "$db_password"
    fi
    
    # Only setup JWT secret if it doesn't exist
    if ! az keyvault secret show --vault-name $KEYVAULT_NAME --name "JWT-SECRET" &> /dev/null; then
        echo -n "Enter JWT secret (or press Enter to generate one): "
        read -s jwt_secret
        echo
        
        if [ -z "$jwt_secret" ]; then
            jwt_secret=$(openssl rand -hex 32)
            print_status "Generated JWT secret"
        fi
        
        az keyvault secret set --vault-name $KEYVAULT_NAME --name "JWT-SECRET" --value "$jwt_secret"
    fi
    
    print_status "Secrets setup completed!"
}

# Function to build and push Docker image
build_and_push_image() {
    local version=$1
    
    print_status "Building Docker image..."
    
    # Build the image
    docker buildx build \
        --platform linux/amd64 \
        --tag $ACR_NAME.azurecr.io/$IMAGE_NAME:$version \
        --tag $ACR_NAME.azurecr.io/$IMAGE_NAME:latest \
        --file Dockerfile \
        --push .
    
    print_status "Docker image built and pushed successfully!"
}

# Function to deploy to Container Apps
deploy_to_container_apps() {
    local version=$1
    
    print_status "Deploying to Azure Container Apps..."
    
    # Get secrets from Key Vault
    db_password=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "DBPASSWORD" --query value -o tsv)
    jwt_secret=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "JWT-SECRET" --query value -o tsv)
    
    # Construct database URL
    database_url="postgresql://${NORDIC_DB_USER}:${db_password}@${NORDIC_DB_HOST}:5432/${NORDIC_DB_NAME}?sslmode=require"
    
    # Environment variables for Azure Container Apps
    env_vars=(
        "DATABASE_URL=$database_url"
        "JWT_SECRET=$jwt_secret"
        "JWT_ALGORITHM=HS256"
        "ACCESS_TOKEN_EXPIRE_MINUTES=30"
        "VITE_API_URL=https://api.bds.nordictechdesign.com"
        "VITE_APP_NAME=BDS_Management_System"
        "VITE_APP_ENV=production"
    )
    
    # Get ACR credentials
    acr_server=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
    acr_username=$(az acr credential show --name $ACR_NAME --query username -o tsv)
    acr_password=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)
    
    # Check if Container App exists
    if az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        print_status "Updating existing Container App..."
        # Update the image
        az containerapp update \
            --name $CONTAINER_APP_NAME \
            --resource-group $RESOURCE_GROUP \
            --image $ACR_NAME.azurecr.io/$IMAGE_NAME:$version
            
        # Update scale settings and environment variables
        az containerapp update \
            --name $CONTAINER_APP_NAME \
            --resource-group $RESOURCE_GROUP \
            --min-replicas 1 \
            --max-replicas 10 \
            --env-vars "${env_vars[@]}"
    else
        print_status "Creating new Container App..."
        az containerapp create \
            --name $CONTAINER_APP_NAME \
            --resource-group $RESOURCE_GROUP \
            --environment $ENVIRONMENT_NAME \
            --image $ACR_NAME.azurecr.io/$IMAGE_NAME:$version \
            --min-replicas 1 \
            --max-replicas 10 \
            --target-port 8000 \
            --ingress external \
            --allow-insecure false \
            --registry-server $acr_server \
            --registry-username $acr_username \
            --registry-password $acr_password \
            --env-vars "${env_vars[@]}"
    fi
    
    print_status "Container App deployment completed!"
}

# Function to get Container App URL
get_app_url() {
    local url=$(az containerapp show \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --query "properties.configuration.ingress.fqdn" \
        --output tsv)
    
    echo "https://$url"
}

# Main deployment function
main() {
    print_header "Backend Deployment to Azure Container Apps"
    
    # Check prerequisites
    check_prerequisites
    
    # Get current version
    current_version=$(get_current_version)
    print_status "Current version: $current_version"
    
    # Prompt for revision suffix
    echo -n "Enter revision suffix (optional, press Enter to skip): "
    read revision_suffix
    
    if [ -n "$revision_suffix" ]; then
        version="${current_version}-${revision_suffix}"
    else
        version=$current_version
    fi
    
    print_status "Deploying version: $version"
    
    # Create Azure resources
    create_azure_resources
    
    # Setup secrets
    setup_secrets
    
    # Login to ACR
    print_status "Logging into Azure Container Registry..."
    az acr login --name $ACR_NAME
    
    # Build and push image
    build_and_push_image $version
    
    # Deploy to Container Apps
    deploy_to_container_apps $version
    
    # Get and display the app URL
    app_url=$(get_app_url)
    print_status "Deployment completed successfully!"
    print_status "Backend URL: $app_url"
    
    print_header "Deployment Summary"
    echo "Resource Group: $RESOURCE_GROUP"
    echo "Container Registry: $ACR_NAME"
    echo "Container App: $CONTAINER_APP_NAME"
    echo "Environment: $ENVIRONMENT_NAME"
    echo "Version: $version"
    echo "Database: $NORDIC_DB_HOST"
    echo "URL: $app_url"
}

# Call main function
main "$@"
