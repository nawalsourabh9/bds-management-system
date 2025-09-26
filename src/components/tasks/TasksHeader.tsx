
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface TasksHeaderProps {
  onCreateTask: () => void;
}

const TasksHeader = ({ onCreateTask }: TasksHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-muted-foreground">
          Manage and track all your quality tasks - both one-time and recurring
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button onClick={onCreateTask}>
          <Plus className="mr-1 h-4 w-4" />
          New Task
        </Button>
      </div>
    </div>
  );
};

export default TasksHeader;
