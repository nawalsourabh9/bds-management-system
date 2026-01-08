
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, HelpCircle, Pause, XCircle, Shield, Eye, AlertTriangle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Completed
        </Badge>
      );
    case 'in-progress':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 flex items-center gap-1">
          <Clock className="h-3 w-3" /> In Progress
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 flex items-center gap-1">
          <HelpCircle className="h-3 w-3" /> Pending
        </Badge>
      );
    case 'not-started':
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 flex items-center gap-1">
          <HelpCircle className="h-3 w-3" /> Not Started
        </Badge>
      );
    case 'under-review':
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 flex items-center gap-1">
          <Eye className="h-3 w-3" /> Under Review
        </Badge>
      );
    case 'on-hold':
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 flex items-center gap-1">
          <Pause className="h-3 w-3" /> On Hold
        </Badge>
      );
    case 'overdue':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Overdue
        </Badge>
      );
    case 'blocked':
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 flex items-center gap-1">
          <Shield className="h-3 w-3" /> Blocked
        </Badge>
      );
    case 'waiting-for-approval':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Waiting for Approval
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700">
          {status}
        </Badge>
      );
  }
};

export default StatusBadge;
