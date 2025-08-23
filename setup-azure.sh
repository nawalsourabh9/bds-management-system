#!/bin/bash

echo "☁️ Setting up Azure Resources..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run: az login"
    exit 1
fi

# Set variables
RESOURCE_GROUP="bds-management-rg"
LOCATION="eastus"
POSTGRES_SERVER="bds-management-db"
STORAGE_ACCOUNT="bdsstorage$(date +%s)"
APP_SERVICE_PLAN="bds-app-plan"
WEB_APP="bds-management-app"

echo "📋 Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

echo "🗄️ Creating Azure PostgreSQL Flexible Server..."
az postgres flexible-server create \
    --name $POSTGRES_SERVER \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --admin-user bdsadmin \
    --admin-password "BdsSecurePassword2024!" \
    --sku-name Standard_B1ms \
    --version 15 \
    --storage-size 32

echo "🔧 Configuring PostgreSQL firewall..."
az postgres flexible-server firewall-rule create \
    --name $POSTGRES_SERVER \
    --resource-group $RESOURCE_GROUP \
    --rule-name allow-all \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 255.255.255.255

echo "💾 Creating Azure Storage Account..."
az storage account create \
    --name $STORAGE_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku Standard_LRS \
    --kind StorageV2

echo "📦 Creating storage containers..."
STORAGE_KEY=$(az storage account keys list --account-name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP --query '[0].value' -o tsv)

az storage container create \
    --name bds-documents \
    --account-name $STORAGE_ACCOUNT \
    --account-key $STORAGE_KEY

az storage container create \
    --name bds-uploads \
    --account-name $STORAGE_ACCOUNT \
    --account-key $STORAGE_KEY

echo "🌐 Creating App Service Plan..."
az appservice plan create \
    --name $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku B1 \
    --is-linux

echo "🚀 Creating Web App..."
az webapp create \
    --name $WEB_APP \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --runtime "PYTHON:3.11"

echo "🔐 Getting connection strings..."
POSTGRES_CONNECTION_STRING=$(az postgres flexible-server show-connection-string \
    --name $POSTGRES_SERVER \
    --resource-group $RESOURCE_GROUP \
    --admin-user bdsadmin \
    --admin-password "BdsSecurePassword2024!" \
    --query connectionString -o tsv)

STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
    --name $STORAGE_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --query connectionString -o tsv)

echo "⚙️ Configuring app settings..."
az webapp config appsettings set \
    --name $WEB_APP \
    --resource-group $RESOURCE_GROUP \
    --settings \
    DATABASE_URL="$POSTGRES_CONNECTION_STRING" \
    AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING" \
    SECRET_KEY="$(openssl rand -hex 32)" \
    REDIS_URL="redis://localhost:6379" \
    CORS_ORIGINS="https://$WEB_APP.azurewebsites.net" \
    STORAGE_TYPE="azure" \
    LOG_LEVEL="INFO" \
    DEFAULT_TIMEZONE="Asia/Kolkata"

echo "📋 Creating deployment script..."
cat > deploy-azure.sh << EOF
#!/bin/bash

echo "🚀 Deploying to Azure..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

# Deploy backend
echo "🔧 Deploying backend..."
cd backend
az webapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name $WEB_APP \
    --src ../deploy.zip

echo "✅ Deployment completed!"
echo "🌐 Your app is available at: https://$WEB_APP.azurewebsites.net"
EOF

chmod +x deploy-azure.sh

echo "📄 Creating Azure configuration file..."
cat > azure-config.env << EOF
# Azure Configuration
RESOURCE_GROUP=$RESOURCE_GROUP
LOCATION=$LOCATION
POSTGRES_SERVER=$POSTGRES_SERVER
STORAGE_ACCOUNT=$STORAGE_ACCOUNT
APP_SERVICE_PLAN=$APP_SERVICE_PLAN
WEB_APP=$WEB_APP

# Connection Strings
POSTGRES_CONNECTION_STRING=$POSTGRES_CONNECTION_STRING
STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION_STRING

# App URLs
WEB_APP_URL=https://$WEB_APP.azurewebsites.net
POSTGRES_HOST=$POSTGRES_SERVER.postgres.database.azure.com
STORAGE_ACCOUNT_URL=https://$STORAGE_ACCOUNT.blob.core.windows.net
EOF

echo "✅ Azure setup completed!"
echo ""
echo "📋 Summary:"
echo "Resource Group: $RESOURCE_GROUP"
echo "PostgreSQL Server: $POSTGRES_SERVER"
echo "Storage Account: $STORAGE_ACCOUNT"
echo "Web App: $WEB_APP"
echo ""
echo "🔗 URLs:"
echo "Web App: https://$WEB_APP.azurewebsites.net"
echo "PostgreSQL: $POSTGRES_SERVER.postgres.database.azure.com"
echo "Storage: https://$STORAGE_ACCOUNT.blob.core.windows.net"
echo ""
echo "📝 Next steps:"
echo "1. Update your .env files with the connection strings"
echo "2. Run: ./deploy-azure.sh to deploy your application"
echo "3. Configure custom domain if needed"
echo ""
echo "⚠️  Important:"
echo "- Change default passwords in production"
echo "- Configure proper firewall rules"
echo "- Set up monitoring and logging"
echo "- Configure SSL certificates"
