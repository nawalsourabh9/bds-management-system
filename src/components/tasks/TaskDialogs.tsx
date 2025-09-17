
import React from "react";
import { Task } from "@/types/task";
import TaskForm from "./TaskForm";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import StatusUpdateDialog from "./StatusUpdateDialog";
import { useTaskUpdate } from "@/hooks/task-operations/use-task-update";

interface TaskDialogsProps {
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (isOpen: boolean) => void;
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (isOpen: boolean) => void;
  isStatusUpdateDialogOpen: boolean;
  setIsStatusUpdateDialogOpen: (isOpen: boolean) => void;
  currentEditTask: Task | null;
  currentStatusTask: Task | null;
  onCreateTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
}

const TaskDialogs: React.FC<TaskDialogsProps> = ({
  isCreateDialogOpen,
  setIsCreateDialogOpen,
  isEditDialogOpen,
  setIsEditDialogOpen,
  isStatusUpdateDialogOpen,
  setIsStatusUpdateDialogOpen,
  currentEditTask,
  currentStatusTask,
  onCreateTask,
  onUpdateTask
}) => {
  const { handleUpdateTask } = useTaskUpdate();
  return (
    <>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <TaskForm onSubmit={onCreateTask} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <TaskForm onSubmit={(task) => {
            // Extract task ID and updates for the useTaskUpdate hook
            const { id, ...updates } = task;
            if (id) {
              handleUpdateTask(id, updates);
            }
          }} initialData={currentEditTask || {}} />
        </DialogContent>
      </Dialog>

      {currentStatusTask && (
        <StatusUpdateDialog
          taskId={currentStatusTask.id}
          currentStatus={currentStatusTask.status}
          currentPriority={currentStatusTask.priority}
          onStatusUpdate={async (taskId, newStatus, newPriority, comments) => {
            // Use the correct handleUpdateTask function with taskId and updates
            await handleUpdateTask(taskId, {
              status: newStatus,
              priority: newPriority,
              comments: comments
            });
            setIsStatusUpdateDialogOpen(false);
          }}
          open={isStatusUpdateDialogOpen}
          onOpenChange={setIsStatusUpdateDialogOpen}
          trigger={null}
        />
      )}
    </>
  );
};

export default TaskDialogs;
