import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fastapiService } from '@/services/fastapi-service';
import { useNotifications } from '@/hooks/use-notifications.tsx';

export interface TaskUpdateData {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  due_date?: string;
  start_date?: string;
  end_date?: string;
  is_customer_related?: boolean;
  customer_name?: string;
  attachments_required?: boolean;
}

export const useTaskUpdates = () => {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { fetchNotifications } = useNotifications();

  const refreshData = () => {
    // Invalidate tasks query to refresh dashboard
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    // Refresh notifications after a short delay to ensure backend processed it
    setTimeout(() => {
      fetchNotifications();
    }, 1000);
  };

  const partialUpdate = async (taskId: string, data: TaskUpdateData) => {
    setUpdating(true);
    setError(null);
    try {
      const result = await fastapiService.partialUpdateTask(taskId, data);
      refreshData();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const fullUpdate = async (taskId: string, data: TaskUpdateData) => {
    setUpdating(true);
    setError(null);
    try {
      const result = await fastapiService.fullUpdateTask(taskId, data);
      refreshData();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const updateStatus = async (taskId: string, status: string) => {
    setUpdating(true);
    setError(null);
    try {
      const result = await fastapiService.updateTaskStatus(taskId, status);
      refreshData();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task status';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const updateAssignee = async (taskId: string, assignee: string) => {
    setUpdating(true);
    setError(null);
    try {
      const result = await fastapiService.updateTaskAssignee(taskId, assignee);
      refreshData();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task assignee';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const updatePriority = async (taskId: string, priority: string) => {
    setUpdating(true);
    setError(null);
    try {
      const result = await fastapiService.updateTaskPriority(taskId, priority);
      refreshData();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task priority';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const updateDueDate = async (taskId: string, dueDate: string) => {
    setUpdating(true);
    setError(null);
    try {
      const result = await fastapiService.updateTaskDueDate(taskId, dueDate);
      refreshData();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task due date';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return {
    updating,
    error,
    partialUpdate,
    fullUpdate,
    updateStatus,
    updateAssignee,
    updatePriority,
    updateDueDate,
  };
};
