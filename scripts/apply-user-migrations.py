#!/usr/bin/env python3
"""
Apply user-related migrations:
1. Make last_name nullable
2. Make email optional
"""

import sys
import os
import subprocess
from pathlib import Path

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
    # Try to load .env files from project root and backend folder (in order of priority)
    project_root = Path(__file__).parent.parent
    backend_root = project_root / 'backend'
    
    # List of .env files to try (in order - later ones override earlier ones)
    env_files = [
        project_root / '.env.local',
        project_root / '.env.azure',
        project_root / '.env',
        backend_root / '.env.local',
        backend_root / '.env.azure',
        backend_root / '.env',
    ]
    
    loaded = False
    for env_path in env_files:
        if env_path.exists():
            load_dotenv(env_path, override=True)
            print(f"✅ Loaded environment from {env_path}")
            loaded = True
    
    if not loaded:
        print("⚠️  No .env file found. Using system environment variables.")
except ImportError:
    print("⚠️  python-dotenv not installed. Using system environment variables only.")
    print("   Install with: pip install python-dotenv")

# Add parent directory to path to import database service
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from backend.app.database_service import DatabaseService
except ImportError:
    print("❌ Could not import DatabaseService. Trying direct psycopg2...")
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def apply_migrations_direct():
    """Apply migrations using direct database connection"""
    # Try to get connection from Azure Key Vault first, then environment variables
    import os
    from urllib.parse import urlparse, quote_plus
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        # Try to get from Azure Key Vault first
        keyvault_name = "bds-qms-kv"
        print(f"🔐 Attempting to fetch database credentials from Azure Key Vault: {keyvault_name}")
        
        kv_host = get_azure_secret('db-host', keyvault_name)
        kv_name = get_azure_secret('db-name', keyvault_name)
        kv_user = get_azure_secret('db-user', keyvault_name)
        kv_password = get_azure_secret('db-password', keyvault_name)
        
        # Use Key Vault values if available, otherwise fall back to environment variables
        db_host = kv_host or os.getenv('DB_HOST') or os.getenv('POSTGRES_HOST') or os.getenv('POSTGRES_SERVER') or 'localhost'
        db_port = os.getenv('DB_PORT') or os.getenv('POSTGRES_PORT') or '5432'
        db_name = kv_name or os.getenv('DB_NAME') or os.getenv('POSTGRES_DB') or os.getenv('POSTGRES_DATABASE') or 'bds_management'
        db_user = kv_user or os.getenv('DB_USER') or os.getenv('POSTGRES_USER') or os.getenv('POSTGRES_ADMIN_USER') or 'postgres'
        db_password = kv_password or os.getenv('DB_PASSWORD') or os.getenv('POSTGRES_PASSWORD') or ''
        db_sslmode = os.getenv('DB_SSLMODE') or os.getenv('POSTGRES_SSLMODE') or 'prefer'
        
        if kv_password:
            print(f"✅ Retrieved password from Azure Key Vault")
        elif kv_host or kv_name or kv_user:
            print(f"⚠️  Some credentials from Key Vault, but password not found. Using environment variables.")
        else:
            print(f"📊 Using environment variables (Key Vault not available or no secrets found)")
        
        # URL encode both username and password to handle special characters (like @ in Azure usernames)
        encoded_user = quote_plus(db_user)
        encoded_password = quote_plus(db_password)
        database_url = f"postgresql://{encoded_user}:{encoded_password}@{db_host}:{db_port}/{db_name}?sslmode={db_sslmode}"
        
        print(f"📊 Database connection details:")
        print(f"   Host: {db_host}, Port: {db_port}, Database: {db_name}, User: {db_user}")
    
    try:
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        migrations = [
            ('database/migrations/make-last-name-nullable.sql', 'Make last_name nullable'),
            ('database/migrations/make-email-optional.sql', 'Make email optional'),
        ]
        
        base_path = Path(__file__).parent.parent
        
        for migration_file, description in migrations:
            file_path = base_path / migration_file
            if not file_path.exists():
                print(f"❌ Migration file not found: {migration_file}")
                continue
            
            print(f"\n📄 Applying: {description}")
            print(f"   File: {migration_file}")
            
            with open(file_path, 'r') as f:
                sql_content = f.read()
            
            try:
                cur.execute(sql_content)
                print(f"✅ Successfully applied: {description}")
            except Exception as e:
                # Check if it's a "already exists" type error
                error_msg = str(e).lower()
                if 'already exists' in error_msg or 'duplicate' in error_msg:
                    print(f"⚠️  Migration may have already been applied: {e}")
                else:
                    print(f"❌ Error applying migration: {e}")
                    raise
        
        cur.close()
        conn.close()
        print("\n🎉 All migrations applied successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        print("\n💡 Make sure you have DATABASE_URL or DB_* environment variables set")
        return False

def apply_migrations_via_service():
    """Apply migrations using DatabaseService"""
    try:
        db_service = DatabaseService()
        conn = db_service.get_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        migrations = [
            ('database/migrations/make-last-name-nullable.sql', 'Make last_name nullable'),
            ('database/migrations/make-email-optional.sql', 'Make email optional'),
        ]
        
        base_path = Path(__file__).parent.parent
        
        for migration_file, description in migrations:
            file_path = base_path / migration_file
            if not file_path.exists():
                print(f"❌ Migration file not found: {migration_file}")
                continue
            
            print(f"\n📄 Applying: {description}")
            print(f"   File: {migration_file}")
            
            with open(file_path, 'r') as f:
                sql_content = f.read()
            
            try:
                cur.execute(sql_content)
                print(f"✅ Successfully applied: {description}")
            except Exception as e:
                error_msg = str(e).lower()
                if 'already exists' in error_msg or 'duplicate' in error_msg:
                    print(f"⚠️  Migration may have already been applied: {e}")
                else:
                    print(f"❌ Error applying migration: {e}")
                    raise
        
        cur.close()
        conn.close()
        print("\n🎉 All migrations applied successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error using DatabaseService: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Applying user-related migrations")
    print("=" * 50)
    
    # Try DatabaseService first, then direct connection
    success = apply_migrations_via_service()
    if not success:
        print("\n⚠️  DatabaseService failed, trying direct connection...")
        success = apply_migrations_direct()
    
    if not success:
        print("\n❌ Could not apply migrations.")
        print("\n💡 Options:")
        print("   1. Set DATABASE_URL environment variable")
        print("   2. Set DB_HOST, DB_USER, DB_NAME, DB_PASSWORD environment variables")
        print("   3. Use the shell script: ./scripts/apply-user-migrations.sh")
        print("   4. Apply manually using psql:")
        print("      psql -d your_database -f database/migrations/make-last-name-nullable.sql")
        print("      psql -d your_database -f database/migrations/make-email-optional.sql")
        sys.exit(1)
    
    sys.exit(0)

