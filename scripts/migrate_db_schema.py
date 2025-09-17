#!/usr/bin/env python3
"""
BDS QMS - Database Schema Migration Tool

This script migrates database schema from a source to target database
using environment variables for configuration.
"""

import os
import sys
import argparse
import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
import logging
from typing import Dict, Any, Optional, List, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Database configuration class"""
    def __init__(self, prefix: str = ""):
        self.prefix = f"{prefix}_" if prefix else ""
        self.host = os.getenv(f"{self.prefix}POSTGRES_HOST", "localhost")
        self.port = os.getenv(f"{self.prefix}POSTGRES_PORT", "5432")
        self.name = os.getenv(f"{self.prefix}POSTGRES_DB", "bds_eqms")
        self.user = os.getenv(f"{self.prefix}POSTGRES_USER", "postgres")
        self.password = os.getenv(f"{self.prefix}POSTGRES_PASSWORD", "")
        self.sslmode = os.getenv(f"{self.prefix}POSTGRES_SSLMODE", "require")
        
        # For Azure, we need to append @server-name to the username
        if self.host.endswith(".postgres.database.azure.com"):
            server_name = self.host.split('.')[0]
            if '@' not in self.user and not self.user.endswith(f"@{server_name}"):
                self.user = f"{self.user}@{server_name}"

    def get_connection_string(self) -> str:
        """Get connection string for PostgreSQL"""
        return (
            f"host={self.host} "
            f"port={self.port} "
            f"dbname={self.name} "
            f"user={self.user.split('@')[0]} "  # Remove @server for connection string
            f"password={self.password} "
            f"sslmode={self.sslmode}"
        )

class DatabaseMigrator:
    """Handles database schema migration between databases"""
    
    def __init__(self, source_config: DatabaseConfig, target_config: DatabaseConfig):
        self.source_config = source_config
        self.target_config = target_config
        self.ignored_schemas = ['pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1']
    
    def get_connection(self, config: DatabaseConfig):
        """Create a database connection"""
        try:
            conn = psycopg2.connect(config.get_connection_string())
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            return conn
        except Exception as e:
            logger.error(f"Error connecting to database: {e}")
            raise
    
    def get_database_objects(self, conn, object_type: str) -> List[Tuple[str, str]]:
        """Get list of database objects (tables, views, etc.)"""
        query = """
        SELECT n.nspname as schema_name, 
               c.relname as object_name
        FROM pg_catalog.pg_class c
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = %s
          AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        ORDER BY n.nspname, c.relname;
        """
        
        # Map object types to relkind values
        relkinds = {
            'table': 'r',
            'view': 'v',
            'function': 'f',
            'index': 'i',
            'sequence': 'S',
            'type': 'T',
            'schema': 'n',
        }
        
        with conn.cursor() as cur:
            cur.execute(query, (relkinds.get(object_type, object_type),))
            return cur.fetchall()
    
    def get_table_ddl(self, conn, schema: str, table: str) -> str:
        """Get DDL for a specific table"""
        query = """
        SELECT pg_get_tabledef(%s, %s);
        """
        with conn.cursor() as cur:
            cur.execute(query, (schema, table))
            return cur.fetchone()[0]
    
    def get_function_ddl(self, conn, schema: str, function: str) -> str:
        """Get DDL for a specific function"""
        query = """
        SELECT pg_get_functiondef(p.oid) as function_definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = %s
        AND p.proname = %s;
        """
        with conn.cursor() as cur:
            cur.execute(query, (schema, function))
            result = cur.fetchone()
            return result[0] if result else ""
    
    def migrate_schema(self):
        """Migrate schema from source to target database"""
        logger.info("Starting database schema migration...")
        
        with self.get_connection(self.source_config) as source_conn, \
             self.get_connection(self.target_config) as target_conn:
            
            # 1. Create schemas if they don't exist
            self._create_schemas(source_conn, target_conn)
            
            # 2. Create tables
            self._create_tables(source_conn, target_conn)
            
            # 3. Create functions
            self._create_functions(source_conn, target_conn)
            
            # 4. Create views
            self._create_views(source_conn, target_conn)
            
            # 5. Create indexes
            self._create_indexes(source_conn, target_conn)
            
        logger.info("Database schema migration completed successfully!")
    
    def _create_schemas(self, source_conn, target_conn):
        """Create schemas in target database"""
        logger.info("Creating schemas...")
        
        # Get all schemas from source
        with source_conn.cursor() as cur:
            cur.execute("""
                SELECT nspname 
                FROM pg_namespace 
                WHERE nspname NOT LIKE 'pg_%' 
                AND nspname != 'information_schema'
                ORDER BY nspname;
            """)
            schemas = [row[0] for row in cur.fetchall()]
        
        # Create schemas in target
        with target_conn.cursor() as cur:
            for schema in schemas:
                if schema not in self.ignored_schemas:
                    try:
                        cur.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(
                            sql.Identifier(schema)
                        ))
                        logger.info(f"Created schema: {schema}")
                    except Exception as e:
                        logger.error(f"Error creating schema {schema}: {e}")
                        raise
    
    def _create_tables(self, source_conn, target_conn):
        """Create tables in target database"""
        logger.info("Creating tables...")
        
        # Get all tables from source
        tables = self.get_database_objects(source_conn, 'table')
        
        with target_conn.cursor() as cur:
            for schema, table in tables:
                if schema not in self.ignored_schemas:
                    try:
                        # Get table DDL
                        ddl = self.get_table_ddl(source_conn, schema, table)
                        if ddl:
                            # Execute DDL in target
                            cur.execute(ddl)
                            logger.info(f"Created table: {schema}.{table}")
                    except Exception as e:
                        logger.error(f"Error creating table {schema}.{table}: {e}")
                        raise
    
    def _create_functions(self, source_conn, target_conn):
        """Create functions in target database"""
        logger.info("Creating functions...")
        
        # Get all functions from source
        functions = self.get_database_objects(source_conn, 'function')
        
        with target_conn.cursor() as cur:
            for schema, func in functions:
                if schema not in self.ignored_schemas:
                    try:
                        # Get function DDL
                        ddl = self.get_function_ddl(source_conn, schema, func)
                        if ddl:
                            # Execute DDL in target
                            cur.execute(ddl)
                            logger.info(f"Created function: {schema}.{func}")
                    except Exception as e:
                        logger.error(f"Error creating function {schema}.{func}: {e}")
                        # Continue with next function on error
                        continue
    
    def _create_views(self, source_conn, target_conn):
        """Create views in target database"""
        logger.info("Creating views...")
        
        # Get all views from source
        views = self.get_database_objects(source_conn, 'view')
        
        with target_conn.cursor() as cur:
            for schema, view in views:
                if schema not in self.ignored_schemas:
                    try:
                        # Get view definition
                        cur.execute("""
                            SELECT pg_get_viewdef(%s::regclass, true);
                        """, (f"{schema}.{view}",))
                        view_def = cur.fetchone()[0]
                        
                        # Create view in target
                        cur.execute(sql.SQL("CREATE OR REPLACE VIEW {}.{} AS {}").format(
                            sql.Identifier(schema),
                            sql.Identifier(view),
                            sql.SQL(view_def)
                        ))
                        logger.info(f"Created view: {schema}.{view}")
                    except Exception as e:
                        logger.error(f"Error creating view {schema}.{view}: {e}")
                        # Continue with next view on error
                        continue
    
    def _create_indexes(self, source_conn, target_conn):
        """Create indexes in target database"""
        logger.info("Creating indexes...")
        
        # Get all indexes from source
        indexes = self.get_database_objects(source_conn, 'index')
        
        with target_conn.cursor() as cur:
            for schema, index in indexes:
                if schema not in self.ignored_schemas:
                    try:
                        # Get index definition
                        cur.execute("""
                            SELECT pg_get_indexdef(i.indexrelid)
                            FROM pg_index i
                            JOIN pg_class c ON c.oid = i.indexrelid
                            JOIN pg_namespace n ON n.oid = c.relnamespace
                            WHERE n.nspname = %s AND c.relname = %s;
                        """, (schema, index))
                        
                        index_def = cur.fetchone()
                        if index_def and index_def[0]:
                            # Execute index creation in target
                            cur.execute(index_def[0])
                            logger.info(f"Created index: {schema}.{index}")
                    except Exception as e:
                        logger.error(f"Error creating index {schema}.{index}: {e}")
                        # Continue with next index on error
                        continue

def load_environment(env_file: str = None) -> bool:
    """Load environment variables from .env file"""
    try:
        if env_file and os.path.exists(env_file):
            load_dotenv(env_file, override=True)
            logger.info(f"Loaded environment from {env_file}")
        else:
            # Try to load from default .env files
            env_files = ['.env', '.env.local', '.env.azure']
            loaded = False
            for env_file in env_files:
                if os.path.exists(env_file):
                    load_dotenv(env_file)
                    logger.info(f"Loaded environment from {env_file}")
                    loaded = True
            
            if not loaded:
                logger.warning("No .env file found. Using system environment variables.")
        
        return True
    except Exception as e:
        logger.error(f"Error loading environment: {e}")
        return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Migrate database schema between PostgreSQL databases')
    parser.add_argument('--source-env', help='Source environment file')
    parser.add_argument('--target-env', help='Target environment file')
    parser.add_argument('--source-prefix', default='', help='Prefix for source environment variables')
    parser.add_argument('--target-prefix', default='AZURE_', help='Prefix for target environment variables')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    
    args = parser.parse_args()
    
    if args.debug:
        logger.setLevel(logging.DEBUG)
    
    # Load environment variables
    load_environment(args.source_env)
    
    # Create database configurations
    source_config = DatabaseConfig(prefix=args.source_prefix)
    target_config = DatabaseConfig(prefix=args.target_prefix)
    
    # Log configurations (without passwords)
    logger.info(f"Source database: {source_config.user}@{source_config.host}:{source_config.port}/{source_config.name}")
    logger.info(f"Target database: {target_config.user}@{target_config.host}:{target_config.port}/{target_config.name}")
    
    # Create migrator and run migration
    migrator = DatabaseMigrator(source_config, target_config)
    migrator.migrate_schema()

if __name__ == "__main__":
    main()
