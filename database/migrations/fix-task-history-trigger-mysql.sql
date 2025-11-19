-- Fix task_history trigger for MySQL
-- MySQL uses triggers directly, not functions

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS task_history_trigger;

-- Create MySQL trigger
DELIMITER $$

CREATE TRIGGER task_history_trigger
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
    -- Log status changes
    IF OLD.status != NEW.status THEN
        INSERT INTO task_history (id, task_id, user_id, action, field_name, old_value, new_value)
        VALUES (UUID(), NEW.id, COALESCE(NEW.created_by, NEW.assignee_id), 'status_changed', 'status', OLD.status, NEW.status);
        
        -- Send notifications for status changes
        -- Notification to assignee
        IF NEW.assignee_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (
                NEW.assignee_id,
                'Task Status Updated',
                CONCAT('Task "', NEW.title, '" status changed from ', OLD.status, ' to ', NEW.status, '.'),
                'info',
                NOW()
            );
        END IF;
        
        -- Notification to creator (if different from assignee)
        IF NEW.created_by IS NOT NULL AND NEW.created_by != NEW.assignee_id THEN
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (
                NEW.created_by,
                'Task Status Updated',
                CONCAT('Task "', NEW.title, '" status changed from ', OLD.status, ' to ', NEW.status, '.'),
                'info',
                NOW()
            );
        END IF;
        
        -- If child task is completed, generate next instance
        IF NEW.status = 'completed' AND NEW.is_parent_task = FALSE AND NEW.parent_task_id IS NOT NULL THEN
            CALL generate_next_child_task(NEW.id);
        END IF;
    END IF;
    
    -- Log priority changes
    IF OLD.priority != NEW.priority THEN
        INSERT INTO task_history (id, task_id, user_id, action, field_name, old_value, new_value)
        VALUES (UUID(), NEW.id, COALESCE(NEW.created_by, NEW.assignee_id), 'priority_changed', 'priority', OLD.priority, NEW.priority);
    END IF;
    
    -- Log assignment changes
    IF OLD.assignee_id != NEW.assignee_id THEN
        INSERT INTO task_history (id, task_id, user_id, action, field_name, old_value, new_value)
        VALUES (UUID(), NEW.id, COALESCE(NEW.created_by, NEW.assignee_id), 'assignee_changed', 'assignee_id', CAST(OLD.assignee_id AS CHAR), CAST(NEW.assignee_id AS CHAR));
        
        -- Notification to new assignee
        IF NEW.assignee_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (
                NEW.assignee_id,
                'Task Assigned to You',
                CONCAT('Task "', NEW.title, '" has been assigned to you.'),
                'info',
                NOW()
            );
        END IF;
    END IF;
END$$

DELIMITER ;

