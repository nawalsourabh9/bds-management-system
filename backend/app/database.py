# Simple database configuration for now
# We'll add SQLAlchemy later when compatibility issues are resolved

from app.core.config import settings
import asyncio
from datetime import datetime

# For now, we'll use a simple in-memory storage
# This can be replaced with proper database integration later

class SimpleDB:
    def __init__(self):
        self.data = {
            'users': [
                {
                    'id': 1,
                    'email': 'admin@bds.com',
                    'first_name': 'Admin',
                    'last_name': 'User',
                    'role': 'admin',
                    'created_at': datetime.now().isoformat()
                }
            ],
            'tasks': [
                {
                    'id': 1,
                    'title': 'Sample Task',
                    'description': 'This is a sample task for testing',
                    'status': 'pending',
                    'priority': 'medium',
                    'created_at': datetime.now().isoformat()
                }
            ],
            'departments': [
                {
                    'id': 1,
                    'name': 'Quality',
                    'description': 'Quality Management Department'
                },
                {
                    'id': 2,
                    'name': 'Production',
                    'description': 'Production Department'
                }
            ]
        }
        self.connected = True
        self.last_check = datetime.now()
    
    def get_data(self, table):
        return self.data.get(table, [])
    
    def add_data(self, table, item):
        if table not in self.data:
            self.data[table] = []
        item['id'] = len(self.data[table]) + 1
        item['created_at'] = datetime.now().isoformat()
        self.data[table].append(item)
        return item
    
    def health_check(self):
        """Check database health status"""
        try:
            # Simulate database connection check
            self.last_check = datetime.now()
            return {
                'status': 'connected',
                'type': 'in-memory',
                'last_check': self.last_check.isoformat(),
                'tables': list(self.data.keys()),
                'record_counts': {table: len(data) for table, data in self.data.items()}
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'last_check': self.last_check.isoformat()
            }

# Global database instance
db = SimpleDB()

async def get_db():
    return db

async def check_database_health():
    """Async database health check"""
    return db.health_check()
