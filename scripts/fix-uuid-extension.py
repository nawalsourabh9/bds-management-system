#!/usr/bin/env python3
"""
Enable uuid-ossp extension and fix trigger to use gen_random_uuid() as fallback
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

def enable_uuid_extension(conn):
    """Enable uuid-ossp extension"""
    try:
        cursor = conn.cursor()
        # Try to enable uuid-ossp extension
        cursor.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
        cursor.close()
        logger.info("✓ Enabled uuid-ossp extension")
        return True
    except Exception as e:
        logger.warning(f"⚠ Could not enable uuid-ossp extension: {e}")
        logger.info("Will use gen_random_uuid() instead")
        return False

def apply_fix(conn, use_gen_random_uuid=False):
    """Apply the trigger function fix"""
    uuid_func = "gen_random_uuid()" if use_gen_random_uuid else "uuid_generate_v4()"
    
    fix_sql = f"""
CREATE OR REPLACE FUNCTION log_task_changes_with_notifications()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO task_history (id, task_id, user_id, action, field_name, old_value, new_value)
            VALUES ({uuid_func}, NEW.id, COALESCE(NEW.created_by, NEW.assignee_id), 'status_changed', 'status', OLD.status, NEW.status);
            
            -- Send notifications for status changes
            -- Notification to assignee
            IF NEW.assignee_id IS NOT NULL THEN
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (
                    NEW.assignee_id,
                    'Task Status Updated',
                    'Task "' || NEW.title || '" status changed from ' || OLD.status || ' to ' || NEW.status || '.',
                    'info',
                    CURRENT_TIMESTAMP
                );
            END IF;
            
            -- Notification to creator (if different from assignee)
            IF NEW.created_by IS NOT NULL AND NEW.created_by != NEW.assignee_id THEN
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (
                    NEW.created_by,
                    'Task Status Updated',
                    'Task "' || NEW.title || '" status changed from ' || OLD.status || ' to ' || NEW.status || '.',
                    'info',
                    CURRENT_TIMESTAMP
                );
            END IF;
            
            -- If child task is completed, generate next instance
            IF NEW.status = 'completed' AND NEW.is_parent_task = FALSE AND NEW.parent_task_id IS NOT NULL THEN
                PERFORM generate_next_child_task(NEW.id);
            END IF;
        END IF;
        
        -- Log priority changes
        IF OLD.priority != NEW.priority THEN
            INSERT INTO task_history (id, task_id, user_id, action, field_name, old_value, new_value)
            VALUES ({uuid_func}, NEW.id, COALESCE(NEW.created_by, NEW.assignee_id), 'priority_changed', 'priority', OLD.priority, NEW.priority);
        END IF;
        
        -- Log assignment changes
        IF OLD.assignee_id != NEW.assignee_id THEN
            INSERT INTO task_history (id, task_id, user_id, action, field_name, old_value, new_value)
            VALUES ({uuid_func}, NEW.id, COALESCE(NEW.created_by, NEW.assignee_id), 'assignee_changed', 'assignee_id', OLD.assignee_id::text, NEW.assignee_id::text);
            
            -- Notification to new assignee
            IF NEW.assignee_id IS NOT NULL THEN
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (
                    NEW.assignee_id,
                    'Task Assigned to You',
                    'Task "' || NEW.title || '" has been assigned to you.',
                    'info',
                    CURRENT_TIMESTAMP
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';
"""
    
    try:
        cursor = conn.cursor()
        cursor.execute(fix_sql)
        cursor.close()
        logger.info(f"✓ Trigger function fixed successfully (using {uuid_func})")
        return True
    except Exception as e:
        logger.error(f"✗ Error applying fix: {e}")
        return False

def main():
    """Main function"""
    logger.info("🚀 Fixing UUID generation in task_history trigger function...")
    
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
        # Try to enable uuid-ossp extension
        uuid_extension_enabled = enable_uuid_extension(conn)
        
        # Apply the fix (use gen_random_uuid if extension not available)
        success = apply_fix(conn, use_gen_random_uuid=not uuid_extension_enabled)
        
        if success:
            logger.info("🎉 Trigger function fixed successfully!")
        else:
            logger.error("❌ Failed to fix trigger function")
            sys.exit(1)
            
    finally:
        conn.close()

if __name__ == "__main__":
    main()

