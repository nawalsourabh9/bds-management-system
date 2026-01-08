-- BDS Management System - Seed Data
-- Populate database with initial data

-- Insert departments
INSERT INTO departments (id, name, description) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Executive Office', 'Executive management and strategic planning'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Quality Assurance', 'Quality control and assurance processes'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Production', 'Manufacturing and production operations'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Research & Development', 'Product development and innovation'),
    ('550e8400-e29b-41d4-a716-446655440005', 'Supply Chain', 'Procurement and logistics management'),
    ('550e8400-e29b-41d4-a716-446655440006', 'Human Resources', 'HR and employee management'),
    ('550e8400-e29b-41d4-a716-446655440007', 'Finance', 'Financial management and accounting'),
    ('550e8400-e29b-41d4-a716-446655440008', 'IT & Systems', 'Information technology and systems support')
ON CONFLICT DO NOTHING;

-- Insert users (password hash for 'admin123' using bcrypt)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, department_id, is_active, is_verified) VALUES 
    -- SuperAdmin user (you)
    ('550e8400-e29b-41d4-a716-446655440100', 'admin@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Super', 'Admin', 'superadmin', '550e8400-e29b-41d4-a716-446655440001', TRUE, TRUE),
    
    -- Admin user
    ('550e8400-e29b-41d4-a716-446655440101', 'sourabh.nawal@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Sourabh', 'Nawal', 'admin', '550e8400-e29b-41d4-a716-446655440001', TRUE, TRUE),
    
    -- Executive team
    ('550e8400-e29b-41d4-a716-446655440102', 'rajesh.kumar@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Rajesh', 'Kumar', 'manager', '550e8400-e29b-41d4-a716-446655440001', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440103', 'priya.sharma@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Priya', 'Sharma', 'manager', '550e8400-e29b-41d4-a716-446655440002', TRUE, TRUE),
    
    -- Quality Assurance team
    ('550e8400-e29b-41d4-a716-446655440104', 'amit.patel@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Amit', 'Patel', 'supervisor', '550e8400-e29b-41d4-a716-446655440002', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440105', 'neha.gupta@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Neha', 'Gupta', 'user', '550e8400-e29b-41d4-a716-446655440002', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440106', 'vikram.singh@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Vikram', 'Singh', 'user', '550e8400-e29b-41d4-a716-446655440002', TRUE, TRUE),
    
    -- Production team
    ('550e8400-e29b-41d4-a716-446655440107', 'sunita.verma@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Sunita', 'Verma', 'manager', '550e8400-e29b-41d4-a716-446655440003', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440108', 'arun.malhotra@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Arun', 'Malhotra', 'supervisor', '550e8400-e29b-41d4-a716-446655440003', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440109', 'meera.reddy@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Meera', 'Reddy', 'user', '550e8400-e29b-41d4-a716-446655440003', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440110', 'sanjay.khanna@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Sanjay', 'Khanna', 'user', '550e8400-e29b-41d4-a716-446655440003', TRUE, TRUE),
    
    -- R&D team
    ('550e8400-e29b-41d4-a716-446655440111', 'deepak.chopra@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Deepak', 'Chopra', 'manager', '550e8400-e29b-41d4-a716-446655440004', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440112', 'anita.desai@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Anita', 'Desai', 'supervisor', '550e8400-e29b-41d4-a716-446655440004', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440113', 'rahul.mehta@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Rahul', 'Mehta', 'user', '550e8400-e29b-41d4-a716-446655440004', TRUE, TRUE),
    
    -- Supply Chain team
    ('550e8400-e29b-41d4-a716-446655440114', 'kavita.joshi@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Kavita', 'Joshi', 'manager', '550e8400-e29b-41d4-a716-446655440005', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440115', 'manish.tiwari@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Manish', 'Tiwari', 'supervisor', '550e8400-e29b-41d4-a716-446655440005', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440116', 'pooja.shah@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Pooja', 'Shah', 'user', '550e8400-e29b-41d4-a716-446655440005', TRUE, TRUE),
    
    -- HR team
    ('550e8400-e29b-41d4-a716-446655440117', 'nitin.bhatt@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Nitin', 'Bhatt', 'manager', '550e8400-e29b-41d4-a716-446655440006', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440118', 'rashmi.iyer@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Rashmi', 'Iyer', 'supervisor', '550e8400-e29b-41d4-a716-446655440006', TRUE, TRUE),
    
    -- Finance team
    ('550e8400-e29b-41d4-a716-446655440119', 'ajay.kapoor@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Ajay', 'Kapoor', 'manager', '550e8400-e29b-41d4-a716-446655440007', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440120', 'shweta.menon@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Shweta', 'Menon', 'supervisor', '550e8400-e29b-41d4-a716-446655440007', TRUE, TRUE),
    
    -- IT team
    ('550e8400-e29b-41d4-a716-446655440121', 'vivek.rao@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Vivek', 'Rao', 'manager', '550e8400-e29b-41d4-a716-446655440008', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440122', 'divya.nair@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Divya', 'Nair', 'supervisor', '550e8400-e29b-41d4-a716-446655440008', TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440123', 'rohit.saxena@bdsmanufacturing.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'Rohit', 'Saxena', 'user', '550e8400-e29b-41d4-a716-446655440008', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Update departments with manager IDs
UPDATE departments SET manager_id = '550e8400-e29b-41d4-a716-446655440102' WHERE id = '550e8400-e29b-41d4-a716-446655440001';
UPDATE departments SET manager_id = '550e8400-e29b-41d4-a716-446655440103' WHERE id = '550e8400-e29b-41d4-a716-446655440002';
UPDATE departments SET manager_id = '550e8400-e29b-41d4-a716-446655440107' WHERE id = '550e8400-e29b-41d4-a716-446655440003';
UPDATE departments SET manager_id = '550e8400-e29b-41d4-a716-446655440111' WHERE id = '550e8400-e29b-41d4-a716-446655440004';
UPDATE departments SET manager_id = '550e8400-e29b-41d4-a716-446655440114' WHERE id = '550e8400-e29b-41d4-a716-446655440005';
UPDATE departments SET manager_id = '550e8400-e29b-41d4-a716-446655440117' WHERE id = '550e8400-e29b-41d4-a716-446655440006';
UPDATE departments SET manager_id = '550e8400-e29b-41d4-a716-446655440119' WHERE id = '550e8400-e29b-41d4-a716-446655440007';
UPDATE departments SET manager_id = '550e8400-e29b-41d4-a716-446655440121' WHERE id = '550e8400-e29b-41d4-a716-446655440008';

-- Insert sample tasks
INSERT INTO tasks (id, title, description, status, priority, department_id, assignee_id, created_by, due_date, is_customer_related, customer_name, tags) VALUES 
    ('550e8400-e29b-41d4-a716-446655440200', 'Quality Control Audit - Production Line A', 'Conduct comprehensive quality audit for production line A to ensure compliance with ISO 9001 standards', 'in-progress', 'high', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440103', '2024-12-15', FALSE, NULL, ARRAY['quality', 'audit', 'iso9001']),
    
    ('550e8400-e29b-41d4-a716-446655440201', 'New Product Development - Component X', 'Design and develop new component X for automotive applications with improved efficiency', 'pending', 'urgent', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440112', '550e8400-e29b-41d4-a716-446655440111', '2024-12-20', TRUE, 'Tata Motors', ARRAY['development', 'automotive', 'component']),
    
    ('550e8400-e29b-41d4-a716-446655440202', 'Production Schedule Optimization', 'Optimize production schedule for Q1 2024 to maximize efficiency and reduce downtime', 'not-started', 'medium', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440108', '550e8400-e29b-41d4-a716-446655440107', '2024-12-25', FALSE, NULL, ARRAY['production', 'optimization', 'schedule']),
    
    ('550e8400-e29b-41d4-a716-446655440203', 'Supplier Evaluation - Steel Components', 'Evaluate and select new suppliers for steel components to improve quality and reduce costs', 'under-review', 'high', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440115', '550e8400-e29b-41d4-a716-446655440114', '2024-12-18', FALSE, NULL, ARRAY['supplier', 'evaluation', 'steel']),
    
    ('550e8400-e29b-41d4-a716-446655440204', 'Employee Training Program - Safety Protocols', 'Develop and implement comprehensive safety training program for all production staff', 'completed', 'medium', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440118', '550e8400-e29b-41d4-a716-446655440117', '2024-12-10', FALSE, NULL, ARRAY['training', 'safety', 'compliance']),
    
    ('550e8400-e29b-41d4-a716-446655440205', 'Financial Audit Preparation', 'Prepare all necessary documents and reports for annual financial audit', 'on-hold', 'critical', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440120', '550e8400-e29b-41d4-a716-446655440119', '2024-12-30', FALSE, NULL, ARRAY['audit', 'finance', 'annual']),
    
    ('550e8400-e29b-41d4-a716-446655440206', 'IT System Upgrade - ERP Module', 'Upgrade ERP system module to latest version and migrate all data', 'blocked', 'urgent', '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440122', '550e8400-e29b-41d4-a716-446655440121', '2024-12-22', FALSE, NULL, ARRAY['upgrade', 'erp', 'migration']),
    
    ('550e8400-e29b-41d4-a716-446655440207', 'Customer Order - Mahindra & Mahindra', 'Process large order for Mahindra & Mahindra with specific quality requirements', 'waiting-for-approval', 'emergency', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440109', '550e8400-e29b-41d4-a716-446655440107', '2024-12-12', TRUE, 'Mahindra & Mahindra', ARRAY['customer', 'order', 'mahindra']),
    
    ('550e8400-e29b-41d4-a716-446655440208', 'R&D Project - Green Manufacturing', 'Research and develop eco-friendly manufacturing processes to reduce carbon footprint', 'in-progress', 'high', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440113', '550e8400-e29b-41d4-a716-446655440111', '2024-12-28', FALSE, NULL, ARRAY['r&d', 'green', 'sustainability']),
    
    ('550e8400-e29b-41d4-a716-446655440209', 'Quality Issue Resolution - Batch #1234', 'Investigate and resolve quality issues reported in production batch #1234', 'overdue', 'critical', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440103', '2024-12-05', FALSE, NULL, ARRAY['quality', 'issue', 'resolution'])
ON CONFLICT DO NOTHING;

-- Insert sample documents
INSERT INTO documents (id, filename, original_filename, content_type, file_size, status, uploaded_by, task_id, department_id) VALUES 
    ('550e8400-e29b-41d4-a716-446655440300', 'quality_audit_report_2024.pdf', 'Quality Audit Report 2024.pdf', 'application/pdf', 2048576, 'approved', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440301', 'component_x_design_specs.docx', 'Component X Design Specifications.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1536000, 'draft', '550e8400-e29b-41d4-a716-446655440112', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440004'),
    ('550e8400-e29b-41d4-a716-446655440302', 'production_schedule_q1_2024.xlsx', 'Production Schedule Q1 2024.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024000, 'draft', '550e8400-e29b-41d4-a716-446655440108', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440003')
ON CONFLICT DO NOTHING;

-- Insert sample notifications
INSERT INTO notifications (id, user_id, title, message, type) VALUES 
    ('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440103', 'Quality Audit Due', 'Quality audit for Production Line A is due in 3 days', 'info'),
    ('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440111', 'New Customer Order', 'New order received from Tata Motors for Component X development', 'info'),
    ('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440107', 'Production Issue', 'Quality issue reported in batch #1234 requires immediate attention', 'info'),
    ('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440121', 'System Maintenance', 'ERP system upgrade scheduled for tomorrow at 2 AM', 'info')
ON CONFLICT DO NOTHING;

-- Insert sample task history
INSERT INTO task_history (id, task_id, user_id, action, field_name, old_value, new_value) VALUES 
    ('550e8400-e29b-41d4-a716-446655440500', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440103', 'status_changed', 'status', 'not-started', 'in-progress'),
    ('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440111', 'priority_changed', 'priority', 'high', 'urgent'),
    ('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440117', 'status_changed', 'status', 'in-progress', 'completed'),
    ('550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440209', '550e8400-e29b-41d4-a716-446655440103', 'status_changed', 'status', 'in-progress', 'overdue')
ON CONFLICT DO NOTHING;
