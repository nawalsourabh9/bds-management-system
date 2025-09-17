#!/bin/bash

echo "🚀 BDS Management System - Quick Setup"
echo "======================================"

# Make scripts executable
chmod +x setup-project.sh
chmod +x setup-backend.sh
chmod +x setup-frontend.sh
chmod +x setup-database.sh

echo "📦 Running complete setup..."
./setup-project.sh

echo ""
echo "🎉 Setup completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Start the development servers:"
echo "   ./start-dev.sh"
echo ""
echo "2. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "3. Default login credentials:"
echo "   Email: admin@bds.com"
echo "   Password: admin123"
echo ""
echo "🚀 Happy coding!"
