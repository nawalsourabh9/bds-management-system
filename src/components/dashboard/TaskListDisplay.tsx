import React from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Clock, Building2 } from "lucide-react";
import { Task } from "@/types/task";

interface TaskListDisplayProps {
  tasks: Task[];
}

export const TaskListDisplay: React.FC<TaskListDisplayProps> = ({ tasks }) => {
  // Format due date to DD-MM-YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    try {
      return format(new Date(dateString), 'dd-MM-yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] || "") + (nameParts[1][0] || "");
    }
    return name.substring(0, 1).toUpperCase();
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div 
          key={task.id} 
          className="group flex items-start justify-between p-4 border border-gray-200/50 rounded-xl hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-orange-100/30 hover:border-orange-200/50 transition-all duration-300 hover:shadow-md cursor-pointer"
        >
          <div className="space-y-3 flex-1">
            <div className="flex items-start gap-3">
              <h3 className="font-semibold text-sm group-hover:text-orange-600 transition-colors leading-tight">
                {task.title}
              </h3>
              {task.isCustomerRelated && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-xs">
                  {task.customerName || 'Customer'}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {task.priority}
              </Badge>
              <Badge 
                variant={task.status === 'completed' ? 'outline' : 
                        task.status === 'overdue' ? 'destructive' : 
                        task.status === 'in-progress' ? 'default' : 
                        'secondary'}
                className="text-xs"
              >
                {task.status}
              </Badge>
              {task.department && (
                <Badge variant="outline" className="bg-gray-50 text-xs">
                  {task.department}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(task.dueDate)}
              </div>
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {task.department || 'General'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Assigned to</div>
              <div className="text-sm font-medium">
                {task.assigneeDetails?.name || 'Unassigned'}
              </div>
            </div>
            <Avatar className="h-10 w-10 ring-2 ring-orange-200 group-hover:ring-orange-300 transition-all">
              <AvatarFallback className="bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 font-semibold">
                {getInitials(task.assigneeDetails?.name || 'U')}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      ))}
    </div>
  );
};
