-- Task Delegation System
-- This script creates the task_delegations table to support multi-level task delegation
-- Allows delegation to system users or offline/shop floor workers

-- Create task_delegations table
-- Using gen_random_uuid() which is available in PostgreSQL 13+ without extensions
CREATE TABLE IF NOT EXISTS task_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    delegated_by_user_id UUID NOT NULL REFERENCES users(id),
    delegated_by_name VARCHAR(255), -- name of delegator at delegation time (for historical accuracy)
    delegated_to_user_id UUID REFERENCES users(id), -- nullable if delegating to offline worker
    delegated_to_name VARCHAR(255), -- name of delegatee at delegation time (for system users, for historical accuracy)
    offline_assignee_name VARCHAR(255), -- name if delegating to offline/shop floor worker
    offline_assignee_department VARCHAR(255), -- department/role if offline worker
    delegation_level INTEGER NOT NULL DEFAULT 1, -- position in chain, 1 = first delegation, 2 = second, etc.
    notes TEXT, -- optional notes about delegation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE -- true for current delegation, false for historical
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_delegations_task_id ON task_delegations(task_id);
CREATE INDEX IF NOT EXISTS idx_task_delegations_delegated_by ON task_delegations(delegated_by_user_id);
CREATE INDEX IF NOT EXISTS idx_task_delegations_delegated_to ON task_delegations(delegated_to_user_id);
CREATE INDEX IF NOT EXISTS idx_task_delegations_active ON task_delegations(is_active);
CREATE INDEX IF NOT EXISTS idx_task_delegations_level ON task_delegations(delegation_level);

-- Add constraint: either delegated_to_user_id OR (offline_assignee_name + offline_assignee_department) must be provided
ALTER TABLE task_delegations 
ADD CONSTRAINT check_delegation_target CHECK (
    (delegated_to_user_id IS NOT NULL AND offline_assignee_name IS NULL AND offline_assignee_department IS NULL) OR
    (delegated_to_user_id IS NULL AND offline_assignee_name IS NOT NULL AND offline_assignee_department IS NOT NULL)
);

-- Create function to get current delegated assignee for a task
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

-- Create function to get full delegation chain for a task
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
