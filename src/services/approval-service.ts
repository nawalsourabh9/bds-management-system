import { toast } from 'sonner';
import { API_BASE } from '@/config/api';

export const checkUserApprovalStatus = async (userId: string, email: string) => {
  try {
    // Check user status via FastAPI
    const response = await fetch(`${API_BASE}/api/v1/users/${userId}`);
    
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

export const approveUser = async (userId: string) => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'active' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to approve user');
    }
    
    toast.success('User approved successfully');
  } catch (error) {
    console.error('Error approving user:', error);
    toast.error('Failed to approve user');
    throw error;
  }
};

export const rejectUser = async (userId: string) => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'inactive' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to reject user');
    }
    
    toast.success('User rejected successfully');
  } catch (error) {
    console.error('Error rejecting user:', error);
    toast.error('Failed to reject user');
    throw error;
  }
};