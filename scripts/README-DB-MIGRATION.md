# BDS QMS - Database Migration

This directory contains scripts for migrating database schemas between PostgreSQL databases, with a focus on migrating from a local development environment to Azure Database for PostgreSQL.

## Prerequisites

- Python 3.7+
- PostgreSQL client tools (`psql`, `pg_dump`, etc.)
- Azure CLI (for Azure Database operations)
- Access to source and target databases

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements-db.txt
   ```

2. Configure environment variables in `.env.azure`:
   ```bash
   # Local database (source)
   LOCAL_POSTGRES_HOST=localhost
   LOCAL_POSTGRES_PORT=5432
   LOCAL_POSTGRES_DB=bds_management
   LOCAL_POSTGRES_USER=postgres
   LOCAL_POSTGRES_PASSWORD=your_local_password

   # Azure database (target)
   POSTGRES_SERVER=your-server-name
   POSTGRES_DB=bds_eqms
   POSTGRES_ADMIN_USER=your_admin_user
   POSTGRES_PASSWORD=your_azure_password
   ```

## Usage

### Basic Migration

To migrate schema from local database to Azure:

```bash
./scripts/migrate-db.sh
```

### Advanced Options

```bash
# Run with debug logging
./scripts/migrate-db.sh --debug

# Use custom environment files
python3 scripts/migrate_db_schema.py \
    --source-env .env.local \
    --target-env .env.azure \
    --source-prefix "LOCAL_" \
    --target-prefix "AZURE_" \
    --debug
```

## How It Works

1. The script connects to both source and target databases
2. It retrieves schema information from the source database
3. It creates the same schema in the target database, including:
   - Schemas
   - Tables
   - Views
   - Functions
   - Indexes
4. It handles Azure-specific requirements like SSL and username formatting

## Troubleshooting

- **Connection Issues**: Verify database credentials and network connectivity
- **Permission Errors**: Ensure the database user has sufficient privileges
- **SSL Errors**: Make sure SSL is properly configured for Azure Database

## Security Notes

- Never commit sensitive information in `.env` files
- Use environment variables or Azure Key Vault for production secrets
- Limit database access to trusted IP addresses in Azure

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
