
import React from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationItem } from "./NotificationItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

export const NotificationsList: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead, clearAllNotifications, isLoading } = useNotifications();

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Loading notifications...</p>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={markAllAsRead}
          className="text-xs"
        >
          Mark all as read
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllNotifications}
          className="text-xs text-red-500 hover:text-red-600"
        >
          <Trash2 className="h-3 w-3 mr-1" /> 
          Clear all
        </Button>
      </div>
      <ScrollArea className="h-[400px]">
        <div className="divide-y divide-border">
          {notifications?.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
