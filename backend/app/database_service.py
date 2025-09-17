import psycopg2
from psycopg2.extras import RealDictCursor
from app.core.config import settings
import logging
from datetime import datetime, date

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
    
    def execute_query(self, query, params=None):
        """Execute a query and return results"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                if cur.description:
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                else:
                    conn.commit()
                    return []
        except Exception as e:
            logger.error(f"Error executing query: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def get_users(self):
        """Get all active users"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        id, employee_id, email, first_name, last_name, role, 
                        department_id, is_active, created_at, updated_at
                    FROM users 
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
                    FROM users 
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
        """Get all tasks with department names and employee information"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        t.id, t.title, t.description, t.status, t.priority,
                        t.department_id, t.assignee_id, t.created_by,
                        t.start_date, t.due_date, t.completed_date,
                        t.is_recurring, t.recurring_frequency, t.is_customer_related, t.customer_name,
                        t.customer_email, t.tags, t.created_at, t.updated_at,
                        -- Assignee information
                        u.email as assignee_email,
                        CONCAT(u.first_name, ' ', u.last_name) as assignee_name,
                        u.employee_id as assignee_employee_id,
                        -- Department information
                        d.name as department_name,
                        -- Creator information
                        creator.email as created_by_email,
                        CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name
                    FROM tasks t
                    LEFT JOIN users u ON t.assignee_id = u.id
                    LEFT JOIN departments d ON t.department_id = d.id
                    LEFT JOIN users creator ON t.created_by = creator.id
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
        """Get a specific task by ID with department names and employee information"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        t.id, t.title, t.description, t.status, t.priority,
                        t.department_id, t.assignee_id, t.created_by,
                        t.start_date, t.due_date, t.completed_date,
                        t.is_recurring, t.recurring_frequency, t.is_customer_related, t.customer_name,
                        t.customer_email, t.tags, t.created_at, t.updated_at,
                        -- Assignee information
                        u.email as assignee_email,
                        CONCAT(u.first_name, ' ', u.last_name) as assignee_name,
                        u.employee_id as assignee_employee_id,
                        -- Department information
                        d.name as department_name,
                        -- Creator information
                        creator.email as created_by_email,
                        CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name
                    FROM tasks t
                    LEFT JOIN users u ON t.assignee_id = u.id
                    LEFT JOIN departments d ON t.department_id = d.id
                    LEFT JOIN users creator ON t.created_by = creator.id
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
                    FROM departments 
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
    
    def get_department_id_by_name(self, department_name):
        """Get department ID by name"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id FROM departments WHERE name = %s", (department_name,))
                result = cur.fetchone()
                return result['id'] if result else None
        except Exception as e:
            logger.error(f"Error fetching department ID by name: {e}")
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
                    INSERT INTO tasks (
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
            logger.info(f"Starting update_task for {task_id} with data: {task_data}")
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # If status is being changed to 'completed', log the completion
                if task_data.get('status') == 'completed':
                    logger.info(f"Completing task {task_id}")
                    # Get the task's due date for logging purposes
                    cur.execute("SELECT due_date FROM tasks WHERE id = %s", (task_id,))
                    result = cur.fetchone()
                    logger.info(f"Query result: {result}")
                    if result and result['due_date']:
                        due_date = result['due_date']
                        current_date = datetime.now().date()
                        logger.info(f"Task completion: Due date: {due_date}, Current date: {current_date}")
                        # Allow completion regardless of due date for flexibility
                
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
                
                # If status is being changed to 'completed', set completed_date
                if task_data.get('status') == 'completed':
                    update_fields.append("completed_date = CURRENT_TIMESTAMP")
                
                if update_fields:
                    values.append(task_id)
                    query = f"""
                        UPDATE tasks 
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
                cur.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
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
                    FROM users u
                    LEFT JOIN departments d ON u.department_id = d.id
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
                        UPDATE users 
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
                cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
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
