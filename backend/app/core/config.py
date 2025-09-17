from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # Basic settings
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "bds_management"
    DB_USER: str = "bds_user"
    DB_PASSWORD: str = "bds_password"
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
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
    
    class Config:
        env_file = ".env"

settings = Settings()
