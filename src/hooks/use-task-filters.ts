
import { useState, useMemo } from "react";
import { Task } from "@/types/task";
import { isSameDay } from "date-fns";

export const useTaskFilters = (tasks: Task[], currentUserId?: string | null) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [dueDateFilter, setDueDateFilter] = useState<Date | null>(null);
  const [frequencyFilter, setFrequencyFilter] = useState<string | null>(null);
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState<boolean>(true); // Default to true

  // Extract unique departments from tasks
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    tasks.forEach(task => {
      if (task.department) {
        deptSet.add(task.department);
      }
    });
    return Array.from(deptSet);
  }, [tasks]);

  // Extract unique team members from tasks
  const teamMembers = useMemo(() => {
    const membersMap = new Map();
    tasks.forEach(task => {
      if (task.assigneeDetails && task.assignee) {
        membersMap.set(task.assignee, {
          id: task.assignee,
          name: task.assigneeDetails.name,
          position: task.assigneeDetails.position || "",
          initials: task.assigneeDetails.initials,
          department: task.assigneeDetails.department || ""
        });
      }
    });
    return Array.from(membersMap.values());
  }, [tasks]);

  // Create a map of parent tasks for quick lookup
  const parentTasksMap = useMemo(() => {
    const map = new Map<string, Task>();
    tasks.forEach(task => {
      if (!task.parentTaskId) { // This is a parent task
        map.set(task.id, task);
      }
    });
    return map;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    // First, identify main tasks (parent tasks) and all child instances
    const mainTasks = tasks.filter(task => !task.parentTaskId); // Parent tasks only
    const childTasks = tasks.filter(task => !!task.parentTaskId); // All child tasks
    
    // Group ALL child tasks by parent ID
    const childTasksByParent = new Map<string, Task[]>();
    childTasks.forEach(child => {
      if (child.parentTaskId) {
        if (!childTasksByParent.has(child.parentTaskId)) {
          childTasksByParent.set(child.parentTaskId, []);
        }
        childTasksByParent.get(child.parentTaskId)!.push(child);
      }
    });
    
    // Combine main tasks with ALL their child instances
    const displayTasks: Task[] = [];
    
    mainTasks.forEach(mainTask => {
      // Add the main task
      displayTasks.push(mainTask);
      
      // Add ALL child instances if they exist
      const childInstances = childTasksByParent.get(mainTask.id) || [];
      childInstances.sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime()); // Sort by due date
      displayTasks.push(...childInstances);
    });
    
    // Apply filters to the combined tasks
    return displayTasks.filter(task => {
      // Search term filter
      const matchesSearch = 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      
      // Status filter
      const matchesStatus = !statusFilter || task.status === statusFilter;
      
      // Priority filter
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;
      
      // Department filter
      const matchesDepartment = !departmentFilter || task.department === departmentFilter;
      
      // Assignee filter
      const matchesAssignee = !assigneeFilter || 
        (assigneeFilter === "unassigned" ? !task.assignee : task.assignee === assigneeFilter);
      
      // Due date filter
      const matchesDueDate = !dueDateFilter || 
        (task.dueDate && isSameDay(new Date(task.dueDate), dueDateFilter));
      
      // My Tasks filter - show tasks related to current user (created, assigned, or delegated to)
      let matchesMyTasks = true;
      if (showOnlyMyTasks && currentUserId) {
        const isCreatedByUser = task.createdBy === currentUserId;
        const isAssignedToUser = task.assignee === currentUserId;
        const isDelegatedToUser = task.currentDelegatedTo?.delegatedToUserId === currentUserId;
        
        matchesMyTasks = isCreatedByUser || isAssignedToUser || isDelegatedToUser;
      }
      
      // Enhanced Frequency filter - check both task's frequency and parent's frequency
      let matchesFrequency = true;
      if (frequencyFilter) {
        if (frequencyFilter === "non-recurring") {
          // Show only non-recurring tasks (no parent and not recurring)
          matchesFrequency = !task.isRecurring && !task.parentTaskId;
        } else {
          // For specific frequencies, check:
          // 1. If it's a parent recurring task with matching frequency
          // 2. If it's an instance whose parent has matching frequency
          const taskFrequency = task.recurringFrequency;
          const parentTask = task.parentTaskId ? parentTasksMap.get(task.parentTaskId) : null;
          const parentFrequency = parentTask?.recurringFrequency;
          
          matchesFrequency = taskFrequency === frequencyFilter || parentFrequency === frequencyFilter;
        }
      }
      
      return matchesSearch && 
             matchesStatus && 
             matchesPriority && 
             matchesDepartment && 
             matchesAssignee && 
             matchesDueDate && 
             matchesFrequency &&
             matchesMyTasks;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, departmentFilter, assigneeFilter, dueDateFilter, frequencyFilter, parentTasksMap]);

  return {
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
    showOnlyMyTasks,
    setShowOnlyMyTasks,
    filteredTasks,
    departments,
    teamMembers
  };
};
