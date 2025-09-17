#!/bin/bash

# Backend Version Bump Script
# Usage: ./bump-version-bknd.sh [--patch|--minor|--major|--custom <version>]

set -e

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

# Function to get current version from package.json
get_current_version() {
    node -p "require('./package.json').version"
}

# Function to bump version
bump_version() {
    local bump_type=$1
    local custom_version=$2
    
    if [ "$bump_type" = "custom" ] && [ -n "$custom_version" ]; then
        new_version=$custom_version
    else
        current_version=$(get_current_version)
        IFS='.' read -ra VERSION_PARTS <<< "$current_version"
        major=${VERSION_PARTS[0]}
        minor=${VERSION_PARTS[1]}
        patch=${VERSION_PARTS[2]}
        
        case $bump_type in
            "patch")
                new_version="$major.$minor.$((patch + 1))"
                ;;
            "minor")
                new_version="$major.$((minor + 1)).0"
                ;;
            "major")
                new_version="$((major + 1)).0.0"
                ;;
            *)
                print_error "Invalid bump type. Use --patch, --minor, --major, or --custom <version>"
                exit 1
                ;;
        esac
    fi
    
    echo $new_version
}

# Main script
main() {
    print_status "Starting backend version bump..."
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in current directory"
        exit 1
    fi
    
    # Parse arguments
    if [ $# -eq 0 ]; then
        print_warning "No version bump type specified. Using --patch"
        bump_type="patch"
        custom_version=""
    elif [ "$1" = "--custom" ] && [ -n "$2" ]; then
        bump_type="custom"
        custom_version="$2"
    elif [ "$1" = "--patch" ] || [ "$1" = "--minor" ] || [ "$1" = "--major" ]; then
        bump_type="${1#--}"
        custom_version=""
    else
        print_error "Invalid arguments. Usage: $0 [--patch|--minor|--major|--custom <version>]"
        exit 1
    fi
    
    # Get current version
    current_version=$(get_current_version)
    print_status "Current version: $current_version"
    
    # Calculate new version
    new_version=$(bump_version "$bump_type" "$custom_version")
    print_status "New version: $new_version"
    
    # Update package.json
    print_status "Updating package.json..."
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.version = '$new_version';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    
    # Create git tag
    print_status "Creating git tag: v$new_version"
    git add package.json
    git commit -m "Bump backend version to $new_version" || print_warning "No changes to commit or git not available"
    git tag "v$new_version" || print_warning "Could not create git tag"
    
    print_status "Backend version bump completed successfully!"
    print_status "New version: $new_version"
    print_status "Don't forget to push the tag: git push origin v$new_version"
}

# Call main function with all arguments
main "$@"
