# 🔐 Custom Domain & SSL Certificate Setup Guide

This guide will help you set up custom domains with free SSL certificates for your BDS Management System on Azure Container Apps.

## 📋 Prerequisites

- ✅ Azure CLI installed and authenticated (`az login`)
- ✅ Azure Container Apps deployed and running
- ✅ Domain registrar access (for DNS configuration)
- ✅ Domain: `eqms.nordictechdesign.com`

## 🚀 Quick Start

### Step 1: Run the Setup Script

```bash
cd /Users/taklu/projects/nordic/bds-management-system
./scripts/setup-custom-domain.sh
```

### Step 2: Update Frontend API URL

After custom domains are working, update the frontend:

```bash
./scripts/update-frontend-api-url.sh
```

## 📚 Detailed Setup Process

### 1. DNS Configuration

The setup script will display the required DNS records. Add these CNAME records to your domain registrar:

#### Frontend Domain
```
Type: CNAME
Name: eqms
Value: [FRONTEND_URL from script output]
TTL: 300 (5 minutes)
```

#### Backend API Domain
```
Type: CNAME
Name: api.eqms
Value: [BACKEND_URL from script output]
TTL: 300 (5 minutes)
```

### 2. Domain Verification & SSL

The script automatically:
- ✅ Verifies DNS propagation
- ✅ Adds custom domains to Azure Container Apps
- ✅ Provisions free SSL certificates (via Azure managed certificates)
- ✅ Verifies SSL certificate installation

### 3. Frontend Configuration Update

After SSL certificates are provisioned, update the frontend to use the custom API URL:

```bash
./scripts/update-frontend-api-url.sh
```

This script:
- ✅ Verifies custom domain API is working
- ✅ Updates Key Vault with new API URL
- ✅ Triggers frontend redeployment
- ✅ Verifies the update

## 🔍 Verification Steps

### Test SSL Certificates

```bash
# Test frontend SSL
curl -I https://eqms.nordictechdesign.com

# Test backend API SSL
curl -I https://api.eqms.nordictechdesign.com/health
```

### Check Certificate Details

```bash
# Frontend certificate
echo | openssl s_client -servername eqms.nordictechdesign.com -connect eqms.nordictechdesign.com:443 2>/dev/null | openssl x509 -noout -dates -issuer

# Backend certificate
echo | openssl s_client -servername api.eqms.nordictechdesign.com -connect api.eqms.nordictechdesign.com:443 2>/dev/null | openssl x509 -noout -dates -issuer
```

## 📊 Azure Resource Configuration

### Container Apps Domains

The setup configures these custom domains:

- **Frontend**: `https://eqms.nordictechdesign.com`
- **Backend API**: `https://api.eqms.nordictechdesign.com`

### SSL Certificates

- **Type**: Azure managed certificates (free)
- **Validation**: Automatic domain validation
- **Renewal**: Automatic certificate renewal

## 🔧 Troubleshooting

### DNS Issues

```bash
# Check DNS propagation
nslookup eqms.nordictechdesign.com
nslookup api.eqms.nordictechdesign.com

# Check current Azure domains
az containerapp hostname list --name bds-frontend --resource-group bds-qms --output table
az containerapp hostname list --name bds-backend --resource-group bds-qms --output table
```

### SSL Certificate Issues

```bash
# Check certificate status
az containerapp hostname list --name bds-frontend --resource-group bds-qms --query "[].{Hostname:hostname, Status:provisioningState}" --output table

# Force certificate renewal (if needed)
az containerapp hostname set --name bds-frontend --resource-group bds-qms --hostname eqms.nordictechdesign.com
```

### API URL Update Issues

```bash
# Check Key Vault
az keyvault secret show --vault-name bds-qms-kv --name api-url --query value -o tsv

# Check frontend environment
az containerapp show --name bds-frontend --resource-group bds-qms --query properties.template.containers[0].env
```

## 📈 Monitoring & Maintenance

### Certificate Expiry Monitoring

Azure automatically monitors and renews certificates, but you can check expiry:

```bash
# Check certificate expiry dates
echo "Frontend Certificate:" | openssl s_client -servername eqms.nordictechdesign.com -connect eqms.nordictechdesign.com:443 2>/dev/null | openssl x509 -noout -enddate

echo "Backend Certificate:" | openssl s_client -servername api.eqms.nordictechdesign.com -connect api.eqms.nordictechdesign.com:443 2>/dev/null | openssl x509 -noout -enddate
```

### Application Monitoring

```bash
# Check application health
curl https://eqms.nordictechdesign.com
curl https://api.eqms.nordictechdesign.com/health

# Check Azure Container Apps status
az containerapp list --resource-group bds-qms --output table
```

## 🔒 Security Considerations

- ✅ SSL/TLS encryption enabled for all traffic
- ✅ Azure managed certificates with automatic renewal
- ✅ Domain validation ensures certificate authenticity
- ✅ HTTPS-only traffic (HTTP automatically redirects to HTTPS)

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify DNS propagation (may take 5-30 minutes)
3. Ensure Azure CLI is authenticated
4. Check Azure resource permissions
5. Review Azure Container Apps logs:

```bash
az containerapp logs show --name bds-frontend --resource-group bds-qms
az containerapp logs show --name bds-backend --resource-group bds-qms
```

## 🎯 Final Result

After successful setup, your application will be available at:

- 🌐 **Frontend**: `https://eqms.nordictechdesign.com`
- 🔗 **Backend API**: `https://api.eqms.nordictechdesign.com`

Both domains will have valid SSL certificates with automatic renewal! 🚀

