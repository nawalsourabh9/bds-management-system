"""
Simple Task Scheduler for BDS Management System
Alternative to Celery for local development
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class TaskScheduler:
    """Simple task scheduler for recurring operations"""
    
    def __init__(self):
        self.running = False
        self.tasks = {}
        self.api_base = "http://localhost:8002"
    
    async def start(self):
        """Start the scheduler"""
        self.running = True
        logger.info("Task Scheduler started")
        
        # Start background tasks
        asyncio.create_task(self._check_recurring_tasks())
        asyncio.create_task(self._cleanup_old_tasks())
        asyncio.create_task(self._send_reminders())
    
    async def stop(self):
        """Stop the scheduler"""
        self.running = False
        logger.info("Task Scheduler stopped")
    
    async def _check_recurring_tasks(self):
        """Check and generate overdue recurring tasks"""
        while self.running:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(f"{self.api_base}/api/v1/tasks/trigger-recurring")
                    if response.status_code == 200:
                        result = response.json()
                        if result.get('generated_count', 0) > 0:
                            logger.info(f"Generated {result['generated_count']} recurring tasks")
                
                # Check every hour
                await asyncio.sleep(3600)
                
            except Exception as e:
                logger.error(f"Error checking recurring tasks: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes before retry
    
    async def _cleanup_old_tasks(self):
        """Clean up old completed tasks"""
        while self.running:
            try:
                # This would call a cleanup endpoint if it existed
                logger.info("Checking for old tasks to cleanup")
                
                # Run daily
                await asyncio.sleep(86400)
                
            except Exception as e:
                logger.error(f"Error cleaning up old tasks: {e}")
                await asyncio.sleep(3600)
    
    async def _send_reminders(self):
        """Send task reminders"""
        while self.running:
            try:
                # This would call a reminder endpoint if it existed
                logger.info("Checking for tasks that need reminders")
                
                # Check every 30 minutes
                await asyncio.sleep(1800)
                
            except Exception as e:
                logger.error(f"Error sending reminders: {e}")
                await asyncio.sleep(300)

# Global scheduler instance
scheduler = TaskScheduler()

async def start_scheduler():
    """Start the task scheduler"""
    await scheduler.start()

async def stop_scheduler():
    """Stop the task scheduler"""
    await scheduler.stop()

# Example usage in main.py:
# from app.scheduler import start_scheduler, stop_scheduler
# 
# @app.on_event("startup")
# async def startup_event():
#     await start_scheduler()
# 
# @app.on_event("shutdown")
# async def shutdown_event():
#     await stop_scheduler()

