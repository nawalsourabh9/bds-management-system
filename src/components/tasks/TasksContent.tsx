
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TaskTable from "./TaskTable";
import { Task, TeamMember } from "@/types/task";

interface TasksContentProps {
  filteredTasks: Task[];
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => Promise<boolean>;
  isAdmin: boolean;
  currentUserId: string | undefined;
  currentUserPermissions: any;
  teamMembers: TeamMember[];
}

const TasksContent: React.FC<TasksContentProps> = ({
  filteredTasks,
  onViewTask,
  onEditTask,
  onDeleteTask,
  isAdmin,
  currentUserId,
  currentUserPermissions,
  teamMembers
}) => {
  // Group tasks to show parent tasks and their instances together
  const groupedTasks = React.useMemo(() => {
    const parentTasks = filteredTasks.filter(task => !task.parentTaskId);
    const childTasks = filteredTasks.filter(task => task.parentTaskId);
    
    // Create a map of parent tasks with their children
    const taskGroups = parentTasks.map(parentTask => {
      const children = childTasks.filter(child => child.parentTaskId === parentTask.id);
      return {
        parent: parentTask,
        children: children.sort((a, b) => 
          (b.recurrenceCountInPeriod || 0) - (a.recurrenceCountInPeriod || 0)
        )
      };
    });
    
    // Add orphaned child tasks (those whose parents aren't in the filtered list)
    const orphanedChildren = childTasks.filter(child => 
      !parentTasks.some(parent => parent.id === child.parentTaskId)
    );
    
    return { taskGroups, orphanedChildren };
  }, [filteredTasks]);

  const allDisplayTasks = React.useMemo(() => {
    const result: Task[] = [];
    
    // Add all task groups (parent + children)
    groupedTasks.taskGroups.forEach(group => {
      result.push(group.parent);
      result.push(...group.children);
    });
    
    // Add orphaned children
    result.push(...groupedTasks.orphanedChildren);
    
    return result;
  }, [groupedTasks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tasks ({filteredTasks.length})</span>
          <div className="text-sm text-muted-foreground">
            {groupedTasks.taskGroups.filter(g => g.parent.isRecurring).length} recurring series
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TaskTable
          tasks={allDisplayTasks}
          onViewTask={onViewTask}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          currentUserPermissions={currentUserPermissions}
          teamMembers={teamMembers}
        />
      </CardContent>
    </Card>
  );
};

export default TasksContent;
