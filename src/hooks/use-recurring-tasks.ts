import { useState, useEffect } from 'react';
import { fastapiService } from '@/services/fastapi-service';

export interface RecurringParent {
  id: string;
  title: string;
  description: string;
  recurring_frequency: string;
  start_date: string;
  end_date?: string;
  department_id: string;
  is_customer_related: boolean;
  customer_name?: string;
  attachments_required: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChildTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  department_id: string;
  assignee_id: string;
  due_date: string;
  parent_task_id: string;
  child_instance_number: number;
  created_at: string;
  updated_at: string;
}

export interface ParentStatus {
  parent_task: RecurringParent;
  total_children: number;
  completed_children: number;
  active_children: number;
  next_due_date?: string;
  is_active: boolean;
}

export const useRecurringTasks = () => {
  const [parents, setParents] = useState<RecurringParent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createParent = async (data: Partial<RecurringParent>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fastapiService.createRecurringParent(data);
      setParents(prev => [...prev, result.data]);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create recurring parent';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchParents = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fastapiService.getRecurringParents();
      setParents(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recurring parents';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getParentStatus = async (parentId: string): Promise<ParentStatus> => {
    try {
      const result = await fastapiService.getParentStatus(parentId);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get parent status';
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchParents();
  }, []);

  return {
    parents,
    loading,
    error,
    createParent,
    fetchParents,
    getParentStatus,
  };
};

export const useChildTasks = (parentId?: string) => {
  const [childTasks, setChildTasks] = useState<ChildTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFirstChild = async (parentId: string, data: {
    due_date: string;
    assignee_id: string;
    priority: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fastapiService.createFirstChild(parentId, data);
      setChildTasks(prev => [...prev, result.data]);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create first child';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchChildTasks = async (parentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fastapiService.getChildTasks(parentId);
      setChildTasks(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch child tasks';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (parentId) {
      fetchChildTasks(parentId);
    }
  }, [parentId]);

  return {
    childTasks,
    loading,
    error,
    createFirstChild,
    fetchChildTasks,
  };
};
