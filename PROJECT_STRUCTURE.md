# BDS Management System - Project Structure

## 📁 **Root Directory Structure**

```
bds-management-system/
├── 🎯 **Core Application**
│   ├── src/                          # React Frontend (TypeScript)
│   ├── backend/                      # FastAPI Backend (Python)
│   └── supabase/                     # Database Migrations & Functions
│
├── 🐳 **Docker & Deployment**
│   ├── docker-compose.yml            # Local development setup
│   ├── Dockerfile.frontend           # Frontend container
│   ├── nginx.conf                    # Web server configuration
│   └── docker/                       # Docker utilities
│
├── 🗄️ **Database**
│   ├── database/                     # Database schemas & seeds
│   └── supabase/migrations/          # Database migrations
│
├── 📚 **Documentation**
│   ├── docs/                         # API documentation
│   ├── README.md                     # Main documentation
│   ├── LOCAL_DEVELOPMENT.md          # Local setup guide
│   └── RECURRING_TASKS_GUIDE.md     # Recurring tasks guide
│
├── 🛠️ **Scripts & Tools**
│   ├── scripts/                      # Utility scripts
│   ├── start-local.sh               # Quick start script
│   ├── test-recurring-tasks.sh      # Test script
│   └── setup-database.sh            # Database setup
│
└── ⚙️ **Configuration**
    ├── package.json                  # Frontend dependencies
    ├── tailwind.config.ts           # Styling configuration
    ├── vite.config.ts               # Build configuration
    └── env.local.example            # Environment template
```

---

## 🎨 **Frontend Structure (src/)**

```
src/
├── 📱 **Pages**
│   ├── Login.tsx                     # Authentication
│   ├── Tasks.tsx                     # Task management
│   ├── Users/                        # User management
│   ├── Admin/                        # Admin panel
│   └── Dashboard/                    # Main dashboard
│
├── 🧩 **Components**
│   ├── auth/                         # Authentication components
│   ├── tasks/                        # Task-related components
│   ├── layout/                       # Layout components
│   ├── ui/                          # Reusable UI components
│   └── documents/                    # Document management
│
├── 🔧 **Services & Hooks**
│   ├── services/                     # API services
│   ├── hooks/                        # Custom React hooks
│   └── utils/                        # Utility functions
│
├── 📊 **Types & Configuration**
│   ├── types/                        # TypeScript definitions
│   ├── config/                       # API configuration
│   └── integrations/                 # External integrations
│
└── 🎨 **Styling**
    ├── App.css                       # Global styles
    └── index.css                     # Base styles
```

---

## ⚙️ **Backend Structure (backend/)**

```
backend/
├── 🚀 **Main Application**
│   ├── app/
│   │   ├── main.py                   # FastAPI application
│   │   ├── core/                     # Core configuration
│   │   ├── models/                   # Database models
│   │   ├── schemas/                  # Pydantic schemas
│   │   ├── services/                 # Business logic
│   │   ├── tasks/                    # Celery tasks
│   │   └── utils/                    # Utilities
│   │
│   ├── Dockerfile                    # Backend container
│   ├── requirements.txt              # Python dependencies
│   └── server.js                     # Node.js server (legacy)
│
└── 📊 **Database & Storage**
    ├── database_service.py           # Database operations
    ├── storage_service.py            # File storage
    └── uploads/                      # File uploads
```

---

## 🗄️ **Database Structure**

```
Database: bds_management
├── 👥 **Users & Authentication**
│   ├── users                         # User accounts
│   ├── departments                   # Organizational units
│   └── roles                         # User roles
│
├── 📋 **Task Management**
│   ├── tasks                         # Main tasks table
│   ├── task_attachments             # File attachments
│   └── task_comments                # Task comments
│
├── 📄 **Document Management**
│   ├── documents                     # Document records
│   ├── document_versions            # Version control
│   └── document_approvals           # Approval workflow
│
└── 🔄 **Recurring Tasks**
    ├── Database triggers             # Automatic generation
    ├── generate_next_recurring_task() # Generation function
    └── handle_task_completion()      # Trigger function
```

---

## 🐳 **Docker Services**

```
Services (docker-compose.yml):
├── 🗄️ **Database**
│   ├── postgres:17-alpine            # PostgreSQL database
│   └── pgadmin                       # Database management UI
│
├── ⚡ **Cache & Queue**
│   └── redis:7-alpine                # Redis cache & Celery broker
│
├── 🚀 **Application**
│   ├── backend                       # FastAPI server
│   └── frontend                      # React + Nginx
│
└── 🌐 **Networking**
    └── bds_network                   # Internal Docker network
```

---

## 🔧 **Key Features & Components**

### **🔄 Recurring Tasks (No Celery Required)**
- **Database Triggers**: Automatic task generation
- **PostgreSQL Functions**: Smart recurring logic
- **Manual Triggers**: API endpoints for testing

### **📱 Frontend Features**
- **React + TypeScript**: Modern UI framework
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast build tool
- **Responsive Design**: Mobile-friendly interface

### **⚙️ Backend Features**
- **FastAPI**: Modern Python web framework
- **PostgreSQL**: Robust database
- **Redis**: Caching and session storage
- **File Storage**: Local and Azure support

### **🛠️ Development Tools**
- **Docker Compose**: Local development environment
- **Hot Reload**: Frontend and backend
- **Database Migrations**: Version-controlled schema
- **API Documentation**: Auto-generated docs

---

## 🚀 **Quick Start Commands**

```bash
# Start the entire system
./start-local.sh

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Test recurring tasks
./test-recurring-tasks.sh
```

---

## 🌐 **Access URLs**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8002
- **API Docs**: http://localhost:8002/docs
- **pgAdmin**: http://localhost:8080
- **Database**: localhost:5432

---

## 📋 **Current Status**

✅ **Working:**
- Local Docker environment
- Database with sample data
- Frontend and backend services
- Database triggers for recurring tasks

🔧 **Needs Fixing:**
- Task creation API constraints
- Recurring task trigger endpoint
- Frontend-backend integration

🎯 **Ready for Testing:**
- Frontend interface
- Database operations
- Recurring task system

