import { API_BASE, API_ENDPOINTS } from '@/config/api';

// FastAPI service for backend communication
export const fastapiService = {
  // Email service
  async sendEmail(emailData: any) {
    const response = await fetch(`${API_BASE}${API_ENDPOINTS.SEND_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Database utils
  async databaseUtils(utilsData: any) {
    const response = await fetch(`${API_BASE}${API_ENDPOINTS.DATABASE_UTILS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(utilsData),
    });
    
    if (!response.ok) {
      throw new Error(`Database utils failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Task automation
  async taskAutomation(automationData?: any) {
    const response = await fetch(`${API_BASE}${API_ENDPOINTS.TASK_AUTOMATION}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(automationData || {}),
    });
    
    if (!response.ok) {
      throw new Error(`Task automation failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Recurring Parent Tasks
  async createRecurringParent(parentData: any) {
    const response = await fetch(`${API_BASE}/api/v1/recurring/parent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parentData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create recurring parent: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getRecurringParents() {
    const response = await fetch(`${API_BASE}/api/v1/recurring/parents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get recurring parents: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getParentStatus(parentId: string) {
    const response = await fetch(`${API_BASE}/api/v1/recurring/${parentId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get parent status: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Child Tasks
  async createFirstChild(parentId: string, childData: any) {
    const response = await fetch(`${API_BASE}/api/v1/recurring/${parentId}/first-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(childData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create first child: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getChildTasks(parentId: string) {
    const response = await fetch(`${API_BASE}/api/v1/recurring/${parentId}/children`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get child tasks: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Task Updates
  async partialUpdateTask(taskId: string, data: any) {
    const response = await fetch(`${API_BASE}/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.statusText}`);
    }
    
    return response.json();
  },

  async fullUpdateTask(taskId: string, data: any) {
    const response = await fetch(`${API_BASE}/api/v1/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Quick Updates
  async updateTaskStatus(taskId: string, status: string) {
    const response = await fetch(`${API_BASE}/api/v1/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update task status: ${response.statusText}`);
    }
    
    return response.json();
  },

  async updateTaskAssignee(taskId: string, assignee: string) {
    const response = await fetch(`${API_BASE}/api/v1/tasks/${taskId}/assignee`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assignee }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update task assignee: ${response.statusText}`);
    }
    
    return response.json();
  },

  async updateTaskPriority(taskId: string, priority: string) {
    const response = await fetch(`${API_BASE}/api/v1/tasks/${taskId}/priority`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priority }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update task priority: ${response.statusText}`);
    }
    
    return response.json();
  },

  async updateTaskDueDate(taskId: string, dueDate: string) {
    const response = await fetch(`${API_BASE}/api/v1/tasks/${taskId}/due-date`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dueDate }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update task due date: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Notifications
  async getNotifications() {
    const response = await fetch(`${API_BASE}/api/v1/notifications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get notifications: ${response.statusText}`);
    }
    
    return response.json();
  },

  async markNotificationRead(notificationId: string) {
    const response = await fetch(`${API_BASE}/api/v1/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to mark notification as read: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Create admin
  async createAdmin() {
    const response = await fetch(`${API_BASE}${API_ENDPOINTS.CREATE_ADMIN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Create admin failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  // HROne integration
  async hroneIntegration(integrationData: any) {
    const response = await fetch(`${API_BASE}${API_ENDPOINTS.HRONE_INTEGRATION}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(integrationData),
    });
    
    if (!response.ok) {
      throw new Error(`HROne integration failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Send invitation
  async sendInvitation(invitationData: any) {
    const response = await fetch(`${API_BASE}${API_ENDPOINTS.SEND_INVITATION}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invitationData),
    });
    
    if (!response.ok) {
      throw new Error(`Send invitation failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  // OTP codes
  async createOtpCode(otpData: any) {
    const response = await fetch(`${API_BASE}/api/v1/otp-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(otpData),
    });
    
    if (!response.ok) {
      throw new Error(`Create OTP code failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getOtpCode(email: string) {
    const response = await fetch(`${API_BASE}/api/v1/otp-codes/${email}`);
    
    if (!response.ok) {
      throw new Error(`Get OTP code failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async updateOtpCode(email: string, otpData: any) {
    const response = await fetch(`${API_BASE}/api/v1/otp-codes/${email}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(otpData),
    });
    
    if (!response.ok) {
      throw new Error(`Update OTP code failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  // User Management
  async getUsers() {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}/api/v1/users`, { headers });
    
    if (!response.ok) {
      throw new Error(`Get users failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getUser(userId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Get user failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async createUser(userData: any) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Create user failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async updateUser(userId: string, userData: any) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Update user failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async deleteUser(userId: string) {
    const response = await fetch(`${API_BASE}/api/v1/users/${userId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Delete user failed: ${response.statusText}`);
    }
    
        return response.json();
    },

    // Position Management
    async getPositions(departmentId?: string) {
        const token = localStorage.getItem('token');
        const url = departmentId 
            ? `${API_BASE}/api/v1/positions?department_id=${departmentId}`
            : `${API_BASE}/api/v1/positions`;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`Get positions failed: ${response.statusText}`);
        }
        return response.json();
    },

    async getPosition(positionId: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/positions/${positionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`Get position failed: ${response.statusText}`);
        }
        return response.json();
    },

    async createPosition(positionData: any) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/positions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(positionData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Create position failed: ${response.statusText}`);
        }
        return response.json();
    },

    async updatePosition(positionId: string, positionData: any) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/positions/${positionId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(positionData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Update position failed: ${response.statusText}`);
        }
        return response.json();
    },

    async deletePosition(positionId: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/positions/${positionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Delete position failed: ${response.statusText}`);
        }
        return response.json();
    },

    // Hierarchy Management
    async getUserHierarchy(userId: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/users/${userId}/hierarchy`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`Get user hierarchy failed: ${response.statusText}`);
        }
        return response.json();
    },

    async getManageableUsers(userId: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/users/${userId}/manageable-users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`Get manageable users failed: ${response.statusText}`);
        }
        return response.json();
    },

    async getDepartmentHierarchy(departmentId: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/departments/${departmentId}/hierarchy`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`Get department hierarchy failed: ${response.statusText}`);
        }
        return response.json();
    },

    async getSubDepartments(departmentId: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/v1/departments/${departmentId}/sub-departments`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`Get sub-departments failed: ${response.statusText}`);
        }
        return response.json();
    },

    async getDepartments() {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}/api/v1/departments`, { headers });
    
    if (!response.ok) {
      throw new Error(`Get departments failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getDepartment(departmentId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/departments/${departmentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Get department failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async createDepartment(departmentData: any) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/departments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(departmentData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Create department failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async updateDepartment(departmentId: string, departmentData: any) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/departments/${departmentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(departmentData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Update department failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async deleteDepartment(departmentId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/departments/${departmentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Delete department failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Task Management Methods
  async getTasks() {
    const response = await fetch(`${API_BASE}/api/v1/tasks`);
    
    if (!response.ok) {
      throw new Error(`Get tasks failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getTask(taskId: string) {
    const response = await fetch(`${API_BASE}/api/v1/tasks/${taskId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Get task failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async createTask(taskData: any) {
    // Normalize payload keys for backend
    const payload: any = {
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority || 'medium',
      status: taskData.status || 'not-started',
      // parent (recurring) attributes
      is_recurring: taskData.is_recurring ?? taskData.isRecurring ?? false,
      recurring_frequency: taskData.is_recurring 
        ? (taskData.recurring_frequency || taskData.recurringFrequency || null)
        : null,
      // Department: backend accepts either 'department' (name) or 'department_id' (UUID)
      // If it's a UUID format, use department_id, otherwise use department name
      ...(taskData.department_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskData.department_id)
        ? { department_id: taskData.department_id }
        : { department: taskData.department || taskData.department_id }),
      is_customer_related: taskData.is_customer_related ?? taskData.isCustomerRelated ?? false,
      customer_name: (taskData.customer_name ?? taskData.customerName) || null,
      start_date: taskData.start_date || taskData.startDate || null,
      end_date: taskData.end_date || taskData.endDate || null,
      created_by: taskData.created_by || null, // Include creator ID if provided
    };
    // Remove null/undefined values
    Object.keys(payload).forEach(k => payload[k] === null || payload[k] === undefined ? delete payload[k] : null);
    
    // Common single-instance fields - backend accepts 'assignee' or 'assignee_id'
    const dueDate = taskData.due_date || taskData.dueDate;
    const assigneeId = taskData.assignee_id || taskData.assignee;
    if (dueDate) payload.due_date = typeof dueDate === 'string' ? dueDate : undefined;
    if (assigneeId) payload.assignee = assigneeId; // Use 'assignee' as backend expects it
    
    // For recurring tasks, also set child-specific fields if provided
    if (payload.is_recurring) {
      if (taskData.child_customer_name !== undefined) payload.child_customer_name = taskData.child_customer_name;
      if (taskData.child_customer_email !== undefined) payload.child_customer_email = taskData.child_customer_email;
      if (taskData.child_is_customer_related !== undefined) payload.child_is_customer_related = taskData.child_is_customer_related;
      if (taskData.child_attachments_required !== undefined) payload.child_attachments_required = taskData.child_attachments_required;
    }

    const response = await fetch(`${API_BASE}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Create task failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async createFirstChildTask(parentId: string, childData: any) {
    const response = await fetch(`${API_BASE}/api/v1/recurring/${parentId}/first-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(childData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create first child task');
    }
    
    return response.json();
  },

  async updateTask(taskId: string, taskData: any) {
    // Normalize frontend fields to backend expectations
    const payload: any = {
      title: taskData.title,
      description: taskData.description,
      assignee_id: taskData.assignee_id || taskData.assignee || null,
      due_date: taskData.due_date || taskData.dueDate || null,
      priority: taskData.priority,
      status: taskData.status,
      is_customer_related: taskData.is_customer_related ?? taskData.isCustomerRelated ?? false,
      customer_name: taskData.customer_name ?? taskData.customerName ?? null,
    };
    // Remove undefined keys
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    const response = await fetch(`${API_BASE}/api/v1/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Update task failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async deleteTask(taskId: string) {
    const response = await fetch(`${API_BASE}/api/v1/tasks/${taskId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Delete task failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  // ============================================================================
  // TEMPLATE MANAGEMENT SERVICES
  // ============================================================================

  // Get all task templates
  async getTaskTemplates() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/templates`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Create a new task template
  async createTaskTemplate(templateData: any) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(templateData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create template: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Update a task template
  async updateTaskTemplate(templateId: string, templateData: any) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(templateData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update template: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Delete (deactivate) a task template
  async deleteTaskTemplate(templateId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/templates/${templateId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete template: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Generate a task from template
  async generateTaskFromTemplate(templateId: string, overrideData?: any) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/templates/${templateId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(overrideData || {}),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate task from template: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Get all instances of a template
  async getTemplateInstances(templateId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/templates/${templateId}/instances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch template instances: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Calculate smart due date
  async calculateSmartDueDate(requestData: {
    base_date: string;
    frequency: string;
    skip_weekends?: boolean;
    skip_holidays?: boolean;
    skip_shutdown_days?: boolean;
  }) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/tasks/calculate-due-date`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to calculate due date: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Trigger recurring task generation
  async triggerRecurringGeneration() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/tasks/trigger-recurring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to trigger recurring generation: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Grouped Tasks - Using existing tasks endpoint and filtering
  async getGroupedTasks() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }
    
    const data = await response.json();
    const tasks = data.tasks || [];
    
    // Filter parent tasks and group with children
    const parentTasks = tasks.filter((task: any) => task.is_parent_task === true);
    
    // Group children with parents
    const groupedTasks = parentTasks.map((parent: any) => {
      const children = tasks.filter((task: any) => 
        task.parent_task_id === parent.id && task.is_parent_task === false
      );
      
      return {
        ...parent,
        parent_id: parent.id,
        parent_title: parent.title,
        parent_description: parent.description,
        parent_status: parent.status,
        parent_priority: parent.priority,
        parent_created_at: parent.created_at,
        created_by: parent.created_by,
        child_count: children.length,
        completed_children: children.filter((c: any) => c.status === 'completed').length,
        in_progress_children: children.filter((c: any) => c.status === 'in-progress').length,
        pending_children: children.filter((c: any) => c.status === 'not-started' || c.status === 'pending').length,
        children: children.map((child: any) => ({
          ...child,
          assignee_first_name: child.assignee_name?.split(' ')[0] || '',
          assignee_last_name: child.assignee_name?.split(' ').slice(1).join(' ') || '',
          assignee_email: child.assignee_email || '',
        })),
      };
    });
    
    return {
      grouped_tasks: groupedTasks,
      total_parents: groupedTasks.length,
      timestamp: new Date().toISOString(),
    };
  },

  async getPositionDepartments(positionId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/positions/${positionId}/departments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Get position departments failed: ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        if (errorText) errorMessage = errorText;
      }
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    }
    
    return response.json();
  },

  async getUserDepartmentSummary(userId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/users/${userId}/department-summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error: any = new Error(`Get department summary failed: ${response.statusText || response.status}`);
      error.status = response.status;
      error.response = { status: response.status };
      throw error;
    }
    
    return response.json();
  },

  async getDepartmentActivities(departmentIds: string[], limit: number = 100) {
    const token = localStorage.getItem('token');
    const idsParam = departmentIds.join(',');
    const response = await fetch(`${API_BASE}/api/v1/departments/activities?department_ids=${idsParam}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Get department activities failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Company management
  async getCompanyInfo() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/company`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: any = new Error(`Get company info failed: ${response.statusText || response.status}`);
      error.status = response.status;
      error.response = { status: response.status };
      throw error;
    }

    return response.json();
  },

  async updateCompanyInfo(companyData: any) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/v1/company`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(companyData),
    });

    if (!response.ok) {
      const error: any = new Error(`Update company info failed: ${response.statusText || response.status}`);
      error.status = response.status;
      error.response = { status: response.status };
      throw error;
    }

    return response.json();
  },
};
