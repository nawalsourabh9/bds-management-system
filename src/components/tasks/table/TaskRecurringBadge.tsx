
import React from "react";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Calendar } from "lucide-react";
import { Task } from "@/types/task";

interface TaskRecurringBadgeProps {
  task: Task;
}

const TaskRecurringBadge: React.FC<TaskRecurringBadgeProps> = ({ task }) => {
  // Show template badge for parent recurring tasks
  if (task.isRecurring && !task.parentTaskId) {
    return (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
        <RotateCcw className="w-3 h-3 mr-1" />
        Template ({task.recurringFrequency})
      </Badge>
    );
  }

  // Show instance badge for recurring task instances
  if (task.parentTaskId && task.originalTaskName) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <Calendar className="w-3 h-3 mr-1" />
        Instance {task.recurrenceCountInPeriod}
      </Badge>
    );
  }

  return null;
};

export default TaskRecurringBadge;
