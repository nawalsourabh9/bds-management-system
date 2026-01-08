import { EmployeeData } from '@/types/auth';

export const getCurrentUser = async (): Promise<EmployeeData | null> => {
  try {
    const storedEmployee = localStorage.getItem('employee');
    if (storedEmployee) {
      return JSON.parse(storedEmployee);
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const checkUserApprovalStatus = async (userId: string, email: string) => {
  try {
    const response = await fetch(`/api/v1/users/${userId}`);
    
    if (!response.ok) {
      throw new Error('Failed to check user status');
    }
    
    const userData = await response.json();
    
    if (userData.status === 'active') {
      return { approved: true, message: 'Account approved' };
    } else if (userData.status === 'inactive') {
      return { approved: false, message: 'Account rejected' };
    } else {
      return { approved: false, message: 'Account pending approval' };
    }
  } catch (error) {
    console.error('Error checking user approval status:', error);
    return { approved: false, message: 'Error checking approval status' };
  }
};

export const updateUserApproval = async (userId: string, approved: boolean) => {
  try {
    const response = await fetch(`/api/v1/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: approved ? 'active' : 'inactive' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update user approval');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating user approval:', error);
    throw error;
  }
};

export const sendEmail = async (emailData: any) => {
  try {
    const response = await fetch('/api/v1/functions/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send email');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};