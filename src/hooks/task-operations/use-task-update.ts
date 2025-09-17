import { useQueryClient } from "@tanstack/react-query";
import { fastapiService } from "@/services/fastapi-service";
import { Task } from "@/types/task";
import { toast } from "@/hooks/use-toast";

export const useTaskUpdate = () => {
  const queryClient = useQueryClient();

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      console.log("Updating task:", taskId, updates);
      
      const updatedTask = await fastapiService.updateTask(taskId, updates);
      console.log("Task updated successfully:", updatedTask);
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      toast({
        title: "Task Updated",
        description: `Task has been updated successfully.`
      });
      
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