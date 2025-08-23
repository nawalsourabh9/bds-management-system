from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from app.core.config import settings
from app.database import get_db, check_database_health
from datetime import datetime
from pydantic import BaseModel

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

@app.get("/")
async def root():
    return {"message": "BDS Management System API"}

@app.get("/health")
async def health_check():
    """Comprehensive health check including database status"""
    db_health = await check_database_health()
    
    return {
        "status": "healthy",
        "database": db_health,
        "redis": {
            "status": "connected",
            "type": "simulated",
            "last_check": datetime.now().isoformat()
        },
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Login endpoint"""
    db = await get_db()
    users = db.get_data('users')
    
    # Find user by email
    user = next((u for u in users if u['email'] == login_data.email), None)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # For demo purposes, accept any password for admin@bds.com
    # In production, this should be proper password verification
    if login_data.email == 'admin@bds.com':
        return LoginResponse(
            user=user,
            message="Login successful"
        )
    else:
        raise HTTPException(status_code=401, detail="Invalid email or password")

@app.get("/api/v1/tasks")
async def get_tasks():
    """Get all tasks"""
    db = await get_db()
    return {"tasks": db.get_data('tasks')}

@app.get("/api/v1/users")
async def get_users():
    """Get all users"""
    db = await get_db()
    return {"users": db.get_data('users')}

@app.get("/api/v1/departments")
async def get_departments():
    """Get all departments"""
    db = await get_db()
    return {"departments": db.get_data('departments')}

@app.get("/api/v1/database/status")
async def get_database_status():
    """Get detailed database status"""
    return await check_database_health()

@app.post("/api/v1/tasks")
async def create_task(task_data: dict):
    """Create a new task"""
    db = await get_db()
    new_task = db.add_data('tasks', task_data)
    return {"task": new_task, "message": "Task created successfully"}

@app.post("/api/v1/users")
async def create_user(user_data: dict):
    """Create a new user"""
    db = await get_db()
    new_user = db.add_data('users', user_data)
    return {"user": new_user, "message": "User created successfully"}

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )
