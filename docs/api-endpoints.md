
# API Endpoints Reference for Enhanced Recurring Task Management System

This document provides comprehensive API endpoints for testing the enhanced Task Management System with automatic recurring task generation using Postman or similar tools.

## Base Configuration

**Base URL:** `https://sibaigcaglcmhfhvrwol.supabase.co`
**Headers Required:**
```
Content-Type: application/json
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYmFpZ2NhZ2xjbWhmaHZyd29sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwOTQxMjUsImV4cCI6MjA1OTY3MDEyNX0.glqXwvhDZ9jSEE81JimH1gt-jHgaYyIh0svj5Q07PZw
Authorization: Bearer YOUR_ACCESS_TOKEN (if authenticated)
```

## Enhanced Task Endpoints with Recurring Task Generation

### 1. Create Parent Recurring Task
```
POST /rest/v1/tasks
Content-Type: application/json

{
  "title": "Daily Quality Check",
  "description": "Daily quality inspection task",
  "department": "Quality",
  "priority": "high",
  "due_date": "2024-01-15",
  "is_recurring": true,
  "recurring_frequency": "daily",
  "start_date": "2024-01-15",
  "end_date": "2024-06-15",
  "is_customer_related": false,
  "attachments_required": "required",
  "approval_status": "approved",
  "status": "not-started",
  "assignee": null,
  "original_task_name": "Daily Quality Check",
  "recurrence_count_in_period": 1
}
```

### 2. Get All Tasks with Recurring Information
```
GET /rest/v1/tasks?select=*,parent_task_id,original_task_name,recurrence_count_in_period,last_generated_date
```

### 3. Get Parent Tasks Only (Recurring Series)
```
GET /rest/v1/tasks?select=*&is_recurring=eq.true&parent_task_id=is.null
```

### 4. Get Task Instances for a Recurring Series
```
GET /rest/v1/tasks?select=*&parent_task_id=eq.{parent_task_id}&order=recurrence_count_in_period.desc
```

### 5. Complete a Recurring Task (Triggers Auto-Generation)
```
PATCH /rest/v1/tasks?id=eq.{task_id}
Content-Type: application/json

{
  "status": "completed",
  "comments": "Task completed successfully - next instance should be auto-generated"
}
```

### 6. Update Parent Recurring Task Settings
```
PATCH /rest/v1/tasks?id=eq.{parent_task_id}
Content-Type: application/json

{
  "title": "Updated Daily Quality Check",
  "description": "Updated description for daily quality inspection",
  "department": "Quality",
  "priority": "medium",
  "due_date": "2024-01-20",
  "is_recurring": true,
  "recurring_frequency": "weekly",
  "start_date": "2024-01-15",
  "end_date": "2024-12-31",
  "is_customer_related": false,
  "attachments_required": "optional",
  "original_task_name": "Updated Daily Quality Check"
}
```

## Database Functions for Manual Testing

### 1. Manually Generate Next Recurring Task
```
POST /rest/v1/rpc/generate_next_recurring_task
Content-Type: application/json

{
  "completed_task_id": "uuid-of-completed-task"
}
```

### 2. Test Task Completion Trigger
Create a task, mark it complete, and verify auto-generation:

```sql
-- Step 1: Insert test recurring task
INSERT INTO tasks (title, description, department, priority, due_date, is_recurring, recurring_frequency, start_date, end_date, original_task_name, status) 
VALUES ('Test Daily Task', 'Test task for auto-generation', 'Quality', 'medium', '2024-01-15', true, 'daily', '2024-01-15', '2024-02-15', 'Test Daily Task', 'not-started');

-- Step 2: Mark as completed (should trigger auto-generation)
UPDATE tasks SET status = 'completed' WHERE title = 'Test Daily Task' AND parent_task_id IS NULL;

-- Step 3: Check if new instance was created
SELECT * FROM tasks WHERE original_task_name = 'Test Daily Task' ORDER BY created_at DESC;
```

## Recurring Task Naming Convention Examples

The system automatically generates names using this pattern:
`[Original Task Name] ([Frequency Abbreviation][count]-[Month/Year])`

### Daily/Weekly/Bi-weekly Tasks (Monthly Count Reset)
- `Daily Quality Check (D1-January)`
- `Daily Quality Check (D2-January)`
- `Weekly Safety Inspection (W1-February)`
- `Bi-weekly Review (BW1-March)`

### Monthly/Quarterly/Annual Tasks (Yearly Count Reset)
- `Monthly Report (M1-2024)`
- `Quarterly Audit (Q1-2024)`
- `Annual Review (A1-2024)`

## Testing Scenarios for Enhanced System

### Scenario 1: Daily Recurring Task with Auto-Generation
1. Create a daily recurring task using the parent task endpoint
2. Mark it as completed on the same day
3. Verify a new instance is generated with name format `(D1-[Month])`
4. Complete the new instance
5. Verify next instance is generated with name `(D2-[Month])`

### Scenario 2: Delayed Completion Testing
1. Create a weekly recurring task for last week
2. Mark it as completed today (delayed)
3. Verify new instance is generated for today (not the missed dates)
4. Check that the naming follows the correct pattern

### Scenario 3: Cross-Period Testing
1. Create a daily task in December
2. Complete several instances through month-end
3. Complete a task in January
4. Verify count resets: `(D1-January)` instead of continuing December count

### Scenario 4: End Date Boundary Testing
1. Create a recurring task with end_date close to current date
2. Complete instances approaching the end date
3. Verify no new instances are generated beyond end_date

## Error Responses and Troubleshooting

### Recurring Task Validation Errors
```json
{
  "code": "P0001",
  "message": "Both start_date and end_date are required for recurring tasks"
}
```

### Auto-Generation Function Errors
```json
{
  "code": "P0001", 
  "message": "Task not found: [task-id]"
}
```

### Naming Convention Edge Cases
- Tasks completed on the same day multiple times
- Month/year transitions
- Tasks with very long original names

## Advanced Queries for Analysis

### 1. Get Recurring Task Statistics
```
GET /rest/v1/tasks?select=original_task_name,recurring_frequency,count(*)&is_recurring=eq.true&group_by=original_task_name,recurring_frequency
```

### 2. Find Overdue Recurring Instances
```
GET /rest/v1/tasks?select=*&parent_task_id=not.is.null&status=eq.overdue&order=due_date.asc
```

### 3. Get Last Generated Dates for Monitoring
```
GET /rest/v1/tasks?select=original_task_name,last_generated_date&is_recurring=eq.true&parent_task_id=is.null&order=last_generated_date.desc
```

## Performance Monitoring

Monitor these aspects when testing:
- Database trigger execution time
- Auto-generation function performance  
- Task list loading with large numbers of instances
- Filtering and sorting with recurring task groups

## Tips for Testing

1. **Test with different frequencies** to verify naming patterns
2. **Use realistic date ranges** to test period transitions
3. **Monitor database logs** for trigger execution messages
4. **Test concurrent completions** to verify count incrementing
5. **Verify parent-child relationships** in the database
6. **Test UI grouping and filtering** with the enhanced task structure

This enhanced API documentation covers the new automatic recurring task generation system with proper naming conventions.
