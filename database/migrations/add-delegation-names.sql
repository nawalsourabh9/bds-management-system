-- Migration: Add name columns to task_delegations table
-- This stores names at delegation time for historical accuracy
-- Even if a user's name changes later, the delegation record shows the name at delegation time

-- Add columns to store names (nullable, will be populated for existing records via JOIN)
ALTER TABLE task_delegations 
ADD COLUMN IF NOT EXISTS delegated_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS delegated_to_name VARCHAR(255);

-- Update existing records to populate names from users table
UPDATE task_delegations
SET 
    delegated_by_name = subquery.delegated_by_name,
    delegated_to_name = subquery.delegated_to_name
FROM (
    SELECT 
        td.id,
        CONCAT(db.first_name, ' ', db.last_name) as delegated_by_name,
        CASE 
            WHEN td.delegated_to_user_id IS NOT NULL 
            THEN CONCAT(u.first_name, ' ', u.last_name)
            ELSE NULL
        END as delegated_to_name
    FROM task_delegations td
    INNER JOIN users db ON td.delegated_by_user_id = db.id
    LEFT JOIN users u ON td.delegated_to_user_id = u.id
    WHERE td.delegated_by_name IS NULL OR td.delegated_to_name IS NULL
) AS subquery
WHERE task_delegations.id = subquery.id;

-- Update the functions to use stored names, falling back to JOIN if names are NULL
CREATE OR REPLACE FUNCTION get_current_delegated_assignee(task_id_param UUID)
RETURNS TABLE (
    delegated_to_user_id UUID,
    delegated_to_name TEXT,
    offline_assignee_name VARCHAR,
    offline_assignee_department VARCHAR,
    delegation_level INTEGER,
    delegated_by_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        td.delegated_to_user_id,
        COALESCE(
            td.delegated_to_name::TEXT,
            CASE 
                WHEN td.delegated_to_user_id IS NOT NULL 
                THEN CONCAT(u.first_name, ' ', u.last_name)
                ELSE NULL
            END
        ) as delegated_to_name,
        td.offline_assignee_name,
        td.offline_assignee_department,
        td.delegation_level,
        COALESCE(
            td.delegated_by_name::TEXT,
            CASE 
                WHEN db.first_name IS NOT NULL AND db.last_name IS NOT NULL
                THEN CONCAT(db.first_name, ' ', db.last_name)
                ELSE NULL
            END
        ) as delegated_by_name,
        td.created_at
    FROM task_delegations td
    LEFT JOIN users u ON td.delegated_to_user_id = u.id
    LEFT JOIN users db ON td.delegated_by_user_id = db.id
    WHERE td.task_id = task_id_param 
      AND td.is_active = TRUE
    ORDER BY td.delegation_level DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Update the delegation chain function
CREATE OR REPLACE FUNCTION get_task_delegation_chain(task_id_param UUID)
RETURNS TABLE (
    id UUID,
    delegated_by_user_id UUID,
    delegated_by_name TEXT,
    delegated_to_user_id UUID,
    delegated_to_name TEXT,
    offline_assignee_name VARCHAR,
    offline_assignee_department VARCHAR,
    delegation_level INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        td.id,
        td.delegated_by_user_id,
        COALESCE(
            td.delegated_by_name::TEXT,
            CASE 
                WHEN db.first_name IS NOT NULL AND db.last_name IS NOT NULL
                THEN CONCAT(db.first_name, ' ', db.last_name)
                ELSE NULL
            END
        ) as delegated_by_name,
        td.delegated_to_user_id,
        COALESCE(
            td.delegated_to_name::TEXT,
            CASE 
                WHEN td.delegated_to_user_id IS NOT NULL 
                THEN CONCAT(u.first_name, ' ', u.last_name)
                ELSE NULL
            END
        ) as delegated_to_name,
        td.offline_assignee_name,
        td.offline_assignee_department,
        td.delegation_level,
        td.notes,
        td.created_at,
        td.is_active
    FROM task_delegations td
    LEFT JOIN users u ON td.delegated_to_user_id = u.id
    LEFT JOIN users db ON td.delegated_by_user_id = db.id
    WHERE td.task_id = task_id_param
    ORDER BY td.delegation_level ASC, td.created_at ASC;
END;
$$ LANGUAGE plpgsql;
