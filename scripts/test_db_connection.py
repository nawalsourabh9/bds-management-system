#!/usr/bin/env python3

import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

def test_connection():
    # Load environment variables
    load_dotenv()
    
    # Database connection parameters
    db_params = {
        "host": os.getenv("POSTGRES_SERVER") + ".postgres.database.azure.com",
        "database": os.getenv("POSTGRES_DB"),
        "user": os.getenv("POSTGRES_ADMIN_USER") + "@" + os.getenv("POSTGRES_SERVER"),
        "password": os.getenv("POSTGRES_PASSWORD"),
        "sslmode": "require"
    }
    
    try:
        # Connect to the database
        conn = psycopg2.connect(**db_params)
        print("✅ Successfully connected to the database!")
        
        # Create a cursor
        cur = conn.cursor()
        
        # Execute a test query
        cur.execute("SELECT version();")
        db_version = cur.fetchone()
        print(f"📊 Database version: {db_version[0]}")
        
        # Close the cursor and connection
        cur.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error connecting to the database: {e}")
        return False

if __name__ == "__main__":
    test_connection()
