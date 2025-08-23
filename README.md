
# BDS Management System

A modern Business Document System with Quality Management System (QMS) features, built with React, FastAPI, and PostgreSQL. Features Apple-like UI/UX with glass morphism effects and orange theme.

## 🚀 Features

- 🎨 **Modern UI/UX** - Apple-like design with glass morphism effects
- 🍊 **Orange Theme** - Beautiful orange color scheme throughout
- 📅 **Calendar Integration** - Full calendar functionality with drag & drop
- 🔄 **Task Generation** - Automated recurring task creation
- 📊 **QMS Features** - Document control, CAPA, audits, processes
- 🔐 **Authentication** - JWT-based authentication system
- 📱 **Responsive Design** - Works on all devices
- 🚀 **Real-time Updates** - WebSocket integration
- 🐳 **Docker Support** - Easy deployment with Docker
- ☁️ **Azure Integration** - Cloud deployment ready

## 🛠️ Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL 15+
- Redis 7+

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd bds-management-system

# Make setup script executable
chmod +x setup-project.sh

# Run the complete setup
./setup-project.sh
```

### 2. Start Development Servers

```bash
# Start both backend and frontend
./start-dev.sh
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 4. Default Credentials

- **Email**: admin@bds.com
- **Password**: admin123

## 📁 Project Structure

```
bds-management-system/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic
│   │   └── core/           # Core functionality
│   ├── alembic/            # Database migrations
│   └── tests/              # Backend tests
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── database/               # Database scripts
│   ├── migrations/         # Database migrations
│   └── init/               # Initialization scripts
├── scripts/                # Setup and utility scripts
└── docs/                   # Documentation
```

## 🎨 UI/UX Features

### Glass Morphism Design
- Frosted glass effects throughout the interface
- Subtle shadows and blur effects
- Smooth transitions and animations

### Orange Theme
- Primary: #FF6B35
- Secondary: #FF8C42
- Accent: #FFA500
- Consistent orange color scheme

### Interactive Elements
- Glossy toggle switches
- Smooth hover effects
- Responsive design
- Mobile-first approach

## 🗄️ Database Schema

### Core Tables
- **users** - User management and authentication
- **departments** - Organizational structure
- **tasks** - Task management with recurring support
- **calendar_events** - Calendar and scheduling
- **task_templates** - Reusable task definitions
- **documents** - Document management system

### Key Features
- UUID primary keys for scalability
- JSONB fields for flexible data storage
- Proper indexing for performance
- Automatic timestamp management
- Soft delete support

## 🔧 Development

### Backend Development

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Database Management

```bash
# Create migration
cd backend
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Reset database
alembic downgrade base
alembic upgrade head
```

## 🐳 Docker Deployment

### Local Docker Setup

```bash
# Start with Docker
docker-compose up --build

# Stop services
docker-compose down
```

### Production Docker

```bash
# Build and start production
docker-compose -f docker-compose.prod.yml up --build -d
```

## ☁️ Azure Deployment

### 1. Setup Azure Resources

```bash
# Setup Azure infrastructure
./setup-azure.sh
```

### 2. Deploy to Azure

```bash
# Deploy application
./deploy-azure.sh
```

### Azure Services Used
- **Azure PostgreSQL** - Managed database
- **Azure Storage** - File storage
- **Azure App Service** - Web application hosting
- **Azure Redis Cache** - Caching (optional)

## 📊 QMS Features

### Document Management
- Version control
- Approval workflows
- Document templates
- Search and indexing

### Process Management
- Visual process flows
- Process templates
- Process monitoring
- Performance analytics

### CAPA Management
- Corrective actions
- Preventive actions
- Effectiveness tracking
- Root cause analysis

### Audit Management
- Audit planning
- Checklist management
- Finding tracking
- Compliance reporting

## 🔄 Task Generation System

### Features
- **Recurring Tasks** - Daily, weekly, monthly, etc.
- **Template-based** - Create tasks from templates
- **Smart Scheduling** - Intelligent due date calculation
- **Duplicate Prevention** - Avoid duplicate task generation
- **Batch Operations** - Generate multiple tasks at once

### Frequencies Supported
- Daily
- Weekly
- Bi-weekly
- Monthly
- Quarterly
- Annually
- Custom intervals

## 📅 Calendar Integration

### Features
- **Multiple Views** - Month, week, day, list
- **Event Types** - Tasks, meetings, deadlines, reminders
- **Recurring Events** - Handle recurring patterns
- **Drag & Drop** - Reschedule by dragging
- **Quick Actions** - Quick task creation

## 🚀 Performance Optimizations

### Backend
- Database indexing
- Query optimization
- Caching with Redis
- Background task processing
- Connection pooling

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Bundle optimization
- Service worker caching

## 🔒 Security Features

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Session management
- Role-based access control

### Data Protection
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting

## 📈 Monitoring & Analytics

### Metrics
- Application performance
- Database performance
- User activity
- Error tracking
- Business metrics

### Logging
- Structured logging
- Error tracking
- Performance monitoring
- Audit trails

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: Create an issue in the repository
- **Email**: support@bds.com

## 🔄 Changelog

### v1.0.0 (Current)
- Initial release
- Basic task management
- Calendar integration
- Document management
- QMS features
- Azure deployment support

## 🎯 Roadmap

### v1.1.0 (Next)
- Advanced task dependencies
- Resource management
- Time tracking
- Advanced analytics
- Mobile app

### v1.2.0 (Future)
- AI-powered insights
- Advanced reporting
- Integration APIs
- Multi-tenant support
- Advanced QMS features

---

**Built with ❤️ and ☕ by the BDS Team**
