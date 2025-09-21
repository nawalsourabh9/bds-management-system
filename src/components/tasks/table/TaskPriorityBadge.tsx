
import React from "react";
import { Badge } from "@/components/ui/badge";

interface TaskPriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical' | 'emergency';
}

export const TaskPriorityBadge: React.FC<TaskPriorityBadgeProps> = ({ priority }) => {
  switch (priority) {
    case 'low':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">Low</Badge>;
    case 'medium':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700">Medium</Badge>;
    case 'high':
      return <Badge variant="outline" className="bg-red-50 text-red-700">High</Badge>;
    case 'urgent':
      return <Badge variant="outline" className="bg-orange-50 text-orange-700">Urgent</Badge>;
    case 'critical':
      return <Badge variant="outline" className="bg-red-100 text-red-800">Critical</Badge>;
    case 'emergency':
      return <Badge variant="outline" className="bg-red-200 text-red-900">Emergency</Badge>;
  }
};
