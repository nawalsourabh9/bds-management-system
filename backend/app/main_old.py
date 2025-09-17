from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from app.core.config import settings
from app.database import get_db, check_database_health
from app.services.document_service import document_service
from datetime import datetime
from pydantic import BaseModel
import os

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
    
    # For demo purposes, accept any password for any user
    # In production, this should be proper password verification with bcrypt
    if user and user.get('is_active', True):
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

# Document upload endpoints
@app.post("/api/v1/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    task_id: str = Form(None),
    user_id: str = Form(...)
):
    """Upload a document to Azure Blob Storage or local storage"""
    try:
        # Read file content
        file_content = await file.read()
        
        # Upload document
        result = await document_service.upload_document(
            file_data=file_content,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
            user_id=user_id,
            task_id=task_id
        )
        
        if result['success']:
            return {
                "success": True,
                "message": "Document uploaded successfully",
                "document": result
            }
        else:
            raise HTTPException(status_code=500, detail=result['error'])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/v1/documents")
async def list_documents(
    user_id: str = None,
    task_id: str = None
):
    """List documents"""
    try:
        documents = await document_service.list_documents(user_id, task_id)
        return {
            "success": True,
            "documents": documents
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")

@app.get("/api/v1/documents/{blob_name}")
async def download_document(blob_name: str):
    """Download a document"""
    try:
        file_content = await document_service.download_document(blob_name)
        
        if file_content is None:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # For local storage, serve file directly
        if document_service.blob_service_client is None:
            file_path = os.path.join("uploads", blob_name)
            if os.path.exists(file_path):
                return FileResponse(file_path)
        
        # For Azure storage, return file content
        return FileResponse(
            content=file_content,
            media_type="application/octet-stream",
            filename=blob_name
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@app.delete("/api/v1/documents/{blob_name}")
async def delete_document(blob_name: str):
    """Delete a document"""
    try:
        success = await document_service.delete_document(blob_name)
        
        if success:
            return {
                "success": True,
                "message": "Document deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Document not found or could not be deleted")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

# Mount static files for local uploads
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )
