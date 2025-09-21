-- Organizational Hierarchy System
-- This script creates the complete organizational structure with departments, sub-departments, positions, and reporting relationships

-- 1. Add sub-departments support
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS parent_department_id UUID REFERENCES departments(id),
ADD COLUMN IF NOT EXISTS department_type VARCHAR(50) DEFAULT 'department' CHECK (department_type IN ('department', 'sub_department'));

-- 2. Create positions table
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    department_id UUID NOT NULL REFERENCES departments(id),
    level INTEGER DEFAULT 1, -- 1=user, 2=supervisor, 3=manager, 4=admin, 5=superadmin
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add reporting relationships to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reports_to_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_positions_department ON positions(department_id);
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to_id);
CREATE INDEX IF NOT EXISTS idx_users_position ON users(position_id);

-- 5. Insert default positions for each department
-- This will be populated when departments are created

-- 6. Create function to get user hierarchy
CREATE OR REPLACE FUNCTION get_user_hierarchy(user_id_param UUID)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    full_name TEXT,
    role VARCHAR,
    position_name VARCHAR,
    department_name VARCHAR,
    reports_to_name TEXT,
    hierarchy_level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE user_hierarchy AS (
        -- Base case: start with the specified user
        SELECT 
            u.id as user_id,
            u.email,
            CONCAT(u.first_name, ' ', u.last_name) as full_name,
            u.role::VARCHAR,
            p.name as position_name,
            d.name as department_name,
            CONCAT(reports_to.first_name, ' ', reports_to.last_name) as reports_to_name,
            1 as hierarchy_level
        FROM users u
        LEFT JOIN positions p ON u.position_id = p.id
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN users reports_to ON u.reports_to_id = reports_to.id
        WHERE u.id = user_id_param
        
        UNION ALL
        
        -- Recursive case: get all users who report to the current user
        SELECT 
            u.id as user_id,
            u.email,
            CONCAT(u.first_name, ' ', u.last_name) as full_name,
            u.role::VARCHAR,
            p.name as position_name,
            d.name as department_name,
            CONCAT(reports_to.first_name, ' ', reports_to.last_name) as reports_to_name,
            uh.hierarchy_level + 1
        FROM users u
        LEFT JOIN positions p ON u.position_id = p.id
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN users reports_to ON u.reports_to_id = reports_to.id
        JOIN user_hierarchy uh ON u.reports_to_id = uh.user_id
    )
    SELECT * FROM user_hierarchy ORDER BY hierarchy_level, full_name;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to get department hierarchy
