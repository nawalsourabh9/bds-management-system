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
    const response = await fetch(`${API_BASE}/api/v1/users`);
    
    if (!response.ok) {
      throw new Error(`Get users failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getUser(userId: string) {
    const response = await fetch(`${API_BASE}/api/v1/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`Get user failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async createUser(userData: any) {
    const response = await fetch(`${API_BASE}/api/v1/users`, {
      method: 'POST',
      headers: {
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
    const response = await fetch(`${API_BASE}/api/v1/users/${userId}`, {
      method: 'PUT',
      headers: {
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

  async getDepartments() {
    const response = await fetch(`${API_BASE}/api/v1/departments`);
    
    if (!response.ok) {
      throw new Error(`Get departments failed: ${response.statusText}`);
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
    const response = await fetch(`${API_BASE}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Create task failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async updateTask(taskId: string, taskData: any) {
    const response = await fetch(`${API_BASE}/api/v1/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
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
};
