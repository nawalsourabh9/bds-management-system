from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from app.core.config import settings
from app.database_connection import get_db, test_connection, create_tables
from app.models.database import User, Task, Department, TaskHistory, Notification, AuditLog
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        # Test database connection
        if test_connection():
            logger.info("Database connection successful")
            # Create tables if they don't exist
            create_tables()
            logger.info("Database initialization complete")
        else:
            logger.error("Database connection failed")
    except Exception as e:
        logger.error(f"Startup error: {e}")

@app.get("/")
async def root():
    return {"message": "BDS Management System API"}

@app.get("/health")
async def health_check():
    """Comprehensive health check including database status"""
    db_status = "connected" if test_connection() else "disconnected"
    
    return {
        "status": "healthy",
        "database": {
            "status": db_status,
            "type": "postgresql",
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

@app.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint"""
    try:
        # Find user by email
        user = db.query(User).filter(User.email == login_data.email).first()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # For demo purposes, accept any password for any user
        # In production, this should be proper password verification with bcrypt
        if user and user.is_active:
            user_dict = {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.value,
                "department": user.department,
                "position": user.position,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None
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
async def get_tasks(db: Session = Depends(get_db)):
    """Get all tasks"""
    try:
        tasks = db.query(Task).all()
        task_list = []
        for task in tasks:
            task_dict = {
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "status": task.status.value if task.status else "not-started",
                "priority": task.priority.value if task.priority else "medium",
                "department": task.department,
                "assignee": task.assignee,
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "created_at": task.created_at.isoformat() if task.created_at else None,
                "is_recurring": task.is_recurring,
                "recurring_frequency": task.recurring_frequency,
                "is_customer_related": task.is_customer_related,
                "customer_name": task.customer_name,
                "attachments_required": task.attachments_required
            }
            task_list.append(task_dict)
        return {"tasks": task_list}
    except Exception as e:
        logger.error(f"Error fetching tasks: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/tasks")
async def create_task(task_data: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task"""
    try:
        # Parse due date
        due_date = None
        if task_data.due_date:
            try:
                due_date = datetime.fromisoformat(task_data.due_date.replace('Z', '+00:00'))
            except:
                due_date = datetime.strptime(task_data.due_date, '%Y-%m-%d')
        
        new_task = Task(
            title=task_data.title,
            description=task_data.description,
            department=task_data.department,
            assignee=task_data.assignee,
            priority=task_data.priority,
            due_date=due_date,
            is_recurring=task_data.is_recurring,
            recurring_frequency=task_data.recurring_frequency,
            is_customer_related=task_data.is_customer_related,
            customer_name=task_data.customer_name,
            attachments_required=task_data.attachments_required
        )
        
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        
        return {"message": "Task created successfully", "task_id": new_task.id}
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/v1/tasks/{task_id}")
async def update_task(task_id: int, task_data: TaskUpdate, db: Session = Depends(get_db)):
    """Update a task"""
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Update fields if provided
        if task_data.title is not None:
            task.title = task_data.title
        if task_data.description is not None:
            task.description = task_data.description
        if task_data.department is not None:
            task.department = task_data.department
        if task_data.assignee is not None:
            task.assignee = task_data.assignee
        if task_data.priority is not None:
            task.priority = task_data.priority
        if task_data.status is not None:
            task.status = task_data.status
        if task_data.due_date is not None:
            try:
                task.due_date = datetime.fromisoformat(task_data.due_date.replace('Z', '+00:00'))
            except:
                task.due_date = datetime.strptime(task_data.due_date, '%Y-%m-%d')
        if task_data.is_recurring is not None:
            task.is_recurring = task_data.is_recurring
        if task_data.recurring_frequency is not None:
            task.recurring_frequency = task_data.recurring_frequency
        if task_data.is_customer_related is not None:
            task.is_customer_related = task_data.is_customer_related
        if task_data.customer_name is not None:
            task.customer_name = task_data.customer_name
        if task_data.attachments_required is not None:
            task.attachments_required = task_data.attachments_required
        
        task.updated_at = datetime.now()
        db.commit()
        
        return {"message": "Task updated successfully"}
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/v1/tasks/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task"""
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        db.delete(task)
        db.commit()
        
        return {"message": "Task deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/users")
async def get_users(db: Session = Depends(get_db)):
    """Get all users"""
    try:
        users = db.query(User).filter(User.is_active == True).all()
        user_list = []
        for user in users:
            user_dict = {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.value,
                "department": user.department,
                "position": user.position,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
            user_list.append(user_dict)
        return {"users": user_list}
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/departments")
async def get_departments(db: Session = Depends(get_db)):
    """Get all departments"""
    try:
        departments = db.query(Department).all()
        dept_list = []
        for dept in departments:
            dept_dict = {
                "id": dept.id,
                "name": dept.name,
                "description": dept.description,
                "manager_id": dept.manager_id,
                "created_at": dept.created_at.isoformat() if dept.created_at else None
            }
            dept_list.append(dept_dict)
        return {"departments": dept_list}
    except Exception as e:
        logger.error(f"Error fetching departments: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
