import psycopg2
from psycopg2.extras import RealDictCursor
from app.core.config import settings, mask_sensitive_info
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
            # Mask sensitive information in error messages
            error_msg = mask_sensitive_info(str(e))
            logger.error(f"Database connection error: {error_msg}")
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
                        INSERT INTO notifications (id, user_id, title, message, type, task_id, is_read, created_at)
                        VALUES (gen_random_uuid(), %(user_id)s, %(title)s, %(message)s, %(type)s, %(task_id)s, FALSE, NOW())
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
                        INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
                        VALUES (gen_random_uuid(), %(user_id)s, %(title)s, %(message)s, %(type)s, FALSE, NOW())
                        RETURNING id;
                    """, {
                        "user_id": user_id,
                        "title": title,
                        "message": final_message,
                        "type": notification_type
                    })
                
                result = cur.fetchone()
                if not result:
                    raise Exception("Failed to create notification - no ID returned")
                # Handle both tuple and dict results
                if isinstance(result, tuple):
                    notification_id = result[0]
                elif isinstance(result, dict):
                    notification_id = result.get('id')
                else:
                    notification_id = result[0] if hasattr(result, '__getitem__') else None
                
                if not notification_id:
                    raise Exception(f"Failed to extract notification ID from result: {result}")
                
                conn.commit()
                logger.info(f"✅ Created notification {notification_id} for user {user_id}, task_id: {task_id}")
                return notification_id
        except Exception as e:
            logger.error(f"Error creating notification: {e}", exc_info=True)
            raise
        finally:
            if conn:
                conn.close()

    def get_notifications_by_user(self, user_id: str, limit: int = 50):
        """Get notifications for a specific user"""
        conn = None
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
        conn = None
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
            # Mask sensitive information in error messages
            error_msg = mask_sensitive_info(str(e))
            logger.error(f"Error executing query: {error_msg}")
            raise
        finally:
            if conn:
                conn.close()
    
    def get_users(self):
        """Get all active users with department and position information"""
        conn = None
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
                        WHERE LOWER(TRIM(email)) = LOWER(TRIM(%s)) AND is_active = true
                    """, (email,))
                else:
                    # Fallback for databases without password_hash column
                    cur.execute("""
                        SELECT 
                            id, employee_id, email, first_name, last_name, role, 
                            department_id, is_active, created_at, updated_at
                        FROM users 
                        WHERE LOWER(TRIM(email)) = LOWER(TRIM(%s)) AND is_active = true
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
    
    def get_tasks(self):
        """Get all tasks with department names and employee information"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check if task_delegations table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'task_delegations'
                    ) as exists
                """)
                result = cur.fetchone()
                has_delegations_table = result['exists'] if result else False
                
                if has_delegations_table:
                    # Query with delegation information
                    cur.execute("""
                        SELECT 
                            t.id, t.title, t.description, t.status, t.priority,
                            t.department_id, t.assignee_id, t.created_by,
                            to_char(t.start_date, 'YYYY-MM-DD') as start_date,
                            to_char(t.due_date, 'YYYY-MM-DD') as due_date,
                            to_char(t.end_date, 'YYYY-MM-DD') as end_date,
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
                            CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name,
                            -- Current delegation information
                            td.delegated_to_user_id as current_delegated_to_user_id,
                            CASE 
                                WHEN td.delegated_to_user_id IS NOT NULL 
                                THEN CONCAT(du.first_name, ' ', du.last_name)
                                ELSE td.offline_assignee_name
                            END as current_delegated_to_name,
                            td.offline_assignee_department as current_delegated_to_department,
                            td.delegation_level as current_delegation_level
                        FROM tasks t
                        LEFT JOIN users u ON t.assignee_id = u.id
                        LEFT JOIN positions pos ON u.position_id = pos.id
                        LEFT JOIN users reports_to ON u.reports_to_id = reports_to.id
                        LEFT JOIN departments d ON t.department_id = d.id
                        LEFT JOIN users creator ON t.created_by = creator.id
                        LEFT JOIN LATERAL (
                            SELECT delegated_to_user_id, offline_assignee_name, offline_assignee_department, delegation_level
                            FROM task_delegations
                            WHERE task_id = t.id AND is_active = TRUE
                            ORDER BY delegation_level DESC
                            LIMIT 1
                        ) td ON TRUE
                        LEFT JOIN users du ON td.delegated_to_user_id = du.id
                        ORDER BY t.created_at DESC
                    """)
                else:
                    # Query without delegation information (backward compatible)
                    cur.execute("""
                        SELECT 
                            t.id, t.title, t.description, t.status, t.priority,
                            t.department_id, t.assignee_id, t.created_by,
                            to_char(t.start_date, 'YYYY-MM-DD') as start_date,
                            to_char(t.due_date, 'YYYY-MM-DD') as due_date,
                            to_char(t.end_date, 'YYYY-MM-DD') as end_date,
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
                            CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name,
                            -- No delegation information (table doesn't exist yet)
                            NULL as current_delegated_to_user_id,
                            NULL as current_delegated_to_name,
                            NULL as current_delegated_to_department,
                            NULL as current_delegation_level
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

    def get_task_by_id(self, task_id: str):
        """Get a specific task by ID with department names and employee information"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check if task_delegations table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'task_delegations'
                    ) as exists
                """)
                result = cur.fetchone()
                has_delegations_table = result['exists'] if result else False
                
                if has_delegations_table:
                    # Query with delegation information
                    cur.execute("""
                        SELECT 
                            t.id, t.title, t.description, t.status, t.priority,
                            t.department_id, t.assignee_id, t.created_by,
                            to_char(t.start_date, 'YYYY-MM-DD') as start_date, to_char(t.due_date, 'YYYY-MM-DD') as due_date, to_char(t.end_date, 'YYYY-MM-DD') as end_date, t.completed_date,
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
                            CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name,
                            -- Current delegation information
                            td.delegated_to_user_id as current_delegated_to_user_id,
                            CASE 
                                WHEN td.delegated_to_user_id IS NOT NULL 
                                THEN CONCAT(du.first_name, ' ', du.last_name)
                                ELSE td.offline_assignee_name
                            END as current_delegated_to_name,
                            td.offline_assignee_department as current_delegated_to_department,
                            td.delegation_level as current_delegation_level
                        FROM tasks t
                        LEFT JOIN users u ON t.assignee_id = u.id
                        LEFT JOIN positions pos ON u.position_id = pos.id
                        LEFT JOIN users reports_to ON u.reports_to_id = reports_to.id
                        LEFT JOIN departments d ON t.department_id = d.id
                        LEFT JOIN users creator ON t.created_by = creator.id
                        LEFT JOIN LATERAL (
                            SELECT delegated_to_user_id, offline_assignee_name, offline_assignee_department, delegation_level
                            FROM task_delegations
                            WHERE task_id = t.id AND is_active = TRUE
                            ORDER BY delegation_level DESC
                            LIMIT 1
                        ) td ON TRUE
                        LEFT JOIN users du ON td.delegated_to_user_id = du.id
                        WHERE t.id = %s
                    """, (task_id,))
                else:
                    # Query without delegation information (backward compatible)
                    cur.execute("""
                        SELECT 
                            t.id, t.title, t.description, t.status, t.priority,
                            t.department_id, t.assignee_id, t.created_by,
                            to_char(t.start_date, 'YYYY-MM-DD') as start_date, to_char(t.due_date, 'YYYY-MM-DD') as due_date, to_char(t.end_date, 'YYYY-MM-DD') as end_date, t.completed_date,
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
                            CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name,
                            -- No delegation information (table doesn't exist yet)
                            NULL as current_delegated_to_user_id,
                            NULL as current_delegated_to_name,
                            NULL as current_delegated_to_department,
                            NULL as current_delegation_level
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

    def create_task_delegation(self, task_id: str, delegated_by_user_id: str, 
                               delegated_to_user_id: str = None, 
                               offline_assignee_name: str = None,
                               offline_assignee_department: str = None,
                               notes: str = None):
        """Create a new task delegation"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get the current maximum delegation level for this task
                cur.execute("""
                    SELECT COALESCE(MAX(delegation_level), 0) as max_level
                    FROM task_delegations
                    WHERE task_id = %s
                """, (task_id,))
                result = cur.fetchone()
                next_level = (result['max_level'] if result else 0) + 1
                
                # Get delegator's name
                delegated_by_name = None
                if delegated_by_user_id:
                    cur.execute("""
                        SELECT CONCAT(first_name, ' ', last_name) as name
                        FROM users WHERE id = %s
                    """, (delegated_by_user_id,))
                    delegator_result = cur.fetchone()
                    if delegator_result:
                        delegated_by_name = delegator_result['name']
                
                # Get delegated-to user's name (if system user)
                delegated_to_name = None
                if delegated_to_user_id:
                    cur.execute("""
                        SELECT CONCAT(first_name, ' ', last_name) as name
                        FROM users WHERE id = %s
                    """, (delegated_to_user_id,))
                    delegatee_result = cur.fetchone()
                    if delegatee_result:
                        delegated_to_name = delegatee_result['name']
                
                # Mark all previous delegations as inactive
                cur.execute("""
                    UPDATE task_delegations
                    SET is_active = FALSE
                    WHERE task_id = %s AND is_active = TRUE
                """, (task_id,))
                
                # Create new delegation with names stored
                cur.execute("""
                    INSERT INTO task_delegations 
                    (task_id, delegated_by_user_id, delegated_by_name,
                     delegated_to_user_id, delegated_to_name,
                     offline_assignee_name, offline_assignee_department, 
                     delegation_level, notes, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                    RETURNING id, created_at
                """, (task_id, delegated_by_user_id, delegated_by_name,
                      delegated_to_user_id, delegated_to_name,
                      offline_assignee_name, offline_assignee_department,
                      next_level, notes))
                
                delegation = cur.fetchone()
                conn.commit()
                return dict(delegation) if delegation else None
        except Exception as e:
            logger.error(f"Error creating task delegation: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()

    def get_task_delegation_chain(self, task_id: str):
        """Get full delegation chain for a task"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM get_task_delegation_chain(%s)
                """, (task_id,))
                delegations = cur.fetchall()
                return [dict(d) for d in delegations]
        except Exception as e:
            logger.error(f"Error fetching task delegation chain: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def get_current_delegated_assignee(self, task_id: str):
        """Get the current active delegated assignee for a task"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM get_current_delegated_assignee(%s)
                """, (task_id,))
                result = cur.fetchone()
                return dict(result) if result else None
        except Exception as e:
            logger.error(f"Error fetching current delegated assignee: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def get_departments(self):
        """Get all departments with parent department information and positions"""
        conn = None
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
    
    def get_department_id_by_name(self, department_name):
        """Get department ID by name"""
        conn = None
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
    
    def get_department_by_id(self, department_id: str):
        """Get department by ID"""
        conn = None
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
    
    def get_department_by_name(self, department_name: str):
        """Get department by name"""
        conn = None
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
    
    def update_department(self, department_id: str, department_data: dict):
        """Update a department"""
        conn = None
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
    
    def delete_department(self, department_id: str):
        """Delete a department"""
        conn = None
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
    
    def create_task(self, task_data):
        """Create a new task"""
        conn = None
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
    
    def update_task(self, task_id, task_data):
        """Update a task"""
        conn = None
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

    def delete_task(self, task_id):
        """Delete a task"""
        conn = None
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
        conn = None
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

    def update_user(self, user_id: str, user_data: dict):
        """Update a user"""
        conn = None
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

    def delete_user(self, user_id: str):
        """Delete a user"""
        conn = None
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
        conn = None
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
        conn = None
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
        conn = None
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
    def get_positions(self, department_id: str = None):
        """Get all positions, optionally filtered by department"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if department_id:
                    # Get positions that belong to this department or all departments
                    cur.execute("""
                        SELECT DISTINCT p.*
                        FROM positions p
                        LEFT JOIN position_departments pd ON p.id = pd.position_id
                        WHERE p.is_active = true
                        AND (p.applies_to_all_departments = true 
                             OR pd.department_id = %s
                             OR (p.department_id = %s AND NOT EXISTS (SELECT 1 FROM position_departments WHERE position_id = p.id)))
                        ORDER BY p.level DESC, p.name
                    """, (department_id, department_id))
                else:
                    cur.execute("""
                        SELECT DISTINCT p.*
                        FROM positions p
                        WHERE p.is_active = true
                        ORDER BY p.level DESC, p.name
                    """)
                positions = cur.fetchall()
                
                # For each position, get its departments
                result = []
                for pos in positions:
                    pos_dict = dict(pos)
                    # Get departments from junction table (new way)
                    cur.execute("""
                        SELECT d.id, d.name, d.parent_department_id,
                               parent_d.name as parent_department_name
                        FROM position_departments pd
                        JOIN departments d ON pd.department_id = d.id
                        LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                        WHERE pd.position_id = %s
                        ORDER BY 
                            CASE WHEN d.parent_department_id IS NULL THEN 0 ELSE 1 END,
                            parent_d.name NULLS FIRST,
                            d.name
                    """, (pos['id'],))
                    dept_rows = cur.fetchall()
                    
                    # If no departments in junction table, check old department_id field (backward compatibility)
                    if not dept_rows and pos.get('department_id'):
                        cur.execute("""
                            SELECT d.id, d.name, d.parent_department_id,
                                   parent_d.name as parent_department_name
                            FROM departments d
                            LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                            WHERE d.id = %s
                        """, (pos['department_id'],))
                        old_dept = cur.fetchone()
                        if old_dept:
                            dept_rows = [old_dept]
                    
                    # Get main department IDs
                    main_dept_ids = [d['id'] for d in dept_rows if not d.get('parent_department_id')]
                    
                    # Get all sub-departments of the main departments assigned to this position
                    sub_depts = []
                    if main_dept_ids:
                        # Use IN clause with tuple for proper UUID comparison
                        placeholders = ','.join(['%s'] * len(main_dept_ids))
                        cur.execute(f"""
                            SELECT d.id, d.name, d.parent_department_id,
                                   parent_d.name as parent_department_name
                            FROM departments d
                            LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                            WHERE d.parent_department_id IN ({placeholders})
                            ORDER BY parent_d.name, d.name
                        """, tuple(main_dept_ids))
                        sub_depts = cur.fetchall()
                    
                    # Combine directly assigned departments with sub-departments of main departments
                    all_dept_rows = list(dept_rows) + list(sub_depts)
                    
                    if pos_dict.get('applies_to_all_departments'):
                        # Get all departments including sub-departments
                        cur.execute("""
                            SELECT d.id, d.name, d.parent_department_id,
                                   parent_d.name as parent_department_name
                            FROM departments d
                            LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                            ORDER BY 
                                CASE WHEN d.parent_department_id IS NULL THEN 0 ELSE 1 END,
                                parent_d.name NULLS FIRST,
                                d.name
                        """)
                        all_dept_rows = cur.fetchall()
                        pos_dict['department_names'] = ['All Departments']
                        pos_dict['departments'] = [dict(d) for d in all_dept_rows]
                    else:
                        # Get all departments (main + sub) that are directly assigned OR sub-departments of assigned main departments
                        # Include both directly assigned sub-departments and sub-departments of assigned main departments
                        main_depts = [d for d in dept_rows if not d.get('parent_department_id')]
                        direct_sub_depts = [d for d in dept_rows if d.get('parent_department_id')]
                        
                        # Combine: directly assigned departments + directly assigned sub-departments + sub-departments of main departments
                        all_dept_rows = list(dept_rows) + list(sub_depts)
                        # Remove duplicates based on department ID
                        seen_ids = set()
                        unique_depts = []
                        for d in all_dept_rows:
                            dept_id = d['id']
                            if dept_id not in seen_ids:
                                seen_ids.add(dept_id)
                                unique_depts.append(d)
                        
                        pos_dict['department_names'] = [d['name'] for d in main_depts] if main_depts else [d['name'] for d in dept_rows]
                        # Include all departments and sub-departments - ensure parent_department_id and parent_department_name are included
                        pos_dict['departments'] = [dict(d) for d in unique_depts]  # Include all departments and sub-departments
                        
                        # Debug logging to verify sub-departments are included
                        sub_dept_count = len([d for d in unique_depts if d.get('parent_department_id')])
                        if sub_dept_count > 0:
                            logger.debug(f"Position {pos_dict.get('name')} has {sub_dept_count} sub-departments in departments array")
                        
                        # For backward compatibility, set first main department as primary
                        if main_depts:
                            pos_dict['department_name'] = main_depts[0]['name']
                            pos_dict['department_id'] = main_depts[0]['id']
                        elif dept_rows:
                            # If only sub-departments, use first one
                            pos_dict['department_name'] = dept_rows[0]['name']
                            pos_dict['department_id'] = dept_rows[0]['id']
                            pos_dict['parent_department_id'] = dept_rows[0].get('parent_department_id')
                            pos_dict['parent_department_name'] = dept_rows[0].get('parent_department_name')
                    
                    result.append(pos_dict)
                
                return result
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def get_position_by_id(self, position_id: str):
        """Get a specific position by ID with department information"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get position basic info
                cur.execute("""
                    SELECT p.*
                    FROM positions p
                    WHERE p.id = %s
                """, (position_id,))
                position = cur.fetchone()
                
                if not position:
                    return None
                
                pos_dict = dict(position)
                
                # Get departments for this position
                if pos_dict.get('applies_to_all_departments'):
                    # Get all departments
                    cur.execute("""
                        SELECT d.id, d.name, d.parent_department_id,
                               parent_d.name as parent_department_name
                        FROM departments d
                        LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                        ORDER BY d.name
                    """)
                    dept_rows = cur.fetchall()
                    pos_dict['departments'] = [dict(d) for d in dept_rows]
                else:
                    # Get departments from junction table
                    cur.execute("""
                        SELECT d.id, d.name, d.parent_department_id,
                               parent_d.name as parent_department_name
                        FROM position_departments pd
                        JOIN departments d ON pd.department_id = d.id
                        LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                        WHERE pd.position_id = %s
                        ORDER BY d.name
                    """, (position_id,))
                    dept_rows = cur.fetchall()
                    
                    # If no departments in junction table, check old department_id field
                    if not dept_rows and pos_dict.get('department_id'):
                        cur.execute("""
                            SELECT d.id, d.name, d.parent_department_id,
                                   parent_d.name as parent_department_name
                            FROM departments d
                            LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                            WHERE d.id = %s
                        """, (pos_dict['department_id'],))
                        old_dept = cur.fetchone()
                        if old_dept:
                            dept_rows = [old_dept]
                    
                    pos_dict['departments'] = [dict(d) for d in dept_rows]
                
                return pos_dict
        except Exception as e:
            logger.error(f"Error fetching position: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def create_position(self, position_data: dict):
        """Create a new position with optional multiple departments"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                applies_to_all = position_data.get('applies_to_all_departments', False)
                department_ids = position_data.get('department_ids', [])
                
                # If applies_to_all_departments is true, don't require department_id
                department_id = None if applies_to_all else (position_data.get('department_id') or (department_ids[0] if department_ids else None))
                
                cur.execute("""
                    INSERT INTO positions (id, name, description, department_id, level, applies_to_all_departments)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, name, description, department_id, level, is_active, applies_to_all_departments, created_at, updated_at
                """, (
                    str(uuid.uuid4()),
                    position_data['name'],
                    position_data.get('description', ''),
                    department_id,
                    position_data.get('level', 1),
                    applies_to_all
                ))
                new_position = cur.fetchone()
                position_id = new_position['id']
                
                # Add departments to junction table if not applies_to_all
                if not applies_to_all and department_ids:
                    for dept_id in department_ids:
                        cur.execute("""
                            INSERT INTO position_departments (position_id, department_id)
                            VALUES (%s, %s)
                            ON CONFLICT (position_id, department_id) DO NOTHING
                        """, (position_id, dept_id))
                
                conn.commit()
                return dict(new_position)
        except Exception as e:
            logger.error(f"Error creating position: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def update_position(self, position_id: str, position_data: dict):
        """Update a position and its department associations"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                set_clauses = []
                values = []
                
                # Update position fields
                for key, value in position_data.items():
                    if key in ['name', 'description', 'level', 'applies_to_all_departments'] and value is not None:
                        set_clauses.append(f"{key} = %s")
                        values.append(value)
                
                # Handle department updates
                applies_to_all = position_data.get('applies_to_all_departments', False)
                department_ids = position_data.get('department_ids', [])
                
                if 'department_ids' in position_data or 'applies_to_all_departments' in position_data:
                    # Delete existing department associations
                    cur.execute("DELETE FROM position_departments WHERE position_id = %s", (position_id,))
                    
                    # Add new department associations if not applies_to_all
                    if not applies_to_all and department_ids:
                        for dept_id in department_ids:
                            cur.execute("""
                                INSERT INTO position_departments (position_id, department_id)
                                VALUES (%s, %s)
                                ON CONFLICT (position_id, department_id) DO NOTHING
                            """, (position_id, dept_id))
                    
                    # Update department_id for backward compatibility
                    if not applies_to_all and department_ids:
                        set_clauses.append("department_id = %s")
                        values.append(department_ids[0])
                    elif applies_to_all:
                        set_clauses.append("department_id = NULL")
                
                if set_clauses:
                    set_clauses.append("updated_at = CURRENT_TIMESTAMP")
                    values.append(position_id)
                    
                    query = f"""
                        UPDATE positions 
                        SET {', '.join(set_clauses)}
                        WHERE id = %s
                    """
                    cur.execute(query, values)
                
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error updating position: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def delete_position(self, position_id: str):
        """Delete a position"""
        conn = None
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
    def get_user_hierarchy(self, user_id: str):
        """Get the reporting hierarchy for a user"""
        conn = None
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
    
    def get_users_by_reporting_level(self, user_id: str):
        """Get users that the current user can manage based on hierarchy"""
        conn = None
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
    
    def get_department_hierarchy(self, department_id: str):
        """Get the department hierarchy including sub-departments"""
        conn = None
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
    
    def get_sub_departments(self, parent_department_id: str):
        """Get all sub-departments of a parent department"""
        conn = None
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
    
        conn = None
    
    def get_department_activities(self, department_ids: list, limit: int = 100):
        """Get all activities (notifications and audit logs) for given departments"""
        conn = None
        try:
            import json
            from datetime import datetime
            conn = self.get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                activities = []
                
                # Get notifications for users in these departments
                cur.execute("""
                    SELECT 
                        n.id,
                        n.title,
                        n.message,
                        n.type,
                        n.is_read,
                        n.created_at,
                        n.task_id,
                        u.id as user_id,
                        u.first_name,
                        u.last_name,
                        u.employee_id,
                        u.department_id,
                        d.name as department_name,
                        'notification' as activity_type
                    FROM notifications n
                    JOIN users u ON n.user_id = u.id
                    LEFT JOIN departments d ON u.department_id = d.id
                    WHERE u.department_id = ANY(%s)
                    ORDER BY n.created_at DESC
                    LIMIT %s
                """, (department_ids, limit))
                
                notifications = cur.fetchall()
                for notif in notifications:
                    activities.append({
                        'id': str(notif['id']),
                        'type': 'notification',
                        'title': notif['title'],
                        'message': notif['message'],
                        'notification_type': notif['type'],
                        'is_read': notif['is_read'],
                        'created_at': notif['created_at'].isoformat() if isinstance(notif['created_at'], datetime) else str(notif['created_at']),
                        'user': {
                            'id': str(notif['user_id']),
                            'first_name': notif['first_name'],
                            'last_name': notif['last_name'],
                            'employee_id': notif['employee_id'],
                            'department_id': str(notif['department_id']) if notif['department_id'] else None,
                            'department_name': notif['department_name']
                        },
                        'task_id': str(notif['task_id']) if notif['task_id'] else None
                    })
                
                # Get audit logs related to these departments with detailed task and user info
                cur.execute("""
                    SELECT 
                        al.id,
                        al.action,
                        al.table_name,
                        al.record_id,
                        al.old_values,
                        al.new_values,
                        al.created_at,
                        u.id as user_id,
                        u.first_name,
                        u.last_name,
                        u.employee_id,
                        u.department_id,
                        d.name as department_name,
                        -- Task details if this is a task action
                        CASE WHEN al.table_name = 'tasks' THEN
                            json_build_object(
                                'id', t.id,
                                'title', t.title,
                                'status', t.status,
                                'priority', t.priority,
                                'due_date', t.due_date,
                                'assignee_id', t.assignee_id,
                                'accountable_id', t.accountable_id,
                                'department_id', t.department_id,
                                'assignee_name', CONCAT(assignee_u.first_name, ' ', assignee_u.last_name),
                                'accountable_name', CONCAT(accountable_u.first_name, ' ', accountable_u.last_name)
                            )
                        ELSE NULL END as task_details,
                        -- User details if this is a user action
                        CASE WHEN al.table_name = 'users' THEN
                            json_build_object(
                                'id', target_u.id,
                                'first_name', target_u.first_name,
                                'last_name', target_u.last_name,
                                'employee_id', target_u.employee_id,
                                'email', target_u.email,
                                'position_id', target_u.position_id,
                                'position_name', pos.name,
                                'department_id', target_u.department_id,
                                'department_name', target_d.name
                            )
                        ELSE NULL END as target_user_details
                    FROM audit_logs al
                    JOIN users u ON al.user_id = u.id
                    LEFT JOIN departments d ON u.department_id = d.id
                    LEFT JOIN tasks t ON al.table_name = 'tasks' AND t.id::text = al.record_id::text
                    LEFT JOIN users assignee_u ON t.assignee_id = assignee_u.id
                    LEFT JOIN users accountable_u ON t.accountable_id = accountable_u.id
                    LEFT JOIN users target_u ON al.table_name = 'users' AND target_u.id::text = al.record_id::text
                    LEFT JOIN departments target_d ON target_u.department_id = target_d.id
                    LEFT JOIN positions pos ON target_u.position_id = pos.id
                    WHERE (
                        -- User actions in these departments
                        (al.table_name = 'users' AND target_u.department_id = ANY(%s))
                        OR
                        -- Task actions for tasks in these departments
                        (al.table_name = 'tasks' AND t.department_id = ANY(%s))
                        OR
                        -- Department actions for these departments
                        (al.table_name = 'departments' AND al.record_id::text = ANY(%s))
                        OR
                        -- Position actions for positions in these departments
                        (al.table_name = 'positions' AND EXISTS (
                            SELECT 1 FROM positions p
                            LEFT JOIN position_departments pd ON p.id = pd.position_id
                            WHERE p.id::text = al.record_id::text
                            AND (pd.department_id = ANY(%s) OR p.department_id = ANY(%s))
                        ))
                    )
                    ORDER BY al.created_at DESC
                    LIMIT %s
                """, (department_ids, department_ids, [str(did) for did in department_ids], department_ids, department_ids, limit))
                
                audit_logs = cur.fetchall()
                for log in audit_logs:
                    old_vals = json.loads(log['old_values']) if log['old_values'] else {}
                    new_vals = json.loads(log['new_values']) if log['new_values'] else {}
                    
                    # Get task details if available
                    task_details = None
                    if log['task_details']:
                        task_details = log['task_details']
                    
                    # Get target user details if available
                    target_user_details = None
                    if log['target_user_details']:
                        target_user_details = log['target_user_details']
                    
                    # Format action message based on table and action
                    action_message = self._format_audit_action(
                        log['action'],
                        log['table_name'],
                        old_vals,
                        new_vals,
                        task_details,
                        target_user_details
                    )
                    
                    activity = {
                        'id': str(log['id']),
                        'type': 'audit',
                        'action': log['action'],
                        'table_name': log['table_name'],
                        'record_id': str(log['record_id']) if log['record_id'] else None,
                        'message': action_message,
                        'old_values': old_vals,
                        'new_values': new_vals,
                        'created_at': log['created_at'].isoformat() if isinstance(log['created_at'], datetime) else str(log['created_at']),
                        'user': {
                            'id': str(log['user_id']),
                            'first_name': log['first_name'],
                            'last_name': log['last_name'],
                            'employee_id': log['employee_id'],
                            'department_id': str(log['department_id']) if log['department_id'] else None,
                            'department_name': log['department_name']
                        }
                    }
                    
                    # Add task details if available
                    if task_details:
                        activity['task'] = {
                            'id': str(task_details['id']) if task_details.get('id') else None,
                            'title': task_details.get('title'),
                            'status': task_details.get('status'),
                            'priority': task_details.get('priority'),
                            'due_date': task_details['due_date'].isoformat() if task_details.get('due_date') and isinstance(task_details['due_date'], datetime) else (str(task_details['due_date']) if task_details.get('due_date') else None),
                            'assignee_name': task_details.get('assignee_name'),
                            'accountable_name': task_details.get('accountable_name')
                        }
                    
                    # Add target user details if available
                    if target_user_details:
                        activity['target_user'] = {
                            'id': str(target_user_details['id']) if target_user_details.get('id') else None,
                            'first_name': target_user_details.get('first_name'),
                            'last_name': target_user_details.get('last_name'),
                            'employee_id': target_user_details.get('employee_id'),
                            'email': target_user_details.get('email'),
                            'position_name': target_user_details.get('position_name'),
                            'department_name': target_user_details.get('department_name')
                        }
                    
                    activities.append(activity)
                
                # Sort all activities by created_at descending
                activities.sort(key=lambda x: x['created_at'], reverse=True)
                
                return activities[:limit]
        except Exception as e:
            logger.error(f"Error fetching department activities: {e}", exc_info=True)
            raise
        finally:
            if conn:
                conn.close()
    
    def _format_audit_action(self, action: str, table_name: str, old_values: dict, new_values: dict, task_details: dict = None, target_user_details: dict = None) -> str:
        """Format audit log action into a human-readable message"""
        action_lower = action.lower()
        table_lower = table_name.lower() if table_name else ''
        
        if action_lower == 'create' or action_lower == 'insert':
            if table_lower == 'users':
                if target_user_details:
                    name = f"{target_user_details.get('first_name', '')} {target_user_details.get('last_name', '')}".strip()
                    employee_id = target_user_details.get('employee_id', '')
                    position = target_user_details.get('position_name', '')
                    dept = target_user_details.get('department_name', '')
                    details = []
                    if employee_id:
                        details.append(f"ID: {employee_id}")
                    if position:
                        details.append(f"Position: {position}")
                    if dept:
                        details.append(f"Department: {dept}")
                    detail_str = f" ({', '.join(details)})" if details else ""
                    return f"Your department welcoming new user: {name or 'User'}{detail_str}"
                else:
                    name = new_values.get('first_name', '') + ' ' + new_values.get('last_name', '')
                    return f"New user created: {name.strip() or 'User'}"
            elif table_lower == 'tasks':
                if task_details:
                    title = task_details.get('title', new_values.get('title', 'Task'))
                    status = task_details.get('status', 'not-started')
                    priority = task_details.get('priority', 'medium')
                    due_date = task_details.get('due_date')
                    assignee = task_details.get('assignee_name', '')
                    accountable = task_details.get('accountable_name', '')
                    
                    details = []
                    if due_date:
                        from datetime import datetime
                        if isinstance(due_date, str):
                            try:
                                due_dt = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                                details.append(f"Due: {due_dt.strftime('%b %d, %Y')}")
                            except:
                                details.append(f"Due: {due_date}")
                        else:
                            details.append(f"Due: {due_date.strftime('%b %d, %Y')}")
                    if priority:
                        details.append(f"Priority: {priority.title()}")
                    if status:
                        details.append(f"Status: {status.replace('-', ' ').title()}")
                    if assignee:
                        details.append(f"Responsible: {assignee}")
                    if accountable:
                        details.append(f"Accountable: {accountable}")
                    
                    detail_str = f" ({', '.join(details)})" if details else ""
                    return f"New task created: {title}{detail_str}"
                else:
                    task_title = new_values.get('title', 'Task')
                    assignee_id = new_values.get('assignee_id')
                    accountable_id = new_values.get('accountable_id')
                    responsible = f" (Responsible: {assignee_id})" if assignee_id else ""
                    accountable = f" (Accountable: {accountable_id})" if accountable_id else ""
                    return f"New task created: {task_title}{responsible}{accountable}"
            elif table_lower == 'departments':
                dept_name = new_values.get('name', 'Department')
                if new_values.get('parent_department_id'):
                    return f"New sub-department added: {dept_name}"
                return f"New department created: {dept_name}"
            elif table_lower == 'positions':
                return f"New position created: {new_values.get('name', 'Position')}"
        elif action_lower == 'update':
            if table_lower == 'tasks':
                if 'status' in new_values:
                    return f"Task status changed: {old_values.get('status', 'Unknown')} → {new_values.get('status', 'Unknown')}"
                return f"Task updated: {new_values.get('title', old_values.get('title', 'Task'))}"
            elif table_lower == 'users':
                if 'department_id' in new_values:
                    return f"User department changed"
                return f"User updated"
            elif table_lower == 'departments':
                return f"Department updated: {new_values.get('name', old_values.get('name', 'Department'))}"
            elif table_lower == 'positions':
                return f"Position updated: {new_values.get('name', old_values.get('name', 'Position'))}"
        elif action_lower == 'delete':
            if table_lower == 'users':
                name = old_values.get('first_name', '') + ' ' + old_values.get('last_name', '')
                return f"User deleted: {name.strip() or 'User'}"
            elif table_lower == 'tasks':
                return f"Task deleted: {old_values.get('title', 'Task')}"
            elif table_lower == 'departments':
                return f"Department deleted: {old_values.get('name', 'Department')}"
            elif table_lower == 'positions':
                return f"Position deleted: {old_values.get('name', 'Position')}"
        
        return f"{action} on {table_name}"

# Global database service instance
db_service = DatabaseService()
