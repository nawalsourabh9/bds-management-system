#!/usr/bin/env python3
"""
Apply database schema using Azure backend API
"""

import json
import requests
import sys
import os

BACKEND_URL = "https://bds-backend.graystone-766c02c8.centralindia.azurecontainerapps.io"
SCHEMA_FILE = "database/schema/04-recurring-parent-child.sql"

def main():
    print("🚀 Applying database schema to Azure PostgreSQL...")
    print(f"📄 Schema file: {SCHEMA_FILE}")
    print(f"🔗 Backend URL: {BACKEND_URL}")
    
    # Check if schema file exists
    if not os.path.exists(SCHEMA_FILE):
        print(f"❌ Schema file not found: {SCHEMA_FILE}")
        sys.exit(1)
    
    # Read the schema file
    print("📖 Reading schema file...")
    try:
        with open(SCHEMA_FILE, 'r') as f:
            sql_content = f.read()
    except Exception as e:
        print(f"❌ Error reading schema file: {e}")
        sys.exit(1)
    
    # Apply the schema
    print("🔧 Applying schema to database...")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/v1/execute-sql",
            headers={"Content-Type": "application/json"},
            json={"sql": sql_content},
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Schema applied successfully!")
            print("📊 Response:")
            print(json.dumps(result, indent=2))
            
            # Check results
            if "results" in result:
                success_count = sum(1 for r in result["results"] if r.get("success", False))
                total_count = len(result["results"])
                print(f"📈 Successfully executed: {success_count}/{total_count} statements")
                
                # Show any errors
                errors = [r for r in result["results"] if not r.get("success", False)]
                if errors:
                    print("⚠️  Errors encountered:")
                    for error in errors:
                        print(f"   Statement {error['statement']}: {error.get('error', 'Unknown error')}")
        else:
            print(f"❌ Failed to apply schema: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            sys.exit(1)
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)
    
    print("🎉 Database schema update completed!")

if __name__ == "__main__":
    main()
