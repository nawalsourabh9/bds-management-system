import { useQueryClient } from "@tanstack/react-query";
import { fastapiService } from "@/services/fastapi-service";
import { toast } from "@/hooks/use-toast";

export const useRecurringTaskManager = () => {
  const queryClient = useQueryClient();

  const generateRecurringInstances = async (parentTaskId: string) => {
    try {
      console.log("Generating recurring instances for task:", parentTaskId);
      
      // Trigger recurring task generation via FastAPI
      const response = await fetch('/api/v1/tasks/trigger-recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parent_task_id: parentTaskId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate recurring instances');
      }
      
      const result = await response.json();
      console.log("Recurring instances generated:", result);
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      toast({
        title: "Recurring Tasks Generated",
        description: `Recurring task instances have been generated successfully.`
      });
      
      return result;
    } catch (error: any) {
      console.error('Error generating recurring instances:', error);
      toast({
        title: "Error",
        description: `Failed to generate recurring instances: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  const markTaskCompleted = async (taskId: string) => {
    try {
      console.log("Marking task as completed:", taskId);
      
      const updatedTask = await fastapiService.updateTask(taskId, { status: 'completed' });
      console.log("Task marked as completed:", updatedTask);
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      toast({
        title: "Task Completed",
        description: `Task has been marked as completed.`
      });
      
      return updatedTask;
    } catch (error: any) {
      console.error('Error marking task as completed:', error);
      toast({
        title: "Error",
        description: `Failed to mark task as completed: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    generateRecurringInstances,
    markTaskCompleted,
  };
};