"""
Simple Database-Driven Scheduler for BDS Management System
No Redis or Celery needed - uses only PostgreSQL
Cost: $0/month
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any
import httpx
from app.core.config import settings, mask_sensitive_info
from app.database_service import db_service

logger = logging.getLogger(__name__)

class SimpleScheduler:
    """Database-driven task scheduler - no external dependencies"""
    
    def __init__(self):
        self.running = False
        self.api_base = "http://localhost:8002"
    
    async def start(self):
        """Start the scheduler"""
        self.running = True
        logger.info("Simple Database Scheduler started")
        
        # Start background tasks
        asyncio.create_task(self._run_scheduled_tasks())
    
    async def stop(self):
        """Stop the scheduler"""
        self.running = False
        logger.info("Simple Database Scheduler stopped")
    
    async def _run_scheduled_tasks(self):
        """Run all scheduled tasks using database functions"""
        while self.running:
            try:
                # Call the database function that handles everything
                result = db_service.execute_query("SELECT run_scheduled_tasks();")
                
                if result and len(result) > 0:
                    task_result = result[0]['run_scheduled_tasks']
                    logger.info(f"Scheduled tasks completed: {task_result}")
                    
                    # Log metrics
                    recurring = task_result.get('recurring_generated', 0)
                    overdue = task_result.get('overdue_marked', 0)
                    reminders = task_result.get('reminders_sent', 0)
                    
                    if recurring > 0 or overdue > 0 or reminders > 0:
                        logger.info(f"Generated {recurring} recurring tasks, marked {overdue} overdue, sent {reminders} reminders")
                
                # Run every 5 minutes
                await asyncio.sleep(300)
                
            except Exception as e:
                # Mask sensitive information in error messages
                error_msg = mask_sensitive_info(str(e))
                logger.error(f"Error running scheduled tasks: {error_msg}")
                await asyncio.sleep(60)  # Wait 1 minute before retry

# Global scheduler instance
scheduler = SimpleScheduler()

async def start_simple_scheduler():
    """Start the simple scheduler"""
    await scheduler.start()

async def stop_simple_scheduler():
    """Stop the simple scheduler"""
    await scheduler.stop()

# Manual trigger function for testing
async def trigger_manual_run():
    """Manually trigger scheduled tasks"""
    try:
        result = db_service.execute_query("SELECT run_scheduled_tasks();")
        if result and len(result) > 0:
            return result[0]['run_scheduled_tasks']
        return {"error": "No result from database"}
    except Exception as e:
        logger.error(f"Error in manual trigger: {e}")
        return {"error": str(e)}
