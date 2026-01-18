#!/usr/bin/env python3
"""
Apply task delegations migration
"""
import sys
import os
from pathlib import Path

# Try to use backend's virtual environment
backend_path = Path(__file__).parent.parent / "backend"
venv_python = backend_path / "venv" / "bin" / "python3"

if venv_python.exists():
    # If running from venv, we need to add backend to path
    sys.path.insert(0, str(backend_path))
else:
    # Add backend to path for direct execution
    sys.path.insert(0, str(backend_path))

try:
    from app.database_service import DatabaseService
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    # Fallback: use direct psycopg2 connection
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    from urllib.parse import urlparse, quote_plus
    DatabaseService = None

def apply_migration():
    """Apply the task delegations migration"""
    try:
        if DatabaseService:
            db_service = DatabaseService()
            conn = db_service.get_connection()
        else:
            # Direct connection using environment variables
            import os
            db_host = os.getenv('DB_HOST', os.getenv('POSTGRES_HOST', 'localhost'))
            db_port = os.getenv('DB_PORT', os.getenv('POSTGRES_PORT', '5432'))
            db_name = os.getenv('DB_NAME', os.getenv('POSTGRES_DB', 'bds_eqms'))
            db_user = os.getenv('DB_USER', os.getenv('POSTGRES_USER', 'postgres'))
            db_password = os.getenv('DB_PASSWORD', os.getenv('POSTGRES_PASSWORD', ''))
            db_sslmode = os.getenv('DB_SSLMODE', os.getenv('POSTGRES_SSLMODE', 'require'))
            
            encoded_user = quote_plus(db_user)
            encoded_password = quote_plus(db_password)
            database_url = f"postgresql://{encoded_user}:{encoded_password}@{db_host}:{db_port}/{db_name}?sslmode={db_sslmode}"
            
            print(f"📊 Connecting to database: {db_host}:{db_port}/{db_name}")
            conn = psycopg2.connect(database_url)
        
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        migration_file = 'database/migrations/add-task-delegations.sql'
        base_path = Path(__file__).parent.parent
        file_path = base_path / migration_file
        
        if not file_path.exists():
            print(f"❌ Migration file not found: {migration_file}")
            return False
        
        print(f"\n📄 Applying: Task Delegations Migration")
        print(f"   File: {migration_file}")
        
        with open(file_path, 'r') as f:
            sql_content = f.read()
        
        try:
            cur.execute(sql_content)
            print(f"✅ Successfully applied: Task Delegations Migration")
        except Exception as e:
            error_msg = str(e).lower()
            if 'already exists' in error_msg or 'duplicate' in error_msg:
                print(f"⚠️  Migration may have already been applied: {e}")
            else:
                print(f"❌ Error applying migration: {e}")
                raise
        
        cur.close()
        conn.close()
        print("\n🎉 Migration applied successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error applying migration: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Applying Task Delegations Migration")
    print("=" * 50)
    
    success = apply_migration()
    
    if not success:
        print("\n❌ Could not apply migration.")
        print("\n💡 Alternative: Apply manually using psql:")
        print("   psql -d your_database -f database/migrations/add-task-delegations.sql")
        sys.exit(1)
    
    sys.exit(0)
