import React, { useState } from "react";
import { Task } from "@/types/task";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, RotateCcw, ArrowRight } from "lucide-react";
import NewTaskForm from "./NewTaskForm";

interface UnifiedTaskCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (task: Task) => void;
}

type TaskCreationStep = 'type-selection' | 'task-form';

const UnifiedTaskCreationDialog: React.FC<UnifiedTaskCreationDialogProps> = ({
  isOpen,
  onClose,
  onCreateTask
}) => {
  const [currentStep, setCurrentStep] = useState<TaskCreationStep>('type-selection');
  const [taskType, setTaskType] = useState<'one-time' | 'recurring'>('one-time');

  const handleTaskTypeSelection = (type: 'one-time' | 'recurring') => {
    setTaskType(type);
    setCurrentStep('task-form');
  };

  const handleTaskSubmit = (task: Task) => {
    // Add task type information to the task
    const taskWithType = {
      ...task,
      isRecurring: taskType === 'recurring'
    };
    onCreateTask(taskWithType);
    handleClose();
  };

  const handleClose = () => {
    setCurrentStep('type-selection');
    setTaskType('one-time');
    onClose();
  };

  const handleBackToSelection = () => {
    setCurrentStep('type-selection');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        {currentStep === 'type-selection' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">Create New Task</DialogTitle>
              <p className="text-center text-muted-foreground">
                Choose the type of task you want to create
              </p>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
              {/* One-Time Task Option */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                onClick={() => handleTaskTypeSelection('one-time')}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                    <ClipboardList className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">One-Time Task</CardTitle>
                  <CardDescription>
                    Create a single task with specific due date and assignee
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Single occurrence
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Custom due date
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Direct assignment
                    </li>
                  </ul>
                  <Button className="w-full mt-4" onClick={() => handleTaskTypeSelection('one-time')}>
                    Create One-Time Task
                  </Button>
                </CardContent>
              </Card>

              {/* Recurring Task Option */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                onClick={() => handleTaskTypeSelection('recurring')}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                    <RotateCcw className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Recurring Task</CardTitle>
                  <CardDescription>
                    Create a recurring workflow with parent-child relationships
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Automated scheduling
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Parent-child structure
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Frequency-based generation
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Editable due dates & assignees
                    </li>
                  </ul>
                  <Button className="w-full mt-4" onClick={() => handleTaskTypeSelection('recurring')}>
                    Create Recurring Task
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSelection}
                  className="p-1 h-8 w-8"
                >
                  ←
                </Button>
                Create {taskType === 'one-time' ? 'One-Time' : 'Recurring'} Task
              </DialogTitle>
            </DialogHeader>
            
            <NewTaskForm
              taskType={taskType}
              onSubmit={handleTaskSubmit}
              onCancel={handleClose}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedTaskCreationDialog;
