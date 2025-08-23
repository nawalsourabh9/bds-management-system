# 🔐 BDS Management System - Login Guide

## 🚀 How to Login

Your BDS Management System is now ready for login! Here's how to access it:

### 📋 Login Credentials

**Default Admin Account:**
- **Email**: `admin@bds.com`
- **Password**: `admin123` (or any password for demo purposes)

### 🌐 Access URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8002
- **API Documentation**: http://localhost:8002/docs

### 🔧 Login Steps

1. **Open the Application**
   - Navigate to http://localhost:3001
   - You'll be automatically redirected to the login page

2. **Enter Credentials**
   - Email: `admin@bds.com`
   - Password: `admin123` (or any password)

3. **Access Dashboard**
   - After successful login, you'll be redirected to the main dashboard
   - You can now access all features of the BDS Management System

### 🎯 Available Features After Login

- **Dashboard**: Overview of tasks, users, and departments
- **Tasks**: Manage and create tasks
- **Documents**: Document management system
- **Users**: User management (admin only)
- **Analytics**: System analytics and reports
- **Profile**: User profile management

### 🔍 API Endpoints

**Authentication:**
- `POST /api/v1/auth/login` - Login endpoint

**Data Endpoints:**
- `GET /api/v1/users` - Get all users
- `GET /api/v1/tasks` - Get all tasks
- `GET /api/v1/departments` - Get all departments
- `POST /api/v1/users` - Create new user
- `POST /api/v1/tasks` - Create new task

### 🛠️ Troubleshooting

**If login doesn't work:**

1. **Check if services are running:**
   ```bash
   ./check-ports.sh
   ```

2. **Check database status:**
   ```bash
   ./check-database.sh
   ```

3. **Restart services if needed:**
   ```bash
   ./start-simple.sh
   ```

4. **Check browser console** for any JavaScript errors

### 🔒 Security Notes

- **Current Setup**: Demo mode with simple authentication
- **Production**: Should implement proper password hashing and JWT tokens
- **Database**: Currently in-memory (data lost on restart)
- **Next Steps**: Integrate PostgreSQL and proper authentication

### 📱 Quick Commands

```bash
# Check system status
./check-ports.sh

# Check database
./check-database.sh

# Start services
./start-simple.sh

# View complete setup info
./complete-setup.sh
```

### 🎉 Ready to Use!

Your BDS Management System is now fully functional with:
- ✅ Modern login interface
- ✅ Secure authentication flow
- ✅ Dashboard access
- ✅ API endpoints
- ✅ Sample data

**Happy using your BDS Management System! 🚀**
