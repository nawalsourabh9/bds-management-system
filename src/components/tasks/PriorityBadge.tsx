
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Minus, Plus, Zap, Flame } from "lucide-react";

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical' | 'emergency';
}

const PriorityBadge = ({ priority }: PriorityBadgeProps) => {
  switch (priority) {
    case 'low':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center gap-1">
          <Minus className="h-3 w-3" /> Low
        </Badge>
      );
    case 'medium':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 flex items-center gap-1">
          <Plus className="h-3 w-3" /> Medium
        </Badge>
      );
    case 'high':
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> High
        </Badge>
      );
    case 'urgent':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Urgent
        </Badge>
      );
    case 'critical':
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 flex items-center gap-1">
          <Zap className="h-3 w-3" /> Critical
        </Badge>
      );
    case 'emergency':
      return (
        <Badge variant="outline" className="bg-red-200 text-red-900 flex items-center gap-1">
          <Flame className="h-3 w-3" /> Emergency
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700">
          {priority}
        </Badge>
      );
  }
};

export default PriorityBadge;
