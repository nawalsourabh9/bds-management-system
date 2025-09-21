
import React from "react";
import { Task } from "@/types/task";
import EditTaskDialog from "./EditTaskDialog";
import UnifiedTaskCreationDialog from "./UnifiedTaskCreationDialog";
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
      <UnifiedTaskCreationDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreateTask={onCreateTask}
      />

      <EditTaskDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        task={currentEditTask}
        onUpdate={handleUpdateTask}
      />

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
