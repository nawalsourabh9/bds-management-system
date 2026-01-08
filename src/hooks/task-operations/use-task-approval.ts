import { useQueryClient } from "@tanstack/react-query";
import { fastapiService } from "@/services/fastapi-service";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";

export const useTaskApproval = () => {
  const queryClient = useQueryClient();
  const { fetchNotifications } = useNotifications();

  const approveTask = async (taskId: string) => {
    try {
      console.log("Approving task:", taskId);
      
      const updatedTask = await fastapiService.updateTask(taskId, { 
        approval_status: 'approved' 
      });
      console.log("Task approved successfully:", updatedTask);
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Refresh notifications after a short delay
      setTimeout(() => {
        fetchNotifications();
      }, 1000);
      
      toast({
        title: "Task Approved",
        description: `Task has been approved successfully.`
      });
      
      return updatedTask;
    } catch (error: any) {
      console.error('Error approving task:', error);
      toast({
        title: "Error",
        description: `Failed to approve task: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  const rejectTask = async (taskId: string, reason?: string) => {
    try {
      console.log("Rejecting task:", taskId, reason);
      
      const updatedTask = await fastapiService.updateTask(taskId, { 
        approval_status: 'rejected',
        rejection_reason: reason 
      });
      console.log("Task rejected successfully:", updatedTask);
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Refresh notifications after a short delay
      setTimeout(() => {
        fetchNotifications();
      }, 1000);
      
      toast({
        title: "Task Rejected",
        description: `Task has been rejected successfully.`
      });
      
      return updatedTask;
    } catch (error: any) {
      console.error('Error rejecting task:', error);
      toast({
        title: "Error",
        description: `Failed to reject task: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    approveTask,
    rejectTask,
  };
};