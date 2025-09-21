-- Simple Task Templates - Using ONLY existing terms
-- Minimal changes to current system

-- 1. Create simple task_templates table (using existing enums/fields only)
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium', -- Use existing: low, medium, high, urgent, critical, emergency
    department_id UUID REFERENCES departments(id),
    assignee_id UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id) NOT NULL,
    
    -- Use existing recurring_frequency field (matching frontend options)
    recurring_frequency VARCHAR(20) DEFAULT 'daily', -- Use existing: daily, weekly, bi-weekly, monthly, quarterly, annually
    
    -- Simple weekend skipping (just one new field)
    skip_weekends BOOLEAN DEFAULT FALSE,
    
    -- Use existing task fields only
    is_customer_related BOOLEAN DEFAULT FALSE,
    customer_name VARCHAR(255),
    attachments_required VARCHAR(20) DEFAULT 'none',
    
    -- Template status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add template reference to existing tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES task_templates(id);

-- 3. Simple weekend skipping function (using existing logic + weekends)
CREATE OR REPLACE FUNCTION calculate_next_due_date_simple(
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

-- 4. Simple recurring task generation (using existing function + templates)
CREATE OR REPLACE FUNCTION generate_recurring_tasks_with_templates()
RETURNS INTEGER AS $$
DECLARE
    task_record RECORD;
    new_task_id UUID;
    generated_count INTEGER := 0;
    next_due_date DATE;
BEGIN
    -- Find completed tasks that have templates and need next instances
    FOR task_record IN 
        SELECT t.*, tt.title as template_title, tt.description as template_description,
               tt.priority as template_priority, tt.department_id as template_department_id,
               tt.assignee_id as template_assignee_id, tt.skip_weekends
        FROM tasks t
        JOIN task_templates tt ON t.template_id = tt.id
        WHERE t.is_recurring = TRUE 
        AND t.status = 'completed'
        AND tt.is_active = TRUE
        AND (
            -- Use existing logic for timing (matching frontend options)
            (t.recurring_frequency = 'daily' AND t.completed_date::date <= CURRENT_DATE)
            OR (t.recurring_frequency = 'weekly' AND t.completed_date::date <= CURRENT_DATE - INTERVAL '7 days')
            OR (t.recurring_frequency = 'bi-weekly' AND t.completed_date::date <= CURRENT_DATE - INTERVAL '14 days')
            OR (t.recurring_frequency = 'monthly' AND t.completed_date::date <= CURRENT_DATE - INTERVAL '30 days')
            OR (t.recurring_frequency = 'quarterly' AND t.completed_date::date <= CURRENT_DATE - INTERVAL '90 days')
            OR (t.recurring_frequency = 'annually' AND t.completed_date::date <= CURRENT_DATE - INTERVAL '365 days')
        )
        AND NOT EXISTS (
            -- Don't generate if next instance already exists
            SELECT 1 FROM tasks t2 
            WHERE t2.template_id = t.template_id 
            AND t2.status NOT IN ('completed', 'cancelled')
            AND t2.created_at > t.completed_date
        )
    LOOP
        -- Calculate next due date with weekend skipping
        next_due_date := calculate_next_due_date_simple(
            task_record.completed_date::date,
            task_record.recurring_frequency,
            task_record.skip_weekends
        );
        
        -- Create new task instance (using existing task structure)
        INSERT INTO tasks (
            title, description, priority, department_id, assignee_id, 
            created_by, due_date, is_recurring, recurring_frequency,
            is_customer_related, customer_name, template_id,
            status, created_at, updated_at
        ) VALUES (
            COALESCE(task_record.template_title, task_record.title),
            COALESCE(task_record.template_description, task_record.description),
            COALESCE(task_record.template_priority, task_record.priority),
            COALESCE(task_record.template_department_id, task_record.department_id),
            COALESCE(task_record.template_assignee_id, task_record.assignee_id),
            task_record.created_by,
            next_due_date,
            TRUE,
            task_record.recurring_frequency,
            task_record.is_customer_related,
            task_record.customer_name,
            task_record.template_id,
            'not-started',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO new_task_id;
        
        generated_count := generated_count + 1;
        
        -- Log the generation (using existing task_history)
        INSERT INTO task_history (task_id, action, field_name, new_value, created_at)
        VALUES (new_task_id, 'recurring_generated', 'template_id', task_record.template_id::text, CURRENT_TIMESTAMP);
        
        -- Send notifications to creator and assignee
        -- Notification to task creator
        INSERT INTO notifications (user_id, title, message, type, created_at)
        VALUES (
            task_record.created_by,
            'New Recurring Task Generated',
            'Task "' || COALESCE(task_record.template_title, task_record.title) || '" has been automatically generated from template.',
            'info',
            CURRENT_TIMESTAMP
        );
        
        -- Notification to assignee (if different from creator)
        IF task_record.assignee_id IS NOT NULL AND task_record.assignee_id != task_record.created_by THEN
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (
                COALESCE(task_record.template_assignee_id, task_record.assignee_id),
                'New Task Assigned',
                'You have been assigned to task "' || COALESCE(task_record.template_title, task_record.title) || '".',
                'info',
                CURRENT_TIMESTAMP
            );
        END IF;
    END LOOP;
    
    RETURN generated_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to create task from template (simple version)
CREATE OR REPLACE FUNCTION create_task_from_template_simple(
    template_uuid UUID,
    custom_title VARCHAR(255) DEFAULT NULL,
    custom_due_date DATE DEFAULT NULL,
    custom_assignee_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    template_record RECORD;
    new_task_id UUID;
    due_date DATE;
BEGIN
    -- Get template details
    SELECT * INTO template_record FROM task_templates WHERE id = template_uuid AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found or inactive';
    END IF;
    
    -- Use custom due date or calculate from template
    IF custom_due_date IS NOT NULL THEN
        due_date := custom_due_date;
    ELSE
        due_date := calculate_next_due_date_simple(
            CURRENT_DATE,
            template_record.recurring_frequency,
            template_record.skip_weekends
        );
    END IF;
    
    -- Create task (using existing task structure)
    INSERT INTO tasks (
        title, description, priority, department_id, assignee_id, 
        created_by, due_date, is_recurring, recurring_frequency,
        is_customer_related, customer_name, template_id,
        status, created_at, updated_at
    ) VALUES (
        COALESCE(custom_title, template_record.title),
        template_record.description,
        template_record.priority,
        template_record.department_id,
        COALESCE(custom_assignee_id, template_record.assignee_id),
        template_record.created_by,
        due_date,
        TRUE,
        template_record.recurring_frequency,
        template_record.is_customer_related,
        template_record.customer_name,
        template_record.id,
        'not-started',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO new_task_id;
    
    -- Send notifications to creator and assignee
    -- Notification to template creator
    INSERT INTO notifications (user_id, title, message, type, created_at)
    VALUES (
        template_record.created_by,
        'Task Created from Template',
        'Task "' || COALESCE(custom_title, template_record.title) || '" has been created from your template.',
        'info',
        CURRENT_TIMESTAMP
    );
    
    -- Notification to assignee (if different from creator)
    IF COALESCE(custom_assignee_id, template_record.assignee_id) IS NOT NULL 
       AND COALESCE(custom_assignee_id, template_record.assignee_id) != template_record.created_by THEN
        INSERT INTO notifications (user_id, title, message, type, created_at)
        VALUES (
            COALESCE(custom_assignee_id, template_record.assignee_id),
            'New Task Assigned',
            'You have been assigned to task "' || COALESCE(custom_title, template_record.title) || '".',
            'info',
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RETURN new_task_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Update main scheduler to use templates
CREATE OR REPLACE FUNCTION run_scheduled_tasks()
RETURNS JSON AS $$
DECLARE
    recurring_count INTEGER;
    overdue_count INTEGER;
    reminder_count INTEGER;
    result JSON;
BEGIN
    -- Generate recurring tasks from templates (simple version)
    SELECT generate_recurring_tasks_with_templates() INTO recurring_count;
    
    -- Check for overdue tasks (existing function)
    SELECT check_overdue_tasks() INTO overdue_count;
    
    -- Send reminders (existing function)
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

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_templates_simple ON task_templates(is_active, recurring_frequency);
CREATE INDEX IF NOT EXISTS idx_tasks_template_simple ON tasks(template_id, status, completed_date);

-- 8. Enhanced task history trigger with notifications
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

-- 9. Update the task history trigger to use enhanced function
DROP TRIGGER IF EXISTS task_history_trigger ON tasks;
CREATE TRIGGER task_history_trigger
    AFTER UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION log_task_changes_with_notifications();

-- 10. Insert sample templates (using existing departments and users)
INSERT INTO task_templates (title, description, priority, recurring_frequency, skip_weekends, created_by) VALUES
('Daily Equipment Check', 'Perform routine inspection of manufacturing equipment', 'medium', 'daily', TRUE, '550e8400-e29b-41d4-a716-446655440100'),
('Weekly Team Meeting', 'Conduct weekly team standup meeting', 'low', 'weekly', TRUE, '550e8400-e29b-41d4-a716-446655440100'),
('Bi-weekly Report', 'Submit bi-weekly progress report', 'medium', 'bi-weekly', TRUE, '550e8400-e29b-41d4-a716-446655440100'),
('Monthly Safety Audit', 'Complete monthly safety compliance audit', 'high', 'monthly', FALSE, '550e8400-e29b-41d4-a716-446655440100'),
('Quarterly Review', 'Conduct quarterly performance review', 'high', 'quarterly', FALSE, '550e8400-e29b-41d4-a716-446655440100'),
('Annual Budget Planning', 'Prepare annual budget and planning', 'urgent', 'annually', FALSE, '550e8400-e29b-41d4-a716-446655440100')
ON CONFLICT DO NOTHING;
