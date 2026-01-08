const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bds_user:bds_password_2024@localhost:5432/bds_management'
});

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'BDS Backend is running!' });
});

// Users endpoint
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.department_id, 
             d.name as department_name, u.is_active, u.is_verified
      FROM users u 
      LEFT JOIN departments d ON u.department_id = d.id 
      WHERE u.is_active = true
      ORDER BY u.first_name, u.last_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

// Tasks endpoint
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, 
             u.first_name, u.last_name, u.email as assignee_email,
             d.name as department_name,
             c.first_name as created_by_first_name, c.last_name as created_by_last_name
      FROM tasks t 
      LEFT JOIN users u ON t.assignee_id = u.id 
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users c ON t.created_by = c.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update task status
app.put('/api/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, updated_by } = req.body;
    
    const result = await pool.query(`
      UPDATE tasks 
      SET status = $1, priority = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [status, priority, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Log the change
    await pool.query(`
      INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
      VALUES ($1, $2, 'status_updated', 'status', $3, $4)
    `, [id, updated_by, result.rows[0].status, status]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: err.message });
  }
});

// Departments endpoint
app.get('/api/departments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, u.first_name as manager_first_name, u.last_name as manager_last_name
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.id
      WHERE d.is_active = true
      ORDER BY d.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: err.message });
  }
});

// Notifications endpoint
app.get('/api/notifications', async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await pool.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [user_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

// Task history endpoint
app.get('/api/tasks/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT th.*, u.first_name, u.last_name
      FROM task_history th
      LEFT JOIN users u ON th.user_id = u.id
      WHERE th.task_id = $1
      ORDER BY th.created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching task history:', err);
    res.status(500).json({ error: err.message });
  }
});

// Database statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = {};
    
    // User count
    const userResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    stats.users = parseInt(userResult.rows[0].count);
    
    // Task count by status
    const taskResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM tasks 
      GROUP BY status
    `);
    stats.tasks = taskResult.rows;
    
    // Department count
    const deptResult = await pool.query('SELECT COUNT(*) as count FROM departments WHERE is_active = true');
    stats.departments = parseInt(deptResult.rows[0].count);
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`BDS Backend server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});
