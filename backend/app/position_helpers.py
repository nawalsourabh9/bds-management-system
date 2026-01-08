"""
Helper functions for position-department relationships
These functions leverage the many-to-many relationship between positions and departments
"""

import logging
from app.database_service import db_service

logger = logging.getLogger(__name__)


def get_users_by_position_departments(position_id: str, department_ids: list = None):
    """
    Get all users who hold a position that applies to specific departments
    
    Args:
        position_id: The position ID
        department_ids: Optional list of department IDs to filter by
        
    Returns:
        List of user dictionaries
    """
    try:
        from psycopg2.extras import RealDictCursor
        conn = db_service.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if position applies to all departments
            cur.execute("""
                SELECT applies_to_all_departments
                FROM positions
                WHERE id = %s AND is_active = true
            """, (position_id,))
            position = cur.fetchone()
            
            if not position:
                return []
            
            applies_to_all = position.get('applies_to_all_departments', False)
            
            if applies_to_all:
                # Position applies to all departments - get all users with this position
                query = """
                    SELECT DISTINCT u.*, d.name as department_name,
                           parent_d.name as parent_department_name
                    FROM users u
                    LEFT JOIN departments d ON u.department_id = d.id
                    LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                    WHERE u.position_id = %s AND u.is_active = true
                """
                params = (position_id,)
            else:
                # Position applies to specific departments via junction table
                if department_ids:
                    query = """
                        SELECT DISTINCT u.*, d.name as department_name,
                               parent_d.name as parent_department_name
                        FROM users u
                        INNER JOIN position_departments pd ON pd.position_id = %s
                        LEFT JOIN departments d ON u.department_id = d.id
                        LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                        WHERE u.position_id = %s 
                        AND u.is_active = true
                        AND (pd.department_id = ANY(%s) OR u.department_id = ANY(%s))
                    """
                    params = (position_id, position_id, department_ids, department_ids)
                else:
                    query = """
                        SELECT DISTINCT u.*, d.name as department_name,
                               parent_d.name as parent_department_name
                        FROM users u
                        INNER JOIN position_departments pd ON pd.position_id = %s
                        LEFT JOIN departments d ON u.department_id = d.id
                        LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                        WHERE u.position_id = %s AND u.is_active = true
                    """
                    params = (position_id, position_id)
            
            cur.execute(query, params)
            users = cur.fetchall()
            return [dict(user) for user in users]
    except Exception as e:
        logger.error(f"Error getting users by position departments: {e}")
        return []
    finally:
        if conn:
            conn.close()


