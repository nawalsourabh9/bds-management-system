#!/usr/bin/env python3
"""
Apply position-departments junction table migration to Azure PostgreSQL
"""

import sys
import os
import subprocess
import psycopg2
from pathlib import Path
from urllib.parse import quote_plus

def get_azure_secret(secret_name: str, keyvault_name: str = "bds-qms-kv") -> str:
    """Get secret from Azure Key Vault"""
    try:
        result = subprocess.run([
            "az", "keyvault", "secret", "show",
            "--vault-name", keyvault_name,
            "--name", secret_name,
            "--query", "value",
            "-o", "tsv"
        ], capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Failed to get secret {secret_name} from Key Vault {keyvault_name}: {e.stderr}")
        return None
    except FileNotFoundError:
        print("⚠️  Azure CLI not found. Install it: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli")
        return None

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    project_root = Path(__file__).parent.parent
    backend_root = project_root / 'backend'
    
    env_files = [
        backend_root / '.env',
        project_root / '.env',
    ]
    
    for env_path in env_files:
        if env_path.exists():
            load_dotenv(env_path, override=True)
            print(f"✓ Loaded environment from {env_path}")
            break
except ImportError:
    print("⚠️  python-dotenv not found. Install it: pip install python-dotenv")
    print("   Continuing with environment variables...")

# Get database credentials
db_host = os.getenv('DB_HOST', 'bds-pg-dev.postgres.database.azure.com')
db_port = os.getenv('DB_PORT', '5432')
db_name = os.getenv('DB_NAME', 'bds_eqms')
db_user = os.getenv('DB_USER', 'bds_admin@bds-pg-dev')
db_password = os.getenv('DB_PASSWORD')

# If password not in env, try to get from Key Vault
if not db_password:
    print("📦 Fetching database password from Azure Key Vault...")
    db_password = get_azure_secret('db-password')
    if not db_password:
        print("❌ Failed to get database password from Key Vault")
        sys.exit(1)

if not db_password:
    print("❌ Database password not found in environment or Key Vault")
    sys.exit(1)

# Read migration file
migration_file = project_root / 'database' / 'migrations' / 'add-position-departments-junction.sql'
if not migration_file.exists():
    print(f"❌ Migration file not found: {migration_file}")
    sys.exit(1)

print(f"📄 Reading migration file: {migration_file}")
with open(migration_file, 'r') as f:
    migration_sql = f.read()

# Connect to database
print(f"\n🔌 Connecting to database: {db_host}:{db_port}/{db_name}")
print(f"   User: {db_user}")

try:
    # For Azure PostgreSQL, username might need @server format
    # psycopg2 handles this automatically
    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        database=db_name,
        user=db_user,
        password=db_password,
        sslmode='require'
    )
    
    print("✓ Connected to database")
    
    # Execute migration
    print("\n🚀 Applying migration...")
    with conn.cursor() as cur:
        # Execute the migration SQL
        cur.execute(migration_sql)
        conn.commit()
    
    print("✓ Migration applied successfully!")
    
    # Verify the table was created
    print("\n🔍 Verifying migration...")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) as table_exists 
            FROM information_schema.tables 
            WHERE table_name = 'position_departments'
        """)
        table_exists = cur.fetchone()[0]
        
        if table_exists:
            cur.execute("SELECT COUNT(*) FROM position_departments")
            row_count = cur.fetchone()[0]
            print(f"✓ Table 'position_departments' exists with {row_count} rows")
        else:
            print("⚠️  Table 'position_departments' not found after migration")
    
    conn.close()
    print("\n✅ Migration completed successfully!")
    
except psycopg2.Error as e:
    print(f"\n❌ Database error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Error: {e}")
    sys.exit(1)

