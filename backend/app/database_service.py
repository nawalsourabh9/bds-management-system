import psycopg2
from psycopg2.extras import RealDictCursor
from app.core.config import settings
import logging
import uuid
from datetime import datetime, date

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        # Don't cache connection string - read it dynamically from settings
        # This ensures environment variables are read at runtime, not at module load time
        logger.info("DatabaseService initialized (connection string will be read dynamically)")
    
    @property
    def connection_string(self):
        """Get connection string dynamically from settings (reads environment variables at runtime)"""
        db_url = settings.DATABASE_URL
        # Log connection info (without password for security)
        safe_url = db_url.split('@')[-1] if '@' in db_url else 'hidden'
        logger.info(f"Using database connection: postgresql://***@{safe_url}")
        return db_url
    
    def get_connection(self):
        """Get a database connection"""
        try:
            conn = psycopg2.connect(self.connection_string)
            return conn
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise

    def create_notification(self, user_id: str, title: str, message: str, notification_type: str = 'info', task_id: str = None):
        """Create a new notification"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor() as cur:
                # Check if task_id column exists
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'notifications' AND column_name = 'task_id'
                """)
                has_task_id_column = cur.fetchone() is not None
                
                if has_task_id_column:
                    # Use task_id column if it exists
                    cur.execute("""
                        INSERT INTO notifications (user_id, title, message, type, task_id, is_read, created_at)
                        VALUES (%(user_id)s, %(title)s, %(message)s, %(type)s, %(task_id)s, FALSE, NOW())
                        RETURNING id;
                    """, {
                        "user_id": user_id,
                        "title": title,
                        "message": message,
                        "type": notification_type,
                        "task_id": task_id
                    })
                else:
                    # Fallback: store task_id in message metadata if column doesn't exist
                    final_message = message
                    if task_id:
                        final_message = f"{message}|TASK_ID:{task_id}"
                    
                    cur.execute("""
                        INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
                        VALUES (%(user_id)s, %(title)s, %(message)s, %(type)s, FALSE, NOW())
                        RETURNING id;
                    """, {
                        "user_id": user_id,
                        "title": title,
                        "message": final_message,
                        "type": notification_type
                    })
                
                notification_id = cur.fetchone()[0]
                conn.commit()
                logger.info(f"Created notification {notification_id} for user {user_id}, task_id: {task_id}")
                return notification_id
        except Exception as e:
            logger.error(f"Error creating notification: {e}", exc_info=True)
            raise
        finally:
            if conn:
                conn.close()

        conn = None
    def get_notifications_by_user(self, user_id: str, limit: int = 50):
        """Get notifications for a specific user"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check if task_id column exists
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'notifications' AND column_name = 'task_id'
                """)
                has_task_id_column = cur.fetchone() is not None
                
                if has_task_id_column:
                    # Use task_id column if it exists
                    # Primary lookup: user_id should be UUID from users.id (not employee_id)
                    # Fallback: if employee_id is provided, find user by employee_id first
                    logger.info(f"Fetching notifications for user_id: {user_id} (type: {type(user_id).__name__})")
                    # First try direct UUID match (primary case - user_id is UUID)
                    # If that fails, try matching by employee_id (fallback for display IDs)
                    cur.execute("""
                        SELECT 
                            n.id, n.title, n.message, n.type, n.is_read, n.created_at, n.task_id,
                            u.first_name, u.last_name, u.email
                        FROM notifications n
                        LEFT JOIN users u ON n.user_id = u.id
                        WHERE n.user_id::text = %(user_id)s::text
                           OR EXISTS (
                               SELECT 1 FROM users u2 
                               WHERE u2.id = n.user_id 
                               AND u2.employee_id = %(user_id)s
                           )
                        ORDER BY n.created_at DESC
                        LIMIT %(limit)s;
                    """, {"user_id": str(user_id), "limit": limit})
                else:
                    # Fallback: query without task_id column
                    # Primary lookup: user_id should be UUID from users.id (not employee_id)
                    logger.info(f"Fetching notifications (no task_id column) for user_id: {user_id}")
                    cur.execute("""
                        SELECT 
                            n.id, n.title, n.message, n.type, n.is_read, n.created_at,
                            u.first_name, u.last_name, u.email
                        FROM notifications n
                        LEFT JOIN users u ON n.user_id = u.id
                        WHERE n.user_id::text = %(user_id)s::text
                           OR EXISTS (
                               SELECT 1 FROM users u2 
                               WHERE u2.id = n.user_id 
                               AND u2.employee_id = %(user_id)s
                           )
                        ORDER BY n.created_at DESC
                        LIMIT %(limit)s;
                    """, {"user_id": str(user_id), "limit": limit})
                
                notifications = cur.fetchall()
                result = []
                for notification in notifications:
                    notif_dict = dict(notification)
                    # Extract task_id from message if column doesn't exist
                    if not has_task_id_column:
                        message = notif_dict.get('message', '')
                        if '|TASK_ID:' in message:
                            parts = message.split('|TASK_ID:')
                            notif_dict['message'] = parts[0]  # Original message without metadata
                            notif_dict['task_id'] = parts[1] if len(parts) > 1 else None
                    result.append(notif_dict)
                return result
        except Exception as e:
            logger.error(f"Error fetching notifications: {e}", exc_info=True)
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    
    def create_audit_log(self, user_id: str, action: str, table_name: str = None, record_id: str = None, 
                         old_values: dict = None, new_values: dict = None, ip_address: str = None, 
                         user_agent: str = None):
        """Create an audit log entry"""
        conn = None
        try:
            import json
            conn = self.get_connection()
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at)
                    VALUES (%(user_id)s, %(action)s, %(table_name)s, %(record_id)s, 
                            %(old_values)s::jsonb, %(new_values)s::jsonb, %(ip_address)s, %(user_agent)s, NOW())
                    RETURNING id;
                """, {
                    "user_id": user_id,
                    "action": action,
                    "table_name": table_name,
                    "record_id": record_id,
                    "old_values": json.dumps(old_values) if old_values else None,
                    "new_values": json.dumps(new_values) if new_values else None,
                    "ip_address": ip_address,
                    "user_agent": user_agent
                })
                log_id = cur.fetchone()[0]
                conn.commit()
                logger.info(f"Created audit log {log_id} for action {action} by user {user_id}")
                return log_id
        except Exception as e:
            logger.error(f"Error creating audit log: {e}", exc_info=True)
            # Don't raise - audit logging shouldn't break main operations
        finally:
            if conn:
                conn.close()
    
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
    
        conn = None
    def get_users(self):
        """Get all active users with department and position information"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        u.id, u.employee_id, u.email, u.first_name, u.last_name, u.role, 
                        u.department_id, u.is_active, u.created_at, u.updated_at,
                        u.reports_to_id, u.position_id,
                        d.name as department_name,
                        d.parent_department_id,
                        parent_d.name as parent_department_name,
                        p.name as position_name,
                        CASE 
                            WHEN reports_to.first_name IS NOT NULL AND reports_to.last_name IS NOT NULL 
                            THEN CONCAT(reports_to.first_name, ' ', reports_to.last_name)
                            ELSE NULL
                        END as reports_to_name
                    FROM users u
                    LEFT JOIN departments d ON u.department_id = d.id
                    LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                    LEFT JOIN positions p ON u.position_id = p.id
                    LEFT JOIN users reports_to ON u.reports_to_id = reports_to.id
                    WHERE u.is_active = true
                    ORDER BY u.role, u.first_name, u.last_name
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
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check if password_hash column exists
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='password_hash'
                """)
                has_password_hash = cur.fetchone() is not None
                
                # Build query based on whether password_hash column exists
                if has_password_hash:
                    cur.execute("""
                        SELECT 
                            id, employee_id, email, password_hash, first_name, last_name, role, 
                            department_id, is_active, created_at, updated_at
                        FROM users 
                        WHERE email = %s AND is_active = true
                    """, (email,))
                else:
                    # Fallback for databases without password_hash column
                    cur.execute("""
                        SELECT 
                            id, employee_id, email, first_name, last_name, role, 
                            department_id, is_active, created_at, updated_at
                        FROM users 
                        WHERE email = %s AND is_active = true
                    """, (email,))
                    # Add None for password_hash
                    user = cur.fetchone()
                    if user:
                        user = dict(user)
                        user['password_hash'] = None
                        return user
                    return None
                
                user = cur.fetchone()
                return dict(user) if user else None
        except Exception as e:
            logger.error(f"Error fetching user by email: {e}", exc_info=True)
            raise
        finally:
            if conn:
                conn.close()

    def get_user_by_employee_id(self, employee_id):
        """Get user by employee ID"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check if password_hash column exists
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='password_hash'
                """)
                has_password_hash = cur.fetchone() is not None
                
                # Build query based on whether password_hash column exists
                if has_password_hash:
                    cur.execute("""
                        SELECT 
                            id, employee_id, email, password_hash, first_name, last_name, role, 
                            department_id, is_active, created_at, updated_at
                        FROM users 
                        WHERE employee_id = %s AND is_active = true
                    """, (employee_id,))
                else:
                    # Fallback for databases without password_hash column
                    cur.execute("""
                        SELECT 
                            id, employee_id, email, first_name, last_name, role, 
                            department_id, is_active, created_at, updated_at
                        FROM users 
                        WHERE employee_id = %s AND is_active = true
                    """, (employee_id,))
                    # Add None for password_hash
                    user = cur.fetchone()
                    if user:
                        user = dict(user)
                        user['password_hash'] = None
                        return user
                    return None
                
                user = cur.fetchone()
                return dict(user) if user else None
        except Exception as e:
            logger.error(f"Error fetching user by employee ID: {e}", exc_info=True)
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    def get_tasks(self):
        """Get all tasks with department names and employee information"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        t.id, t.title, t.description, t.status, t.priority,
                        t.department_id, t.assignee_id, t.created_by,
                        t.start_date,
                        to_char(t.due_date, 'YYYY-MM-DD') as due_date,
                        t.completed_date,
                        t.is_recurring, t.recurring_frequency, t.is_customer_related, t.customer_name,
                        t.customer_email, t.tags, t.created_at, t.updated_at, t.parent_task_id,
                        t.attachments_required,
                        -- Assignee information
                        u.email as assignee_email,
                        CASE 
                            WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL 
                            THEN CONCAT(u.first_name, ' ', u.last_name)
                            ELSE NULL
                        END as assignee_name,
                        u.employee_id as assignee_employee_id,
                        -- Assignee position and reports-to information
                        pos.name as assignee_position_name,
                        CASE 
                            WHEN reports_to.first_name IS NOT NULL AND reports_to.last_name IS NOT NULL 
                            THEN CONCAT(reports_to.first_name, ' ', reports_to.last_name)
                            ELSE NULL
                        END as assignee_reports_to_name,
                        -- Department information
                        d.name as department_name,
                        -- Creator information
                        creator.email as created_by_email,
                        CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name
                    FROM tasks t
                    LEFT JOIN users u ON t.assignee_id = u.id
                    LEFT JOIN positions pos ON u.position_id = pos.id
                    LEFT JOIN users reports_to ON u.reports_to_id = reports_to.id
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

        conn = None
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
                        t.customer_email, t.tags, t.created_at, t.updated_at, t.parent_task_id,
                        t.attachments_required,
                        -- Assignee information
                        u.email as assignee_email,
                        CASE 
                            WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL 
                            THEN CONCAT(u.first_name, ' ', u.last_name)
                            ELSE NULL
                        END as assignee_name,
                        u.employee_id as assignee_employee_id,
                        -- Assignee position and reports-to information
                        pos.name as assignee_position_name,
                        CASE 
                            WHEN reports_to.first_name IS NOT NULL AND reports_to.last_name IS NOT NULL 
                            THEN CONCAT(reports_to.first_name, ' ', reports_to.last_name)
                            ELSE NULL
                        END as assignee_reports_to_name,
                        -- Department information
                        d.name as department_name,
                        -- Creator information
                        creator.email as created_by_email,
                        CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name
                    FROM tasks t
                    LEFT JOIN users u ON t.assignee_id = u.id
                    LEFT JOIN positions pos ON u.position_id = pos.id
                    LEFT JOIN users reports_to ON u.reports_to_id = reports_to.id
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
    
        conn = None
    def get_departments(self):
        """Get all departments with parent department information and positions"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # First get all departments
                cur.execute("""
                    SELECT 
                        d.id, d.name, d.description, d.manager_id, d.parent_department_id,
                        d.created_at, d.updated_at,
                        parent.name as parent_department_name
                    FROM departments d
                    LEFT JOIN departments parent ON d.parent_department_id = parent.id
                    ORDER BY d.name
                """)
                departments = cur.fetchall()
                
                # For each department, get its positions
                for dept in departments:
                    cur.execute("""
                        SELECT id, name, description, is_active, created_at, updated_at
                        FROM positions 
                        WHERE department_id = %s AND is_active = true
                        ORDER BY name
                    """, (dept['id'],))
                    positions = cur.fetchall()
                    dept['positions'] = [dict(pos) for pos in positions]
                
                return [dict(dept) for dept in departments]
        except Exception as e:
            logger.error(f"Error fetching departments: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
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
    
        conn = None
    def get_department_by_id(self, department_id: str):
        """Get department by ID"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Base department with parent info
                cur.execute("""
                    SELECT 
                        d.id, d.name, d.description, d.manager_id, 
                        d.parent_department_id,
                        parent.name AS parent_department_name,
                        d.created_at, d.updated_at
                    FROM departments d
                    LEFT JOIN departments parent ON parent.id = d.parent_department_id
                    WHERE d.id = %s
                """, (department_id,))
                department = cur.fetchone()
                if not department:
                    return None

                result = dict(department)

                # Positions for this department (if table exists)
                try:
                    cur.execute("""
                        SELECT id, name, description, level, is_active, created_at, updated_at
                        FROM positions
                        WHERE department_id = %s
                        ORDER BY name
                    """, (department_id,))
                    positions = cur.fetchall() or []
                    result["positions"] = [dict(p) for p in positions]
                except Exception:
                    # Positions table may not exist in minimal schema; ignore
                    result["positions"] = []

                # Sub-departments
                cur.execute("""
                    SELECT id, name, description, manager_id, created_at, updated_at
                    FROM departments
                    WHERE parent_department_id = %s
                    ORDER BY name
                """, (department_id,))
                subs = cur.fetchall() or []
                result["sub_departments"] = [dict(s) for s in subs]

                return result
        except Exception as e:
            logger.error(f"Error fetching department by ID: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    def get_department_by_name(self, department_name: str):
        """Get department by name"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        id, name, description, manager_id, created_at, updated_at
                    FROM departments 
                    WHERE name = %s
                """, (department_name,))
                department = cur.fetchone()
                return dict(department) if department else None
        except Exception as e:
            logger.error(f"Error fetching department by name: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    def update_department(self, department_id: str, department_data: dict):
        """Update a department"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Build dynamic update query
                set_clauses = []
                values = []
                
                for field, value in department_data.items():
                    if field in ['name', 'description', 'manager_id', 'parent_department_id'] and value is not None:
                        set_clauses.append(f"{field} = %s")
                        values.append(value)
                
                if not set_clauses:
                    return False
                
                # Add updated_at timestamp
                set_clauses.append("updated_at = NOW()")
                values.append(department_id)
                
                query = f"""
                    UPDATE departments 
                    SET {', '.join(set_clauses)}
                    WHERE id = %s
                """
                
                cur.execute(query, values)
                conn.commit()
                return cur.rowcount > 0
        except Exception as e:
            logger.error(f"Error updating department: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    def delete_department(self, department_id: str):
        """Delete a department"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("DELETE FROM departments WHERE id = %s", (department_id,))
                conn.commit()
                return cur.rowcount > 0
        except Exception as e:
            logger.error(f"Error deleting department: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    def create_task(self, task_data):
        """Create a new task"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO tasks (
                        id, title, description, status, priority, department_id,
                        assignee_id, created_by, start_date, due_date, end_date,
                        is_recurring, recurring_frequency, is_customer_related, customer_name,
                        attachments_required, is_parent_task, parent_task_id
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id
                """, (
                    str(uuid.uuid4()),
                    task_data.get('title'),
                    task_data.get('description'),
                    task_data.get('status', 'not-started'),
                    task_data.get('priority', 'medium'),
                    task_data.get('department_id'),
                    task_data.get('assignee_id'),
                    task_data.get('created_by'),
                    task_data.get('start_date'),
                    task_data.get('due_date'),
                    task_data.get('end_date'),
                    task_data.get('is_recurring', False),
                    task_data.get('recurring_frequency', 'none'),
                    task_data.get('is_customer_related', False),
                    task_data.get('customer_name'),
                    task_data.get('attachments_required', False),
                    task_data.get('is_parent_task', False),
                    task_data.get('parent_task_id')
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
    
        conn = None
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
                        'department_id', 'assignee_id', 'start_date', 'due_date', 'end_date',
                        'is_recurring', 'is_customer_related', 'customer_name', 'attachments_required'
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
    
        conn = None
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

        conn = None
    def get_user_by_id(self, user_id: str):
        """Get a user by ID"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        u.id, u.employee_id, u.email, u.first_name, u.last_name, u.role, 
                        u.department_id, u.is_active, u.created_at, u.updated_at,
                        u.reports_to_id, u.position_id,
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

        conn = None
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
                        'employee_id', 'email', 'first_name', 'last_name', 'role', 
                        'department_id', 'is_active', 'reports_to_id', 'position_id'
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

        conn = None
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

        conn = None
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

        conn = None
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

        conn = None
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
    
    # Position Management Methods
        conn = None
    def get_positions(self, department_id: str = None):
        """Get all positions, optionally filtered by department"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if department_id:
                    cur.execute("""
                        SELECT p.*, d.name as department_name,
                               d.parent_department_id,
                               parent_d.name as parent_department_name
                        FROM positions p
                        JOIN departments d ON p.department_id = d.id
                        LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                        WHERE p.department_id = %s AND p.is_active = true
                        ORDER BY p.level DESC, p.name
                    """, (department_id,))
                else:
                    cur.execute("""
                        SELECT p.*, d.name as department_name,
                               d.parent_department_id,
                               parent_d.name as parent_department_name
                        FROM positions p
                        JOIN departments d ON p.department_id = d.id
                        LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                        WHERE p.is_active = true
                        ORDER BY d.name, p.level DESC, p.name
                    """)
                positions = cur.fetchall()
                return [dict(pos) for pos in positions]
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    def get_position_by_id(self, position_id: str):
        """Get a specific position by ID"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT p.*, d.name as department_name
                    FROM positions p
                    JOIN departments d ON p.department_id = d.id
                    WHERE p.id = %s
                """, (position_id,))
                position = cur.fetchone()
                return dict(position) if position else None
        except Exception as e:
            logger.error(f"Error fetching position: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    def create_position(self, position_data: dict):
        """Create a new position"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO positions (id, name, description, department_id, level)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, name, description, department_id, level, is_active, created_at, updated_at
                """, (
                    str(uuid.uuid4()),
                    position_data['name'],
                    position_data.get('description', ''),
                    position_data['department_id'],
                    position_data.get('level', 1)
                ))
                new_position = cur.fetchone()
                conn.commit()
                return dict(new_position)
        except Exception as e:
            logger.error(f"Error creating position: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    def update_position(self, position_id: str, position_data: dict):
        """Update a position"""
        try:
            conn = self.get_connection()
            set_clauses = []
            values = []
            
            for key, value in position_data.items():
                if key in ['name', 'description', 'level'] and value is not None:
                    set_clauses.append(f"{key} = %s")
                    values.append(value)
            
            if not set_clauses:
                return False
            
            set_clauses.append("updated_at = CURRENT_TIMESTAMP")
            values.append(position_id)
            
            query = f"""
                UPDATE positions 
                SET {', '.join(set_clauses)}
                WHERE id = %s
            """
            
            with conn.cursor() as cur:
                cur.execute(query, values)
                conn.commit()
                return cur.rowcount > 0
        except Exception as e:
            logger.error(f"Error updating position: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    def delete_position(self, position_id: str):
        """Delete a position"""
        try:
            conn = self.get_connection()
            with conn.cursor() as cur:
                cur.execute("UPDATE positions SET is_active = false WHERE id = %s", (position_id,))
                conn.commit()
                return cur.rowcount > 0
        except Exception as e:
            logger.error(f"Error deleting position: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    # Hierarchy Management Methods
        conn = None
    def get_user_hierarchy(self, user_id: str):
        """Get the reporting hierarchy for a user"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM get_user_hierarchy(%s)", (user_id,))
                hierarchy = cur.fetchall()
                return [dict(h) for h in hierarchy]
        except Exception as e:
            logger.error(f"Error fetching user hierarchy: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    def get_users_by_reporting_level(self, user_id: str):
        """Get users that the current user can manage based on hierarchy"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM get_users_by_reporting_level(%s)", (user_id,))
                users = cur.fetchall()
                return [dict(u) for u in users]
        except Exception as e:
            logger.error(f"Error fetching users by reporting level: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    def get_department_hierarchy(self, department_id: str):
        """Get the department hierarchy including sub-departments"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM get_department_hierarchy(%s)", (department_id,))
                hierarchy = cur.fetchall()
                return [dict(d) for d in hierarchy]
        except Exception as e:
            logger.error(f"Error fetching department hierarchy: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
        conn = None
    def get_sub_departments(self, parent_department_id: str):
        """Get all sub-departments of a parent department"""
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT d.*, 
                           (SELECT COUNT(*) FROM users WHERE department_id = d.id AND is_active = true) as user_count,
                           (SELECT COUNT(*) FROM departments WHERE parent_department_id = d.id) as sub_department_count
                    FROM departments d
                    WHERE d.parent_department_id = %s
                    ORDER BY d.name
                """, (parent_department_id,))
                sub_departments = cur.fetchall()
                return [dict(dept) for dept in sub_departments]
        except Exception as e:
            logger.error(f"Error fetching sub-departments: {e}")
            raise
        finally:
            if conn:
                conn.close()

# Global database service instance
db_service = DatabaseService()
