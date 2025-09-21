
import { useQueryClient } from "@tanstack/react-query";
import { fastapiService } from "@/services/fastapi-service";
import { Task } from "@/types/task";
import { toast } from "@/hooks/use-toast";
import { useTaskDocumentUpload } from "@/hooks/use-task-document-upload";
import { formatDateForInput } from "@/utils/dateUtils";

interface TaskPayload {
  title: string;
  description: string | null;
  department: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  is_recurring: boolean;
  is_customer_related: boolean;
  customer_name?: string | null;
  recurring_frequency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  attachments_required: 'none' | 'optional' | 'required';
  assignee: string | null;
  status: 'not-started' | 'in-progress' | 'completed' | 'overdue';
  approval_status: 'pending' | 'approved' | 'rejected';
  original_task_name?: string | null; // New field
  recurrence_count_in_period?: number; // New field
}

export const useTaskCreate = (setIsCreateDialogOpen: (isOpen: boolean) => void) => {
  const queryClient = useQueryClient();
  const { processTaskDocuments } = useTaskDocumentUpload();

  const handleCreateTask = async (newTask: Partial<Task> & { documentUploads?: any[] }) => {
    try {
      console.log("Creating task with enhanced recurring support:", newTask);
      
      // Format dates consistently
      const formattedDueDate = formatDateForInput(newTask.dueDate);
      const formattedStartDate = newTask.startDate ? formatDateForInput(newTask.startDate) : null;
      const formattedEndDate = newTask.endDate ? formatDateForInput(newTask.endDate) : null;
      
      // Handle assignee conversion
      const assigneeValue = newTask.assignee === "unassigned" ? null : newTask.assignee;
      
      // Create the task payload with new fields
      const taskPayload: TaskPayload = {
        title: newTask.title || "",
        description: newTask.description || null,
        department: newTask.department || "Quality",
        priority: newTask.priority || "medium",
        due_date: formattedDueDate || null,
        is_recurring: newTask.isRecurring || false,
        is_customer_related: newTask.isCustomerRelated || false,
        customer_name: newTask.customerName || null,
        recurring_frequency: newTask.isRecurring ? newTask.recurringFrequency || null : null,
        start_date: newTask.isRecurring ? formattedStartDate : null,
        end_date: newTask.isRecurring ? formattedEndDate : null,
        attachments_required: newTask.attachmentsRequired || "none",
        assignee: assigneeValue,
        status: "not-started",
        approval_status: "approved",
        // Set original_task_name for recurring tasks - this will be used for naming instances
        original_task_name: newTask.isRecurring ? newTask.title || null : null,
        recurrence_count_in_period: newTask.isRecurring ? 1 : undefined // First instance starts at 1
      };
      
      console.log("Task payload with new recurring fields:", taskPayload);

      // Convert to FastAPI format
      const fastapiPayload = {
        title: taskPayload.title,
        description: taskPayload.description,
        priority: taskPayload.priority,
        status: taskPayload.status,
        due_date: taskPayload.due_date,
        assignee: taskPayload.assignee,
        department: taskPayload.department, // Send department name, backend will convert to ID
        is_recurring: taskPayload.is_recurring,
        recurring_frequency: taskPayload.recurring_frequency || "none",
        is_customer_related: taskPayload.is_customer_related,
        customer_name: taskPayload.customer_name,
        start_date: taskPayload.start_date,
        end_date: taskPayload.end_date
      };

      const data = await fastapiService.createTask(fastapiPayload);
      console.log("Task created successfully:", data);
      
      // Process document uploads if any
      if (newTask.documentUploads && newTask.documentUploads.length > 0) {
        console.log("Processing document uploads for new task");
        await processTaskDocuments(data.id, newTask.documentUploads);
      }

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['grouped-tasks'] });

      toast({
        title: "Task Created",
        description: `Task "${newTask.title}" has been created successfully.${newTask.isRecurring ? ' Recurring instances will be generated automatically when completed.' : ''}`
      });

      setIsCreateDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: `Failed to create task: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  return { handleCreateTask };
};
