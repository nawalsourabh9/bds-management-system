# BDS Manufacturing - Azure Infrastructure

> **Environment**: Test/Development  
> **Last Updated**: 2025-09-17 16:20:00

## Overview
This document contains the Azure infrastructure details for BDS Manufacturing's management system. The environment is optimized for cost-effective testing and development.

## Resource Group
- **Name**: `bds-qms`
- **Region**: Central India
- **Purpose**: Contains all resources for BDS Manufacturing test environment

## Azure Database for PostgreSQL
- **Server Name**: `bds-pg-dev`
- **Hostname**: `bds-pg-dev.postgres.database.azure.com`
- **Tier**: Burstable (B1ms)
- **vCores**: 1
- **Memory**: 2GB
- **Storage**: 32GB
- **Version**: PostgreSQL 17
- **Admin Username**: `bds_admin`
- **Database Name**: `bds_eqms`
- **Connection Security**: TLS 1.2 enforced
- **Backup Retention**: 7 days

## Azure Container Registry (ACR)
- **Name**: `bdsqmsacr`
- **Login Server**: `bdsqmsacr.azurecr.io`
- **SKU**: Basic
- **Region**: Central India

## Azure Container Apps
- **Environment**: `bds-qms-env` (Consolidated Environment)
- **Location**: Central India
- **Domain**: `graystone-766c02c8.centralindia.azurecontainerapps.io`

### Container Apps
- **Backend App**: `bds-backend`
  - **URL**: https://bds-backend.graystone-766c02c8.centralindia.azurecontainerapps.io/
  - **Port**: 8000
  - **Status**: ✅ Running
  
- **Frontend App**: `bds-frontend`
  - **URL**: https://bds-frontend.graystone-766c02c8.centralindia.azurecontainerapps.io/
  - **Port**: 80
  - **Status**: ✅ Running

## Connection Details

### PostgreSQL Connection String
```bash
postgresql://bds_admin:${PASSWORD}@bds-pg-dev.postgres.database.azure.com/bds_eqms?sslmode=require
```

### Environment Variables
```bash
# Database
DB_HOST=bds-pg-dev.postgres.database.azure.com
DB_PORT=5432
DB_NAME=bds_eqms
DB_USER=bds_admin@bds-pg-dev
DB_PASSWORD=your_password_here  # Use the password shown during PostgreSQL server creation

# Azure Container Registry
ACR_NAME=bdsqmsacr
ACR_LOGIN_SERVER=bdsqmsacr.azurecr.io
```

## Next Steps
1. **Set the Database Password**:
   - The password was shown when the PostgreSQL server was created
   - If you missed it, you can reset it using:
     ```bash
     az postgres flexible-server update --admin-password "new-password" --name bds-pg-dev --resource-group bds-qms
     ```

2. **Deploy Your Application**:
   - Build and push your container images to ACR
   - Update the container app with your application image

3. **Cost Management**:
   - Stop the PostgreSQL server when not in use:
     ```bash
     az postgres flexible-server stop --name bds-pg-dev --resource-group bds-qms
     ```
   - Start it when needed:
     ```bash
     az postgres flexible-server start --name bds-pg-dev --resource-group bds-qms
     ```

## Deployment Commands

### Prerequisites
1. Install [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. Login: `az login`
3. Set subscription (if needed): `az account set --subscription <subscription-id>`

### Setup Infrastructure
```bash
# Make script executable
chmod +x scripts/setup-azure-infra.sh

# Run setup
./scripts/setup-azure-infra.sh
```

### Deploy Application
```bash
# Deploy both backend and frontend (recommended)
./scripts/deploy-simple.sh --all

# Deploy only backend
./scripts/deploy-simple.sh --backend

# Deploy only frontend
./scripts/deploy-simple.sh --frontend

# Alternative: Use the comprehensive deployment script
./scripts/deploy-all.sh
```

### Deployment Script Features
- **Platform Detection**: Automatically detects macOS (ARM64) and builds for Linux (AMD64)
- **Version Management**: Automatic version bumping with `VERSION-backend` and `VERSION-frontend` files
- **Cross-Platform Builds**: Uses Docker buildx for multi-platform compatibility
- **Azure Integration**: Automatic ACR login and container app deployment
- **Environment Variables**: Automatic backend URL configuration for frontend

## Cost Optimization Notes
- Using Burstable SKU for PostgreSQL (cheapest option)
- Minimum storage allocation (32GB)
- Backup retention set to minimum (7 days)
- Auto-grow disabled to prevent unexpected costs
- Basic ACR SKU (cheapest option)

## Security Notes
- Database password is randomly generated during setup
- Store the password securely (e.g., Azure Key Vault)
- Firewall allows access from any IP (0.0.0.0 - 255.255.255.255)
  - Restrict this in production

## Cleanup
To remove all resources when no longer needed:
```bash
az group delete --name bds-qms --yes --no-wait
```

> **Warning**: This will permanently delete all resources in the resource group.

## Support
For any issues, contact the BDS Manufacturing DevOps team.
