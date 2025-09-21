import { useState, useEffect, useCallback } from 'react';
import { fastapiService } from '@/services/fastapi-service';

export interface ChildTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  completed_date?: string;
  child_instance_number: number;
  created_at: string;
  assignee_first_name?: string;
  assignee_last_name?: string;
  assignee_email?: string;
}

export interface GroupedTask {
  parent_id: string;
  parent_title: string;
  parent_description: string;
  parent_status: string;
  parent_priority: string;
  recurring_frequency: string;
  start_date: string;
  end_date: string;
  attachments_required: boolean;
  parent_created_at: string;
  department_name: string;
  first_name: string;
  last_name: string;
  created_by: string;
  child_count: number;
  completed_children: number;
  in_progress_children: number;
  pending_children: number;
  children: ChildTask[];
}

export interface GroupedTasksResponse {
  grouped_tasks: GroupedTask[];
  total_parents: number;
  timestamp: string;
}

export const useGroupedTasks = () => {
  const [groupedTasks, setGroupedTasks] = useState<GroupedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalParents, setTotalParents] = useState(0);

  const fetchGroupedTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response: GroupedTasksResponse = await fastapiService.getGroupedTasks();
      setGroupedTasks(response.grouped_tasks);
      setTotalParents(response.total_parents);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching grouped tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroupedTasks();
  }, [fetchGroupedTasks]);

  const refreshGroupedTasks = useCallback(() => {
    fetchGroupedTasks();
  }, [fetchGroupedTasks]);

  return {
    groupedTasks,
    loading,
    error,
    totalParents,
    refreshGroupedTasks,
  };
};

