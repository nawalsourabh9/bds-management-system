from pydantic_settings import BaseSettings
from typing import List, Optional
from urllib.parse import quote_plus

import os

class Settings(BaseSettings):
    # Basic settings
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DEBUG: bool = False
    
    # Database - BaseSettings will read from environment variables automatically
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "bds_management"
    DB_USER: str = "bds_user"
    DB_PASSWORD: str = "bds_password"
    DB_SSLMODE: str = "prefer"
    
    class Config:
        env_file = None  # Don't use .env file, only environment variables
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
        
        # Read directly from environment variables (prefer env vars over BaseSettings defaults)
        # This ensures we use the actual environment variables set in the container
        db_host = os.getenv("DB_HOST")
        db_port_str = os.getenv("DB_PORT")
        db_name = os.getenv("DB_NAME")
        db_user = os.getenv("DB_USER")
        db_password = os.getenv("DB_PASSWORD")
        db_sslmode = os.getenv("DB_SSLMODE")
        
        # Debug logging to see what we're getting
        logger.info(f"Environment variable check - DB_HOST from os.getenv: {db_host}, from settings: {self.DB_HOST}")
        logger.info(f"All DB env vars: DB_HOST={db_host}, DB_USER={db_user}, DB_NAME={db_name}, DB_SSLMODE={db_sslmode}")
        
        # Only use defaults if environment variables are not set
        if not db_host:
            db_host = self.DB_HOST
        if not db_port_str:
            db_port = self.DB_PORT
        else:
            db_port = int(db_port_str)
        if not db_name:
            db_name = self.DB_NAME
        if not db_user:
            db_user = self.DB_USER
        if not db_password:
            db_password = self.DB_PASSWORD
        if not db_sslmode:
            db_sslmode = self.DB_SSLMODE
        
        # Log the values being used (without password)
        logger.info(f"Constructing DATABASE_URL from components - DB_HOST: {db_host}, DB_USER: {db_user}, DB_NAME: {db_name}, DB_SSLMODE: {db_sslmode}")
        
        # URL encode password to handle special characters
        encoded_password = quote_plus(db_password)
        db_url = f"postgresql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}?sslmode={db_sslmode}"
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
    
    class Config:
        env_file = ".env"

settings = Settings()
