#!/bin/bash

# BDS Management System - Main Setup Script
# Provides options for different setup types

set -e

echo "🚀 BDS Management System - Setup Options"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if scripts directory exists
if [ ! -d "scripts" ]; then
    print_error "Scripts directory not found!"
    exit 1
fi

echo ""
echo "📋 Available Setup Options:"
echo "1. Complete Setup (Database + Backend + Frontend) - RECOMMENDED"
echo "2. Docker Only (Database setup)"
echo "3. Azure Setup (Cloud deployment)"
echo "4. Database Only"
echo "5. View all available scripts"
echo ""

read -p "Choose an option (1-5): " choice

case $choice in
    1)
        print_status "Running Complete Setup..."
        chmod +x scripts/setup-complete.sh
        ./scripts/setup-complete.sh
        ;;
    2)
        print_status "Running Docker Setup..."
        chmod +x scripts/setup-docker.sh
        ./scripts/setup-docker.sh
        ;;
    3)
        print_status "Running Azure Setup..."
        chmod +x scripts/setup-azure.sh
        ./scripts/setup-azure.sh
        ;;
    4)
        print_status "Running Database Setup..."
        chmod +x scripts/setup-database.sh
        ./scripts/setup-database.sh
        ;;
    5)
        echo ""
        print_status "Available Scripts in scripts/ folder:"
        echo ""
        ls -la scripts/ | grep "\.sh$" | while read line; do
            filename=$(echo $line | awk '{print $9}')
            echo "   📄 $filename"
        done
        echo ""
        print_status "To run any script directly:"
        echo "   chmod +x scripts/[script-name].sh"
        echo "   ./scripts/[script-name].sh"
        ;;
    *)
        print_error "Invalid option. Please choose 1-5."
        exit 1
        ;;
esac
