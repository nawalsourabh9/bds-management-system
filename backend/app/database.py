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
                    'email': 'admin@bdsmanufacturing.in',
                    'first_name': 'Super',
                    'last_name': 'Admin',
                    'role': 'superadmin',
                    'department': 'Executive Office',
                    'position': 'Super Administrator',
                    'is_active': True,
                    'created_at': datetime.now().isoformat()
                },
                {
                    'id': 2,
                    'email': 'admin@bds.com',
                    'first_name': 'Admin',
                    'last_name': 'User',
                    'role': 'admin',
                    'department': 'IT',
                    'position': 'System Administrator',
                    'is_active': True,
                    'created_at': datetime.now().isoformat()
                },
                {
                    'id': 2,
                    'email': 'sourabh.nawal@bdsmanufacturing.in',
                    'first_name': 'Sourabh',
                    'last_name': 'Nawal',
                    'role': 'admin',
                    'department': 'Executive',
                    'position': 'Chief Business Strategy Officer (CBS)',
                    'is_active': True,
                    'created_at': datetime.now().isoformat()
                },
                {
                    'id': 3,
                    'email': 'siddharth.jain@bdsmanufacturing.in',
                    'first_name': 'Siddharth',
                    'last_name': 'Jain',
                    'role': 'admin',
                    'department': 'Executive',
                    'position': 'Chief Operating Officer (COO)',
                    'is_active': True,
                    'created_at': datetime.now().isoformat()
                },
                {
                    'id': 4,
                    'email': 'raman.bansal@bdsmanufacturing.in',
                    'first_name': 'Raman',
                    'last_name': 'Bansal',
                    'role': 'manager',
                    'department': 'Engineering',
                    'position': 'Engineering Head',
                    'is_active': True,
                    'created_at': datetime.now().isoformat()
                },
                {
                    'id': 5,
                    'email': 'priya.sharma@bdsmanufacturing.in',
                    'first_name': 'Priya',
                    'last_name': 'Sharma',
                    'role': 'manager',
                    'department': 'Quality',
                    'position': 'Quality Manager',
                    'is_active': True,
                    'created_at': datetime.now().isoformat()
                },
                {
                    'id': 6,
                    'email': 'rajesh.kumar@bdsmanufacturing.in',
                    'first_name': 'Rajesh',
                    'last_name': 'Kumar',
                    'role': 'manager',
                    'department': 'Production',
                    'position': 'Production Manager',
                    'is_active': True,
                    'created_at': datetime.now().isoformat()
                },
                {
                    'id': 7,
                    'email': 'anita.patel@bdsmanufacturing.in',
                    'first_name': 'Anita',
                    'last_name': 'Patel',
                    'role': 'manager',
                    'department': 'HR',
                    'position': 'HR Manager',
                    'is_active': True,
                    'created_at': datetime.now().isoformat()
                },
                {
                    'id': 8,
                    'email': 'vikram.singh@bdsmanufacturing.in',
                    'first_name': 'Vikram',
                    'last_name': 'Singh',
                    'role': 'user',
                    'department': 'Engineering',
                    'position': 'Senior Engineer',
                    'is_active': True,
                    'created_at': datetime.now().isoformat()
                },
                {
                    'id': 9,
                    'email': 'meera.reddy@bdsmanufacturing.in',
                    'first_name': 'Meera',
                    'last_name': 'Reddy',
                    'role': 'user',
                    'department': 'Quality',
                    'position': 'Quality Inspector',
                    'is_active': True,
                    'created_at': datetime.now().isoformat()
                },
                {
                    'id': 10,
                    'email': 'arun.verma@bdsmanufacturing.in',
                    'first_name': 'Arun',
                    'last_name': 'Verma',
                    'role': 'user',
                    'department': 'Production',
                    'position': 'Production Supervisor',
                    'is_active': True,
                    'created_at': datetime.now().isoformat()
                }
            ],
            'departments': [
                {
                    'id': 1,
                    'name': 'Executive',
                    'description': 'Executive Leadership Team'
                },
                {
                    'id': 2,
                    'name': 'Engineering',
                    'description': 'Engineering and R&D Department'
                },
                {
                    'id': 3,
                    'name': 'Quality',
                    'description': 'Quality Assurance and Control Department'
                },
                {
                    'id': 4,
                    'name': 'Production',
                    'description': 'Production and Manufacturing Department'
                },
                {
                    'id': 5,
                    'name': 'HR',
                    'description': 'Human Resources Department'
                },
                {
                    'id': 6,
                    'name': 'IT',
                    'description': 'Information Technology Department'
                },
                {
                    'id': 7,
                    'name': 'Finance',
                    'description': 'Finance and Accounting Department'
                },
                {
                    'id': 8,
                    'name': 'Sales',
                    'description': 'Sales and Marketing Department'
                },
                {
                    'id': 9,
                    'name': 'Supply Chain',
                    'description': 'Supply Chain and Procurement Department'
                },
                {
                    'id': 10,
                    'name': 'Maintenance',
                    'description': 'Maintenance and Facilities Department'
                }
            ],
            'tasks': [
                {
                    'id': 1,
                    'title': 'Quality Control Review - Product Line A',
                    'description': 'Conduct comprehensive quality control review for Product Line A manufacturing process',
                    'status': 'in-progress',
                    'priority': 'high',
                    'department': 'Quality',
                    'assignee': 'meera.reddy@bdsmanufacturing.in',
                    'due_date': '2025-08-25',
                    'created_at': datetime.now().isoformat(),
                    'is_recurring': False,
                    'is_customer_related': False,
                    'attachments_required': 'required'
                },
                {
                    'id': 2,
                    'title': 'Engineering Design Review - New Component',
                    'description': 'Review engineering design specifications for new component integration',
                    'status': 'pending',
                    'priority': 'medium',
                    'department': 'Engineering',
                    'assignee': 'vikram.singh@bdsmanufacturing.in',
                    'due_date': '2025-08-28',
                    'created_at': datetime.now().isoformat(),
                    'is_recurring': False,
                    'is_customer_related': False,
                    'attachments_required': 'optional'
                },
                {
                    'id': 3,
                    'title': 'Production Schedule Optimization',
                    'description': 'Optimize production schedule for Q4 manufacturing targets',
                    'status': 'not-started',
                    'priority': 'high',
                    'department': 'Production',
                    'assignee': 'arun.verma@bdsmanufacturing.in',
                    'due_date': '2025-09-01',
                    'created_at': datetime.now().isoformat(),
                    'is_recurring': True,
                    'recurring_frequency': 'monthly',
                    'is_customer_related': False,
                    'attachments_required': 'none'
                },
                {
                    'id': 4,
                    'title': 'Employee Training Program - Safety Protocols',
                    'description': 'Develop and implement safety training program for all production staff',
                    'status': 'pending',
                    'priority': 'high',
                    'department': 'HR',
                    'assignee': 'anita.patel@bdsmanufacturing.in',
                    'due_date': '2025-08-30',
                    'created_at': datetime.now().isoformat(),
                    'is_recurring': True,
                    'recurring_frequency': 'quarterly',
                    'is_customer_related': False,
                    'attachments_required': 'required'
                },
                {
                    'id': 5,
                    'title': 'Customer Complaint Resolution - Order #12345',
                    'description': 'Address customer complaint regarding delivery timeline for Order #12345',
                    'status': 'in-progress',
                    'priority': 'high',
                    'department': 'Sales',
                    'assignee': 'sourabh.nawal@bdsmanufacturing.in',
                    'due_date': '2025-08-23',
                    'created_at': datetime.now().isoformat(),
                    'is_recurring': False,
                    'is_customer_related': True,
                    'customer_name': 'ABC Manufacturing Ltd.',
                    'attachments_required': 'required'
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
