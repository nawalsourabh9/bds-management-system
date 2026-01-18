
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, Clock, CheckCircle, AlertCircle, HelpCircle, Pause, XCircle, Shield, AlertTriangle, UserCheck, ArrowRight } from "lucide-react";
import { Task, TeamMember } from "@/types/task";
import { TaskDocument } from "@/types/document";
import { formatDate } from "@/utils/dateUtils";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskCustomerBadge } from "./TaskCustomerBadge";
import { TaskAttachmentBadge } from "./TaskAttachmentBadge";
import { TaskDocumentBadges } from "./TaskDocumentBadges";
import TaskRecurringBadge from "./TaskRecurringBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TemplateTaskEditDialog } from "../TemplateTaskEditDialog";
import TaskDelegation from "../TaskDelegation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface TaskTableRowProps {
  task: Task;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => void;
  isAdmin: boolean;
  currentUserId: string | undefined;
  currentUserPermissions: any;
  teamMembers: TeamMember[];
  setViewingDocument: (data: { task: Task, document: TaskDocument } | null) => void;
  allTasks?: Task[]; // Add this to check for child tasks
  isHighlighted?: boolean;
  rowId?: string;
}

const statusOptions = [
  { value: 'not-started', label: 'Not Started', icon: HelpCircle },
  { value: 'pending', label: 'Pending', icon: HelpCircle },
  { value: 'in-progress', label: 'In Progress', icon: Clock },
  { value: 'under-review', label: 'Under Review', icon: Eye },
  { value: 'on-hold', label: 'On Hold', icon: Pause },
  { value: 'waiting-for-approval', label: 'Waiting for Approval', icon: AlertTriangle },
  { value: 'blocked', label: 'Blocked', icon: Shield },
  { value: 'overdue', label: 'Overdue', icon: AlertCircle },
  { value: 'completed', label: 'Completed', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical' },
  { value: 'emergency', label: 'Emergency' },
];

const TaskTableRow: React.FC<TaskTableRowProps> = ({
  task,
  onViewTask,
  onEditTask,
  onUpdateTask,
  onDeleteTask,
  isAdmin,
  currentUserId,
  currentUserPermissions,
  teamMembers,
  setViewingDocument,
  allTasks = [],
  isHighlighted = false,
  rowId
}) => {
  const [isTemplateEditOpen, setIsTemplateEditOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isDelegationOpen, setIsDelegationOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === task.status || !onUpdateTask) return;
    
    setIsUpdatingStatus(true);
    try {
      await onUpdateTask(task.id, { status: newStatus as Task['status'] });
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update task status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (newPriority === task.priority || !onUpdateTask) return;
    
    setIsUpdatingPriority(true);
    try {
      await onUpdateTask(task.id, { priority: newPriority as Task['priority'] });
    } catch (error) {
      console.error("Error updating priority:", error);
      toast.error("Failed to update task priority");
    } finally {
      setIsUpdatingPriority(false);
    }
  };
  
  const formatDateForDisplay = (dateString: string | undefined) => {
    if (!dateString) return "";
    try {
      return formatDate(dateString);
    } catch (error) {
      return dateString;
    }
  };

  // Determine if this is an instance task (indented display)
  const isInstanceTask = !!task.parentTaskId;
  const isRecurringParent = task.isRecurring && !task.parentTaskId;
  

  
  // Determine background color based on task type
  const getBackgroundColor = () => {
    if (isInstanceTask) {
      return 'bg-blue-50/30 border-l-4 border-l-blue-300'; // Light blue for child instances
    } else if (task.isRecurring) {
      return 'bg-slate-200 hover:bg-slate-250 border-l-6 border-l-purple-500 font-semibold shadow-sm'; // Darker, bolder for parent recurring tasks
    } else {
      return 'bg-white hover:bg-muted/50'; // Default for one-time tasks
    }
  };

  return (
    <>
    <TableRow 
      id={rowId}
      className={`${getBackgroundColor()} ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''}`}
    >
      <TableCell className="font-medium min-w-[250px]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={`${isInstanceTask ? 'ml-6 text-sm text-blue-700' : 
                              isRecurringParent ? 'text-base font-bold text-slate-800' : 
                              'text-sm'}`}>
              {task.title}
            </span>
            {task.originalTaskName && isInstanceTask && (
              <span className="text-xs text-muted-foreground">
                (from "{task.originalTaskName}")
              </span>
            )}
          </div>
          {task.createdByName && (
            <span className="text-xs text-muted-foreground">
              Created by: {task.createdByName}
            </span>
          )}
          <div className="flex flex-wrap gap-1">
            <TaskRecurringBadge task={task} />
            <TaskCustomerBadge isCustomerRelated={task.isCustomerRelated} customerName={task.customerName} />
          </div>
        </div>
      </TableCell>
      <TableCell className="min-w-[120px]">
        <div>
              {isInstanceTask ? (
                <div className="flex items-center gap-2">
                  {task.assigneeDetails ? (
                <>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {task.assigneeDetails.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-blue-700">{task.assigneeDetails.name}</span>
                    {task.assigneeDetails.employeeId && (
                      <span className="text-xs text-muted-foreground">{task.assigneeDetails.employeeId}</span>
                    )}
                    {task.currentDelegatedTo && (
                      <div className="flex items-center gap-1 mt-1 pt-1 border-t border-border/50">
                        <ArrowRight className="h-3 w-3 text-blue-600" />
                        <span className="text-xs text-muted-foreground">Delegated to:</span>
                        <span className="text-xs font-medium text-blue-600">
                          {task.currentDelegatedTo.delegatedToName || task.currentDelegatedTo.offlineAssigneeName}
                        </span>
                        {task.currentDelegatedTo.offlineAssigneeName && (
                          <Badge variant="outline" className="text-xs ml-1">
                            Offline
                          </Badge>
                        )}
                      </div>
                    )}
                    {/* Delegate Button - Show if user is assignee or current delegated person */}
                    {(isAdmin || currentUserId === task.assignee || 
                      (task.currentDelegatedTo?.delegatedToUserId && currentUserId === task.currentDelegatedTo.delegatedToUserId)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-full mt-1 text-xs"
                        onClick={() => setIsDelegationOpen(true)}
                        title="Delegate Task"
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Delegate
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </div>
          ) : isRecurringParent ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-600">Template</span>
              <span className="text-xs text-muted-foreground">Assignees set per instance</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {task.assigneeDetails ? (
                <>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {task.assigneeDetails.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{task.assigneeDetails.name}</span>
                    {task.assigneeDetails.employeeId && (
                      <span className="text-xs text-muted-foreground">{task.assigneeDetails.employeeId}</span>
                    )}
                    {task.currentDelegatedTo && (
                      <div className="flex items-center gap-1 mt-1 pt-1 border-t border-border/50">
                        <ArrowRight className="h-3 w-3 text-blue-600" />
                        <span className="text-xs text-muted-foreground">Delegated to:</span>
                        <span className="text-xs font-medium text-blue-600">
                          {task.currentDelegatedTo.delegatedToName || task.currentDelegatedTo.offlineAssigneeName}
                        </span>
                        {task.currentDelegatedTo.offlineAssigneeName && (
                          <Badge variant="outline" className="text-xs ml-1">
                            Offline
                          </Badge>
                        )}
                      </div>
                    )}
                    {/* Delegate Button - Show if user is assignee or current delegated person */}
                    {(isAdmin || currentUserId === task.assignee || 
                      (task.currentDelegatedTo?.delegatedToUserId && currentUserId === task.currentDelegatedTo.delegatedToUserId)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-full mt-1 text-xs"
                        onClick={() => setIsDelegationOpen(true)}
                        title="Delegate Task"
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Delegate
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="min-w-[100px]">
        <div>
          <span className="text-sm">{task.department}</span>
        </div>
      </TableCell>
      <TableCell className="min-w-[120px] hidden lg:table-cell">
        <div>
          {isRecurringParent ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-600">Template</span>
              <span className="text-xs text-muted-foreground">Reports-to set per instance</span>
            </div>
          ) : (
            <span className="text-sm">{task.assigneeDetails?.reportsTo || 'N/A'}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="min-w-[120px]">
        <div>
          {isInstanceTask ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-blue-700">{formatDateForDisplay(task.dueDate)}</span>
              {task.startDate && (
                <span className="text-xs text-muted-foreground">
                  Started: {formatDateForDisplay(task.startDate)}
                </span>
              )}
            </div>
          ) : isRecurringParent ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-600">Template</span>
              {task.startDate && (
                <span className="text-sm">Start: {formatDateForDisplay(task.startDate)}</span>
              )}
              {task.endDate && (
                <span className="text-sm">End: {formatDateForDisplay(task.endDate)}</span>
              )}
              {task.customerName && (
                <span className="text-sm">Customer: {task.customerName}</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-sm">{formatDateForDisplay(task.dueDate)}</span>
              {task.startDate && (
                <span className="text-xs text-muted-foreground">
                  Started: {formatDateForDisplay(task.startDate)}
                </span>
              )}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="min-w-[120px]">
        <div>
          {isRecurringParent ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-600">Template</span>
              <span className="text-xs text-muted-foreground">Priority set per instance</span>
            </div>
          ) : (
            <Select 
              value={task.priority} 
              onValueChange={handlePriorityChange}
              disabled={isUpdatingPriority}
            >
              <SelectTrigger className="h-auto w-auto border-0 p-1 bg-transparent hover:bg-muted/50 shadow-none data-[state=open]:bg-muted [&>span]:hidden">
                <SelectValue />
                <TaskPriorityBadge priority={task.priority} />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </TableCell>
      <TableCell className="min-w-[150px]">
        <div>
          {isRecurringParent ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-600">Template</span>
              <span className="text-xs text-muted-foreground">Status set per instance</span>
            </div>
          ) : (
            <Select 
              value={task.status} 
              onValueChange={handleStatusChange}
              disabled={isUpdatingStatus}
            >
              <SelectTrigger className="h-auto w-auto border-0 p-1 bg-transparent hover:bg-muted/50 shadow-none data-[state=open]:bg-muted [&>span]:hidden">
                <SelectValue />
                <TaskStatusBadge status={task.status} comments={task.comments} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {React.createElement(option.icon, { className: "h-4 w-4" })}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </TableCell>
      <TableCell className="min-w-[150px] hidden md:table-cell">
        <div>
          {isRecurringParent ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-600">Template</span>
              <span className="text-xs text-muted-foreground">Documents set per instance</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              <TaskDocumentBadges task={task} setViewingDocument={setViewingDocument} />
              <TaskAttachmentBadge attachmentsRequired={task.attachmentsRequired} />
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="sticky right-0 bg-background z-10 min-w-[140px] border-l-2 border-l-border">
        <div className="flex items-center justify-end gap-2">
          {/* View/Update Status Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary/10"
            onClick={() => onViewTask(task)}
            title="View/Update Status"
          >
            <Eye className="h-4 w-4 text-blue-600" />
          </Button>
          
          {/* Edit Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary/10"
            onClick={() => {
              if (isRecurringParent) {
                setIsTemplateEditOpen(true);
              } else {
                onEditTask(task);
              }
            }}
            title={isRecurringParent ? "Edit Template" : "Edit Task"}
          >
            <Edit className="h-4 w-4 text-green-600" />
          </Button>
          
          {/* Delete Button - Only show if admin or assignee */}
          {(isAdmin || currentUserId === task.assignee) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-destructive/10"
              onClick={() => onDeleteTask(task.id)}
              title="Delete Task"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          )}
          
          {/* More Options Dropdown (for additional actions) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                title="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewTask(task)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (isRecurringParent) {
                  setIsTemplateEditOpen(true);
                } else {
                  onEditTask(task);
                }
              }}>
                <Edit className="h-4 w-4 mr-2" />
                {isRecurringParent ? "Edit Template" : "Edit Task"}
              </DropdownMenuItem>
              {(isAdmin || currentUserId === task.assignee || 
                (task.currentDelegatedTo?.delegatedToUserId && currentUserId === task.currentDelegatedTo.delegatedToUserId)) && (
                <DropdownMenuItem onClick={() => setIsDelegationOpen(true)}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Delegate Task
                </DropdownMenuItem>
              )}
              {(isAdmin || currentUserId === task.assignee) && (
                <DropdownMenuItem 
                  onClick={() => onDeleteTask(task.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
      {isRecurringParent && (
        <TemplateTaskEditDialog
          isOpen={isTemplateEditOpen}
          onClose={() => setIsTemplateEditOpen(false)}
          onSuccess={() => {
            setIsTemplateEditOpen(false);
            // Refresh tasks or call a callback
          }}
          task={task}
        />
      )}
      <TaskDelegation
        isOpen={isDelegationOpen}
        onClose={() => setIsDelegationOpen(false)}
        task={task}
        onDelegated={() => {
          setIsDelegationOpen(false);
          // Invalidate tasks query to refresh the UI
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }}
      />
    </>
  );
};

export default TaskTableRow;
