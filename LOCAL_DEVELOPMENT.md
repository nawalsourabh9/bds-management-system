# BDS Management System - Local Development

## Quick Start

1. **Start the application:**
   ```bash
   ./start-local.sh
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8002
   - Database: Local Mac PostgreSQL 17.5 (taklu:0071@localhost:5432/bds_management_system)

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React application |
| Backend | 8002 | FastAPI application |
| PostgreSQL | 5432 | Local Mac PostgreSQL 17.5 |

## Development Commands

```bash
# Start all services (simplified - frontend + backend only)
./start-local.sh

# Check build status and history
./build-status.sh

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart backend

# Access service shell
docker-compose exec backend sh

# Rebuild and restart
docker-compose up --build -d

# View build history
cat builds.log

# View Docker images with versions
docker images | grep bds-management-system
```

## Database

- **Database**: `bds_management_system`
- **User**: `taklu`
- **Password**: `0071`
- **Host**: `localhost:5432` (Local Mac PostgreSQL 17.5)

## API Endpoints

- Health check: http://localhost:8002/health
- API docs: http://localhost:8002/docs
- OpenAPI spec: http://localhost:8002/openapi.json
- User Management: http://localhost:8002/api/v1/users
- Departments: http://localhost:8002/api/v1/departments

## User Management Features

✅ **Backend API Endpoints:**
- `GET /api/v1/users` - List all users
- `GET /api/v1/users/{user_id}` - Get specific user
- `POST /api/v1/users` - Create new user
- `PUT /api/v1/users/{user_id}` - Update user
- `DELETE /api/v1/users/{user_id}` - Delete user
- `GET /api/v1/departments` - List departments

✅ **Frontend Components:**
- User management page with create/edit/delete functionality
- Department selection
- User role management (admin, user, manager)

## Build Tracking & Versioning

The system now includes comprehensive build tracking:

- **Build Versioning**: Each build gets a unique version (e.g., `v1.0.0-20250905_173758`)
- **Build History**: All builds are logged in `builds.log` with timestamps and status
- **Image Tagging**: Docker images are tagged with version numbers for easy rollback
- **Status Monitoring**: Real-time health checks for all services

### Build Management Commands

```bash
# View build status and history
./build-status.sh

# View build log
cat builds.log

# List all image versions
docker images | grep bds-management-system

# Rollback to previous version (example)
docker-compose down
docker tag bds-management-system-backend:v1.0.0-20250905_173758 bds-management-system-backend:latest
docker-compose up -d
```

## Troubleshooting

1. **Port conflicts**: The script automatically kills processes using ports 3000, 8002
2. **Docker issues**: Ensure Docker is running and has enough resources
3. **Database connection**: Check if local PostgreSQL is running on port 5432
4. **Frontend not loading**: Check if backend is running on port 8002
5. **Database connection issues**: Verify PostgreSQL is running: `brew services list | grep postgresql`
6. **Build issues**: Check `builds.log` for build history and status
7. **Container cleanup**: The script automatically cleans up orphaned containers and dangling images

## File Structure

```
├── backend/           # FastAPI backend
├── src/              # React frontend
├── docker-compose.yml # Local development setup
├── start-local.sh    # Quick start script
└── env.local.example # Environment variables template
```

