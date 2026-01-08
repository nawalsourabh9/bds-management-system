#!/usr/bin/env python3
"""
Fix generate_next_child_task function to generate UUID for id column
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import subprocess
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

def apply_fix(conn):
    """Apply the generate_next_child_task function fix"""
    # Read the fixed function from the schema file
    schema_file = "database/schema/04-recurring-parent-child.sql"
    if not os.path.exists(schema_file):
        logger.error(f"Schema file not found: {schema_file}")
        return False
    
    try:
        with open(schema_file, 'r') as f:
            content = f.read()
        
        # Extract the generate_next_child_task function
        start_marker = "CREATE OR REPLACE FUNCTION generate_next_child_task("
        end_marker = "$$ LANGUAGE plpgsql;"
        
        start_idx = content.find(start_marker)
        if start_idx == -1:
            logger.error("Could not find generate_next_child_task function in schema file")
            return False
        
        # Find the end of the function
        end_idx = content.find(end_marker, start_idx)
        if end_idx == -1:
            logger.error("Could not find end of generate_next_child_task function")
            return False
        
        function_sql = content[start_idx:end_idx + len(end_marker)]
        
        cursor = conn.cursor()
        cursor.execute(function_sql)
        cursor.close()
        logger.info("✓ generate_next_child_task function fixed successfully")
        return True
    except Exception as e:
        logger.error(f"✗ Error applying fix: {e}")
        return False

def main():
    """Main function"""
    logger.info("🚀 Fixing generate_next_child_task function...")
    
    # Get database configuration
    config = get_database_config()
    if not config:
        logger.error("❌ Failed to get database configuration")
        sys.exit(1)
    
    # Connect to database
    conn = get_db_connection(config)
    if not conn:
        logger.error("❌ Failed to connect to database")
        sys.exit(1)
    
    try:
        # Apply the fix
        success = apply_fix(conn)
        
        if success:
            logger.info("🎉 Function fixed successfully!")
        else:
            logger.error("❌ Failed to fix function")
            sys.exit(1)
            
    finally:
        conn.close()

if __name__ == "__main__":
    main()

