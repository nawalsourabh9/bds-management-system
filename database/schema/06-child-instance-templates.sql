-- Child instance templates table for recurring tasks
-- Stores the initial child instance parameters associated with a parent recurring task

CREATE TABLE IF NOT EXISTS child_instance_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assignee_id UUID,
    due_date DATE,
    priority task_priority DEFAULT 'medium',
    status task_status DEFAULT 'not-started',
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    is_customer_related BOOLEAN DEFAULT FALSE,
    attachments_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_child_templates_parent ON child_instance_templates(parent_task_id);


