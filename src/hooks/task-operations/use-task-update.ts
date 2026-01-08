import { useQueryClient } from "@tanstack/react-query";
import { fastapiService } from "@/services/fastapi-service";
import { Task } from "@/types/task";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";

export const useTaskUpdate = () => {
  const queryClient = useQueryClient();
  const { fetchNotifications } = useNotifications();

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      console.log("Updating task:", taskId, updates);
      
      const updatedTask = await fastapiService.updateTask(taskId, updates);
      console.log("Task updated successfully:", updatedTask);
      
      // Invalidate queries to refresh the UI immediately
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Immediately refresh notifications to show new notifications
      setTimeout(() => {
        fetchNotifications();
      }, 1000); // Small delay to ensure backend has processed the notification
      
      // Check for warning message (e.g., completing task before due date)
      if (updatedTask?.warning) {
        toast({
          title: "Task Updated",
          description: updatedTask.warning,
          variant: "default"
        });
      } else {
        toast({
          title: "Task Updated",
          description: `Task has been updated successfully.`
        });
      }
      
      return updatedTask;
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  return { handleUpdateTask };
};