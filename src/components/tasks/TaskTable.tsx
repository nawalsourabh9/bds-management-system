
import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Task } from "@/types/task";
import { TaskDocument } from "@/types/document";
import TaskTableRow from "./table/TaskTableRow";
import DeleteTaskDialog from "./table/DeleteTaskDialog";
import DocumentViewerDialog from "./table/DocumentViewerDialog";

interface TasksTableProps {
  tasks: Task[];
  onViewTask: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => Promise<boolean>;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  isAdmin?: boolean;
  currentUserId?: string;
  currentUserPermissions?: any; // Simplified - accept any permissions
  teamMembers?: Array<{
    id: string;
    name: string;
    position: string;
    initials: string;
    email?: string;
    department?: string;
  }>;
  highlightedTaskId?: string;
}

const TasksTable: React.FC<TasksTableProps> = ({ 
  tasks, 
  onViewTask,
  onEditTask,
  onDeleteTask,
  onUpdateTask,
  isAdmin = true, // Default to admin for all users
  currentUserId, 
  currentUserPermissions,
  teamMembers = [],
  highlightedTaskId
}) => {
  const [viewingDocument, setViewingDocument] = useState<{
    task: Task,
    document: TaskDocument
  } | null>(null);
  
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  console.log("TasksTable isAdmin:", isAdmin);

  const handleDeleteTask = async () => {
    if (taskToDelete && onDeleteTask) {
      setIsDeleting(true);
      const success = await onDeleteTask(taskToDelete);
      setIsDeleting(false);
      if (success) {
        setTaskToDelete(null);
      }
    }
  };

  const handleUpdateRevision = (task: Task, documentType: string, revisionId: string) => {
    if (!task.documents) return;

    const docIndex = task.documents.findIndex(doc => doc.documentType === documentType);
    if (docIndex >= 0) {
      task.documents[docIndex].currentRevisionId = revisionId;
    }
  };
  
  const handleUpdateApprovalStatus = (
    task: Task, 
    documentType: string, 
    action: 'initiate' | 'check' | 'approve' | 'reject', 
    reason?: string
  ) => {
    if (!task.documents) return;
    
    const docIndex = task.documents.findIndex(doc => doc.documentType === documentType);
    if (docIndex >= 0) {
      const doc = task.documents[docIndex];
      const now = new Date().toISOString();
      
      if (!doc.approvalHierarchy) {
        doc.approvalHierarchy = {
          initiator: currentUserId,
          status: 'draft'
        };
      }
      
      switch(action) {
        case 'initiate':
          doc.approvalHierarchy.initiatorApproved = true;
          doc.approvalHierarchy.status = 'pending-checker';
          doc.approvalHierarchy.initiatedAt = now;
          break;
        case 'check':
          doc.approvalHierarchy.checkerApproved = true;
          doc.approvalHierarchy.status = 'pending-approval';
          doc.approvalHierarchy.checkedAt = now;
          break;
        case 'approve':
          doc.approvalHierarchy.approverApproved = true;
          doc.approvalHierarchy.status = 'approved';
          doc.approvalHierarchy.approvedAt = now;
          break;
        case 'reject':
          doc.approvalHierarchy.status = 'rejected';
          doc.approvalHierarchy.rejectedAt = now;
          doc.approvalHierarchy.rejectedBy = currentUserId;
          doc.approvalHierarchy.rejectionReason = reason;
          break;
      }
    }
  };

  // Convert teamMembers to proper TeamMember format
  const convertedTeamMembers = teamMembers.map(member => ({
    ...member,
    email: member.email || `${member.name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
    department: member.department || 'General'
  }));

  return (
    <>
      <div className="overflow-hidden rounded-vms-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table variant="clean" className="min-w-[720px]">
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="min-w-[200px] border-0">Task</TableHead>
                  <TableHead className="min-w-[120px] border-0">Assignee</TableHead>
                  <TableHead className="min-w-[100px] border-0">Department</TableHead>
                  <TableHead className="hidden min-w-[120px] border-0 lg:table-cell">Reports To</TableHead>
                  <TableHead className="min-w-[100px] border-0">Due Date</TableHead>
                  <TableHead className="min-w-[80px] border-0">Priority</TableHead>
                  <TableHead className="min-w-[120px] border-0">Status</TableHead>
                  <TableHead className="hidden min-w-[150px] border-0 md:table-cell">Documents</TableHead>
                  <TableHead className="sticky right-0 z-10 min-w-[120px] border-0 bg-card pl-4 shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.4)]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell colSpan={9} className="border-0 text-center text-muted-foreground">
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    // Group tasks: parent tasks first, then their children
                    const parentTasks = tasks.filter(task => !task.parentTaskId);
                    const childTasks = tasks.filter(task => task.parentTaskId);
                    
                    // Create grouped structure
                    const groupedTasks: Task[] = [];
                    
                    parentTasks.forEach(parentTask => {
                      // Add parent task
                      groupedTasks.push(parentTask);
                      
                      // Add all child tasks for this parent
                      const children = childTasks.filter(child => child.parentTaskId === parentTask.id);
                      groupedTasks.push(...children);
                    });
                    
                    // Add any orphaned child tasks (shouldn't happen but just in case)
                    const orphanedChildren = childTasks.filter(child => 
                      !parentTasks.some(parent => parent.id === child.parentTaskId)
                    );
                    groupedTasks.push(...orphanedChildren);
                    
                    return groupedTasks.map((task) => (
                      <TaskTableRow 
                        key={task.id}
                        task={task}
                        onViewTask={onViewTask}
                        onEditTask={onEditTask || (() => {})}
                        onUpdateTask={onUpdateTask}
                        isHighlighted={highlightedTaskId === task.id}
                        rowId={`task-${task.id}`}
                        onDeleteTask={(taskId) => {
                          if (onDeleteTask) {
                            setTaskToDelete(taskId);
                          }
                        }}
                        isAdmin={isAdmin}
                        currentUserId={currentUserId}
                        currentUserPermissions={currentUserPermissions}
                        teamMembers={convertedTeamMembers}
                        setViewingDocument={setViewingDocument}
                        allTasks={tasks}
                      />
                    ));
                  })()
                )}
              </TableBody>
            </Table>
        </div>
      </div>

      <DocumentViewerDialog 
        viewingDocument={viewingDocument}
        onClose={() => setViewingDocument(null)}
        currentUserId={currentUserId}
        teamMembers={convertedTeamMembers}
        onUpdateRevision={(documentType, revisionId) => 
          viewingDocument && handleUpdateRevision(viewingDocument.task, documentType, revisionId)
        }
        onUpdateApprovalStatus={(action, reason) => 
          viewingDocument && handleUpdateApprovalStatus(
            viewingDocument.task, 
            viewingDocument.document.documentType, 
            action, 
            reason
          )
        }
      />

      <DeleteTaskDialog 
        taskId={taskToDelete}
        isDeleting={isDeleting}
        onClose={() => setTaskToDelete(null)}
        onConfirmDelete={handleDeleteTask}
      />
    </>
  );
};

export default TasksTable;
