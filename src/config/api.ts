// API Configuration
// This file centralizes API configuration for local development

// Get API base URL from environment variable or default to localhost for development
const getApiBaseUrl = (): string => {
  // Check for Vite environment variable for development
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Default to localhost for development
  return 'http://localhost:8002';
};

export const API_BASE = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH_TOKEN: '/auth/refresh',
  LOGOUT: '/auth/logout',
  
  // Task endpoints
  TASKS: '/api/v1/tasks',
  TASK_DETAIL: (id: string) => `/api/v1/tasks/${id}`,
  CREATE_TASK: '/api/v1/tasks',
  UPDATE_TASK: (id: string) => `/api/v1/tasks/${id}`,
  DELETE_TASK: (id: string) => `/api/v1/tasks/${id}`,
  
  // User endpoints
  USERS: '/api/v1/users',
  USER_DETAIL: (id: string) => `/api/v1/users/${id}`,
  EMPLOYEES: '/api/v1/employees',
  EMPLOYEE_DETAIL: (id: string) => `/api/v1/employees/${id}`,
  
  // Department endpoints
  DEPARTMENTS: '/api/v1/departments',
  
  // Document endpoints
  DOCUMENTS: '/api/v1/documents',
  UPLOAD_DOCUMENT: '/api/v1/documents/upload',
  
  // Function endpoints
  SEND_EMAIL: '/api/v1/functions/send-email',
  DATABASE_UTILS: '/api/v1/functions/database-utils',
  TASK_AUTOMATION: '/api/v1/functions/task-automation',
  CREATE_ADMIN: '/api/v1/functions/create-admin',
  HRONE_INTEGRATION: '/api/v1/functions/hrone-integration',
  SEND_INVITATION: '/api/v1/functions/send-invitation',
  
  // Health check
  HEALTH: '/health',
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE}${endpoint}`;
};

// Log API configuration for debugging
console.log('🔧 API Configuration:', {
  API_BASE,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
});
