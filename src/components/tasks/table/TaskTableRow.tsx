
import React from "react";
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
  setViewingDocument
}) => {
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
  
  return (
    <TableRow 
      className={`hover:bg-muted/50 ${isInstanceTask ? 'bg-muted/20 border-l-4 border-l-blue-200' : ''}`}
    >
      <TableCell className="font-medium min-w-[250px]">
        <div className={`flex flex-col gap-2 ${isInstanceTask ? 'ml-4' : ''}`}>
          <div className="flex items-center gap-2">
            <span className={isInstanceTask ? 'text-sm text-muted-foreground' : ''}>
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
      </TableCell>
      <TableCell className="min-w-[100px]">
        <span className="text-sm">{task.department}</span>
      </TableCell>
      <TableCell className="min-w-[120px]">
        <div className="flex flex-col gap-1">
          <span className="text-sm">{formatDateForDisplay(task.dueDate)}</span>
          {isInstanceTask && task.startDate && (
            <span className="text-xs text-muted-foreground">
              Started: {formatDateForDisplay(task.startDate)}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="min-w-[80px]">
        <TaskPriorityBadge priority={task.priority} />
      </TableCell>
      <TableCell className="min-w-[120px]">
        <TaskStatusBadge status={task.status} comments={task.comments} />
      </TableCell>
      <TableCell className="min-w-[200px]">
        <div className="flex flex-wrap gap-1">
          <TaskDocumentBadges task={task} setViewingDocument={setViewingDocument} />
          <TaskAttachmentBadge attachmentsRequired={task.attachmentsRequired} />
        </div>
      </TableCell>
      <TableCell className="min-w-[200px]">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onViewTask(task)}
            className="h-8 px-3"
          >
            <Eye className="h-3 w-3 mr-1" />
            Update
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onEditTask(task)}
            className="h-8 px-3"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          {(isAdmin || currentUserId === task.assignee) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteTask(task.id)}
              className="h-8 px-3 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default TaskTableRow;
