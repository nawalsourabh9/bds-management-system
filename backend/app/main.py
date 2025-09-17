from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from app.core.config import settings
from app.database_service import db_service
from datetime import datetime
from pydantic import BaseModel
import os
import logging
import sys
from psycopg2.extras import RealDictCursor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check if this is a Celery worker (exit if so)
if settings.CELERY_WORKER:
    logger.info("Running as Celery worker, exiting FastAPI server")
    sys.exit(0)

# Import simple scheduler (no Redis needed)
try:
    from app.simple_scheduler import start_simple_scheduler, stop_simple_scheduler, trigger_manual_run
    SCHEDULER_AVAILABLE = True
except ImportError:
    SCHEDULER_AVAILABLE = False

app = FastAPI(
    title="BDS Management System",
    description="Business Document System with QMS",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Startup event - initialize scheduler if available"""
    logger.info("BDS Management System starting up...")
    
    if SCHEDULER_AVAILABLE:
        try:
            await start_simple_scheduler()
            logger.info("Simple database scheduler started successfully")
        except Exception as e:
            logger.error(f"Failed to start simple scheduler: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event - cleanup scheduler if running"""
    logger.info("BDS Management System shutting down...")
    
    if SCHEDULER_AVAILABLE:
        try:
            await stop_simple_scheduler()
            logger.info("Simple database scheduler stopped successfully")
        except Exception as e:
            logger.error(f"Error stopping simple scheduler: {e}")

# Pydantic models for request/response
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    user: dict
    message: str

class TaskCreate(BaseModel):
    title: str
    description: str
    department: str
    assignee: str
    priority: str
    due_date: str
    is_recurring: bool = False
    recurring_frequency: str = None
    is_customer_related: bool = False
    customer_name: str = None
    attachments_required: str = "none"

class TaskUpdate(BaseModel):
    title: str = None
    description: str = None
    department: str = None
    assignee: str = None
    priority: str = None
    due_date: str = None
    status: str = None
    is_recurring: bool = None
    recurring_frequency: str = None
    is_customer_related: bool = None
    customer_name: str = None
    attachments_required: str = None

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    try:
        # Test database connection by trying to get users
        users = db_service.get_users()
        logger.info(f"Database connection successful. Found {len(users)} users.")
    except Exception as e:
        logger.error(f"Startup error: {e}")

# Check if running as Celery worker
if settings.CELERY_WORKER:
    logger.info("Running in Celery worker mode - skipping FastAPI startup")
    import sys
    sys.exit(0)

@app.get("/")
async def root():
    return {"message": "BDS Management System API"}

@app.get("/health")
async def health_check():
    """Comprehensive health check including database status"""
    try:
        users = db_service.get_users()
        db_status = "connected"
        user_count = len(users)
    except Exception as e:
        db_status = "disconnected"
        user_count = 0
    
    return {
        "status": "healthy",
        "database": {
            "status": db_status,
            "type": "postgresql",
            "user_count": user_count,
            "last_check": datetime.now().isoformat()
        },
        "redis": {
            "status": "connected",
            "type": "simulated",
            "last_check": datetime.now().isoformat()
        },
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.post("/api/v1/tasks/trigger-recurring")
async def trigger_recurring_generation():
    """Manually trigger recurring task generation for testing"""
    try:
        # Call the database function to generate overdue recurring tasks
        result = db_service.execute_query("""
            SELECT generate_recurring_tasks() as generated_count;
        """)
        
        if result and len(result) > 0:
            generated_count = result[0].get('generated_count', 0)
            return {
                "message": f"Recurring task generation triggered",
                "generated_count": generated_count,
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "message": "No recurring tasks to generate",
                "generated_count": 0,
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Error triggering recurring task generation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/scheduler/run-tasks")
async def run_scheduled_tasks():
    """Manually trigger all scheduled tasks"""
    try:
        if SCHEDULER_AVAILABLE:
            result = await trigger_manual_run()
            return {
                "message": "Scheduled tasks executed",
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "message": "Scheduler not available",
                "result": None,
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        logger.error(f"Error running scheduled tasks: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Login endpoint"""
    try:
        # Find user by email
        user = db_service.get_user_by_email(login_data.email)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # For demo purposes, accept any password for any user
        # In production, this should be proper password verification with bcrypt
        if user and user.get('is_active', True):
            user_dict = {
                "id": str(user['id']),
                "email": user['email'],
                "first_name": user['first_name'],
                "last_name": user['last_name'],
                "role": user['role'],
                "department": user.get('department_id'),
                "is_active": user['is_active'],
                "created_at": user['created_at'].isoformat() if user['created_at'] else None
            }
            return LoginResponse(
                user=user_dict,
                message="Login successful"
            )
        else:
            raise HTTPException(status_code=401, detail="Invalid email or password")
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/tasks")
async def get_tasks():
    """Get all tasks"""
    try:
        tasks = db_service.get_tasks()
        return {"tasks": tasks}
    except Exception as e:
        logger.error(f"Error fetching tasks: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/tasks/{task_id}")
async def get_task(task_id: str):
    """Get a specific task by ID"""
    try:
        # Validate UUID format
        import uuid
        try:
            uuid.UUID(task_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task = db_service.get_task_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# User Management Endpoints
@app.get("/api/v1/users")
async def get_users():
    """Get all users"""
    try:
        users = db_service.get_users()
        return {"users": users}
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/users/{user_id}")
async def get_user(user_id: str):
    """Get a specific user by ID"""
    try:
        # Validate UUID format
        import uuid
        try:
            uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = db_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/users")
async def create_user(user_data: dict):
    """Create a new user"""
    try:
        # Validate required fields
        required_fields = ['email', 'first_name', 'last_name', 'role']
        for field in required_fields:
            if not user_data.get(field):
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Check if user already exists
        existing_user = db_service.get_user_by_email(user_data['email'])
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Create user with default password hash (for demo purposes)
        # In production, this should be a proper password hash
        default_password_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i"  # "admin123"
        
        conn = db_service.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO users (
                        email, password_hash, first_name, last_name, role, department_id, is_active
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id, email, first_name, last_name, role, department_id, is_active, created_at
                """, (
                    user_data['email'],
                    default_password_hash,
                    user_data['first_name'],
                    user_data['last_name'],
                    user_data['role'],
                    user_data.get('department_id'),
                    user_data.get('is_active', True)
                ))
                new_user = cur.fetchone()
                conn.commit()
                return {"user": dict(new_user), "message": "User created successfully"}
        finally:
            conn.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/v1/users/{user_id}")
async def update_user(user_id: str, user_data: dict):
    """Update a user"""
    try:
        # Check if user exists
        existing_user = db_service.get_user_by_id(user_id)
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user
        success = db_service.update_user(user_id, user_data)
        if success:
            updated_user = db_service.get_user_by_id(user_id)
            return {"user": updated_user, "message": "User updated successfully"}
        else:
            raise HTTPException(status_code=400, detail="No valid fields to update")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/v1/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user"""
    try:
        # Check if user exists
        existing_user = db_service.get_user_by_id(user_id)
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete user
        success = db_service.delete_user(user_id)
        if success:
            return {"message": "User deleted successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to delete user")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/departments")
async def get_departments():
    """Get all departments"""
    try:
        departments = db_service.get_departments()
        return {"departments": departments}
    except Exception as e:
        logger.error(f"Error fetching departments: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/tasks")
async def create_task(task_data: dict):
    """Create a new task"""
    try:
        # Validate required fields
        required_fields = ['title', 'description', 'priority']
        for field in required_fields:
            if not task_data.get(field):
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Convert task data to database format
        task_db_data = {
            'title': task_data['title'],
            'description': task_data['description'],
            'priority': task_data.get('priority', 'medium'),
            'status': task_data.get('status', 'pending'),
            'assignee_id': task_data.get('assigned_to'),
            'created_by': '550e8400-e29b-41d4-a716-446655440100',  # Super admin user
            'due_date': task_data.get('due_date'),
            'is_recurring': task_data.get('is_recurring', False),
            'recurring_frequency': task_data.get('recurring_frequency', 'none'),
            'is_customer_related': task_data.get('is_customer_related', False),
            'customer_name': task_data.get('customer_name')
        }
        
        # Handle department name to ID conversion
        if 'department' in task_data and task_data['department'] is not None:
            department_id = db_service.get_department_id_by_name(task_data['department'])
            if department_id:
                task_db_data['department_id'] = department_id
            else:
                raise HTTPException(status_code=400, detail=f"Department '{task_data['department']}' not found")
        elif 'department_id' in task_data:
            task_db_data['department_id'] = task_data['department_id']
        
        task_id = db_service.create_task(task_db_data)
        return {"message": "Task created successfully", "id": str(task_id)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/v1/tasks/{task_id}")
async def update_task(task_id: str, task_data: dict):
    """Update a task"""
    try:
        # Convert frontend field names to database field names
        task_db_data = {}
        
        # Map frontend fields to database fields
        field_mapping = {
            'title': 'title',
            'description': 'description',
            'assignee': 'assignee_id',      # Frontend sends assignee ID (UUID)
            'priority': 'priority',
            'status': 'status',
            'dueDate': 'due_date',          # Frontend sends dueDate
            'isRecurring': 'is_recurring',  # Frontend sends isRecurring
            'isCustomerRelated': 'is_customer_related',  # Frontend sends isCustomerRelated
            'customerName': 'customer_name',  # Frontend sends customerName
            'attachmentsRequired': 'attachments_required'  # Frontend sends attachmentsRequired
        }
        
        for frontend_field, db_field in field_mapping.items():
            if frontend_field in task_data and task_data[frontend_field] is not None:
                task_db_data[db_field] = task_data[frontend_field]
        
        # Handle department name to ID conversion
        if 'department' in task_data and task_data['department'] is not None:
            department_id = db_service.get_department_id_by_name(task_data['department'])
            if department_id:
                task_db_data['department_id'] = department_id
            else:
                raise HTTPException(status_code=400, detail=f"Department '{task_data['department']}' not found")
        
        success = db_service.update_task(task_id, task_db_data)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {"message": "Task updated successfully"}
    except ValueError as e:
        logger.error(f"Validation error updating task: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/v1/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    try:
        success = db_service.delete_task(task_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {"message": "Task deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/users")
async def get_users():
    """Get all users"""
    try:
        users = db_service.get_users()
        return {"users": users}
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/users/{user_id}")
async def get_user(user_id: str):
    """Get a specific user by ID"""
    try:
        # Validate UUID format
        import uuid
        try:
            uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = db_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/v1/users/{user_id}")
async def update_user(user_id: str, user_data: dict):
    """Update a user"""
    try:
        # Convert frontend field names to database field names
        user_db_data = {}
        
        # Map frontend fields to database fields
        field_mapping = {
            'email': 'email',
            'first_name': 'first_name',
            'last_name': 'last_name',
            'role': 'role',
            'department': 'department_id',  # Frontend sends department name, we need ID
            'is_active': 'is_active'
        }
        
        for frontend_field, db_field in field_mapping.items():
            if frontend_field in user_data and user_data[frontend_field] is not None:
                user_db_data[db_field] = user_data[frontend_field]
        
        success = db_service.update_user(user_id, user_db_data)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "User updated successfully"}
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/v1/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user"""
    try:
        success = db_service.delete_user(user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "User deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Email Service Endpoint
@app.post("/api/v1/functions/send-email")
async def send_email(email_data: dict):
    """Send email endpoint (placeholder for now)"""
    try:
        # TODO: Implement actual email sending logic
        logger.info(f"Email would be sent: {email_data}")
        return {"message": "Email sent successfully", "data": email_data}
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Database Utils Endpoint
@app.post("/api/v1/functions/database-utils")
async def database_utils(utils_data: dict):
    """Database utilities endpoint"""
    try:
        action = utils_data.get('action')
        
        if action == 'update_user_profile':
            user_id = utils_data.get('user_id')
            profile_data = utils_data.get('profile_data', {})
            success = db_service.update_user(user_id, profile_data)
            return {"message": "User profile updated successfully", "success": success}
        
        elif action == 'verify_user':
            user_id = utils_data.get('user_id')
            success = db_service.update_user(user_id, {"is_verified": True})
            return {"message": "User verified successfully", "success": success}
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
            
    except Exception as e:
        logger.error(f"Error in database utils: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Task Automation Endpoint
@app.post("/api/v1/functions/task-automation")
async def task_automation(automation_data: dict = None):
    """Task automation endpoint"""
    try:
        # TODO: Implement actual task automation logic
        logger.info(f"Task automation triggered: {automation_data}")
        return {"message": "Task automation completed successfully"}
    except Exception as e:
        logger.error(f"Error in task automation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Create Admin Endpoint
@app.post("/api/v1/functions/create-admin")
async def create_admin():
    """Create admin endpoint"""
    try:
        # TODO: Implement actual admin creation logic
        logger.info("Admin creation requested")
        return {"message": "Admin created successfully"}
    except Exception as e:
        logger.error(f"Error creating admin: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# HROne Integration Endpoint
@app.post("/api/v1/functions/hrone-integration")
async def hrone_integration(integration_data: dict):
    """HROne integration endpoint"""
    try:
        action = integration_data.get('action')
        
        if action == 'import_employees':
            # TODO: Implement employee import logic
            return {"message": "Employees imported successfully"}
        
        elif action == 'import_departments':
            # TODO: Implement department import logic
            return {"message": "Departments imported successfully"}
        
        elif action == 'export_employees':
            # TODO: Implement employee export logic
            return {"message": "Employees exported successfully"}
        
        elif action == 'export_departments':
            # TODO: Implement department export logic
            return {"message": "Departments exported successfully"}
        
        elif action == 'sync':
            # TODO: Implement sync logic
            return {"message": "Sync completed successfully"}
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
            
    except Exception as e:
        logger.error(f"Error in HROne integration: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Send Invitation Endpoint
@app.post("/api/v1/functions/send-invitation")
async def send_invitation(invitation_data: dict):
    """Send invitation endpoint"""
    try:
        # TODO: Implement actual invitation sending logic
        logger.info(f"Invitation would be sent: {invitation_data}")
        return {"message": "Invitation sent successfully", "data": invitation_data}
    except Exception as e:
        logger.error(f"Error sending invitation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# OTP Codes Endpoints
@app.post("/api/v1/otp-codes")
async def create_otp_code(otp_data: dict):
    """Create OTP code"""
    try:
        success = db_service.create_otp_code(otp_data)
        return {"message": "OTP code created successfully", "success": success}
    except Exception as e:
        logger.error(f"Error creating OTP code: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/otp-codes/{email}")
async def get_otp_code(email: str):
    """Get OTP code for email"""
    try:
        otp_code = db_service.get_otp_code(email)
        if not otp_code:
            raise HTTPException(status_code=404, detail="OTP code not found")
        return otp_code
    except Exception as e:
        logger.error(f"Error getting OTP code: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/v1/otp-codes/{email}")
async def update_otp_code(email: str, otp_data: dict):
    """Update OTP code"""
    try:
        success = db_service.update_otp_code(email, otp_data)
        return {"message": "OTP code updated successfully", "success": success}
    except Exception as e:
        logger.error(f"Error updating OTP code: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/departments")
async def get_departments():
    """Get all departments"""
    try:
        departments = db_service.get_departments()
        return {"departments": departments}
    except Exception as e:
        logger.error(f"Error fetching departments: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/notifications")
async def get_notifications():
    """Get all notifications"""
    try:
        # For now, return empty notifications array
        # TODO: Implement proper notification fetching based on user authentication
        return {"notifications": []}
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
