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
import uuid
from psycopg2.extras import RealDictCursor
import bcrypt
from fastapi import Request

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Password utility functions
def _prepare_password_bytes(password: str) -> bytes:
    if not password or not isinstance(password, str):
        return b""
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    password_bytes = _prepare_password_bytes(password)
    if not password_bytes:
        raise ValueError("Password cannot be empty")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        if not hashed_password or not isinstance(hashed_password, str):
            return False
        password_bytes = _prepare_password_bytes(plain_password)
        if not password_bytes:
            return False
        return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

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

# Helper function to convert attachments_required string to boolean
def parse_attachments_required(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('required', 'yes', 'true')
    return False

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

@app.get("/debug/db-config")
async def debug_db_config():
    """Debug endpoint to check database configuration"""
    import os
    safe_conn = "***"
    try:
        conn_str = settings.DATABASE_URL
        if "@" in conn_str:
            safe_conn = "postgresql://***@" + conn_str.split("@")[-1]
        else:
            safe_conn = "***"
    except:
        safe_conn = "ERROR"
    
    return {
        "env_vars": {
            "DB_HOST": os.getenv("DB_HOST"),
            "DB_USER": os.getenv("DB_USER"),
            "DB_NAME": os.getenv("DB_NAME"),
            "DB_PORT": os.getenv("DB_PORT"),
            "DB_SSLMODE": os.getenv("DB_SSLMODE"),
            "DB_PASSWORD": "***" if os.getenv("DB_PASSWORD") else None
        },
        "settings_values": {
            "DB_HOST": settings.DB_HOST,
            "DB_USER": settings.DB_USER,
            "DB_NAME": settings.DB_NAME,
            "DB_PORT": settings.DB_PORT,
            "DB_SSLMODE": settings.DB_SSLMODE
        },
        "connection_string": safe_conn,
        "database_service_conn": "***" + str(db_service.connection_string).split("@")[-1] if "@" in str(db_service.connection_string) else "ERROR"
    }

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

# Temporary debug endpoint to verify server-side password hashing
# Admin-protected password reset endpoints
def get_admin_reset_token() -> str:
    token = os.getenv("ADMIN_RESET_TOKEN")
    return token or ""

@app.post("/api/v1/auth/admin/reset-password")
async def admin_reset_password(payload: dict, request: Request):
    """Admin resets a user's password by email or user_id.
    Protection: header X-Admin-Token must match ADMIN_RESET_TOKEN env var.
    Body: { email?: string, user_id?: string, new_password: string }
    """
    try:
        admin_token = request.headers.get("X-Admin-Token")
        expected = get_admin_reset_token()
        if not expected or admin_token != expected:
            raise HTTPException(status_code=403, detail="Forbidden")

        email = payload.get("email")
        user_id = payload.get("user_id")
        new_password = payload.get("new_password")

        if not new_password or not isinstance(new_password, str):
            raise HTTPException(status_code=400, detail="new_password is required")

        # Truncate to bcrypt 72-byte limit before hashing for consistency
        new_password_effective = new_password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
        new_hash = hash_password(new_password_effective)

        # Locate user
        user = None
        if user_id:
            user = db_service.get_user_by_id(user_id)
        elif email:
            user = db_service.get_user_by_email(email)
        else:
            raise HTTPException(status_code=400, detail="Provide email or user_id")

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        target_id = user.get('id') if isinstance(user, dict) else user

        conn = db_service.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "UPDATE users SET password_hash = %s, is_verified = TRUE, updated_at = NOW() WHERE id = %s",
                    (new_hash, str(target_id))
                )
                conn.commit()
        finally:
            conn.close()

        return {
            "message": "Password reset successfully",
            "user_id": str(target_id),
            "hash_len": len(new_hash)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"admin_reset_password error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/auth/admin/reset-password-random")
