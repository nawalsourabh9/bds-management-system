#!/bin/bash

echo "🚀 Starting BDS Management System (Simple Setup)"
echo "================================================"

# Start backend
echo "🔧 Starting Backend API..."
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload &
BACKEND_PID=$!

# Start frontend
echo "🎨 Starting Frontend..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services started successfully!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to stop
wait $BACKEND_PID $FRONTEND_PID
