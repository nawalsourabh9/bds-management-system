-- Migration: Add many-to-many relationship between positions and departments
-- This allows positions to belong to multiple departments (e.g., CTO can head multiple departments)

-- 1. Create junction table for position-department relationships
CREATE TABLE IF NOT EXISTS position_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(position_id, department_id)
);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_position_departments_position ON position_departments(position_id);
CREATE INDEX IF NOT EXISTS idx_position_departments_department ON position_departments(department_id);

-- 3. Migrate existing data from positions.department_id to junction table
INSERT INTO position_departments (position_id, department_id)
SELECT id, department_id 
FROM positions 
WHERE department_id IS NOT NULL
ON CONFLICT (position_id, department_id) DO NOTHING;

-- 4. Make department_id nullable in positions table (since positions can now belong to multiple departments)
-- For positions that belong to "all departments", department_id will be NULL
ALTER TABLE positions ALTER COLUMN department_id DROP NOT NULL;

-- 5. Add a flag to indicate if position applies to all departments
ALTER TABLE positions ADD COLUMN IF NOT EXISTS applies_to_all_departments BOOLEAN DEFAULT FALSE;

COMMENT ON TABLE position_departments IS 'Junction table linking positions to multiple departments';
COMMENT ON COLUMN positions.applies_to_all_departments IS 'If true, this position applies to all departments (e.g., CTO, CEO)';

