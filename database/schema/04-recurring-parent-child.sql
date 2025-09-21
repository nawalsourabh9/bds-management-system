-- ========================================
-- RECURRING PARENT-CHILD TASK SYSTEM
-- ========================================
-- This system creates parent recurring tasks and generates child instances
-- Parent task has start/end dates, child tasks have due dates and assignees

-- 1. Add parent-child relationship fields to existing tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_parent_task BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS child_instance_number INTEGER DEFAULT 0;

-- 2. Smart due date calculation function (matching frontend options)
CREATE OR REPLACE FUNCTION calculate_next_due_date_recurring(
    base_date DATE,
    frequency VARCHAR(20),
    skip_weekends_flag BOOLEAN DEFAULT FALSE
) RETURNS DATE AS $$
DECLARE
    next_date DATE;
BEGIN
    -- Use existing frequency logic (matching frontend options)
    CASE frequency
        WHEN 'daily' THEN next_date := base_date + INTERVAL '1 day';
        WHEN 'weekly' THEN next_date := base_date + INTERVAL '7 days';
        WHEN 'bi-weekly' THEN next_date := base_date + INTERVAL '14 days';
        WHEN 'monthly' THEN next_date := base_date + INTERVAL '30 days';
        WHEN 'quarterly' THEN next_date := base_date + INTERVAL '90 days';
        WHEN 'annually' THEN next_date := base_date + INTERVAL '365 days';
        ELSE next_date := base_date + INTERVAL '1 day';
    END CASE;
    
    -- Simple weekend skipping
    IF skip_weekends_flag THEN
        -- Skip to next Monday if it's weekend
        IF EXTRACT(DOW FROM next_date) = 0 THEN -- Sunday
            next_date := next_date + INTERVAL '1 day';
        ELSIF EXTRACT(DOW FROM next_date) = 6 THEN -- Saturday
            next_date := next_date + INTERVAL '2 days';
        END IF;
    END IF;
    
    RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to generate first child task from parent
CREATE OR REPLACE FUNCTION create_first_child_task(
    parent_task_id_param UUID,
    child_due_date DATE,
    child_assignee_id UUID,
    child_priority VARCHAR(20) DEFAULT 'medium'
) RETURNS UUID AS $$
DECLARE
    parent_record RECORD;
    new_child_id UUID;
