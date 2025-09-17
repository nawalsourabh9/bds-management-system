import psycopg2
from psycopg2.extras import RealDictCursor
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self.connection_string = settings.DATABASE_URL
    
    def get_connection(self):
        """Get a database connection"""
        try:
            conn = psycopg2.connect(self.connection_string)
            return conn
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise
    
    def get_users(self):
        """Get all active users"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        id, email, first_name, last_name, role, 
                        department_id, is_active, created_at, updated_at
                    FROM bds.users 
                    WHERE is_active = true
                    ORDER BY created_at DESC
                """)
                users = cur.fetchall()
                return [dict(user) for user in users]
        except Exception as e:
            logger.error(f"Error fetching users: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def get_user_by_email(self, email):
        """Get user by email"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        id, email, first_name, last_name, role, 
                        department_id, is_active, created_at, updated_at
                    FROM bds.users 
                    WHERE email = %s AND is_active = true
                """, (email,))
                user = cur.fetchone()
                return dict(user) if user else None
        except Exception as e:
            logger.error(f"Error fetching user by email: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def get_tasks(self):
        """Get all tasks"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        t.id, t.title, t.description, t.status, t.priority,
                        t.department_id, t.assignee_id, t.created_by,
                        t.start_date, t.due_date, t.completed_date,
                        t.is_recurring, t.is_customer_related, t.customer_name,
                        t.customer_email, t.tags, t.created_at, t.updated_at,
                        u.email as assignee_email,
                        CONCAT(u.first_name, ' ', u.last_name) as assignee_name
                    FROM bds.tasks t
                    LEFT JOIN bds.users u ON t.assignee_id = u.id
                    ORDER BY t.created_at DESC
                """)
                tasks = cur.fetchall()
                return [dict(task) for task in tasks]
        except Exception as e:
            logger.error(f"Error fetching tasks: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def get_task_by_id(self, task_id: str):
        """Get a specific task by ID"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        t.id, t.title, t.description, t.status, t.priority,
                        t.department_id, t.assignee_id, t.created_by,
                        t.start_date, t.due_date, t.completed_date,
                        t.is_recurring, t.is_customer_related, t.customer_name,
                        t.customer_email, t.tags, t.created_at, t.updated_at,
                        u.email as assignee_email,
                        CONCAT(u.first_name, ' ', u.last_name) as assignee_name
                    FROM bds.tasks t
                    LEFT JOIN bds.users u ON t.assignee_id = u.id
                    WHERE t.id = %s
                """, (task_id,))
                task = cur.fetchone()
                return dict(task) if task else None
        except Exception as e:
            logger.error(f"Error fetching task by ID: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def get_departments(self):
        """Get all departments"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        id, name, description, manager_id, created_at, updated_at
                    FROM bds.departments 
                    ORDER BY name
                """)
                departments = cur.fetchall()
                return [dict(dept) for dept in departments]
        except Exception as e:
            logger.error(f"Error fetching departments: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def create_task(self, task_data):
        """Create a new task"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO bds.tasks (
                        title, description, status, priority, department_id,
                        assignee_id, created_by, start_date, due_date,
                        is_recurring, is_customer_related, customer_name
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id
                """, (
                    task_data.get('title'),
                    task_data.get('description'),
                    task_data.get('status', 'not-started'),
                    task_data.get('priority', 'medium'),
                    task_data.get('department_id'),
                    task_data.get('assignee_id'),
                    task_data.get('created_by'),
                    task_data.get('start_date'),
                    task_data.get('due_date'),
                    task_data.get('is_recurring', False),
                    task_data.get('is_customer_related', False),
                    task_data.get('customer_name')
                ))
                task_id = cur.fetchone()['id']
                conn.commit()
                return task_id
        except Exception as e:
            logger.error(f"Error creating task: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def update_task(self, task_id, task_data):
        """Update a task"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Build dynamic update query
                update_fields = []
                values = []
                
                for field, value in task_data.items():
                    if value is not None and field in [
                        'title', 'description', 'status', 'priority', 
                        'department_id', 'assignee_id', 'start_date', 'due_date',
                        'is_recurring', 'is_customer_related', 'customer_name'
                    ]:
                        update_fields.append(f"{field} = %s")
                        values.append(value)
                
                if update_fields:
                    values.append(task_id)
                    query = f"""
                        UPDATE bds.tasks 
                        SET {', '.join(update_fields)}
                        WHERE id = %s
                    """
                    cur.execute(query, values)
                    conn.commit()
                    return True
                return False
        except Exception as e:
            logger.error(f"Error updating task: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def delete_task(self, task_id):
        """Delete a task"""
        try:
            conn = self.get_connection()
            with conn.cursor() as cur:
                cur.execute("DELETE FROM bds.tasks WHERE id = %s", (task_id,))
                conn.commit()
                return cur.rowcount > 0
        except Exception as e:
            logger.error(f"Error deleting task: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()

    def get_user_by_id(self, user_id: str):
        """Get a user by ID"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        u.id, u.email, u.first_name, u.last_name, u.role, 
                        u.department_id, u.is_active, u.created_at, u.updated_at,
                        d.name as department_name
                    FROM bds.users u
                    LEFT JOIN bds.departments d ON u.department_id = d.id
                    WHERE u.id = %s
                """, (user_id,))
                user = cur.fetchone()
                return dict(user) if user else None
        except Exception as e:
            logger.error(f"Error fetching user by ID: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def update_user(self, user_id: str, user_data: dict):
        """Update a user"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Build dynamic update query
                update_fields = []
                values = []
                
                for field, value in user_data.items():
                    if value is not None and field in [
                        'email', 'first_name', 'last_name', 'role', 
                        'department_id', 'is_active'
                    ]:
                        update_fields.append(f"{field} = %s")
                        values.append(value)
                
                if update_fields:
                    values.append(user_id)
                    query = f"""
                        UPDATE bds.users 
                        SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """
                    cur.execute(query, values)
                    conn.commit()
                    return True
                return False
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()

    def delete_user(self, user_id: str):
        """Delete a user"""
        try:
            conn = self.get_connection()
            with conn.cursor() as cur:
                cur.execute("DELETE FROM bds.users WHERE id = %s", (user_id,))
                conn.commit()
                return cur.rowcount > 0
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()

    def create_otp_code(self, otp_data: dict):
        """Create OTP code"""
        try:
            conn = self.get_connection()
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO otp_codes (email, otp_code, expires_at, created_at)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (email) DO UPDATE SET
                        otp_code = EXCLUDED.otp_code,
                        expires_at = EXCLUDED.expires_at,
                        created_at = CURRENT_TIMESTAMP
                """, (otp_data['email'], otp_data['otp_code'], otp_data['expires_at']))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error creating OTP code: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()

    def get_otp_code(self, email: str):
        """Get OTP code for email"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT email, otp_code, expires_at, created_at
                    FROM otp_codes
                    WHERE email = %s AND expires_at > CURRENT_TIMESTAMP
                """, (email,))
                otp_code = cur.fetchone()
                return dict(otp_code) if otp_code else None
        except Exception as e:
            logger.error(f"Error getting OTP code: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def update_otp_code(self, email: str, otp_data: dict):
        """Update OTP code"""
        try:
            conn = self.get_connection()
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE otp_codes
                    SET otp_code = %s, expires_at = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE email = %s
                """, (otp_data['otp_code'], otp_data['expires_at'], email))
                conn.commit()
                return cur.rowcount > 0
        except Exception as e:
            logger.error(f"Error updating OTP code: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()

# Global database service instance
db_service = DatabaseService()
