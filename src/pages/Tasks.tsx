
import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTasks } from "@/hooks/use-tasks";
import { useTaskOperations } from "@/hooks/use-task-operations";
import { useTaskFilters } from "@/hooks/use-task-filters";
import TasksHeader from "@/components/tasks/TasksHeader";
import TaskFilters from "@/components/tasks/TaskFilters";
import TasksContent from "@/components/tasks/TasksContent";
import TaskDialogs from "@/components/tasks/TaskDialogs";
import { useAuth } from "@/hooks/use-auth";

const Tasks = () => {
  const { data: tasks = [], isLoading } = useTasks();
  const { employee, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');
  const filterFromUrl = searchParams.get('filter');
  
  console.log("Current user role:", employee?.role);
  console.log("Is admin?", isAdmin);

  // Simplified permissions for all users - everyone can do everything
  const currentUserPermissions = {
    canInitiate: true,
    canCheck: true,
    canApprove: true,
    allowedDocumentTypes: ['sop', 'dataFormat', 'reportFormat', 'rulesAndProcedures'],
    allowedDepartments: [employee?.department || '', 'All']
  };

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    departmentFilter,
    setDepartmentFilter,
    assigneeFilter,
    setAssigneeFilter,
    dueDateFilter,
    setDueDateFilter,
    frequencyFilter,
    setFrequencyFilter,
    filteredTasks,
    departments,
    teamMembers
  } = useTaskFilters(tasks);

  // Handle URL parameters for task highlighting and filtering
  useEffect(() => {
    if (filterFromUrl === 'assigned' && employee?.id && !assigneeFilter) {
      // Set filter to show only assigned tasks
      setAssigneeFilter(employee.id);
    }
    
    // If taskId is in URL, scroll to it after tasks load
    if (taskIdFromUrl && !isLoading && filteredTasks.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const taskElement = document.getElementById(`task-${taskIdFromUrl}`);
        if (taskElement) {
          taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the task temporarily
          taskElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            taskElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 500);
    }
  }, [taskIdFromUrl, filterFromUrl, employee?.id, assigneeFilter, isLoading, filteredTasks]);

  const {
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isStatusUpdateDialogOpen,
    setIsStatusUpdateDialogOpen,
    currentEditTask,
    currentStatusTask,
    handleEditTask,
    handleStatusUpdate,
    handleUpdateTask,
    handleCreateTask,
    deleteTask
  } = useTaskOperations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TasksHeader 
        onCreateTask={() => setIsCreateDialogOpen(true)} 
      />

      <TaskFilters 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        departmentFilter={departmentFilter}
        setDepartmentFilter={setDepartmentFilter}
        assigneeFilter={assigneeFilter}
        setAssigneeFilter={setAssigneeFilter}
        dueDateFilter={dueDateFilter}
        setDueDateFilter={setDueDateFilter}
        frequencyFilter={frequencyFilter}
        setFrequencyFilter={setFrequencyFilter}
        departments={departments}
        teamMembers={teamMembers}
      />

      <TasksContent 
        filteredTasks={filteredTasks}
        onViewTask={handleStatusUpdate}
        onEditTask={handleEditTask}
        onDeleteTask={deleteTask}
        isAdmin={true} // Give admin capabilities to everyone
        currentUserId={employee?.id}
        currentUserPermissions={currentUserPermissions}
        teamMembers={teamMembers}
        highlightedTaskId={taskIdFromUrl || undefined}
      />

      <TaskDialogs 
        isCreateDialogOpen={isCreateDialogOpen}
        setIsCreateDialogOpen={setIsCreateDialogOpen}
        isEditDialogOpen={isEditDialogOpen}
        setIsEditDialogOpen={setIsEditDialogOpen}
        isStatusUpdateDialogOpen={isStatusUpdateDialogOpen}
        setIsStatusUpdateDialogOpen={setIsStatusUpdateDialogOpen}
        currentEditTask={currentEditTask}
        currentStatusTask={currentStatusTask}
        onCreateTask={handleCreateTask}
        onUpdateTask={handleUpdateTask}
      />
    </div>
  );
};

export default Tasks;
