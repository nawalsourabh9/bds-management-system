from pydantic_settings import BaseSettings
from typing import List, Optional
from urllib.parse import quote_plus
import re

import os

def mask_sensitive_info(error_msg: str) -> str:
    """Mask sensitive information (passwords, connection strings) from error messages"""
    if not error_msg:
        return error_msg
    
    # Check if error contains sensitive information
    if 'password' in error_msg.lower() or '@' in error_msg or '://' in error_msg:
        # Extract only the error type, not connection details
        error_parts = error_msg.split(':')
        if len(error_parts) > 1:
            return f"{error_parts[0]}: [Database error - details masked for security]"
        
        # If no colon, try to extract just the error type
        if 'invalid' in error_msg.lower():
            return "[Database connection error - details masked for security]"
    
    return error_msg

class Settings(BaseSettings):
    # Basic settings
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DEBUG: bool = False

    # Environment settings
    ENVIRONMENT: str = "production"
    DEV_MODE: bool = False

    # Admin settings
    ADMIN_RESET_TOKEN: str = ""
    
    # Database - BaseSettings will read from environment variables automatically
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "bds_management"
    DB_USER: str = "bds_user"
    DB_PASSWORD: str = "bds_password"
    DB_SSLMODE: str = "prefer"
    
    class Config:
        env_file = ".env"  # Use .env file (Azure PostgreSQL configuration)
        env_file_encoding = 'utf-8'
        case_sensitive = False
    
    @property
    def DATABASE_URL(self) -> str:
        # Check if DATABASE_URL is set directly (common in cloud environments)
        import logging
        logger = logging.getLogger(__name__)
        
        if os.getenv("DATABASE_URL"):
            db_url = os.getenv("DATABASE_URL")
            logger.info(f"Using DATABASE_URL from environment variable: postgresql://***@{db_url.split('@')[-1] if '@' in db_url else 'hidden'}")
            return db_url
        
        # Use settings attributes (loaded from .env files by pydantic_settings)
        db_host = self.DB_HOST
        db_port = self.DB_PORT
        db_name = self.DB_NAME
        db_user = self.DB_USER
        db_password = self.DB_PASSWORD
        db_sslmode = self.DB_SSLMODE
        
        # Debug logging to see what we're getting
        logger.info(f"Using database settings - DB_HOST: {db_host}, DB_USER: {db_user}, DB_NAME: {db_name}, DB_SSLMODE: {db_sslmode}")
        logger.info(f"Password length: {len(db_password) if db_password else 0} characters")
        
        # URL encode both username and password to handle special characters (like @ in Azure usernames)
        encoded_user = quote_plus(db_user)
        encoded_password = quote_plus(db_password)
        db_url = f"postgresql://{encoded_user}:{encoded_password}@{db_host}:{db_port}/{db_name}?sslmode={db_sslmode}"
        return db_url
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:3002",
        "http://192.168.29.12:3001",
        "http://192.168.29.12:3000",
        "http://192.168.29.12:5173",
        # Custom domain origins
        "https://eqms.nordictechdesign.com",
        "https://api.eqms.nordictechdesign.com",
        "*"
    ]
    
    # File Storage
    STORAGE_TYPE: str = "local"  # "local" or "azure"
    UPLOAD_DIR: str = "./uploads"
    
    # Azure Storage (when STORAGE_TYPE=azure)
    STORAGE_CONNECTION_STRING: Optional[str] = None
    STORAGE_ACCOUNT_NAME: Optional[str] = None
    FILE_SHARE_NAME: str = "uploads"
    CONTAINER_NAME: str = "documents"
    
    # Celery
    CELERY_WORKER: bool = False
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/app.log"
    
    # Timezone
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"
    
    # Email Configuration (for password notifications)
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    FROM_EMAIL: str = "noreply@bdsmanufacturing.in"
    FROM_NAME: str = "BDS Management System"

settings = Settings()
