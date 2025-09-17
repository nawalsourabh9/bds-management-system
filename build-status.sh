#!/bin/bash

echo "📊 BDS Management System - Build Status & History"
echo "================================================"

# Check if builds.log exists
if [ ! -f "builds.log" ]; then
    echo "❌ No build history found. Run ./start-local.sh first."
    exit 1
fi

echo ""
echo "📈 Recent Build History:"
echo "Timestamp|Version|Date|Status|Backend|Frontend"
echo "---------|-------|----|------|-------|--------"

# Show last 10 builds
tail -10 builds.log | while IFS='|' read -r timestamp version date status backend frontend; do
    printf "%-8s|%-15s|%-19s|%-7s|%-7s|%-8s\n" \
        "${timestamp:8:6}" \
        "${version:0:15}" \
        "${date:0:19}" \
        "${status}" \
        "${backend}" \
        "${frontend}"
done

echo ""
echo "🐳 Current Docker Images:"
docker images | grep bds-management-system | head -5

echo ""
echo "📦 Running Containers:"
docker-compose ps

echo ""
echo "🔍 Current Service Status:"
echo -n "Backend (8002): "
if curl -f http://localhost:8002/health > /dev/null 2>&1; then
    echo "✅ Running"
    BACKEND_HEALTH=$(curl -s http://localhost:8002/health | jq -r '.database.status, .database.user_count' 2>/dev/null || echo "unknown")
    echo "   Database: ${BACKEND_HEALTH}"
else
    echo "❌ Not responding"
fi

echo -n "Frontend (3000): "
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not responding"
fi

echo ""
echo "🔧 Quick Commands:"
echo "  View full logs: docker-compose logs -f"
echo "  Restart:        docker-compose restart"
echo "  Stop all:       docker-compose down"
echo "  New build:      ./start-local.sh"