async def admin_reset_password_random(payload: dict, request: Request):
    """Admin resets a user's password to a random one and returns it.
    Protection: header X-Admin-Token must match ADMIN_RESET_TOKEN env var.
    Body: { email?: string, user_id?: string }
    """
    try:
        admin_token = request.headers.get("X-Admin-Token")
        expected = get_admin_reset_token()
        if not expected or admin_token != expected:
            raise HTTPException(status_code=403, detail="Forbidden")

        email = payload.get("email")
        user_id = payload.get("user_id")

        # Locate user
        user = None
        if user_id:
            user = db_service.get_user_by_id(user_id)
        elif email:
            user = db_service.get_user_by_email(email)
        else:
            raise HTTPException(status_code=400, detail="Provide email or user_id")

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        target_id = user.get('id') if isinstance(user, dict) else user

        # Generate random password
        import secrets, string
        alphabet = string.ascii_letters + string.digits
        new_password = ''.join(secrets.choice(alphabet) for _ in range(12))
        new_password_effective = new_password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
        new_hash = hash_password(new_password_effective)

        conn = db_service.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "UPDATE users SET password_hash = %s, is_verified = TRUE, updated_at = NOW() WHERE id = %s",
                    (new_hash, str(target_id))
                )
                conn.commit()
        finally:
            conn.close()

        return {
            "message": "Password reset successfully",
            "user_id": str(target_id),
            "temporary_password": new_password
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"admin_reset_password_random error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# ============================================================================
# RECURRING PARENT-CHILD TASK SYSTEM
# ============================================================================

@app.get("/api/v1/recurring/parents")
async def get_recurring_parent_tasks():
    """Get all recurring parent tasks"""
    try:
        parents = db_service.execute_query("""
            SELECT t.*, d.name as department_name, u.first_name, u.last_name
            FROM tasks t
            LEFT JOIN departments d ON t.department_id = d.id
            LEFT JOIN users u ON t.created_by = u.id
            WHERE t.is_parent_task = TRUE
            ORDER BY t.created_at DESC;
        """)
        
        return {
            "parents": parents,
            "count": len(parents) if parents else 0,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching recurring parent tasks: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/recurring/parent")
async def create_recurring_parent_task(parent_data: dict):
    """Create a new recurring parent task (no due date, only start/end dates)"""
    try:
        # Validate required fields
        required_fields = ["title", "recurring_frequency", "created_by", "start_date"]
        for field in required_fields:
            if field not in parent_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Validate frequency options (matching frontend)
        valid_frequencies = ["daily", "weekly", "bi-weekly", "monthly", "quarterly", "annually"]
        if parent_data["recurring_frequency"] not in valid_frequencies:
            raise HTTPException(status_code=400, detail=f"Invalid frequency. Must be one of: {', '.join(valid_frequencies)}")
        
        # Insert parent task (no due date, only start/end dates)
        parent_id = db_service.execute_query("""
            INSERT INTO tasks (
                title, description, priority, department_id, created_by,
                start_date, end_date, is_parent_task, is_recurring, recurring_frequency,
                is_customer_related, customer_name, attachments_required, status
            ) VALUES (
                %(title)s, %(description)s, %(priority)s, %(department_id)s, %(created_by)s,
                %(start_date)s, %(end_date)s, TRUE, TRUE, %(recurring_frequency)s,
                %(is_customer_related)s, %(customer_name)s, %(attachments_required)s, 'not-started'
            ) RETURNING id;
        """, parent_data)
        
        if parent_id and len(parent_id) > 0:
            return {
                "message": "Recurring parent task created successfully",
                "parent_task_id": parent_id[0]["id"],
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create parent task")
            
    except Exception as e:
        logger.error(f"Error creating recurring parent task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/recurring/{parent_id}/first-child")
async def create_first_child_task(parent_id: str, child_data: dict):
    """Create the first child task from a parent recurring task"""
    try:
        # Validate required fields for child task
        required_fields = ["due_date", "assignee_id"]
        for field in required_fields:
            if field not in child_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Call database function to create first child task
        result = db_service.execute_query("""
            SELECT create_first_child_task(
                %(parent_task_id)s,
                %(child_due_date)s,
                %(child_assignee_id)s,
                %(child_priority)s
            ) as child_task_id;
        """, {
            "parent_task_id": parent_id,
            "child_due_date": child_data.get("due_date"),
            "child_assignee_id": child_data.get("assignee_id"),
            "child_priority": child_data.get("priority", "medium")
        })
        
        if result and len(result) > 0:
            return {
                "message": "First child task created successfully",
                "child_task_id": result[0]["child_task_id"],
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create first child task")
            
    except Exception as e:
        logger.error(f"Error creating first child task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/recurring/{parent_id}/children")
async def get_child_tasks(parent_id: str):
    """Get all child tasks for a parent recurring task"""
    try:
        children = db_service.execute_query("""
            SELECT t.*, u.first_name, u.last_name, u.email
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.parent_task_id = %(parent_id)s AND t.is_parent_task = FALSE
            ORDER BY t.child_instance_number ASC;
        """, {"parent_id": parent_id})
        
        return {
            "child_tasks": children,
            "count": len(children) if children else 0,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching child tasks: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/recurring/{parent_id}/status")
async def get_recurring_task_status(parent_id: str):
    """Get status summary for a recurring parent task"""
    try:
        status = db_service.execute_query("""
            SELECT 
                p.title as parent_title,
                p.start_date,
                p.end_date,
                p.recurring_frequency,
                COUNT(c.id) as total_children,
                COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_children,
                COUNT(CASE WHEN c.status = 'in-progress' THEN 1 END) as in_progress_children,
                COUNT(CASE WHEN c.status = 'not-started' THEN 1 END) as pending_children,
                CASE 
                    WHEN p.end_date IS NULL THEN 'Infinite'
                    ELSE EXTRACT(days FROM p.end_date - CURRENT_DATE)::text
                END as days_remaining
            FROM tasks p
            LEFT JOIN tasks c ON p.id = c.parent_task_id AND c.is_parent_task = FALSE
            WHERE p.id = %(parent_id)s AND p.is_parent_task = TRUE
            GROUP BY p.id, p.title, p.start_date, p.end_date, p.recurring_frequency;
        """, {"parent_id": parent_id})
        
        if status and len(status) > 0:
            return {"status": status[0]}
        else:
            raise HTTPException(status_code=404, detail="Parent task not found")
            
    except Exception as e:
        logger.error(f"Error fetching recurring task status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/tasks/trigger-recurring")
async def trigger_recurring_generation():
    """Manually trigger recurring task generation (now handled by triggers)"""
    try:
        # Child task generation is now handled automatically by triggers when tasks are completed
        # This endpoint is kept for backward compatibility but doesn't need to do anything
        
        return {
            "message": "Recurring task generation is now automatic via triggers",
            "note": "Child tasks are generated automatically when parent tasks are completed",
            "timestamp": datetime.now().isoformat()
        }
            
    except Exception as e:
        logger.error(f"Error in recurring task generation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/tasks/{task_id}/create-child")
async def create_child_for_parent(task_id: str, child_data: dict):
    """Manually create a child task for an existing recurring parent"""
    try:
        # Validate required fields
        if not child_data.get('due_date') or not child_data.get('assignee_id'):
            raise HTTPException(status_code=400, detail="Missing required fields: due_date and assignee_id")
        
        # Check if the parent task exists and is recurring
        parent_task = db_service.get_task_by_id(task_id)
        if not parent_task:
            raise HTTPException(status_code=404, detail="Parent task not found")
        
        if not parent_task.get('is_recurring'):
            raise HTTPException(status_code=400, detail="Parent task is not a recurring task")
        
        # Create the child task
        result = db_service.execute_query("""
            SELECT create_first_child_task(
                %(parent_task_id)s,
                %(child_due_date)s,
                %(child_assignee_id)s,
                %(child_priority)s
            ) as child_task_id;
        """, {
            "parent_task_id": task_id,
            "child_due_date": child_data.get('due_date'),
            "child_assignee_id": child_data.get('assignee_id'),
            "child_priority": child_data.get('priority', 'medium')
        })
        
        if result and len(result) > 0:
            child_task_id = result[0]["child_task_id"]
            return {
                "message": "Child task created successfully",
                "child_task_id": str(child_task_id),
                "parent_task_id": task_id
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create child task")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating child task: {e}")
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
        # Find user by email or employee_id
        user = None
        if '@' in login_data.email:  # Check if it's an email
            user = db_service.get_user_by_email(login_data.email)
        else:  # Assume it's an employee_id
            user = db_service.get_user_by_employee_id(login_data.email)
        
        if not user:
            logger.warning(f"Login attempt with invalid email/employee_id: {login_data.email}")
            raise HTTPException(status_code=401, detail="Invalid email/employee ID or password")
        
        # Verify password using bcrypt
        password_hash = user.get('password_hash')
        if not password_hash:
            logger.error(f"User {login_data.email} has no password hash - account needs password reset")
            raise HTTPException(status_code=401, detail="User account is not properly configured. Please contact administrator to reset your password.")
        
        # Ensure password_hash is a string and not None
        if not isinstance(password_hash, str):
            logger.error(f"User {login_data.email} has invalid password hash type: {type(password_hash)}")
            raise HTTPException(status_code=401, detail="User account is not properly configured. Please contact administrator to reset your password.")
        
        # Log hash info for debugging (first 20 chars only)
        logger.debug(f"Password hash length: {len(password_hash)}, starts with: {password_hash[:20]}")
        
        # Verify the provided password against the stored hash
        if not verify_password(login_data.password, password_hash):
            logger.warning(f"Invalid password attempt for user: {login_data.email} (hash length: {len(password_hash) if password_hash else 0})")
            raise HTTPException(status_code=401, detail="Invalid email/employee ID or password")
        
        # Check if user is active
        if not user.get('is_active', True):
            logger.warning(f"Login attempt for inactive user: {login_data.email}")
            raise HTTPException(status_code=401, detail="User account is inactive")
        
        # Build user response (exclude password_hash)
        created_at = None
        if user.get('created_at'):
            if hasattr(user['created_at'], 'isoformat'):
                created_at = user['created_at'].isoformat()
            elif isinstance(user['created_at'], str):
                created_at = user['created_at']
        
        user_dict = {
            "id": str(user.get('id', '')),
            "employee_id": user.get('employee_id'),
            "email": user.get('email', ''),
            "first_name": user.get('first_name', ''),
            "last_name": user.get('last_name', ''),
            "role": user.get('role', 'user'),
            "department": user.get('department_id'),
            "is_active": user.get('is_active', True),
            "created_at": created_at
        }
        
        logger.info(f"Successful login for user: {login_data.email}")
        return LoginResponse(
            user=user_dict,
            message="Login successful"
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/v1/auth/change-password")
async def change_password(password_data: dict):
    """Change user password"""
    try:
        user_id = password_data.get('user_id')
        current_password = password_data.get('current_password')
        new_password = password_data.get('new_password')
        
        if not all([user_id, current_password, new_password]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Get user from database
        user = db_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        conn = db_service.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
                result = cur.fetchone()
                
                if not result:
                    raise HTTPException(status_code=404, detail="User not found")
                
                hashed_password = result['password_hash']
                
                # Verify current password
                if not verify_password(current_password, hashed_password):
                    raise HTTPException(status_code=401, detail="Current password is incorrect")
                
                # Hash new password
                new_password_hash = hash_password(new_password)
                
                # Update password
                cur.execute(
                    "UPDATE users SET password_hash = %s WHERE id = %s",
                    (new_password_hash, user_id)
                )
                conn.commit()
                
                return {"message": "Password changed successfully"}
        finally:
            conn.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/tasks/grouped")
async def get_grouped_tasks():
    """Get tasks grouped by parent-child relationships"""
    try:
        # Get all parent tasks with their child counts
        grouped_tasks = db_service.execute_query("""
            SELECT 
                p.id as parent_id,
                p.title as parent_title,
                p.description as parent_description,
                p.status as parent_status,
                p.priority as parent_priority,
                p.recurring_frequency,
                p.start_date,
                p.end_date,
                p.attachments_required,
                p.created_at as parent_created_at,
                d.name as department_name,
                u.first_name,
                u.last_name,
                COUNT(c.id) as child_count,
                COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_children,
                COUNT(CASE WHEN c.status = 'in-progress' THEN 1 END) as in_progress_children,
                COUNT(CASE WHEN c.status = 'not-started' THEN 1 END) as pending_children
            FROM tasks p
            LEFT JOIN tasks c ON p.id = c.parent_task_id AND c.is_parent_task = FALSE
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.is_parent_task = TRUE
            GROUP BY p.id, p.title, p.description, p.status, p.priority, p.recurring_frequency, 
                     p.start_date, p.end_date, p.attachments_required, p.created_at, d.name, u.first_name, u.last_name
            ORDER BY p.created_at DESC;
        """)
        
        # Get child tasks for each parent
        for parent in grouped_tasks:
            child_tasks = db_service.execute_query("""
                SELECT 
                    c.id,
                    c.title,
                    c.status,
                    c.priority,
                    c.due_date,
                    c.completed_date,
                    c.child_instance_number,
                    c.created_at,
                    au.first_name as assignee_first_name,
                    au.last_name as assignee_last_name,
                    au.email as assignee_email
                FROM tasks c
                LEFT JOIN users au ON c.assignee_id = au.id
                WHERE c.parent_task_id = %s AND c.is_parent_task = FALSE
                ORDER BY c.child_instance_number ASC;
            """, (parent['parent_id'],))
            parent['children'] = child_tasks if child_tasks else []
        
        return {
            "grouped_tasks": grouped_tasks,
            "total_parents": len(grouped_tasks),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching grouped tasks: {e}")
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
        required_fields = ['employee_id', 'email', 'first_name', 'last_name', 'role']
        for field in required_fields:
            if not user_data.get(field):
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Check if user already exists by email
        existing_user = db_service.get_user_by_email(user_data['email'])
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Check if employee_id already exists
        existing_employee = db_service.get_user_by_employee_id(user_data['employee_id'])
        if existing_employee:
            raise HTTPException(status_code=400, detail="Employee ID already exists")
        
        # Generate a random password if not provided
        import secrets
        import string
        if 'password' in user_data and user_data['password']:
            plain_password = user_data['password']
        else:
            # Generate random password: 10 chars, at least 1 upper, 1 lower, 1 digit
            alphabet = string.ascii_letters + string.digits
            plain_password = ''.join(secrets.choice(alphabet) for _ in range(10))
        
        # Hash the password
        password_hash = hash_password(plain_password)
        
        conn = db_service.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO users (
                        id, employee_id, email, password_hash, first_name, last_name, role, department_id, 
                        reports_to_id, position_id, is_active
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id, employee_id, email, first_name, last_name, role, department_id, 
                               reports_to_id, position_id, is_active, created_at
                """, (
                    str(uuid.uuid4()),
                    user_data['employee_id'],
                    user_data['email'],
                    password_hash,
                    user_data['first_name'],
                    user_data['last_name'],
                    user_data['role'],
                    user_data.get('department_id'),
                    user_data.get('reports_to_id'),
                    user_data.get('position_id'),
                    user_data.get('is_active', True)
                ))
                new_user = cur.fetchone()
                conn.commit()
                return {
                    "user": dict(new_user), 
                    "message": "User created successfully",
                    "password": plain_password  # Return plain password for display
                }
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

# Department Management Endpoints
@app.get("/api/v1/departments")
async def get_departments():
    """Get all departments"""
    try:
        departments = db_service.get_departments()
        return {"departments": departments}
    except Exception as e:
        logger.error(f"Error fetching departments: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/departments/{department_id}")
async def get_department(department_id: str):
    """Get a specific department by ID"""
    try:
        # Validate UUID format
        import uuid
        try:
            uuid.UUID(department_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Department not found")
        
        department = db_service.get_department_by_id(department_id)
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")
        return department
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching department: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/departments")
async def create_department(department_data: dict):
    """Create a new department"""
    try:
        # Validate required fields
        required_fields = ['name']
        for field in required_fields:
            if not department_data.get(field):
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Check if department already exists
        existing_dept = db_service.get_department_by_name(department_data['name'])
        if existing_dept:
            raise HTTPException(status_code=400, detail="Department with this name already exists")
        
        conn = db_service.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO departments (id, name, description, manager_id, parent_department_id)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, name, description, manager_id, created_at, updated_at
                """, (
                    str(uuid.uuid4()),
                    department_data['name'],
                    department_data.get('description', ''),
                    department_data.get('manager_id'),
                    department_data.get('parent_department_id')
                ))
                new_department = cur.fetchone()
                conn.commit()
                return {"department": dict(new_department), "message": "Department created successfully"}
        finally:
            conn.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating department: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/v1/departments/{department_id}")
async def update_department(department_id: str, department_data: dict):
    """Update a department"""
    try:
        # Check if department exists
        existing_department = db_service.get_department_by_id(department_id)
        if not existing_department:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Update department
        success = db_service.update_department(department_id, department_data)
        if success:
            updated_department = db_service.get_department_by_id(department_id)
            return {"department": updated_department, "message": "Department updated successfully"}
        else:
            raise HTTPException(status_code=400, detail="No valid fields to update")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating department: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/v1/departments/{department_id}")
async def delete_department(department_id: str):
    """Delete a department"""
    try:
        # Check if department exists
        existing_department = db_service.get_department_by_id(department_id)
        if not existing_department:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Check if department has users
        users_in_department = db_service.execute_query(
            "SELECT COUNT(*) as count FROM users WHERE department_id = %s", 
            (department_id,)
        )
        
        if users_in_department and users_in_department[0]['count'] > 0:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete department. Move or delete users first."
            )
        
        # Delete department
        success = db_service.delete_department(department_id)
        if success:
            return {"message": "Department deleted successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to delete department")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting department: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Position Management Endpoints
@app.get("/api/v1/positions")
async def get_positions(department_id: str = None):
    """Get all positions, optionally filtered by department"""
    try:
        positions = db_service.get_positions(department_id)
        return {"positions": positions}
    except Exception as e:
        logger.error(f"Error fetching positions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/positions/{position_id}")
async def get_position(position_id: str):
    """Get a specific position by ID"""
    try:
        position = db_service.get_position_by_id(position_id)
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")
        return position
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching position: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/positions")
async def create_position(position_data: dict):
    """Create a new position"""
    try:
        required_fields = ['name', 'department_id']
        for field in required_fields:
            if not position_data.get(field):
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        new_position = db_service.create_position(position_data)
        return {"position": new_position, "message": "Position created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating position: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/v1/positions/{position_id}")
async def update_position(position_id: str, position_data: dict):
    """Update a position"""
    try:
        existing_position = db_service.get_position_by_id(position_id)
        if not existing_position:
            raise HTTPException(status_code=404, detail="Position not found")
        
        success = db_service.update_position(position_id, position_data)
        if success:
            updated_position = db_service.get_position_by_id(position_id)
            return {"position": updated_position, "message": "Position updated successfully"}
        else:
            raise HTTPException(status_code=400, detail="No valid fields to update")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating position: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/v1/positions/{position_id}")
async def delete_position(position_id: str):
    """Delete a position"""
    try:
        existing_position = db_service.get_position_by_id(position_id)
        if not existing_position:
            raise HTTPException(status_code=404, detail="Position not found")
        
        success = db_service.delete_position(position_id)
        if success:
            return {"message": "Position deleted successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to delete position")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting position: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Hierarchy Management Endpoints
@app.get("/api/v1/users/{user_id}/hierarchy")
async def get_user_hierarchy(user_id: str):
    """Get the reporting hierarchy for a user"""
    try:
        hierarchy = db_service.get_user_hierarchy(user_id)
        return {"hierarchy": hierarchy}
    except Exception as e:
        logger.error(f"Error fetching user hierarchy: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/users/{user_id}/manageable-users")
async def get_manageable_users(user_id: str):
    """Get users that the current user can manage based on hierarchy"""
    try:
        users = db_service.get_users_by_reporting_level(user_id)
        return {"users": users}
    except Exception as e:
        logger.error(f"Error fetching manageable users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/departments/{department_id}/hierarchy")
async def get_department_hierarchy(department_id: str):
    """Get the department hierarchy including sub-departments"""
    try:
        hierarchy = db_service.get_department_hierarchy(department_id)
        return {"hierarchy": hierarchy}
    except Exception as e:
        logger.error(f"Error fetching department hierarchy: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/departments/{department_id}/sub-departments")
async def get_sub_departments(department_id: str):
    """Get all sub-departments of a parent department"""
    try:
        sub_departments = db_service.get_sub_departments(department_id)
        return {"sub_departments": sub_departments}
    except Exception as e:
        logger.error(f"Error fetching sub-departments: {e}")
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
            'assignee_id': task_data.get('assignee') or task_data.get('assigned_to'),  # Handle both field names
            'created_by': '550e8400-e29b-41d4-a716-446655440100',  # Super admin user
            'due_date': task_data.get('due_date') or task_data.get('dueDate'),  # Handle both field names
            'start_date': task_data.get('start_date') or task_data.get('startDate'),  # Handle both field names
            'end_date': task_data.get('end_date') or task_data.get('endDate'),  # Handle both field names
            'is_recurring': task_data.get('is_recurring', False),
            'recurring_frequency': task_data.get('recurring_frequency') or task_data.get('recurringFrequency', 'none'),
            'is_customer_related': task_data.get('is_customer_related', False),
            'customer_name': task_data.get('customer_name'),
            'is_parent_task': task_data.get('is_recurring', False),  # Set to True for recurring tasks
            'attachments_required': parse_attachments_required(task_data.get('attachments_required', False))
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
        
        # For recurring tasks, we need to handle parent + first child differently
        first_child_data = None
        if task_db_data.get('is_recurring'):
            # Store first child instance data before creating parent
            first_child_data = {
                'assignee_id': task_db_data.get('assignee_id') or task_data.get('assignee'),  # Handle both field names
                'due_date': task_db_data.get('due_date') or task_data.get('due_date'),  # Handle both field names
                'priority': task_db_data.get('priority', 'medium'),
                'status': task_db_data.get('status', 'not-started'),
                # Child can override customer info if needed
                'customer_name': task_data.get('child_customer_name'),
                'customer_email': task_data.get('child_customer_email'),
                'is_customer_related': task_data.get('child_is_customer_related', False),
                'attachments_required': parse_attachments_required(task_data.get('child_attachments_required', False))
            }
            
            # Clear assignee and due date from parent task (these belong to child instances)
            task_db_data['assignee_id'] = None
            task_db_data['due_date'] = None
            task_db_data['status'] = 'not-started'  # Parent tasks don't have status
            
            # Keep documents and customer info in parent for inheritance
            # Parent task will have the default documents and customer info
        
        task_id = db_service.create_task(task_db_data)
        
        # For recurring tasks, MANDATORY first child task creation
        if task_db_data.get('is_recurring'):
            if not first_child_data or not first_child_data.get('assignee_id') or not first_child_data.get('due_date'):
                raise HTTPException(status_code=400, detail="Recurring tasks must have assignee and due date for first child instance")
            
            try:
                # Store first child instance template
                db_service.execute_query("""
                    INSERT INTO child_instance_templates 
                    (parent_task_id, assignee_id, due_date, priority, status, customer_name, customer_email, is_customer_related, attachments_required)
                    VALUES (%(parent_task_id)s, %(assignee_id)s, %(due_date)s, %(priority)s, %(status)s, %(customer_name)s, %(customer_email)s, %(is_customer_related)s, %(attachments_required)s)
                """, {
                    "parent_task_id": task_id,
                    "assignee_id": first_child_data['assignee_id'],
                    "due_date": first_child_data['due_date'],
                    "priority": first_child_data['priority'],
                    "status": first_child_data['status'],
                    "customer_name": first_child_data.get('customer_name'),
                    "customer_email": first_child_data.get('customer_email'),
                    "is_customer_related": first_child_data.get('is_customer_related', False),
                    "attachments_required": first_child_data.get('attachments_required', False)
                })
                
                # Create first child task directly using database service
                logger.info(f"Creating first child instance for recurring task {task_id}")
                child_task_data = {
                    'title': f"{task_db_data['title']} ({first_child_data['due_date']})",
                    'description': task_db_data['description'],
                    'priority': first_child_data['priority'],
                    'status': first_child_data['status'],
                    'assignee_id': first_child_data['assignee_id'],
                    'created_by': task_db_data['created_by'],
                    'due_date': first_child_data['due_date'],
                    'start_date': task_db_data.get('start_date'),
                    'is_recurring': False,  # Child tasks are not recurring
                    'recurring_frequency': 'none',
                    'is_customer_related': first_child_data.get('is_customer_related', task_db_data.get('is_customer_related', False)),
                    'customer_name': first_child_data.get('customer_name') or task_db_data.get('customer_name'),
                    'attachments_required': first_child_data.get('attachments_required', task_db_data.get('attachments_required', False)),
                    'is_parent_task': False,  # Child tasks are not parent tasks
                    'parent_task_id': task_id,  # Link to parent
                    'department_id': task_db_data.get('department_id')
                }
                
                child_task_id = db_service.create_task(child_task_data)
                logger.info(f"First child task created successfully: {child_task_id}")
                
                # Create notification for the assignee
                try:
                    assignee_name = db_service.execute_query("""
                        SELECT CONCAT(first_name, ' ', last_name) as name
                        FROM users WHERE id = %s
                    """, (first_child_data['assignee_id'],))
                    
                    assignee_display_name = assignee_name[0]['name'] if assignee_name and len(assignee_name) > 0 else 'User'
                    
                    notification_title = f"New Task Assigned: {task_db_data['title']}"
                    notification_message = f"You have been assigned a new task: {task_db_data['title']}"
                    if first_child_data['due_date']:
                        notification_message += f" (Due: {first_child_data['due_date']})"
                    
                    db_service.create_notification(
                        user_id=first_child_data['assignee_id'],
                        title=notification_title,
                        message=notification_message,
                        notification_type='info'
                    )
                    logger.info(f"Notification created for assignee {first_child_data['assignee_id']}")
                except Exception as notification_error:
                    logger.error(f"Failed to create notification: {notification_error}")
                    # Don't fail the entire operation if notification creation fails
                    
            except Exception as e:
                logger.error(f"Failed to create first child task: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to create first child task: {str(e)}")
        else:
            # For non-recurring tasks, create notification for assignee
            if task_db_data.get('assignee_id'):
                try:
                    assignee_name = db_service.execute_query("""
                        SELECT CONCAT(first_name, ' ', last_name) as name
                        FROM users WHERE id = %s
                    """, (task_db_data['assignee_id'],))
                    
                    assignee_display_name = assignee_name[0]['name'] if assignee_name and len(assignee_name) > 0 else 'User'
                    
                    notification_title = f"New Task Assigned: {task_db_data['title']}"
                    notification_message = f"You have been assigned a new task: {task_db_data['title']}"
                    if task_db_data.get('due_date'):
                        notification_message += f" (Due: {task_db_data['due_date']})"
                    
                    db_service.create_notification(
                        user_id=task_db_data['assignee_id'],
                        title=notification_title,
                        message=notification_message,
                        notification_type='info'
                    )
                    logger.info(f"Notification created for assignee {task_db_data['assignee_id']}")
                except Exception as e:
                    logger.error(f"Failed to create notification for assignee: {e}")
                    # Don't fail the entire operation if notification creation fails
        
        return {"message": "Task created successfully", "id": str(task_id)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def validate_task_update_fields(task_data: dict):
    """Validate task update fields"""
    # Priority validation
    if 'priority' in task_data:
        valid_priorities = ['low', 'medium', 'high', 'urgent', 'critical', 'emergency']
        if task_data['priority'] not in valid_priorities:
            raise ValueError(f"Invalid priority. Must be one of: {', '.join(valid_priorities)}")
    
    # Status validation
    if 'status' in task_data:
        valid_statuses = ['not-started', 'pending', 'in-progress', 'under-review', 'on-hold', 'waiting-for-approval', 'blocked', 'overdue', 'completed', 'cancelled']
        if task_data['status'] not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    # Attachments required validation
    if 'attachments_required' in task_data:
        valid_attachments = ['none', 'optional', 'required']
        if task_data['attachments_required'] not in valid_attachments:
            raise ValueError(f"Invalid attachments_required. Must be one of: {', '.join(valid_attachments)}")
    
    # Recurring frequency validation
    if 'recurring_frequency' in task_data:
        valid_frequencies = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually']
        if task_data['recurring_frequency'] not in valid_frequencies:
            raise ValueError(f"Invalid recurring_frequency. Must be one of: {', '.join(valid_frequencies)}")
    
    # Date validation - Allow past dates for updates (with warning)
    if 'due_date' in task_data and task_data['due_date']:
        try:
            due_date = datetime.strptime(task_data['due_date'], '%Y-%m-%d').date()
            # Note: We allow past dates for task updates, but could add a warning if needed
        except ValueError as e:
            if "time data" in str(e):
                raise ValueError("Invalid due_date format. Use YYYY-MM-DD")
            raise e
    
    if 'start_date' in task_data and task_data['start_date']:
        try:
            start_date = datetime.strptime(task_data['start_date'], '%Y-%m-%d').date()
        except ValueError:
            raise ValueError("Invalid start_date format. Use YYYY-MM-DD")
    
    if 'end_date' in task_data and task_data['end_date']:
        try:
            end_date = datetime.strptime(task_data['end_date'], '%Y-%m-%d').date()
        except ValueError:
            raise ValueError("Invalid end_date format. Use YYYY-MM-DD")
    
    # Cross-field validation
    if 'start_date' in task_data and 'due_date' in task_data and task_data['start_date'] and task_data['due_date']:
        start_date = datetime.strptime(task_data['start_date'], '%Y-%m-%d').date()
        due_date = datetime.strptime(task_data['due_date'], '%Y-%m-%d').date()
        if start_date > due_date:
            raise ValueError("Start date cannot be after due date")

@app.patch("/api/v1/tasks/{task_id}")
async def partial_update_task(task_id: str, task_data: dict):
    """Partially update a task (PATCH) - only provided fields will be updated"""
    try:
        # Validate that at least one field is provided
        if not task_data:
            raise HTTPException(status_code=400, detail="At least one field must be provided for update")
        
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
            'startDate': 'start_date',      # Frontend sends startDate
            'endDate': 'end_date',          # Frontend sends endDate
            'isRecurring': 'is_recurring',  # Frontend sends isRecurring
            'recurringFrequency': 'recurring_frequency',  # Frontend sends recurringFrequency
            'isCustomerRelated': 'is_customer_related',  # Frontend sends isCustomerRelated
            'customerName': 'customer_name',  # Frontend sends customerName
            'attachmentsRequired': 'attachments_required'  # Frontend sends attachmentsRequired
        }
        
        for frontend_field, db_field in field_mapping.items():
            if frontend_field in task_data and task_data[frontend_field] is not None:
                # Special handling for attachments_required to convert string to boolean
                if frontend_field == 'attachmentsRequired':
                    task_db_data[db_field] = parse_attachments_required(task_data[frontend_field])
                else:
                    task_db_data[db_field] = task_data[frontend_field]
        
        # Handle department name to ID conversion
        if 'department' in task_data and task_data['department'] is not None:
            department_id = db_service.get_department_id_by_name(task_data['department'])
            if department_id:
                task_db_data['department_id'] = department_id
            else:
                raise HTTPException(status_code=400, detail=f"Department '{task_data['department']}' not found")
        
        # Validate field values
        await validate_task_update_fields(task_db_data)
        
        success = db_service.update_task(task_id, task_db_data)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {
            "message": "Task partially updated successfully",
            "updated_fields": list(task_db_data.keys()),
            "timestamp": datetime.now().isoformat()
        }
    except ValueError as e:
        logger.error(f"Validation error updating task: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/v1/tasks/{task_id}")
async def full_update_task(task_id: str, task_data: dict):
    """Fully update a task (PUT) - all provided fields will be updated"""
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
            'startDate': 'start_date',      # Frontend sends startDate
            'endDate': 'end_date',          # Frontend sends endDate
            'isRecurring': 'is_recurring',  # Frontend sends isRecurring
            'recurringFrequency': 'recurring_frequency',  # Frontend sends recurringFrequency
            'isCustomerRelated': 'is_customer_related',  # Frontend sends isCustomerRelated
            'customerName': 'customer_name',  # Frontend sends customerName
            'attachmentsRequired': 'attachments_required'  # Frontend sends attachmentsRequired
        }
        
        for frontend_field, db_field in field_mapping.items():
            if frontend_field in task_data and task_data[frontend_field] is not None:
                # Special handling for attachments_required to convert string to boolean
                if frontend_field == 'attachmentsRequired':
                    task_db_data[db_field] = parse_attachments_required(task_data[frontend_field])
                else:
                    task_db_data[db_field] = task_data[frontend_field]
        
        # Handle department name to ID conversion
        if 'department' in task_data and task_data['department'] is not None:
            department_id = db_service.get_department_id_by_name(task_data['department'])
            if department_id:
                task_db_data['department_id'] = department_id
            else:
                raise HTTPException(status_code=400, detail=f"Department '{task_data['department']}' not found")
        
        # Validate field values
        await validate_task_update_fields(task_db_data)
        
        success = db_service.update_task(task_id, task_db_data)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check if task was marked as completed and is a child task
        if 'status' in task_db_data and task_db_data['status'] == 'completed':
            try:
                
                # Get the task details to check if it's a child task
                task_details = db_service.get_task_by_id(task_id)
                if task_details and task_details.get('parent_task_id'):
                    logger.info(f"Child task {task_id} completed, checking for parent automation...")
                    
                    # Get parent task details
                    parent_task = db_service.get_task_by_id(task_details['parent_task_id'])
                    if parent_task and parent_task.get('is_recurring') and parent_task.get('recurring_frequency'):
                        logger.info(f"Parent task {task_details['parent_task_id']} is recurring, generating next child...")
                        
                        # Check if parent task has an end date and if we should continue
                        parent_end_date = parent_task.get('end_date')
                        if parent_end_date:
                            try:
                                parent_end_date_obj = datetime.fromisoformat(parent_end_date.replace('Z', '+00:00')) if isinstance(parent_end_date, str) else parent_end_date
                                if datetime.now().date() > parent_end_date_obj.date():
                                    logger.info(f"Parent task end date {parent_end_date} has passed, not generating new child")
                                    return {
                                        "message": "Task fully updated successfully",
                                        "updated_fields": list(task_db_data.keys()),
                                        "timestamp": datetime.now().isoformat()
                                    }
                            except Exception as e:
                                logger.error(f"Error parsing parent end date: {e}")
                        
                        # Generate next child task using the database function
                        try:
                            result = db_service.execute_query("""
                                SELECT generate_next_child_task(%(completed_child_id)s) as child_task_id;
                            """, {
                                "completed_child_id": task_id
                            })
                            
                            if result and len(result) > 0 and result[0]["child_task_id"]:
                                child_task_id = result[0]["child_task_id"]
                                logger.info(f"Next child task created successfully: {child_task_id}")
                                
                                # Create notification for the assignee
                                try:
                                    notification_title = f"New Task Assigned: {parent_task['title']}"
                                    notification_message = f"A new instance of recurring task '{parent_task['title']}' has been assigned to you."
                                    
                                    db_service.create_notification(
                                        user_id=task_details.get('assignee_id'),
                                        title=notification_title,
                                        message=notification_message,
                                        notification_type='info'
                                    )
                                    logger.info(f"Notification created for assignee {task_details.get('assignee_id')}")
                                except Exception as notification_error:
                                    logger.error(f"Failed to create notification: {notification_error}")
                                    
                        except Exception as generation_error:
                            logger.error(f"Failed to generate next child task: {generation_error}")
                            # Don't fail the entire operation if child generation fails
                            
            except Exception as e:
                logger.error(f"Error in task completion automation: {e}")
                # Don't fail the entire operation if automation fails
        
        return {
            "message": "Task fully updated successfully",
            "updated_fields": list(task_db_data.keys()),
            "timestamp": datetime.now().isoformat()
        }
    except ValueError as e:
        logger.error(f"Validation error updating task: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.patch("/api/v1/tasks/{task_id}/status")
async def update_task_status(task_id: str, status_data: dict):
    """Quick status update endpoint with auto-generation logic"""
    try:
        if 'status' not in status_data:
            raise HTTPException(status_code=400, detail="Status field is required")
        
        await validate_task_update_fields({'status': status_data['status']})
        
        # Update the task status
        success = db_service.update_task(task_id, {'status': status_data['status']})
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # If marking as completed, check if this is a child task and trigger next generation
        if status_data['status'] == 'completed':
            # Check if this is a child task
            child_task = db_service.execute_query(
                "SELECT parent_task_id, assignee_id, priority FROM tasks WHERE id = %s AND is_parent_task = FALSE",
                (task_id,)
            )
            
            if child_task:
                parent_id = child_task[0]['parent_task_id']
                assignee_id = child_task[0]['assignee_id']
                priority = child_task[0]['priority']
                
                # Calculate next due date based on parent's frequency
                parent_task = db_service.execute_query(
                    "SELECT recurring_frequency, end_date FROM tasks WHERE id = %s AND is_parent_task = TRUE",
                    (parent_id,)
                )
                
                if parent_task:
                    frequency = parent_task[0]['recurring_frequency']
                    parent_end_date = parent_task[0]['end_date']
                    
                    # Calculate next due date
                    next_due_date = db_service.execute_query(
                        "SELECT calculate_next_due_date_recurring(CURRENT_DATE, %s, true) as next_date",
                        (frequency,)
                    )
                    
                    if next_due_date:
                        next_date = next_due_date[0]['next_date']
                        
                        # Check if we're within the parent's end date
                        if not parent_end_date or next_date <= parent_end_date:
                            # Generate next child task
                            new_child_id = db_service.execute_query(
                                "SELECT generate_next_child_task(%s) as child_id",
                                (task_id,)
                            )
                            
                            if new_child_id:
                                logger.info(f"Generated next child task: {new_child_id[0]['child_id']}")
        
        return {
            "message": "Task status updated successfully",
            "task_id": task_id,
            "new_status": status_data['status'],
            "timestamp": datetime.now().isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating task status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.patch("/api/v1/tasks/{task_id}/assignee")
async def update_task_assignee(task_id: str, assignee_data: dict):
    """Quick assignee update endpoint"""
    try:
        if 'assignee' not in assignee_data:
            raise HTTPException(status_code=400, detail="Assignee field is required")
        
        success = db_service.update_task(task_id, {'assignee_id': assignee_data['assignee']})
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {
            "message": "Task assignee updated successfully",
            "task_id": task_id,
            "new_assignee": assignee_data['assignee'],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error updating task assignee: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.patch("/api/v1/tasks/{task_id}/priority")
async def update_task_priority(task_id: str, priority_data: dict):
    """Quick priority update endpoint"""
    try:
        if 'priority' not in priority_data:
            raise HTTPException(status_code=400, detail="Priority field is required")
        
        await validate_task_update_fields({'priority': priority_data['priority']})
        
        success = db_service.update_task(task_id, {'priority': priority_data['priority']})
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {
            "message": "Task priority updated successfully",
            "task_id": task_id,
            "new_priority": priority_data['priority'],
            "timestamp": datetime.now().isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating task priority: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.patch("/api/v1/tasks/{task_id}/due-date")
async def update_task_due_date(task_id: str, due_date_data: dict):
    """Quick due date update endpoint"""
    try:
        if 'dueDate' not in due_date_data:
            raise HTTPException(status_code=400, detail="dueDate field is required")
        
        await validate_task_update_fields({'due_date': due_date_data['dueDate']})
        
        success = db_service.update_task(task_id, {'due_date': due_date_data['dueDate']})
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {
            "message": "Task due date updated successfully",
            "task_id": task_id,
            "new_due_date": due_date_data['dueDate'],
            "timestamp": datetime.now().isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating task due date: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/v1/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task with proper permissions"""
    try:
        # Get task details first
        task = db_service.execute_query(
            "SELECT * FROM tasks WHERE id = %s",
            (task_id,)
        )
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task_data = task[0]
        
        # Check if this is a parent task
        if task_data.get('is_parent_task'):
            # Check if parent has children
            children_count = db_service.execute_query(
                "SELECT COUNT(*) as count FROM tasks WHERE parent_task_id = %s AND is_parent_task = FALSE",
                (task_id,)
            )
            
            if children_count and children_count[0]['count'] > 0:
                raise HTTPException(
                    status_code=400, 
                    detail="Cannot delete parent task. Delete all child tasks first."
                )
        
        # For child tasks, check if user has permission (this should be enhanced with proper auth)
        # For now, we'll allow deletion but in production, check if user is the creator
        
        success = db_service.delete_task(task_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {"message": "Task deleted successfully"}
    except HTTPException:
        raise
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

@app.post("/api/v1/notifications")
async def create_notification(notification_data: dict):
    """Create a new notification"""
    try:
        # Validate required fields
        required_fields = ['user_id', 'title', 'message']
        for field in required_fields:
            if not notification_data.get(field):
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        notification_id = db_service.create_notification(
            user_id=notification_data['user_id'],
            title=notification_data['title'],
            message=notification_data['message'],
            notification_type=notification_data.get('type', 'info')
        )
        
        return {
            "message": "Notification created successfully",
            "notification_id": notification_id,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/notifications")
async def get_notifications(user_id: str = None):
    """Get notifications for the current user"""
    try:
        if user_id:
            # Get notifications for specific user
            result = db_service.get_notifications_by_user(user_id)
        else:
            # Get all notifications (in real app, filter by user_id from token)
            result = db_service.execute_query("""
                SELECT n.*, u.first_name, u.last_name, u.email
                FROM notifications n
                LEFT JOIN users u ON n.user_id = u.id
                ORDER BY n.created_at DESC
                LIMIT 50;
            """)
        
        return {
            "notifications": result,
            "count": len(result) if result else 0,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/v1/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read"""
    try:
        result = db_service.execute_query("""
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE id = %(notification_id)s
            RETURNING id;
        """, {"notification_id": notification_id})
        
        if result and len(result) > 0:
            return {
                "message": "Notification marked as read",
                "notification_id": notification_id,
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
            
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/execute-sql")
async def execute_sql_script(sql_data: dict):
    """Execute SQL script for schema updates"""
    try:
        sql_script = sql_data.get("sql", "")
        if not sql_script:
            raise HTTPException(status_code=400, detail="SQL script is required")
        
        # Parse SQL statements more intelligently to handle functions
        statements = []
        current_statement = ""
        in_function = False
        dollar_quote_tag = None
        
        lines = sql_script.split('\n')
        for line in lines:
            line = line.strip()
            if not line or line.startswith('--'):
                continue
                
            current_statement += line + " "
            
            # Check for function start
            if 'CREATE OR REPLACE FUNCTION' in line.upper() or 'CREATE FUNCTION' in line.upper():
                in_function = True
                # Extract dollar quote tag if present
                if '$$' in line:
                    dollar_quote_tag = '$$'
                elif '$' in line:
                    # Look for custom dollar quote tag
                    import re
                    match = re.search(r'\$([^$]*)\$', line)
                    if match:
                        dollar_quote_tag = f'${match.group(1)}$'
            
            # Check for function end
            if in_function and dollar_quote_tag and dollar_quote_tag in line:
                if current_statement.strip():
                    statements.append(current_statement.strip())
                    current_statement = ""
                    in_function = False
                    dollar_quote_tag = None
            elif not in_function and line.endswith(';'):
                if current_statement.strip():
                    statements.append(current_statement.strip().rstrip(';'))
                    current_statement = ""
        
        # Add any remaining statement
        if current_statement.strip():
            statements.append(current_statement.strip())
        
        results = []
        for i, statement in enumerate(statements):
            try:
                result = db_service.execute_query(statement)
                results.append({
                    "statement": i + 1,
                    "success": True,
                    "result": result if result else "Success"
                })
                logger.info(f"✓ Executed statement {i+1}/{len(statements)}")
            except Exception as e:
                results.append({
                    "statement": i + 1,
                    "success": False,
                    "error": str(e)
                })
                logger.warning(f"⚠ Statement {i+1} failed: {e}")
                # Continue with other statements
        
        return {
            "message": f"Executed {len(statements)} statements",
            "results": results,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error executing SQL script: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