BEGIN
    -- Get parent task details
    SELECT * INTO parent_record
    FROM tasks 
    WHERE id = parent_task_id_param AND is_parent_task = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent task not found: %', parent_task_id_param;
    END IF;
    
    -- Create first child task with dynamic parent title + timestamp
    INSERT INTO tasks (
        title,
        description,
        priority,
        department_id,
        assignee_id,
        created_by,
        due_date,
        start_date,
        parent_task_id,
        is_parent_task,
        child_instance_number,
        is_recurring,
        recurring_frequency,
        is_customer_related,
        customer_name,
        attachments_required,
        status,
        created_at,
        updated_at
    ) VALUES (
        (SELECT title FROM tasks WHERE id = parent_task_id_param) || ' (' || TO_CHAR(child_due_date, 'DD Mon YYYY') || ')',
        parent_record.description,
        child_priority,
        parent_record.department_id,
        child_assignee_id,
        parent_record.created_by,
        child_due_date,
        CURRENT_DATE,
        parent_task_id_param,
        FALSE,
        1,
        FALSE, -- Child tasks are not recurring themselves
        parent_record.recurring_frequency,
        parent_record.is_customer_related,
        parent_record.customer_name,
        parent_record.attachments_required,
        'not-started',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO new_child_id;
    
    -- Send notifications to creator and assignee
    -- Notification to parent creator
    INSERT INTO notifications (user_id, title, message, type, created_at)
    VALUES (
        parent_record.created_by,
        'First Child Task Created',
        'First instance of recurring task "' || parent_record.title || '" has been created.',
        'info',
        CURRENT_TIMESTAMP
    );
    
    -- Notification to child assignee (if different from creator)
    IF child_assignee_id IS NOT NULL AND child_assignee_id != parent_record.created_by THEN
        INSERT INTO notifications (user_id, title, message, type, created_at)
        VALUES (
            child_assignee_id,
            'New Recurring Task Assigned',
            'You have been assigned to the first instance of recurring task "' || parent_record.title || '".',
            'info',
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RETURN new_child_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to generate next child task when current one is completed
CREATE OR REPLACE FUNCTION generate_next_child_task(
    completed_child_task_id UUID
) RETURNS UUID AS $$
DECLARE
    child_record RECORD;
    parent_record RECORD;
    next_due_date DATE;
    new_child_id UUID;
    next_instance_number INTEGER;
BEGIN
    -- Get completed child task and its parent
    SELECT c.*, p.* INTO child_record, parent_record
    FROM tasks c
    JOIN tasks p ON c.parent_task_id = p.id
    WHERE c.id = completed_child_task_id 
    AND c.is_parent_task = FALSE
    AND p.is_parent_task = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Child task or parent task not found';
    END IF;
    
    -- Check if parent task has end date and if we should continue
    IF parent_record.end_date IS NOT NULL AND CURRENT_DATE > parent_record.end_date THEN
        RAISE EXCEPTION 'Parent task has ended, no more instances will be generated';
    END IF;
    
    -- Calculate next instance number
    SELECT COALESCE(MAX(child_instance_number), 0) + 1 INTO next_instance_number
    FROM tasks 
    WHERE parent_task_id = parent_record.id;
    
    -- Calculate next due date based on frequency
    next_due_date := calculate_next_due_date_recurring(
        child_record.due_date,
        parent_record.recurring_frequency,
        FALSE -- You can add skip_weekends to parent task if needed
    );
    
    -- Check if next due date is beyond parent end date
    IF parent_record.end_date IS NOT NULL AND next_due_date > parent_record.end_date THEN
        RAISE EXCEPTION 'Next due date is beyond parent task end date';
    END IF;
    
    -- Create next child task with dynamic parent title + timestamp
    INSERT INTO tasks (
        title,
        description,
        priority,
        department_id,
        assignee_id,
        created_by,
        due_date,
        start_date,
        parent_task_id,
        is_parent_task,
        child_instance_number,
        is_recurring,
        recurring_frequency,
        is_customer_related,
        customer_name,
        attachments_required,
        status,
        created_at,
        updated_at
    ) VALUES (
        (SELECT title FROM tasks WHERE id = parent_record.id) || ' (' || TO_CHAR(next_due_date, 'DD Mon YYYY') || ')',
        parent_record.description,
        child_record.priority, -- Use same priority as previous child
        parent_record.department_id,
        child_record.assignee_id, -- Use same assignee as previous child
        parent_record.created_by,
        next_due_date,
        CURRENT_DATE,
        parent_record.id,
        FALSE,
        next_instance_number,
        FALSE,
        parent_record.recurring_frequency,
        parent_record.is_customer_related,
        parent_record.customer_name,
        parent_record.attachments_required,
        'not-started',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO new_child_id;
    
    -- Send notifications to creator and assignee
    -- Notification to parent creator
    INSERT INTO notifications (user_id, title, message, type, created_at)
    VALUES (
        parent_record.created_by,
        'Next Recurring Task Generated',
        'Instance ' || next_instance_number || ' of recurring task "' || parent_record.title || '" has been generated.',
        'info',
        CURRENT_TIMESTAMP
    );
    
    -- Notification to assignee (if different from creator)
    IF child_record.assignee_id IS NOT NULL AND child_record.assignee_id != parent_record.created_by THEN
        INSERT INTO notifications (user_id, title, message, type, created_at)
        VALUES (
            child_record.assignee_id,
            'New Recurring Task Instance',
            'You have been assigned to instance ' || next_instance_number || ' of recurring task "' || parent_record.title || '".',
            'info',
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RETURN new_child_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to update child task titles when parent title changes
CREATE OR REPLACE FUNCTION update_child_task_titles()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if parent task title changed
    IF OLD.title != NEW.title AND NEW.is_parent_task = TRUE THEN
        -- Update all child task titles to sync with new parent title
        UPDATE tasks 
        SET title = NEW.title || ' - Instance ' || child_instance_number || ' (' || TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') || ')',
            updated_at = CURRENT_TIMESTAMP
        WHERE parent_task_id = NEW.id 
        AND is_parent_task = FALSE;
        
        -- Log the title update
        INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
        VALUES (NEW.id, NEW.updated_at, 'parent_title_updated', 'title', OLD.title, NEW.title);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Enhanced task history trigger with notifications
CREATE OR REPLACE FUNCTION log_task_changes_with_notifications()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
            VALUES (NEW.id, NEW.updated_at, 'status_changed', 'status', OLD.status, NEW.status);
            
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
            INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
            VALUES (NEW.id, NEW.updated_at, 'priority_changed', 'priority', OLD.priority, NEW.priority);
        END IF;
        
        -- Log assignment changes
        IF OLD.assignee_id != NEW.assignee_id THEN
            INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
            VALUES (NEW.id, NEW.updated_at, 'assignee_changed', 'assignee_id', OLD.assignee_id::text, NEW.assignee_id::text);
            
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

-- 6. Update the task history trigger to use enhanced function
DROP TRIGGER IF EXISTS task_history_trigger ON tasks;
DROP TRIGGER IF EXISTS task_title_sync_trigger ON tasks;

CREATE TRIGGER task_history_trigger
    AFTER UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION log_task_changes_with_notifications();

CREATE TRIGGER task_title_sync_trigger
    AFTER UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_child_task_titles();

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_child ON tasks(parent_task_id, is_parent_task);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_parents ON tasks(is_parent_task, status, end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_child_instances ON tasks(parent_task_id, child_instance_number);

-- 8. Insert sample parent recurring tasks (using generic names as placeholders)
INSERT INTO tasks (
    title, description, priority, department_id, created_by, 
    start_date, end_date, is_parent_task, is_recurring, recurring_frequency,
    is_customer_related, attachments_required, status
) VALUES
(
    'Daily Equipment Check',
    'Perform routine inspection of manufacturing equipment',
    'medium',
    (SELECT id FROM departments WHERE name = 'Quality Assurance' LIMIT 1),
    '550e8400-e29b-41d4-a716-446655440100',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days', -- 30 days from now
    TRUE,
    TRUE,
    'daily',
    FALSE,
    'none',
    'active'
),
(
    'Weekly Team Meeting',
    'Conduct weekly team standup meeting',
    'low',
    (SELECT id FROM departments WHERE name = 'Quality Assurance' LIMIT 1),
    '550e8400-e29b-41d4-a716-446655440100',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days', -- 3 months from now
    TRUE,
    TRUE,
    'weekly',
    FALSE,
    'none',
    'active'
),
(
    'Monthly Safety Audit',
    'Complete monthly safety compliance audit',
    'high',
    (SELECT id FROM departments WHERE name = 'Quality Assurance' LIMIT 1),
    '550e8400-e29b-41d4-a716-446655440100',
    CURRENT_DATE,
    NULL, -- No end date - continues indefinitely
    TRUE,
    TRUE,
    'monthly',
    FALSE,
    'required',
    'active'
)
ON CONFLICT DO NOTHING;

-- 9. Update main scheduler to handle recurring parent tasks
CREATE OR REPLACE FUNCTION run_scheduled_tasks()
RETURNS JSON AS $$
DECLARE
    result JSON;
    generated_count INTEGER := 0;
    notification_count INTEGER := 0;
BEGIN
    -- This function now focuses on other scheduled tasks
    -- Child task generation is handled by the trigger when tasks are completed
    
    result := json_build_object(
        'status', 'success',
        'timestamp', CURRENT_TIMESTAMP,
        'generated_count', generated_count,
        'notification_count', notification_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
