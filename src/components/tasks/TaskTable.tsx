
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
}

const TasksTable: React.FC<TasksTableProps> = ({ 
  tasks, 
  onViewTask,
  onEditTask,
  onDeleteTask,
  isAdmin = true, // Default to admin for all users
  currentUserId = "1", 
  currentUserPermissions,
  teamMembers = []
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
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[1520px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="border-r min-w-[250px]">Task</TableHead>
                  <TableHead className="border-r min-w-[120px]">Assignee</TableHead>
                  <TableHead className="border-r min-w-[100px]">Department</TableHead>
                  <TableHead className="border-r min-w-[120px]">Reports To</TableHead>
                  <TableHead className="border-r min-w-[120px]">Due Date</TableHead>
                  <TableHead className="border-r min-w-[80px]">Priority</TableHead>
                  <TableHead className="border-r min-w-[120px]">Status</TableHead>
                  <TableHead className="border-r min-w-[200px]">Documents</TableHead>
                  <TableHead className="min-w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TaskTableRow 
                      key={task.id}
                      task={task}
                      onViewTask={onViewTask}
                      onEditTask={onEditTask || (() => {})}
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
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
