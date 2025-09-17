from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum, UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
import uuid

Base = declarative_base()

# Enums
class UserRole(str, enum.Enum):
    superadmin = "superadmin"
    admin = "admin"
    manager = "manager"
    supervisor = "supervisor"
    user = "user"

class TaskStatus(str, enum.Enum):
    not_started = "not-started"
    in_progress = "in-progress"
    completed = "completed"
    overdue = "overdue"
    pending = "pending"

class TaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"
    critical = "critical"
    emergency = "emergency"

class DocumentStatus(str, enum.Enum):
    draft = "draft"
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class NotificationType(str, enum.Enum):
    info = "info"
    warning = "warning"
    error = "error"
    success = "success"

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.user)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    department = Column(String)
    assignee = Column(String)
    priority = Column(Enum(TaskPriority), default=TaskPriority.medium)
    due_date = Column(DateTime)
    status = Column(Enum(TaskStatus), default=TaskStatus.not_started)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    is_recurring = Column(Boolean, default=False)
    recurring_frequency = Column(String)
    is_customer_related = Column(Boolean, default=False)
    customer_name = Column(String)
    attachments_required = Column(String, default="none")
    recurring_parent_id = Column(Integer, ForeignKey("tasks.id"))
    parent_task_id = Column(Integer, ForeignKey("tasks.id"))
    original_task_name = Column(String)
    recurrence_count_in_period = Column(Integer)
    last_generated_date = Column(DateTime)
    department_head_id = Column(Integer, ForeignKey("users.id"))
    comments = Column(Text)

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    file_path = Column(String)
    file_type = Column(String)
    file_size = Column(Integer)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    task_id = Column(Integer, ForeignKey("tasks.id"))
    status = Column(Enum(DocumentStatus), default=DocumentStatus.draft)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class TaskHistory(Base):
    __tablename__ = "task_history"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    field_name = Column(String, nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    changed_by = Column(Integer, ForeignKey("users.id"))
    changed_at = Column(DateTime, default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text)
    type = Column(Enum(NotificationType), default=NotificationType.info)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, nullable=False)
    table_name = Column(String)
    record_id = Column(Integer)
    old_values = Column(Text)
    new_values = Column(Text)
    ip_address = Column(String)
    user_agent = Column(String)
    created_at = Column(DateTime, default=func.now())