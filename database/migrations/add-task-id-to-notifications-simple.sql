-- Add task_id column to notifications table if it doesn't exist
-- This version works with statement splitting

-- Check and add column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE notifications ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes (these will be skipped if they already exist)
CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