CREATE OR REPLACE FUNCTION get_department_hierarchy(department_id_param UUID)
RETURNS TABLE (
    department_id UUID,
    department_name VARCHAR,
    department_type VARCHAR,
    parent_department_name VARCHAR,
    level INTEGER,
    path TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE dept_hierarchy AS (
        -- Base case: start with the specified department
        SELECT 
            d.id as department_id,
            d.name as department_name,
            d.department_type,
            parent.name as parent_department_name,
            1 as level,
            d.name as path
        FROM departments d
        LEFT JOIN departments parent ON d.parent_department_id = parent.id
        WHERE d.id = department_id_param
        
        UNION ALL
        
        -- Recursive case: get all sub-departments
        SELECT 
            d.id as department_id,
            d.name as department_name,
            d.department_type,
            parent.name as parent_department_name,
            dh.level + 1,
            dh.path || ' > ' || d.name
        FROM departments d
        LEFT JOIN departments parent ON d.parent_department_id = parent.id
        JOIN dept_hierarchy dh ON d.parent_department_id = dh.department_id
    )
    SELECT * FROM dept_hierarchy ORDER BY level, department_name;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to assign default positions when creating a department
CREATE OR REPLACE FUNCTION create_default_positions_for_department(dept_id UUID)
RETURNS VOID AS $$
DECLARE
    dept_name VARCHAR;
BEGIN
    -- Get department name
    SELECT name INTO dept_name FROM departments WHERE id = dept_id;
    
    -- Insert default positions based on role hierarchy
    INSERT INTO positions (name, description, department_id, level) VALUES
    (dept_name || ' Manager', 'Department manager position', dept_id, 3),
    (dept_name || ' Supervisor', 'Team supervisor position', dept_id, 2),
    (dept_name || ' Engineer', 'Engineering position', dept_id, 1),
    (dept_name || ' Operator', 'Operations position', dept_id, 1),
    (dept_name || ' Technician', 'Technical support position', dept_id, 1),
    (dept_name || ' Analyst', 'Data analysis position', dept_id, 1),
    (dept_name || ' Coordinator', 'Coordination position', dept_id, 1)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to automatically create default positions for new departments
CREATE OR REPLACE FUNCTION trigger_create_default_positions()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_positions_for_department(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_positions_on_department_insert
    AFTER INSERT ON departments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_positions();

-- 10. Create function to validate reporting relationships
CREATE OR REPLACE FUNCTION validate_reporting_relationship()
RETURNS TRIGGER AS $$
DECLARE
    manager_role VARCHAR;
    subordinate_role VARCHAR;
    manager_level INTEGER;
    subordinate_level INTEGER;
BEGIN
    -- Get roles and levels
    SELECT u.role::VARCHAR, p.level 
    INTO manager_role, manager_level
    FROM users u
    LEFT JOIN positions p ON u.position_id = p.id
    WHERE u.id = NEW.reports_to_id;
    
    SELECT u.role::VARCHAR, p.level 
    INTO subordinate_role, subordinate_level
    FROM users u
    LEFT JOIN positions p ON u.position_id = p.id
    WHERE u.id = NEW.id;
    
    -- Validate hierarchy (manager should be higher level)
    IF manager_level IS NOT NULL AND subordinate_level IS NOT NULL THEN
        IF manager_level <= subordinate_level THEN
            RAISE EXCEPTION 'Reporting relationship invalid: Manager level (%) must be higher than subordinate level (%)', manager_level, subordinate_level;
        END IF;
    END IF;
    
    -- Validate role hierarchy
    CASE 
        WHEN subordinate_role = 'superadmin' THEN
            RAISE EXCEPTION 'Superadmin cannot report to anyone';
        WHEN subordinate_role = 'admin' AND manager_role != 'superadmin' THEN
            RAISE EXCEPTION 'Admin can only report to Superadmin';
        WHEN subordinate_role = 'manager' AND manager_role NOT IN ('admin', 'superadmin') THEN
            RAISE EXCEPTION 'Manager can only report to Admin or Superadmin';
        WHEN subordinate_role = 'supervisor' AND manager_role NOT IN ('manager', 'admin', 'superadmin') THEN
            RAISE EXCEPTION 'Supervisor can only report to Manager, Admin, or Superadmin';
        WHEN subordinate_role = 'user' AND manager_role NOT IN ('supervisor', 'manager', 'admin', 'superadmin') THEN
            RAISE EXCEPTION 'User can only report to Supervisor, Manager, Admin, or Superadmin';
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_reporting_before_update
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    WHEN (NEW.reports_to_id IS NOT NULL)
    EXECUTE FUNCTION validate_reporting_relationship();

-- 11. Create function to get users by reporting level
CREATE OR REPLACE FUNCTION get_users_by_reporting_level(user_id_param UUID)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    full_name TEXT,
    role VARCHAR,
    position_name VARCHAR,
    department_name VARCHAR,
    can_manage BOOLEAN
) AS $$
DECLARE
    current_user_role VARCHAR;
    current_user_level INTEGER;
BEGIN
    -- Get current user's role and level
    SELECT u.role::VARCHAR, COALESCE(p.level, 
        CASE u.role::VARCHAR 
            WHEN 'superadmin' THEN 5
            WHEN 'admin' THEN 4
            WHEN 'manager' THEN 3
            WHEN 'supervisor' THEN 2
            WHEN 'user' THEN 1
        END)
    INTO current_user_role, current_user_level
    FROM users u
    LEFT JOIN positions p ON u.position_id = p.id
    WHERE u.id = user_id_param;
    
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        CONCAT(u.first_name, ' ', u.last_name) as full_name,
        u.role::VARCHAR,
        p.name as position_name,
        d.name as department_name,
        (COALESCE(p.level, 
            CASE u.role::VARCHAR 
                WHEN 'superadmin' THEN 5
                WHEN 'admin' THEN 4
                WHEN 'manager' THEN 3
                WHEN 'supervisor' THEN 2
                WHEN 'user' THEN 1
            END) < current_user_level) as can_manage
    FROM users u
    LEFT JOIN positions p ON u.position_id = p.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.is_active = true
    AND (
        current_user_role = 'superadmin' OR
        (current_user_role = 'admin') OR
        (current_user_role = 'manager' AND u.department_id = (
            SELECT department_id FROM users WHERE id = user_id_param
        )) OR
        (current_user_role = 'supervisor' AND u.reports_to_id = user_id_param)
    )
    ORDER BY u.role, u.first_name, u.last_name;
END;
$$ LANGUAGE plpgsql;

-- 12. Update existing departments to have default positions
DO $$
DECLARE
    dept_record RECORD;
BEGIN
    FOR dept_record IN SELECT id FROM departments LOOP
        PERFORM create_default_positions_for_department(dept_record.id);
    END LOOP;
END $$;

COMMENT ON TABLE positions IS 'Positions within departments with hierarchy levels';
COMMENT ON COLUMN positions.level IS 'Hierarchy level: 1=user, 2=supervisor, 3=manager, 4=admin, 5=superadmin';
COMMENT ON COLUMN users.reports_to_id IS 'User ID that this user reports to';
COMMENT ON COLUMN users.position_id IS 'Position ID linked to this user';
COMMENT ON COLUMN departments.parent_department_id IS 'Parent department for sub-departments';
COMMENT ON COLUMN departments.department_type IS 'Type: department or sub_department';
