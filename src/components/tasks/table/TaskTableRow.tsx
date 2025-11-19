
import React, { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
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

interface TaskTableRowProps {
  task: Task;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
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

const TaskTableRow: React.FC<TaskTableRowProps> = ({
  task,
  onViewTask,
  onEditTask,
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
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-blue-700">{task.assigneeDetails.name}</span>
                    {task.assigneeDetails.employeeId && (
                      <span className="text-xs text-muted-foreground">{task.assigneeDetails.employeeId}</span>
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
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{task.assigneeDetails.name}</span>
                    {task.assigneeDetails.employeeId && (
                      <span className="text-xs text-muted-foreground">{task.assigneeDetails.employeeId}</span>
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
      <TableCell className="min-w-[80px]">
        <div>
          {isRecurringParent ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-600">Template</span>
              <span className="text-xs text-muted-foreground">Priority set per instance</span>
            </div>
          ) : (
            <TaskPriorityBadge priority={task.priority} />
          )}
        </div>
      </TableCell>
      <TableCell className="min-w-[120px]">
        <div>
          {isRecurringParent ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-600">Template</span>
              <span className="text-xs text-muted-foreground">Status set per instance</span>
            </div>
          ) : (
            <TaskStatusBadge status={task.status} comments={task.comments} />
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
      <TableCell className="sticky right-0 bg-background z-10 min-w-[120px] border-l-2 border-l-border">
        <div className="flex items-center justify-end gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewTask(task)}>
                <Eye className="h-4 w-4 mr-2" />
                Update Status
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
    </>
  );
};

export default TaskTableRow;
