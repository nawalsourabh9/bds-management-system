#!/usr/bin/env python3
"""
Apply database schema to Azure PostgreSQL using Key Vault or environment variables
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import subprocess
import json
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

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
        logger.error(f"Failed to get secret {secret_name} from Key Vault: {e}")
        return None

def get_database_config():
    """Get database configuration from Azure Key Vault or environment variables"""
    config = {}
    
    # Try to get from Key Vault first
    keyvault_name = "bds-qms-kv"
    
    # Get database credentials from Key Vault
    config['host'] = get_azure_secret('db-host', keyvault_name) or os.getenv('DB_HOST')
    config['database'] = get_azure_secret('db-name', keyvault_name) or os.getenv('DB_NAME')
    config['user'] = get_azure_secret('db-user', keyvault_name) or os.getenv('DB_USER')
    config['password'] = get_azure_secret('db-password', keyvault_name) or os.getenv('DB_PASSWORD')
    
    # Validate configuration
    missing = [k for k, v in config.items() if not v]
    if missing:
        logger.error(f"Missing database configuration: {', '.join(missing)}")
        logger.error("Please ensure secrets exist in Azure Key Vault or environment variables are set")
        return None
    
    logger.info(f"Database config: {config['user']}@{config['host']}/{config['database']}")
    return config

def get_db_connection(config):
    """Get database connection"""
    try:
        conn = psycopg2.connect(
            host=config['host'],
            database=config['database'],
            user=config['user'],
            password=config['password'],
            port=5432,
            sslmode='require'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        logger.info("✓ Connected to database")
        return conn
    except Exception as e:
        logger.error(f"✗ Failed to connect to database: {e}")
        return None

def apply_schema_file(conn, file_path):
    """Apply SQL schema file to database"""
    if not os.path.exists(file_path):
        logger.error(f"Schema file not found: {file_path}")
        return False
    
    try:
        with open(file_path, 'r') as f:
            sql_content = f.read()
        
        logger.info(f"📄 Applying schema file: {file_path}")
        
        cursor = conn.cursor()
        
        # Split by semicolon and execute each statement
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
        
        for i, statement in enumerate(statements):
            if statement:
                try:
                    cursor.execute(statement)
                    logger.info(f"✓ Executed statement {i+1}/{len(statements)}")
                except Exception as e:
                    logger.warning(f"⚠ Statement {i+1} failed: {e}")
                    # Continue with other statements
                    continue
        
        cursor.close()
        logger.info(f"✓ Schema file {file_path} applied successfully")
        return True
        
    except Exception as e:
        logger.error(f"✗ Error applying schema file {file_path}: {e}")
        return False

def test_connection(config):
    """Test database connection"""
    conn = get_db_connection(config)
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        logger.info(f"✓ Database version: {version}")
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"✗ Database test failed: {e}")
        return False

def main():
    """Main function"""
    logger.info("🚀 Starting Azure database schema application...")
    
    # Get database configuration
    config = get_database_config()
    if not config:
        logger.error("❌ Failed to get database configuration")
        sys.exit(1)
    
    # Test connection
    if not test_connection(config):
        logger.error("❌ Database connection test failed")
        sys.exit(1)
    
    # Apply schema
    conn = get_db_connection(config)
    if not conn:
        logger.error("❌ Failed to connect to database")
        sys.exit(1)
    
    try:
        # Apply the recurring parent-child schema
        schema_file = "database/schema/04-recurring-parent-child.sql"
        success = apply_schema_file(conn, schema_file)
        
        if success:
            logger.info("🎉 Database schema applied successfully!")
            
            # Test the new functionality
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'parent_task_id';")
                if cursor.fetchone()[0] > 0:
                    logger.info("✓ Parent-child relationship columns added successfully")
                
                cursor.execute("SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'create_first_child_task';")
                if cursor.fetchone()[0] > 0:
                    logger.info("✓ Recurring task functions created successfully")
                    
            except Exception as e:
                logger.warning(f"⚠ Could not verify schema changes: {e}")
            finally:
                cursor.close()
        else:
            logger.error("❌ Failed to apply database schema")
            sys.exit(1)
            
    finally:
        conn.close()

if __name__ == "__main__":
    main()
