
import React from "react";
import { Notification } from "@/hooks/use-notifications.tsx";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, CheckCircle2, Info, XCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
}) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    onMarkAsRead(notification.id);
    
    // If notification has a task_id, navigate to tasks page with task ID
    if (notification.task_id) {
      navigate(`/tasks?taskId=${notification.task_id}&filter=assigned`);
      return;
    }
    
    // Otherwise use actionUrl if available
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-start space-x-3 p-3 hover:bg-accent cursor-pointer border-b border-border last:border-none",
        !notification.is_read && "bg-accent/20"
      )}
    >
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium">{notification.title}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 pb-1">{notification.message}</p>
        {(notification.actionUrl || notification.task_id) && (
          <div className="flex items-center text-xs text-primary mt-1">
            <span>{notification.task_id ? 'View task' : 'View details'}</span>
            <ChevronRight className="h-3 w-3 ml-1" />
          </div>
        )}
      </div>
      {!notification.is_read && (
        <div className="h-2 w-2 rounded-full bg-primary" />
      )}
    </div>
  );
};
