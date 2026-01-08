
import { useQueryClient } from "@tanstack/react-query";
import { fastapiService } from "@/services/fastapi-service";
import { Task } from "@/types/task";
import { toast } from "@/hooks/use-toast";
import { useTaskDocumentUpload } from "@/hooks/use-task-document-upload";
import { formatDateForInput } from "@/utils/dateUtils";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";

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
  const { user } = useAuth();
  const { processTaskDocuments } = useTaskDocumentUpload();
  const { fetchNotifications } = useNotifications();

  const handleCreateTask = async (newTask: Partial<Task> & { documentUploads?: any[]; [key: string]: any }) => {
    try {
      console.log("Creating task with enhanced recurring support:", newTask);
      
      // Normalize field names - accept both camelCase and snake_case
      const dueDate = newTask.dueDate || (newTask as any).due_date;
      const startDate = newTask.startDate || (newTask as any).start_date;
      const endDate = newTask.endDate || (newTask as any).end_date;
      const isRecurring = newTask.isRecurring || (newTask as any).is_recurring || false;
      const recurringFreq = newTask.recurringFrequency || (newTask as any).recurring_frequency;
      const isCustomerRelated = newTask.isCustomerRelated || (newTask as any).is_customer_related || false;
      const customerName = newTask.customerName || (newTask as any).customer_name;
      const attachmentsRequired = newTask.attachmentsRequired || (newTask as any).attachments_required || "none";
      
      // Format dates consistently
      const formattedDueDate = dueDate ? formatDateForInput(dueDate) : null;
      const formattedStartDate = startDate ? formatDateForInput(startDate) : null;
      const formattedEndDate = endDate ? formatDateForInput(endDate) : null;
      
      // Handle assignee conversion
      const assigneeValue = (newTask.assignee === "unassigned" || !newTask.assignee) ? null : newTask.assignee;
      
      // Create the task payload with new fields
      const taskPayload: TaskPayload = {
        title: newTask.title || "",
        description: newTask.description || null,
        department: newTask.department || "Quality",
        priority: newTask.priority || "medium",
        due_date: formattedDueDate,
        is_recurring: isRecurring,
        is_customer_related: isCustomerRelated,
        customer_name: customerName || null,
        recurring_frequency: isRecurring ? recurringFreq || null : null,
        start_date: isRecurring ? formattedStartDate : null,
        end_date: isRecurring ? formattedEndDate : null,
        attachments_required: attachmentsRequired,
        assignee: assigneeValue,
        status: "not-started",
        approval_status: "approved",
        // Set original_task_name for recurring tasks - this will be used for naming instances
        original_task_name: isRecurring ? newTask.title || null : null,
        recurrence_count_in_period: isRecurring ? 1 : undefined // First instance starts at 1
      };
      
      console.log("Task payload with new recurring fields:", taskPayload);

      // Convert to FastAPI format
      const fastapiPayload: any = {
        title: taskPayload.title,
        description: taskPayload.description,
        priority: taskPayload.priority,
        status: taskPayload.status,
        department: taskPayload.department, // Send department name, backend will convert to ID
        is_recurring: taskPayload.is_recurring,
        is_customer_related: taskPayload.is_customer_related,
        customer_name: taskPayload.customer_name || null,
        created_by: user?.id || null, // Include creator ID
      };
      
      // Only include recurring_frequency if task is recurring and has a valid frequency
      if (taskPayload.is_recurring && taskPayload.recurring_frequency) {
        fastapiPayload.recurring_frequency = taskPayload.recurring_frequency;
      }
      
      // For recurring tasks, send child instance data
      if (taskPayload.is_recurring) {
        fastapiPayload.assignee = taskPayload.assignee; // First child assignee
        fastapiPayload.due_date = taskPayload.due_date; // First child due date
        fastapiPayload.start_date = taskPayload.start_date;
        fastapiPayload.end_date = taskPayload.end_date;
        // Include child-specific fields if provided
        if ((newTask as any).child_customer_name !== undefined) {
          fastapiPayload.child_customer_name = (newTask as any).child_customer_name;
        }
        if ((newTask as any).child_customer_email !== undefined) {
          fastapiPayload.child_customer_email = (newTask as any).child_customer_email;
        }
        if ((newTask as any).child_is_customer_related !== undefined) {
          fastapiPayload.child_is_customer_related = (newTask as any).child_is_customer_related;
        }
        if ((newTask as any).child_attachments_required !== undefined) {
          fastapiPayload.child_attachments_required = (newTask as any).child_attachments_required;
        }
      } else {
        // For one-time tasks
        fastapiPayload.assignee = taskPayload.assignee;
        fastapiPayload.due_date = taskPayload.due_date;
      }
      
      // Remove null/undefined values
      Object.keys(fastapiPayload).forEach(k => {
        if (fastapiPayload[k] === null || fastapiPayload[k] === undefined) {
          delete fastapiPayload[k];
        }
      });

      console.log("Final FastAPI payload being sent:", JSON.stringify(fastapiPayload, null, 2));
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
      
      // Refresh notifications after a short delay to show new notifications
      setTimeout(() => {
        fetchNotifications();
      }, 1000);

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
