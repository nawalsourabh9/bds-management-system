-- Simple Recurring Tasks Implementation (Database-Only Solution)
-- Works with existing database schema

-- Add missing columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_frequency VARCHAR(20) DEFAULT 'none';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_parent_id UUID REFERENCES tasks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Create function to generate recurring tasks (simplified)
CREATE OR REPLACE FUNCTION generate_recurring_tasks()
RETURNS INTEGER AS $$
DECLARE
    task_record RECORD;
    new_task_id UUID;
    generated_count INTEGER := 0;
    next_due_date DATE;
BEGIN
    -- Find overdue recurring tasks that need to be regenerated
    FOR task_record IN 
        SELECT * FROM tasks 
        WHERE is_recurring = TRUE 
        AND status = 'completed'
        AND (
            -- Daily tasks completed more than 1 day ago
            (recurring_frequency = 'daily' AND completed_date < CURRENT_DATE)
            -- Weekly tasks completed more than 7 days ago
            OR (recurring_frequency = 'weekly' AND completed_date < CURRENT_DATE - INTERVAL '7 days')
            -- Monthly tasks completed more than 30 days ago
            OR (recurring_frequency = 'monthly' AND completed_date < CURRENT_DATE - INTERVAL '30 days')
            -- Default to daily if no frequency specified
            OR (recurring_frequency IS NULL AND completed_date < CURRENT_DATE)
        )
    LOOP
        -- Calculate next due date based on frequency
        CASE COALESCE(task_record.recurring_frequency, 'daily')
            WHEN 'daily' THEN
                next_due_date := CURRENT_DATE + INTERVAL '1 day';
            WHEN 'weekly' THEN
                next_due_date := CURRENT_DATE + INTERVAL '7 days';
            WHEN 'monthly' THEN
                next_due_date := CURRENT_DATE + INTERVAL '30 days';
            ELSE
                next_due_date := CURRENT_DATE + INTERVAL '1 day';
        END CASE;
        
        -- Create new recurring task
        INSERT INTO tasks (
            title, description, priority, department_id, assignee_id, 
            created_by, due_date, is_recurring, recurring_frequency,
            is_customer_related, customer_name, recurring_parent_id,
            status, created_at, updated_at
        ) VALUES (
            task_record.title,
            task_record.description,
            task_record.priority,
            task_record.department_id,
            task_record.assignee_id,
            task_record.created_by,
            next_due_date,
            TRUE,
            COALESCE(task_record.recurring_frequency, 'daily'),
            task_record.is_customer_related,
            task_record.customer_name,
            task_record.id,
            'not-started',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO new_task_id;
        
        -- Reset original task status to pending for next cycle
        UPDATE tasks 
        SET status = 'pending', 
            completed_date = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = task_record.id;
        
        generated_count := generated_count + 1;
        
        -- Log the generation
        INSERT INTO task_history (task_id, action, field_name, new_value, created_at)
        VALUES (new_task_id, 'recurring_generated', 'parent_task_id', task_record.id::text, CURRENT_TIMESTAMP);
    END LOOP;
    
    RETURN generated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to check for overdue tasks
CREATE OR REPLACE FUNCTION check_overdue_tasks()
RETURNS INTEGER AS $$
DECLARE
    overdue_count INTEGER := 0;
BEGIN
    -- Mark tasks as overdue if due date has passed and status is not completed
    UPDATE tasks 
    SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
    WHERE due_date < CURRENT_DATE 
    AND status NOT IN ('completed', 'cancelled', 'overdue');
    
    GET DIAGNOSTICS overdue_count = ROW_COUNT;
    
    RETURN overdue_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to send task reminders
CREATE OR REPLACE FUNCTION send_task_reminders()
RETURNS INTEGER AS $$
DECLARE
    reminder_count INTEGER := 0;
    task_record RECORD;
BEGIN
    -- Find tasks due in the next 24 hours that need reminders
    FOR task_record IN 
        SELECT t.*, u.email as assignee_email, u.first_name, u.last_name
        FROM tasks t
        JOIN users u ON t.assignee_id = u.id
        WHERE t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day'
        AND t.status NOT IN ('completed', 'cancelled')
        AND COALESCE(t.reminder_sent, FALSE) = FALSE
    LOOP
        -- Create notification for the user
        INSERT INTO notifications (user_id, title, message, type, created_at)
        VALUES (
            task_record.assignee_id,
            'Task Reminder: ' || task_record.title,
            'Task "' || task_record.title || '" is due on ' || task_record.due_date::text,
            'reminder',
            CURRENT_TIMESTAMP
        );
        
        -- Mark reminder as sent
        UPDATE tasks 
        SET reminder_sent = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE id = task_record.id;
        
        reminder_count := reminder_count + 1;
    END LOOP;
    
    RETURN reminder_count;
END;
$$ LANGUAGE plpgsql;

-- Create a simple cron-like function that can be called externally
CREATE OR REPLACE FUNCTION run_scheduled_tasks()
RETURNS JSON AS $$
DECLARE
    recurring_count INTEGER;
    overdue_count INTEGER;
    reminder_count INTEGER;
    result JSON;
BEGIN
    -- Generate recurring tasks
    SELECT generate_recurring_tasks() INTO recurring_count;
    
    -- Check for overdue tasks
    SELECT check_overdue_tasks() INTO overdue_count;
    
    -- Send reminders
    SELECT send_task_reminders() INTO reminder_count;
    
    -- Return results
    result := json_build_object(
        'recurring_generated', recurring_count,
        'overdue_marked', overdue_count,
        'reminders_sent', reminder_count,
        'timestamp', CURRENT_TIMESTAMP
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks(is_recurring, status, completed_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_reminder ON tasks(due_date, status, reminder_sent);
