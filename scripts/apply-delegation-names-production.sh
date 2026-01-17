#!/bin/bash
# Script to apply delegation names migration to production database
# This uses the same database connection as the backend

set -e

echo "🚀 Applying Delegation Names Migration to Production"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "scripts/apply-delegation-names-migration.py" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if backend venv exists
if [ ! -d "backend/venv" ]; then
    echo "❌ Error: Backend virtual environment not found"
    echo "   Please run: cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

echo "📋 This will apply the migration to add name columns to task_delegations table"
echo "   The migration adds:"
echo "   - delegated_by_name VARCHAR(255)"
echo "   - delegated_to_name VARCHAR(255)"
echo ""
echo "⚠️  Make sure your backend/.env file has the correct production database credentials"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "🔧 Applying migration..."
cd backend && source venv/bin/activate && python3 ../scripts/apply-delegation-names-migration.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "💡 The deployed app should now show delegate names correctly."
    echo "   If it doesn't, make sure the deployed app code is up to date."
else
    echo ""
    echo "❌ Migration failed. Check the error above."
    exit 1
fi