def get_position_holders_for_department(department_id: str):
    """
    Get all users who hold positions that apply to a specific department
    
    Args:
        department_id: The department ID
        
    Returns:
        List of user dictionaries with their positions
    """
    try:
        from psycopg2.extras import RealDictCursor
        conn = db_service.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT DISTINCT u.*, p.name as position_name, p.level as position_level,
                       d.name as department_name,
                       parent_d.name as parent_department_name
                FROM users u
                INNER JOIN positions p ON u.position_id = p.id
                LEFT JOIN departments d ON u.department_id = d.id
                LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                WHERE u.is_active = true
                AND (
                    -- Position applies to all departments
                    p.applies_to_all_departments = true
                    OR
                    -- Position applies to this department via junction table
                    EXISTS (
                        SELECT 1 FROM position_departments pd
                        WHERE pd.position_id = p.id
                        AND pd.department_id = %s
                    )
                    OR
                    -- User is directly in this department
                    u.department_id = %s
                )
                ORDER BY p.level DESC, u.first_name, u.last_name
            """
            cur.execute(query, (department_id, department_id))
            users = cur.fetchall()
            return [dict(user) for user in users]
    except Exception as e:
        logger.error(f"Error getting position holders for department: {e}")
        return []
    finally:
        if conn:
            conn.close()


def get_departments_for_position(position_id: str):
    """
    Get all departments that a position applies to
    
    Args:
        position_id: The position ID
        
    Returns:
        List of department dictionaries
    """
    try:
        from psycopg2.extras import RealDictCursor
        conn = db_service.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if position applies to all departments
            cur.execute("""
                SELECT applies_to_all_departments
                FROM positions
                WHERE id = %s AND is_active = true
            """, (position_id,))
            position = cur.fetchone()
            
            if not position:
                return []
            
            if position.get('applies_to_all_departments', False):
                # Return all departments
                cur.execute("""
                    SELECT d.*, parent_d.name as parent_department_name
                    FROM departments d
                    LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                    ORDER BY d.name
                """)
            else:
                # Return departments from junction table
                cur.execute("""
                    SELECT d.*, parent_d.name as parent_department_name
                    FROM position_departments pd
                    INNER JOIN departments d ON pd.department_id = d.id
                    LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                    WHERE pd.position_id = %s
                    ORDER BY d.name
                """, (position_id,))
            
            departments = cur.fetchall()
            return [dict(dept) for dept in departments]
    except Exception as e:
        logger.error(f"Error getting departments for position: {e}")
        return []
    finally:
        if conn:
            conn.close()


def notify_position_holders(department_id: str, title: str, message: str, 
                            notification_type: str = 'info', task_id: str = None,
                            exclude_user_id: str = None):
    """
    Notify all users who hold positions that apply to a specific department
    
    Args:
        department_id: The department ID
        title: Notification title
        message: Notification message
        notification_type: Type of notification
        task_id: Optional task ID
        exclude_user_id: Optional user ID to exclude from notifications
    """
    try:
        position_holders = get_position_holders_for_department(department_id)
        
        for user in position_holders:
            user_id = user.get('id')
            
            # Skip if this is the excluded user
            if exclude_user_id and str(user_id) == str(exclude_user_id):
                continue
            
            try:
                db_service.create_notification(
                    user_id=str(user_id),
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    task_id=task_id
                )
                logger.info(f"Notified position holder {user.get('first_name')} {user.get('last_name')} "
                          f"({user.get('position_name')}) for department {department_id}")
            except Exception as e:
                logger.error(f"Failed to notify position holder {user_id}: {e}")
    except Exception as e:
        logger.error(f"Error notifying position holders: {e}")


def get_department_summary_for_user(user_id: str):
    """
    Get department summaries for all departments that a user's position applies to
    
    Args:
        user_id: The user ID
        
    Returns:
        Dictionary with department summaries including:
        - tasks_count: Total tasks in departments
        - completed_tasks: Completed tasks
        - pending_tasks: Pending tasks
        - overdue_tasks: Overdue tasks
        - users_count: Users in departments
        - departments: List of department info
    """
    conn = None
    try:
        from psycopg2.extras import RealDictCursor
        conn = db_service.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get user's position
            cur.execute("""
                SELECT position_id, department_id
                FROM users
                WHERE id = %s AND is_active = true
            """, (user_id,))
            user = cur.fetchone()
            
            if not user or not user.get('position_id'):
                return {
                    'tasks_count': 0,
                    'completed_tasks': 0,
                    'pending_tasks': 0,
                    'overdue_tasks': 0,
                    'users_count': 0,
                    'departments': []
                }
            
            position_id = user['position_id']
            user_department_id = user.get('department_id')
            
            # Get departments for this position
            departments = get_departments_for_position(position_id)
            department_ids = [d['id'] for d in departments]
            
            if not department_ids:
                return {
                    'tasks_count': 0,
                    'completed_tasks': 0,
                    'pending_tasks': 0,
                    'overdue_tasks': 0,
                    'users_count': 0,
                    'departments': []
                }
            
            # Get task counts per department
            cur.execute("""
                SELECT 
                    d.id as department_id,
                    d.name as department_name,
                    d.parent_department_id,
                    parent_d.name as parent_department_name,
                    COUNT(t.id) FILTER (WHERE t.id IS NOT NULL) as tasks_count,
                    COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
                    COUNT(t.id) FILTER (WHERE t.status IN ('not-started', 'pending', 'in-progress')) as pending_tasks,
                    COUNT(t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status NOT IN ('completed', 'cancelled')) as overdue_tasks
                FROM departments d
                LEFT JOIN tasks t ON d.id = t.department_id AND (t.status IS NULL OR t.status != 'cancelled')
                LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                WHERE d.id = ANY(%s)
                GROUP BY d.id, d.name, d.parent_department_id, parent_d.name
                ORDER BY d.name
            """, (department_ids,))
            dept_task_stats = cur.fetchall()
            
            # Get user counts per department
            cur.execute("""
                SELECT 
                    d.id as department_id,
                    COUNT(u.id) as users_count
                FROM departments d
                LEFT JOIN users u ON d.id = u.department_id AND u.is_active = true
                WHERE d.id = ANY(%s)
                GROUP BY d.id
            """, (department_ids,))
            dept_user_stats = {row['department_id']: row['users_count'] for row in cur.fetchall()}
            
            # Build department summaries with per-department stats
            department_summaries = []
            total_tasks = 0
            total_completed = 0
            total_pending = 0
            total_overdue = 0
            total_users = 0
            
            for dept_stat in dept_task_stats:
                dept_id = str(dept_stat['department_id'])
                dept_summary = {
                    'id': dept_id,
                    'name': dept_stat['department_name'],
                    'parent_department_id': str(dept_stat['parent_department_id']) if dept_stat['parent_department_id'] else None,
                    'parent_department_name': dept_stat['parent_department_name'],
                    'tasks_count': dept_stat['tasks_count'] or 0,
                    'completed_tasks': dept_stat['completed_tasks'] or 0,
                    'pending_tasks': dept_stat['pending_tasks'] or 0,
                    'overdue_tasks': dept_stat['overdue_tasks'] or 0,
                    'users_count': dept_user_stats.get(dept_id, 0)
                }
                department_summaries.append(dept_summary)
                
                total_tasks += dept_summary['tasks_count']
                total_completed += dept_summary['completed_tasks']
                total_pending += dept_summary['pending_tasks']
                total_overdue += dept_summary['overdue_tasks']
                total_users += dept_summary['users_count']
            
            return {
                'tasks_count': total_tasks,
                'completed_tasks': total_completed,
                'pending_tasks': total_pending,
                'overdue_tasks': total_overdue,
                'users_count': total_users,
                'departments': department_summaries
            }
    except Exception as e:
        logger.error(f"Error getting department summary for user: {e}")
        return {
            'tasks_count': 0,
            'completed_tasks': 0,
            'pending_tasks': 0,
            'overdue_tasks': 0,
            'users_count': 0,
            'departments': []
        }
    finally:
        if conn:
            conn.close()

