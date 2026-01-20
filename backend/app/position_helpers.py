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
            # Keep UUIDs as UUIDs for database queries, but also maintain string versions for comparison
            department_ids = [d['id'] for d in departments]  # Keep as UUID objects
            department_ids_str = [str(d['id']) for d in departments]  # String versions for comparison
            
            # Also include all sub-departments of the assigned departments
            if department_ids:
                # Get all sub-departments of the assigned departments
                cur.execute("""
                    SELECT d.*, parent_d.name as parent_department_name
                    FROM departments d
                    LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                    WHERE d.parent_department_id = ANY(%s::uuid[])
                    ORDER BY d.name
                """, (department_ids,))
                sub_departments = cur.fetchall()
                
                for sub_dept in sub_departments:
                    sub_dept_id = sub_dept['id']
                    sub_dept_id_str = str(sub_dept_id)
                    # Only add if not already in the list
                    if sub_dept_id_str not in department_ids_str:
                        departments.append({
                            'id': str(sub_dept['id']),
                            'name': sub_dept['name'],
                            'parent_department_id': str(sub_dept['parent_department_id']) if sub_dept.get('parent_department_id') else None,
                            'parent_department_name': sub_dept.get('parent_department_name')
                        })
                        department_ids.append(sub_dept_id)  # Add UUID object
                        department_ids_str.append(sub_dept_id_str)  # Add string version
                        logger.info(f"Added sub-department: {sub_dept['name']} (parent: {sub_dept.get('parent_department_name')})")
            
            # Also include user's own department if it's not already in the position's departments
            if user_department_id:
                user_dept_id_str = str(user_department_id)
                if user_dept_id_str not in department_ids_str:
                    cur.execute("""
                        SELECT id, name, parent_department_id
                        FROM departments
                        WHERE id = %s
                    """, (user_department_id,))
                    user_dept = cur.fetchone()
                    if user_dept:
                        # Get parent department name if exists
                        parent_name = None
                        if user_dept.get('parent_department_id'):
                            cur.execute("SELECT name FROM departments WHERE id = %s", (user_dept['parent_department_id'],))
                            parent = cur.fetchone()
                            if parent:
                                parent_name = parent['name']
                        
                        departments.append({
                            'id': str(user_dept['id']),
                            'name': user_dept['name'],
                            'parent_department_id': str(user_dept['parent_department_id']) if user_dept.get('parent_department_id') else None,
                            'parent_department_name': parent_name
                        })
                        department_ids.append(user_dept['id'])  # Add UUID object
                        department_ids_str.append(str(user_dept['id']))  # Add string version
                        
                        # Also include sub-departments of user's department if it's a main department
                        if not user_dept.get('parent_department_id'):
                            cur.execute("""
                                SELECT d.*, parent_d.name as parent_department_name
                                FROM departments d
                                LEFT JOIN departments parent_d ON d.parent_department_id = parent_d.id
                                WHERE d.parent_department_id = %s
                                ORDER BY d.name
                            """, (user_department_id,))
                            user_sub_depts = cur.fetchall()
                            for sub_dept in user_sub_depts:
                                sub_dept_id_str = str(sub_dept['id'])
                                if sub_dept_id_str not in department_ids_str:
                                    departments.append({
                                        'id': str(sub_dept['id']),
                                        'name': sub_dept['name'],
                                        'parent_department_id': str(sub_dept['parent_department_id']) if sub_dept.get('parent_department_id') else None,
                                        'parent_department_name': sub_dept.get('parent_department_name')
                                    })
                                    department_ids.append(sub_dept['id'])
                                    department_ids_str.append(sub_dept_id_str)
                                    logger.info(f"Added sub-department of user's dept: {sub_dept['name']}")
            
            if not department_ids:
                logger.warning(f"No departments found for user {user_id} (position: {position_id}, user_dept: {user_department_id})")
                return {
                    'tasks_count': 0,
                    'completed_tasks': 0,
                    'pending_tasks': 0,
                    'overdue_tasks': 0,
                    'users_count': 0,
                    'departments': []
                }
            
            logger.info(f"Getting department summary for user {user_id}: {len(department_ids)} departments - {department_ids_str}")
            
            # Get task counts per department
            # Explicitly cast to uuid[] to ensure proper type handling
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
                WHERE d.id = ANY(%s::uuid[])
                GROUP BY d.id, d.name, d.parent_department_id, parent_d.name
                ORDER BY d.name
            """, (department_ids,))
            dept_task_stats = cur.fetchall()
            
            # Get user counts per department
            # Use tuple format with IN clause for better compatibility
            # LEFT JOIN ensures we get a row for each department, even if it has 0 users
            if len(department_ids) == 0:
                user_stats_results = []
            else:
                # Use tuple format for IN clause - psycopg2 handles this better than ANY with arrays
                placeholders = ','.join(['%s'] * len(department_ids))
                logger.info(f"Executing user count query with {len(department_ids)} departments")
                logger.info(f"Department IDs (UUIDs): {department_ids}")
                logger.info(f"Department IDs (strings): {department_ids_str}")
                
                # Query to get user counts - LEFT JOIN ensures we get all departments even with 0 users
                cur.execute(f"""
                    SELECT 
                        d.id as department_id,
                        COALESCE(COUNT(u.id) FILTER (WHERE u.id IS NOT NULL), 0) as users_count
                    FROM departments d
                    LEFT JOIN users u ON d.id = u.department_id AND u.is_active = true
                    WHERE d.id IN ({placeholders})
                    GROUP BY d.id
                    ORDER BY d.id
                """, tuple(department_ids))
                user_stats_results = cur.fetchall()
                
                # Also run a debug query to see all users in these departments
                cur.execute(f"""
                    SELECT 
                        u.id,
                        u.first_name,
                        u.last_name,
                        u.department_id,
                        u.is_active,
                        d.name as department_name
                    FROM users u
                    LEFT JOIN departments d ON u.department_id = d.id
                    WHERE u.department_id IN ({placeholders}) AND u.is_active = true
                """, tuple(department_ids))
                debug_users = cur.fetchall()
                logger.info(f"Debug: Found {len(debug_users)} active users in queried departments:")
                for user in debug_users:
                    logger.info(f"  - {user.get('first_name')} {user.get('last_name')} (dept: {user.get('department_name')}, dept_id: {user.get('department_id')})")
            
            logger.info(f"User stats query returned {len(user_stats_results)} departments (expected {len(department_ids)})")
            logger.info(f"Department IDs queried (strings): {department_ids_str}")
            
            dept_user_stats = {}
            for row in user_stats_results:
                dept_id_str = str(row['department_id'])
                users_count = row['users_count'] or 0
                dept_user_stats[dept_id_str] = users_count
                logger.info(f"  Department {dept_id_str}: {users_count} users")
            
            # Verify all departments have user stats (they should, due to LEFT JOIN)
            missing_depts = set(department_ids_str) - set(dept_user_stats.keys())
            if missing_depts:
                logger.warning(f"Some departments missing from user stats: {missing_depts}")
                # Add missing departments with 0 users
                for dept_id in missing_depts:
                    dept_user_stats[dept_id] = 0
                    logger.info(f"  Added missing department {dept_id} with 0 users")
            
            # Build department summaries with per-department stats
            department_summaries = []
            total_tasks = 0
            total_completed = 0
            total_pending = 0
            total_overdue = 0
            total_users = 0
            
            # Build a set of department IDs that we got stats for
            dept_stats_ids = {str(dept_stat['department_id']) for dept_stat in dept_task_stats}
            
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
            
            # Ensure all departments from our list are included, even if they have no tasks/users
            for dept in departments:
                dept_id_str = str(dept['id'])
                if dept_id_str not in dept_stats_ids:
                    # Department wasn't in query results (no tasks), but should still be included
                    dept_summary = {
                        'id': dept_id_str,
                        'name': dept['name'],
                        'parent_department_id': str(dept.get('parent_department_id')) if dept.get('parent_department_id') else None,
                        'parent_department_name': dept.get('parent_department_name'),
                        'tasks_count': 0,
                        'completed_tasks': 0,
                        'pending_tasks': 0,
                        'overdue_tasks': 0,
                        'users_count': dept_user_stats.get(dept_id_str, 0)
                    }
                    department_summaries.append(dept_summary)
                    total_users += dept_summary['users_count']
            
            logger.info(f"Department summary for user {user_id}: {len(department_summaries)} departments returned")
            logger.info(f"  Total users across departments: {total_users}")
            logger.info(f"  Department user stats dict: {dept_user_stats}")
            
            # Log each department's user count for debugging
            for dept_summary in department_summaries:
                logger.info(f"  Department '{dept_summary['name']}' (ID: {dept_summary['id']}): {dept_summary['users_count']} users")
            
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

