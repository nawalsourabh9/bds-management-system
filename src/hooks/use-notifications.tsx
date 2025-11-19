import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { API_BASE } from '@/config/api';
import { useAuth } from '@/hooks/use-auth';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
  actionUrl?: string;
  task_id?: string; // Task ID for task-related notifications
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { user, employee } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use employee.id if available, otherwise fall back to user.id
  const userId = employee?.id || user?.id;

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      
      // Auto-refresh notifications every 5 seconds for real-time updates
      intervalRef.current = setInterval(() => {
        fetchNotifications();
      }, 5000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      // Clear notifications if user logs out
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId) {
      console.warn("Cannot fetch notifications: user ID not available");
      return;
    }
    
    setIsLoading(true);
    try {
      // Fetch notifications for current user via FastAPI
      const response = await fetch(`${API_BASE}/api/v1/notifications?user_id=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      // Convert notification IDs to strings and ensure proper format
      const formattedNotifications = (data.notifications || []).map((n: any) => ({
        ...n,
        id: String(n.id), // Ensure ID is string
        type: (n.type || 'info') as 'info' | 'success' | 'warning' | 'error',
        is_read: n.is_read || false,
        created_at: n.created_at || new Date().toISOString(),
        task_id: n.task_id || undefined // Include task_id if present
      }));
      setNotifications(formattedNotifications);
      const unread = formattedNotifications.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);
      console.log(`Fetched ${formattedNotifications.length} notifications, ${unread} unread`);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/v1/notifications/read-all?user_id=${userId}`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/v1/notifications/clear-all?user_id=${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear all notifications');
      }
      
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const contextValue: NotificationsContextType = {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  };

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};