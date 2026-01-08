
# Nordic Design E-QMS

A comprehensive electronic quality management system designed for Nordic Design with real-time status updates, and Azure integration.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+) & npm
- Azure CLI (for cloud deployment)

### Setup Options

**Option 1: Complete Setup (Recommended)**
```bash
chmod +x setup.sh
./setup.sh
# Choose option 1 for complete setup
```

**Option 2: Individual Components**
```bash
# Database only
./scripts/setup-docker.sh

# Azure deployment
./scripts/setup-azure.sh

# Complete local setup
./scripts/setup-complete.sh
```

## 📊 System Overview

### Database Structure
- **Users**: 30+ users with Indian names
- **Departments**: 8 manufacturing departments
- **Tasks**: 10+ status types, 6 priority levels
- **Real-time Updates**: Status changes tracked automatically

### User Roles
- **SuperAdmin**: `admin@bdsmanufacturing.in` (Full system access)
- **Admin**: `sourabh.nawal@bdsmanufacturing.in` (Department management)
- **Manager**: Department heads (Team management)
- **Supervisor**: Task oversight
- **User**: Basic task operations

### Task Statuses
- `not-started` → `pending` → `in-progress` → `completed`
- `under-review` → `on-hold` → `blocked` → `waiting-for-approval`
- `overdue` → `cancelled`

### Priorities
- `low` → `medium` → `high` → `urgent` → `critical` → `emergency`

## 🏗️ Architecture

```
BDS Management System/
├── scripts/                 # All setup and utility scripts
│   ├── setup-complete.sh   # Complete local setup
│   ├── setup-docker.sh     # Database setup only
│   ├── setup-azure.sh      # Azure deployment
│   └── ...
├── database/               # Database schema and seed data
│   └── schema/
│       ├── 01-bds_schema.sql
│       └── 02-seed_data.sql
├── src/                    # Frontend React application
├── backend/                # Backend API (created by setup)
├── docker-compose.yml      # Docker services
└── setup.sh               # Main setup script
```

## 🔧 Access Information

### Local Development
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **PgAdmin**: http://localhost:8080

### Test Users (Password: admin123)
- **SuperAdmin**: `admin@bdsmanufacturing.in`
- **Admin**: `sourabh.nawal@bdsmanufacturing.in`
- **Quality Manager**: `priya.sharma@bdsmanufacturing.in`
- **Production Manager**: `rajesh.kumar@bdsmanufacturing.in`

### API Endpoints
- Health Check: `GET /api/health`
- Users: `GET /api/users`
- Tasks: `GET /api/tasks`

## 🎯 Key Features

### ✅ Real-Time Status Updates
- Frontend can update all task statuses dynamically
- Status badges with icons and colors
- Comprehensive status update dialog

### ✅ BDS Manufacturing Data
- Indian names and manufacturing departments
- Quality Assurance, Production, R&D, Supply Chain
- Real manufacturing tasks and workflows

### ✅ Azure Integration Ready
- Azure PostgreSQL setup script
- Azure CLI automation
- Cloud deployment ready

### ✅ Comprehensive Task Management
- 10 different task statuses
- 6 priority levels
- Recurring tasks support
- Customer-related tasks
- Document attachments

## 🚀 Deployment Options

### Local Development
```bash
./setup.sh
# Choose option 1 for complete local setup
```

### Azure Cloud
```bash
./setup.sh
# Choose option 3 for Azure deployment
```

### Docker Only
```bash
./setup.sh
# Choose option 2 for database only
```

## 📁 Scripts Overview

| Script | Purpose |
|--------|---------|
| `setup-complete.sh` | Complete local setup (DB + Backend + Frontend) |
| `setup-docker.sh` | Database setup with Docker |
| `setup-azure.sh` | Azure PostgreSQL and cloud deployment |
| `setup-database.sh` | Database schema and seed data only |

## 🔍 Testing the System

1. **Login**: Use any test user with password `admin123`
2. **Create Tasks**: Test task creation and assignment
3. **Update Status**: Change task statuses using the frontend
4. **View Dashboard**: Check different user roles and permissions
5. **Database**: Use PgAdmin to inspect the database

## 🛠️ Development

### Frontend Components
- Enhanced `StatusBadge` with 10 status types
- Enhanced `PriorityBadge` with 6 priority levels
- `StatusUpdateDialog` for real-time updates
- All components support dynamic status changes

### Backend API
- Express.js server with PostgreSQL
- RESTful endpoints for users and tasks
- Database connection with connection pooling

### Database
- PostgreSQL 17 with comprehensive schema
- BDS manufacturing data with Indian names
- Audit trails and task history

## 📞 Support

For issues or questions:
1. Check the database logs: `docker-compose logs postgres`
2. Verify API endpoints: `curl http://localhost:3001/api/health`
3. Check frontend: Open browser dev tools

## 🎉 Ready to Use!

The BDS Management System is now ready with:
- ✅ Complete database with Indian names
- ✅ Real-time status updates
- ✅ Azure deployment ready
- ✅ Clean, organized structure
- ✅ Comprehensive documentation

**Start with**: `./setup.sh` and choose option 1 for complete setup!
