
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { API_BASE, API_ENDPOINTS } from '@/config/api';

export const useTaskDelete = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const deleteTask = async (taskId: string) => {
    if (!taskId) return false;
    
    try {
      setIsDeleting(true);
      console.log(`Attempting to delete task with ID: ${taskId}`);
      
      // Delete task from FastAPI backend
      const response = await fetch(`${API_BASE}/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error deleting task:", errorData);
        toast.error("Failed to delete task");
        return false;
      }

      console.log("Task deleted successfully");
      toast.success("Task deleted successfully");
      
      // Invalidate tasks query to refresh data
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      return true;
    } catch (error) {
      console.error("Error in deleteTask:", error);
      toast.error("An unexpected error occurred");
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteTask, isDeleting };
};
