
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw, ClipboardList } from "lucide-react";
import { TaskAutomationTester } from "./TaskAutomationTester";

interface TasksHeaderProps {
  onCreateTask: () => void;
  taskMode: 'regular' | 'recurring';
  onTaskModeChange: (mode: 'regular' | 'recurring') => void;
}

const TasksHeader = ({ onCreateTask, taskMode, onTaskModeChange }: TasksHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-muted-foreground">
          {taskMode === 'regular' ? 'Manage and track all your quality tasks' : 'Manage recurring task workflows'}
        </p>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Task Mode Toggle */}
        <div className="flex items-center bg-muted rounded-lg p-1">
          <Button
            variant={taskMode === 'regular' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTaskModeChange('regular')}
            className="flex items-center gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            One Time
          </Button>
          <Button
            variant={taskMode === 'recurring' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTaskModeChange('recurring')}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Recurring
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {taskMode === 'regular' && <TaskAutomationTester />}
          <Button onClick={onCreateTask}>
            <Plus className="mr-1 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TasksHeader;
