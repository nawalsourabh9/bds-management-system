import { useQuery } from "@tanstack/react-query";
import { Task } from "@/types/task";

import { API_BASE, API_ENDPOINTS } from '@/config/api';

export const useTasks = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      console.log("useTasks: Fetching tasks from FastAPI backend...");
      
      try {
        // Fetch tasks from our new FastAPI backend
        const response = await fetch(`${API_BASE}${API_ENDPOINTS.TASKS}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const tasksData = data.tasks || [];
        
        console.log(`useTasks: Retrieved ${tasksData.length} tasks from FastAPI backend`);

        // Map the data to our Task interface
        const tasks: Task[] = tasksData.map((item: any) => {
          // Create assignee details from the new API fields
          const assigneeDetails = item.assignee_name ? {
            name: item.assignee_name,
            initials: item.assignee_name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
            department: item.department_name || '',
            position: item.assignee_position_name || '',
            employeeId: item.assignee_employee_id || 'Not Set',
            reportsTo: item.assignee_reports_to_name || 'N/A'
          } : undefined;

          // Create clean task object
          const cleanTask: Task = {
            id: item.id,
            title: item.title,
            description: item.description || "",
            department: item.department_name || item.department_id, // Use department name if available
            // Use UUID (assignee_id) as primary identifier for matching
            // assignee_id is the UUID from users.id, which is what we use for filtering
            assignee: item.assignee_id || "unassigned", // Use UUID, not employee_id for matching
            priority: item.priority as 'low' | 'medium' | 'high',
            dueDate: item.due_date || "",
            status: item.status as 'completed' | 'in-progress' | 'overdue' | 'not-started',
            // Log date values for debugging
            // due_date: item.due_date, start_date: item.start_date, end_date: item.end_date
            createdAt: item.created_at || "",
            isRecurring: item.is_recurring || false,
            isCustomerRelated: item.is_customer_related || false,
            customerName: item.customer_name || "",
            recurringFrequency: item.recurring_frequency || "",
            startDate: item.start_date,
            endDate: item.end_date,
            attachmentsRequired: item.attachments_required as 'none' | 'optional' | 'required',
            parentTaskId: item.parent_task_id,
            originalTaskName: item.original_task_name,
            lastGeneratedDate: item.last_generated_date,
            assigneeDetails: assigneeDetails,
            documents: item.documents,
            approvalStatus: item.approval_status as 'pending' | 'approved' | 'rejected' | undefined,
            approvedBy: item.approved_by,
            approvedAt: item.approved_at,
            rejectedBy: item.rejected_by,
            rejectedAt: item.rejected_at,
            rejectionReason: item.rejection_reason,
            departmentHeadId: item.department_head_id,
            comments: item.comments,
            // Delegation data
            currentDelegatedTo: item.current_delegated_to_name ? {
              delegatedToUserId: item.current_delegated_to_user_id,
              delegatedToName: item.current_delegated_to_name,
              offlineAssigneeName: item.current_delegated_to_department ? item.current_delegated_to_name : undefined,
              offlineAssigneeDepartment: item.current_delegated_to_department,
              delegationLevel: item.current_delegation_level
            } : undefined,
            // Created by information
            createdBy: item.created_by,
            createdByName: item.created_by_name || 'Unknown'
          };

          return cleanTask;
        });

        console.log("useTasks: All tasks processed successfully from FastAPI backend");
        return tasks;
        
      } catch (error) {
        console.error("useTasks: Error fetching tasks from FastAPI:", error);
        throw error;
      }
    },
    // Refetch tasks every 10 seconds for real-time dashboard updates
    refetchInterval: 10000,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
  });
};
