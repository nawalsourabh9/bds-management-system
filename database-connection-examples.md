# Database Connection Examples

## Database URL
```
postgresql://taklu:0071@localhost:5432/bds_manufacturing_task_flow_prod
```

## Available Databases
- `bds_manufacturing_task_flow_prod` (main BDS database)
- `nordic_erp` (Nordic ERP database)
- `bds_task_flow` (BDS task flow)
- `nordic_saas_management` (Nordic SaaS management)

## Tables in bds_manufacturing_task_flow_prod
- `activities_template`
- `activity_logs`
- `departments`
- `documents`
- `notifications`
- `project_activities`
- `project_members`
- `projects`
- `task_comments`
- `task_recurrence_configs`
- `tasks`
- `users`

## Functions in bds_manufacturing_task_flow_prod
- `cleanup_old_recurring_instances(p_days_to_keep integer DEFAULT 30)`
- `column_exists(table_name text, column_name text)`
- `generate_next_instance(p_parent_task_id uuid)`
- `generate_recurring_task_name(p_task_name text, p_frequency text, p_due_date timestamp with time zone)`
- `get_next_instance_due_date(p_parent_task_id uuid, p_frequency text)`
- `update_notifications_updated_at()` (trigger function)
- `update_updated_at_column()` (trigger function)

## Connection Examples

### Using psql command line:
```bash
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
PGPASSWORD=0071 psql -h localhost -U taklu -d bds_manufacturing_task_flow_prod
```

### Using Python (psycopg2):
```python
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port="5432",
    database="bds_manufacturing_task_flow_prod",
    user="taklu",
    password="0071"
)
```

### Using Python (SQLAlchemy):
```python
from sqlalchemy import create_engine

DATABASE_URL = "postgresql://taklu:0071@localhost:5432/bds_manufacturing_task_flow_prod"
engine = create_engine(DATABASE_URL)
```

### Environment Variables for Backend:
```bash
POSTGRES_USER=taklu
POSTGRES_PASSWORD=0071
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bds_manufacturing_task_flow_prod
DATABASE_URL=postgresql://taklu:0071@localhost:5432/bds_manufacturing_task_flow_prod
```

## Quick Commands

### List all tables:
```sql
\dt
```

### List all functions:
```sql
\df
```

### List all databases:
```sql
\l
```

### Connect to specific database:
```sql
\c database_name
```

### Show table structure:
```sql
\d table_name
```

### Show function definition:
```sql
\df+ function_name
```
