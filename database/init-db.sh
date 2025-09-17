#!/bin/bash

# BDS Management System Database Initialization Script
# This script sets up the complete database schema with all enhancements

set -e

echo "🚀 Starting BDS Management System Database Setup..."

# Database connection details
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="bds_management"
DB_USER="bds_user"
DB_PASSWORD="bds_password_2024"

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Create database if it doesn't exist
echo "📊 Creating database if it doesn't exist..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || echo "Database already exists"

# Set the database URL for psql
export PGPASSWORD=$DB_PASSWORD

# Run the main schema file
echo "🔧 Setting up BDS schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema/01-bds_schema.sql

# Run Azure integration schema
echo "☁️ Setting up Azure integration..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema/02-azure_integration.sql

# Run BDS manufacturing data
echo "🏭 Loading BDS manufacturing data..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema/03-bds_manufacturing_data.sql

# Run automation and triggers
echo "⚡ Setting up automation and triggers..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema/04-automation_triggers.sql

# Run sample data
echo "📝 Loading sample data..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema/05-sample_data.sql

# Verify the setup
echo "🔍 Verifying database setup..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    'Tables created:' as info,
    COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public';
"

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    'Users created:' as info,
    COUNT(*) as count 
FROM users;
"

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    'Tasks created:' as info,
    COUNT(*) as count 
FROM tasks;
"

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    'Departments created:' as info,
    COUNT(*) as count 
FROM departments;
"

echo "✅ Database setup completed successfully!"
echo ""
echo "📊 Database Summary:"
echo "   - Host: $DB_HOST:$DB_PORT"
echo "   - Database: $DB_NAME"
echo "   - User: $DB_USER"
echo ""
echo "🌐 PgAdmin Access:"
echo "   - URL: http://localhost:8080"
echo "   - Email: admin@bds.com"
echo "   - Password: admin123"
echo ""
echo "🔗 Connection String:"
echo "   postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo "🎉 BDS Management System is ready!"
