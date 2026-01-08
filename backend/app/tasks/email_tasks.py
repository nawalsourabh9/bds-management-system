from app.celery_app import celery_app
from loguru import logger
import time

@celery_app.task(bind=True)
def send_email_task(self, to_email: str, subject: str, message: str):
    """Send email task"""
    try:
        logger.info(f"Sending email to {to_email}: {subject}")
        
        # Simulate email sending
        time.sleep(2)
        
        logger.info(f"Email sent successfully to {to_email}")
        return {"status": "success", "email": to_email}
        
    except Exception as exc:
        logger.error(f"Failed to send email to {to_email}: {exc}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)

@celery_app.task
def send_notification_task(user_id: str, notification_type: str, data: dict):
    """Send notification task"""
    try:
        logger.info(f"Sending {notification_type} notification to user {user_id}")
        
        # Simulate notification sending
        time.sleep(1)
        
        logger.info(f"Notification sent successfully to user {user_id}")
        return {"status": "success", "user_id": user_id, "type": notification_type}
        
    except Exception as exc:
        logger.error(f"Failed to send notification to user {user_id}: {exc}")
        raise exc
