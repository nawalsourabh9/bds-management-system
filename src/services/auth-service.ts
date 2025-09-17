
import { toast } from 'sonner';
import { EmployeeData } from '@/types/auth';

import { API_BASE, API_ENDPOINTS } from '@/config/api';

export const signIn = async (email: string, password: string) => {
  try {
    // Use the new login endpoint
    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }

    const data = await response.json();
    
    // Store session data in localStorage
    localStorage.setItem('employee', JSON.stringify(data.user));
    localStorage.setItem('session', JSON.stringify({ 
      access_token: data.access_token || 'local-session',
      user: data.user 
    }));
    
    return { employee: data.user };
  } catch (error: any) {
    console.error('Login error:', error);
    throw new Error(error.message || 'Failed to login');
  }
};

export const signUp = async (email: string, password: string, userData: any) => {
  try {
    // Create a new user via our backend API
    const response = await fetch(`${API_BASE}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: 'user',
        status: 'active'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create account');
    }

    const result = await response.json();
    toast.success('Account created successfully!');
    return { employee: result.user };
  } catch (error: any) {
    console.error('Error in signup:', error);
    throw error;
  }
};

export const signOut = async () => {
  // Clear any session data or local storage if needed
  localStorage.removeItem('employee');
  localStorage.removeItem('session');
  toast.success('Signed out successfully');
};

// Add these stub methods to fix TypeScript errors in AuthProvider.tsx
export const resetPassword = async (email: string): Promise<void> => {
  console.warn('resetPassword not implemented');
};

export const updatePassword = async (password: string): Promise<void> => {
  console.warn('updatePassword not implemented');
};


export const updateProfile = async (data: any, userId: string): Promise<void> => {
  console.warn('updateProfile not implemented');
};

export const changePassword = async (currentPassword: string, newPassword: string, email: string): Promise<void> => {
  console.warn('changePassword not implemented');
};
