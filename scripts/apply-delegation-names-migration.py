#!/usr/bin/env python3
"""
Apply migration to add name columns to task_delegations table
"""
import sys
import os
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import quote_plus

# Add backend to path for imports
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Try to import settings, fallback to environment variables
try:
    from app.core.config import settings
    DB_HOST = settings.DB_HOST
    DB_PORT = settings.DB_PORT
    DB_NAME = settings.DB_NAME
    DB_USER = settings.DB_USER
    DB_PASSWORD = settings.DB_PASSWORD
except ImportError:
    # Fallback to environment variables
    DB_HOST = os.getenv('DB_HOST', os.getenv('POSTGRES_HOST', 'localhost'))
    DB_PORT = int(os.getenv('DB_PORT', os.getenv('POSTGRES_PORT', '5432')))
    DB_NAME = os.getenv('DB_NAME', os.getenv('POSTGRES_DB', 'bds_management'))
    DB_USER = os.getenv('DB_USER', os.getenv('POSTGRES_USER', 'bds_user'))
    DB_PASSWORD = os.getenv('DB_PASSWORD', os.getenv('POSTGRES_PASSWORD', 'bds_password'))

def apply_migration():
    """Apply the delegation names migration"""
    conn = None
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        
        # Read migration file
        migration_file = os.path.join(
            os.path.dirname(__file__),
            '..',
            'database',
            'migrations',
            'add-delegation-names.sql'
        )
        
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        with conn.cursor() as cur:
            print("Applying migration: add-delegation-names.sql")
            cur.execute(migration_sql)
            conn.commit()
            print("✅ Migration applied successfully!")
            
    except Exception as e:
        print(f"❌ Error applying migration: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    apply_migration()
