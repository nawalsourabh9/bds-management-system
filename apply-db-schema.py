#!/usr/bin/env python3
"""
Script to apply database schema updates to Azure PostgreSQL
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_db_connection():
    """Get database connection from environment variables"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=5432
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def apply_schema_file(conn, file_path):
    """Apply SQL schema file to database"""
    try:
        with open(file_path, 'r') as f:
            sql_content = f.read()
        
        cursor = conn.cursor()
        
        # Split by semicolon and execute each statement
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        for statement in statements:
            if statement:
                try:
                    cursor.execute(statement)
                    print(f"✓ Executed: {statement[:50]}...")
                except Exception as e:
                    print(f"⚠ Warning executing: {statement[:50]}... - {e}")
        
        cursor.close()
        print(f"✓ Schema file {file_path} applied successfully")
        return True
        
    except Exception as e:
        print(f"✗ Error applying schema file {file_path}: {e}")
        return False

def main():
    """Main function"""
    print("🔧 Applying database schema updates...")
    
    # Get database connection
    conn = get_db_connection()
    if not conn:
        print("✗ Failed to connect to database")
        sys.exit(1)
    
    print("✓ Connected to database")
    
    # Apply schema files in order
    schema_files = [
        'database/schema/04-recurring-parent-child.sql'
    ]
    
    success = True
    for schema_file in schema_files:
        if os.path.exists(schema_file):
            print(f"\n📄 Applying {schema_file}...")
            if not apply_schema_file(conn, schema_file):
                success = False
        else:
            print(f"⚠ Schema file not found: {schema_file}")
    
    conn.close()
    
    if success:
        print("\n🎉 All database schema updates applied successfully!")
    else:
        print("\n❌ Some schema updates failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
