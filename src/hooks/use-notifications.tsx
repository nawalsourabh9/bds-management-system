import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { API_BASE } from '@/config/api';
import { useAuth } from '@/hooks/use-auth';
import { useAuthSession } from '@/hooks/use-auth-session';
import { playNotificationSound, showBrowserNotification, isBrowserNotificationsEnabled } from '@/utils/soundUtils';

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
  const { user: sessionUser } = useAuthSession(); // Get synchronous user data
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousUnreadCount = useRef<number>(0);

  // Prioritize UUID (id) over employee_id (display-only like "EMP002")
  // Try multiple sources for user ID: employee (async), user (from auth context), sessionUser (sync)
  const userId = employee?.id || user?.id || sessionUser?.id;

  useEffect(() => {
    if (userId) {
      fetchNotifications();

      // Only fetch once on mount, don't auto-refresh to avoid overriding user actions
      // Users can manually refresh if needed

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

      // Handle token expiration
      if (handleApiError(response)) return;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch notifications: ${response.status} - ${errorText}`);
        throw new Error(`Failed to fetch notifications: ${response.status}`);
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

      // Play notification sound and show browser notification for new unread notifications
      if (unread > previousUnreadCount.current && previousUnreadCount.current > 0) {
        playNotificationSound();

        // Show browser notification and toast for the most recent unread notification
        const newUnreadNotifications = formattedNotifications.filter((n: Notification) => !n.is_read);
        if (newUnreadNotifications.length > 0) {
          const latestNotification = newUnreadNotifications[0];

          // Show browser notification if enabled
          if (isBrowserNotificationsEnabled()) {
            showBrowserNotification(latestNotification.title, {
              body: latestNotification.message,
              tag: latestNotification.id, // Prevents duplicate notifications
            });
          }

          // Show toast notification (this will also play sound via our custom toast hook)
          toast(latestNotification.title, {
            description: latestNotification.message,
            duration: 5000,
          });
        }
      }

      previousUnreadCount.current = unread;
      setUnreadCount(unread);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      // Don't clear notifications on error, keep existing ones
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiError = (response: Response) => {
    if (response.status === 401) {
      // Token expired, redirect to login
      console.warn('Token expired, redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('employee');
      localStorage.removeItem('session');
      window.location.href = '/login';
      return true;
    }
    return false;
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle token expiration
      if (handleApiError(response)) return;

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
      const response = await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle token expiration
      if (handleApiError(response)) return;

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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle token expiration
      if (handleApiError(response)) return;

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
      const response = await fetch(`${API_BASE}/api/v1/notifications/clear-all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle token expiration
      if (handleApiError(response)) return;

      if (!response.ok) {
        throw new Error('Failed to clear all notifications');
      }
      
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  const contextValue: NotificationsContextType = {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications: refreshNotifications,
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