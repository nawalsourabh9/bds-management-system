-- Tasks Fixes Migration
-- Adds missing columns used by the application and a wrapper scheduler function

-- 1) Columns required by backend code
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments_required BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_frequency VARCHAR(20) DEFAULT 'none';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_parent_task BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS child_instance_number INTEGER DEFAULT 0;

-- 2) Indexes for parent-child and recurring lookups
CREATE INDEX IF NOT EXISTS idx_tasks_parent_child ON tasks(parent_task_id, is_parent_task);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_freq ON tasks(is_recurring, recurring_frequency);

-- 3) Wrapper function to avoid scheduler errors and to trigger recurring generation
--    Calls generate_recurring_tasks() if present; returns number of generated tasks or 0
CREATE OR REPLACE FUNCTION run_scheduled_tasks()
RETURNS INTEGER AS $$
DECLARE
    generated INTEGER := 0;
BEGIN
    -- Try calling generate_recurring_tasks() if it exists
    BEGIN
        PERFORM 1 FROM pg_proc WHERE proname = 'generate_recurring_tasks';
        IF FOUND THEN
            generated := COALESCE(generate_recurring_tasks(), 0);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- No-op fallback; ensure callers don't crash
        generated := 0;
    END;
    RETURN generated;
END;
$$ LANGUAGE plpgsql;


