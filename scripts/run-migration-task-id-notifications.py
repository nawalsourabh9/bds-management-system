#!/usr/bin/env python3
"""
Run migration to add task_id column to notifications table
"""
import sys
import os

# Add project root to path
project_root = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'backend'))

from app.database_service import db_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    """Run the migration to add task_id column to notifications table"""
    migration_sql = """
    -- Add task_id column to notifications table if it doesn't exist
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'task_id'
        ) THEN
            ALTER TABLE notifications ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
            CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON notifications(task_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
            RAISE NOTICE 'Added task_id column and indexes to notifications table';
        ELSE
            RAISE NOTICE 'task_id column already exists in notifications table';
        END IF;
    END $$;
    """
    
    try:
        logger.info("🚀 Starting migration: Add task_id column to notifications table")
        
        # Execute the migration
        result = db_service.execute_query(migration_sql)
        
        logger.info("✅ Migration completed successfully!")
        logger.info(f"Result: {result}")
        
        # Verify the column was added
        check_sql = """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'task_id';
        """
        check_result = db_service.execute_query(check_sql)
        
        if check_result:
            logger.info("✅ Verified: task_id column exists in notifications table")
        else:
            logger.warning("⚠️  Warning: Could not verify task_id column (might already exist)")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}", exc_info=True)
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

