-- Fix task_history trigger function to use correct user_id
-- The trigger was incorrectly using NEW.updated_at (timestamp) instead of a user_id (UUID)

CREATE OR REPLACE FUNCTION log_task_changes_with_notifications()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO task_history (id, task_id, user_id, action, field_name, old_value, new_value)
            VALUES (gen_random_uuid(), NEW.id, COALESCE(NEW.created_by, NEW.assignee_id), 'status_changed', 'status', OLD.status, NEW.status);
            
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
            VALUES (uuid_generate_v4(), NEW.id, COALESCE(NEW.created_by, NEW.assignee_id), 'priority_changed', 'priority', OLD.priority, NEW.priority);
        END IF;
        
        -- Log assignment changes
        IF OLD.assignee_id != NEW.assignee_id THEN
            INSERT INTO task_history (id, task_id, user_id, action, field_name, old_value, new_value)
            VALUES (uuid_generate_v4(), NEW.id, COALESCE(NEW.created_by, NEW.assignee_id), 'assignee_changed', 'assignee_id', OLD.assignee_id::text, NEW.assignee_id::text);
            
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

