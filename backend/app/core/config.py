from pydantic_settings import BaseSettings
from typing import List, Optional
from urllib.parse import quote_plus

class Settings(BaseSettings):
    # Basic settings
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DEBUG: bool = False
    
    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "bds_management"
    DB_USER: str = "bds_user"
    DB_PASSWORD: str = "bds_password"
    DB_SSLMODE: str = "prefer"
    
    @property
    def DATABASE_URL(self) -> str:
        # URL encode password to handle special characters
        encoded_password = quote_plus(self.DB_PASSWORD)
        return f"postgresql://{self.DB_USER}:{encoded_password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?sslmode={self.DB_SSLMODE}"
    
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
