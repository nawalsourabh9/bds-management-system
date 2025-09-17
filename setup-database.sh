#!/bin/bash

# Database Setup Script for BDS Management System
# This script creates a separate schema for BDS tables in the Nordic database

set -e

# Load configuration
if [ -f "deployment-config.env" ]; then
    source deployment-config.env
else
    echo "Error: deployment-config.env file not found"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Function to get database password from Key Vault
get_db_password() {
    print_status "Getting database password from Key Vault..."
    DB_PASSWORD=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "DBPASSWORD" --query value -o tsv)
    if [ -z "$DB_PASSWORD" ]; then
        print_error "Database password not found in Key Vault"
        exit 1
    fi
    print_status "Database password retrieved successfully"
}

# Function to create database schema and tables
create_database_schema() {
    print_header "Creating BDS Database Schema"
    
    # Create SQL file for schema creation
    cat > bds_schema.sql << 'EOF'
-- BDS Management System Database Schema
-- This schema is separate from the Nordic application tables

-- Create BDS schema
CREATE SCHEMA IF NOT EXISTS bds;

-- Set search path to include BDS schema
SET search_path TO bds, public;

-- Create BDS users table (separate from Nordic users)
CREATE TABLE IF NOT EXISTS bds.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    department_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create BDS departments table
CREATE TABLE IF NOT EXISTS bds.departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id INTEGER REFERENCES bds.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create BDS tasks table
CREATE TABLE IF NOT EXISTS bds.tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    department_id INTEGER REFERENCES bds.departments(id),
    assignee_id INTEGER REFERENCES bds.users(id),
    created_by INTEGER REFERENCES bds.users(id),
    start_date DATE,
    due_date DATE,
    completed_date TIMESTAMP,
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(50),
    is_customer_related BOOLEAN DEFAULT false,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    attachments_required VARCHAR(50) DEFAULT 'none',
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create BDS task_attachments table
CREATE TABLE IF NOT EXISTS bds.task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES bds.tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES bds.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create BDS task_comments table
CREATE TABLE IF NOT EXISTS bds.task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES bds.tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES bds.users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create BDS task_history table
CREATE TABLE IF NOT EXISTS bds.task_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES bds.tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES bds.users(id),
    action VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create BDS documents table
CREATE TABLE IF NOT EXISTS bds.documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    document_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    uploaded_by INTEGER REFERENCES bds.users(id),
    approved_by INTEGER REFERENCES bds.users(id),
    approved_at TIMESTAMP,
    version VARCHAR(20) DEFAULT '1.0',
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create BDS audits table
CREATE TABLE IF NOT EXISTS bds.audits (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    audit_type VARCHAR(100),
    department_id INTEGER REFERENCES bds.departments(id),
    auditor_id INTEGER REFERENCES bds.users(id),
    audit_date DATE,
    status VARCHAR(50) DEFAULT 'planned',
    findings TEXT,
    recommendations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create BDS non_conformances table
CREATE TABLE IF NOT EXISTS bds.non_conformances (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    department_id INTEGER REFERENCES bds.departments(id),
    reported_by INTEGER REFERENCES bds.users(id),
    assigned_to INTEGER REFERENCES bds.users(id),
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    due_date DATE,
    resolved_date TIMESTAMP,
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bds_users_email ON bds.users(email);
CREATE INDEX IF NOT EXISTS idx_bds_tasks_status ON bds.tasks(status);
CREATE INDEX IF NOT EXISTS idx_bds_tasks_assignee ON bds.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_bds_tasks_department ON bds.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_bds_tasks_due_date ON bds.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_bds_documents_status ON bds.documents(status);
CREATE INDEX IF NOT EXISTS idx_bds_audits_status ON bds.audits(status);
CREATE INDEX IF NOT EXISTS idx_bds_non_conformances_status ON bds.non_conformances(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION bds.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_bds_users_updated_at BEFORE UPDATE ON bds.users FOR EACH ROW EXECUTE FUNCTION bds.update_updated_at_column();
CREATE TRIGGER update_bds_departments_updated_at BEFORE UPDATE ON bds.departments FOR EACH ROW EXECUTE FUNCTION bds.update_updated_at_column();
CREATE TRIGGER update_bds_tasks_updated_at BEFORE UPDATE ON bds.tasks FOR EACH ROW EXECUTE FUNCTION bds.update_updated_at_column();
CREATE TRIGGER update_bds_documents_updated_at BEFORE UPDATE ON bds.documents FOR EACH ROW EXECUTE FUNCTION bds.update_updated_at_column();
CREATE TRIGGER update_bds_audits_updated_at BEFORE UPDATE ON bds.audits FOR EACH ROW EXECUTE FUNCTION bds.update_updated_at_column();
CREATE TRIGGER update_bds_non_conformances_updated_at BEFORE UPDATE ON bds.non_conformances FOR EACH ROW EXECUTE FUNCTION bds.update_updated_at_column();

-- Insert default department
INSERT INTO bds.departments (name, description) VALUES 
('General', 'General department for all users')
ON CONFLICT DO NOTHING;

-- Grant permissions to the database user
GRANT USAGE ON SCHEMA bds TO nodicuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA bds TO nodicuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA bds TO nodicuser;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA bds TO nodicuser;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA bds GRANT ALL ON TABLES TO nodicuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA bds GRANT ALL ON SEQUENCES TO nodicuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA bds GRANT EXECUTE ON FUNCTIONS TO nodicuser;
EOF

    print_status "SQL schema file created: bds_schema.sql"
}

# Function to execute database setup
execute_database_setup() {
    print_header "Executing Database Setup"
    
    # Get database password
    get_db_password
    
    # Create connection string
    DATABASE_URL="postgresql://nodicuser:${DB_PASSWORD}@${NORDIC_DB_HOST}:5432/${NORDIC_DB_NAME}?sslmode=require"
    
    print_status "Connecting to database: ${NORDIC_DB_HOST}"
    print_status "Database: ${NORDIC_DB_NAME}"
    print_status "User: nodicuser"
    
    # Execute the schema creation
    print_status "Creating BDS schema and tables..."
    PGPASSWORD="${DB_PASSWORD}" psql -h "${NORDIC_DB_HOST}" -U nodicuser -d "${NORDIC_DB_NAME}" -f bds_schema.sql
    
    print_status "Database schema created successfully!"
}

# Function to verify database setup
verify_database_setup() {
    print_header "Verifying Database Setup"
    
    # Get database password
    get_db_password
    
    # Create verification SQL
    cat > verify_schema.sql << 'EOF'
-- Verify BDS schema and tables
\dt bds.*

-- Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'bds'
ORDER BY table_name;

-- Check table counts
SELECT 'users' as table_name, COUNT(*) as count FROM bds.users
UNION ALL
SELECT 'departments', COUNT(*) FROM bds.departments
UNION ALL
SELECT 'tasks', COUNT(*) FROM bds.tasks
UNION ALL
SELECT 'documents', COUNT(*) FROM bds.documents
UNION ALL
SELECT 'audits', COUNT(*) FROM bds.audits
UNION ALL
SELECT 'non_conformances', COUNT(*) FROM bds.non_conformances;
EOF

    print_status "Verifying schema and tables..."
    PGPASSWORD="${DB_PASSWORD}" psql -h "${NORDIC_DB_HOST}" -U nodicuser -d "${NORDIC_DB_NAME}" -f verify_schema.sql
    
    print_status "Database verification completed!"
}

# Function to update backend configuration
update_backend_config() {
    print_header "Updating Backend Configuration"
    
    # Get database password
    get_db_password
    
    # Create the database URL
    DATABASE_URL="postgresql://nodicuser:${DB_PASSWORD}@${NORDIC_DB_HOST}:5432/${NORDIC_DB_NAME}?sslmode=require&options=-csearch_path%3Dbds,public"
    
    print_status "Updating backend environment variables..."
    
    # Update backend container app with new database URL
    az containerapp update \
        --name $CONTAINER_APP_NAME_BACKEND \
        --resource-group $RESOURCE_GROUP \
        --set-env-vars \
        "DATABASE_URL=$DATABASE_URL"
    
    print_status "Backend configuration updated!"
}

# Function to show setup summary
show_summary() {
    print_header "Database Setup Summary"
    
    echo "Database Configuration:"
    echo "  Host: $NORDIC_DB_HOST"
    echo "  Database: $NORDIC_DB_NAME"
    echo "  User: nodicuser"
    echo "  Schema: bds"
    echo ""
    echo "Tables Created:"
    echo "  ✅ bds.users - User management"
    echo "  ✅ bds.departments - Department management"
    echo "  ✅ bds.tasks - Task management"
    echo "  ✅ bds.task_attachments - File attachments"
    echo "  ✅ bds.task_comments - Task comments"
    echo "  ✅ bds.task_history - Task history"
    echo "  ✅ bds.documents - Document management"
    echo "  ✅ bds.audits - Audit management"
    echo "  ✅ bds.non_conformances - Non-conformance tracking"
    echo ""
    echo "Schema Separation:"
    echo "  • BDS tables are in 'bds' schema"
    echo "  • Nordic tables remain in 'public' schema"
    echo "  • No conflicts between applications"
    echo ""
    echo "Backend Configuration:"
    echo "  • Updated with new DATABASE_URL"
    echo "  • Search path includes 'bds' schema first"
    echo "  • SSL connection enabled"
}

# Main function
main() {
    print_header "BDS Database Setup"
    
    # Check prerequisites
    print_status "Checking prerequisites..."
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) is not installed"
        print_status "Install with: brew install postgresql"
        exit 1
    fi
    
    # Create database schema
    create_database_schema
    
    # Execute database setup
    execute_database_setup
    
    # Verify setup
    verify_database_setup
    
    # Update backend configuration
    update_backend_config
    
    # Show summary
    show_summary
    
    print_header "Database Setup Complete!"
    print_status "BDS application now has its own schema in the Nordic database"
    print_status "No conflicts with existing Nordic tables"
    print_status "Backend is configured to use the new schema"
}

# Call main function
main "$@"
