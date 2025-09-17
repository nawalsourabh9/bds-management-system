#!/bin/bash

# Frontend deployment script for BDS Management System
# This script builds and deploys the frontend to Azure Container Apps

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables from .env.azure
if [ -f "../.env.azure" ]; then
    echo -e "${BLUE}🔍 Loading environment variables from .env.azure...${NC}"
    export $(grep -v '^#' ../.env.azure | xargs)
else
    echo -e "${RED}❌ Error: .env.azure file not found. Please create it based on .env.example.${NC}"
    exit 1
fi

# Set default values
APP_NAME="bds-frontend"
RESOURCE_GROUP="${RESOURCE_GROUP:-bds-qms}"
LOCATION="${AZURE_LOCATION:-centralindia}"
ACR_NAME="${ACR_NAME}"
FRONTEND_IMAGE="${APP_NAME}:latest"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check if user is logged into Azure
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged into Azure. Please log in using 'az login'${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker and try again.${NC}"
    exit 1
fi

# Check if Azure CLI is installed
if ! command_exists az; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it and try again.${NC}"
    exit 1
fi

# Build the frontend
echo -e "\n${BLUE}🏗️  Building frontend Docker image...${NC}"
docker build -t ${FRONTEND_IMAGE} -f ../Dockerfile.frontend ..

# Tag the image for ACR
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
TAGGED_IMAGE="${ACR_LOGIN_SERVER}/${FRONTEND_IMAGE}"
echo -e "\n${BLUE}🏷️  Tagging image for ACR...${NC}"
docker tag ${FRONTEND_IMAGE} ${TAGGED_IMAGE}

# Log in to ACR
echo -e "\n${BLUE}🔐 Logging into ACR...${NC}"
az acr login --name ${ACR_NAME}

# Push the image to ACR
echo -e "\n${BLUE}🚀 Pushing image to ACR...${NC}"
docker push ${TAGGED_IMAGE}

# Deploy to Azure Container Apps
echo -e "\n${BLUE}🚀 Deploying to Azure Container Apps...${NC}"

# Check if container app exists
if ! az containerapp show --name ${APP_NAME} --resource-group ${RESOURCE_GROUP} &> /dev/null; then
    echo -e "${YELLOW}⚠️  Container app ${APP_NAME} not found. Creating a new one...${NC}
    
    # Create container app environment if it doesn't exist
    if ! az containerapp env show --name "${APP_NAME}-env" --resource-group ${RESOURCE_GROUP} &> /dev/null; then
        echo -e "${BLUE}🌍 Creating Container Apps environment...${NC}"
        az containerapp env create \
            --name "${APP_NAME}-env" \
            --resource-group ${RESOURCE_GROUP} \
            --location ${LOCATION}
    fi
    
    # Create the container app
    echo -e "${BLUE}🚀 Creating Container App...${NC}"
    az containerapp create \
        --name ${APP_NAME} \
        --resource-group ${RESOURCE_GROUP} \
        --environment "${APP_NAME}-env" \
        --image ${TAGGED_IMAGE} \
        --target-port 80 \
        --ingress external \
        --query properties.configuration.ingress.fqdn
else
    # Update existing container app
    echo -e "${BLUE}🔄 Updating existing Container App...${NC}"
    az containerapp update \
        --name ${APP_NAME} \
        --resource-group ${RESOURCE_GROUP} \
        --image ${TAGGED_IMAGE} \
        --query properties.configuration.ingress.fqdn
fi

echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your application should be available at the URL shown above.${NC}"
