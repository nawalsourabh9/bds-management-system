
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, HelpCircle, Pause, XCircle, Shield, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface StatusUpdateDialogProps {
  taskId: string;
  currentStatus: string;
  currentPriority: string;
  onStatusUpdate: (taskId: string, newStatus: string, newPriority: string, comments: string) => Promise<void>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const statusOptions = [
  { value: 'not-started', label: 'Not Started', icon: HelpCircle, color: 'bg-gray-50 text-gray-700' },
  { value: 'pending', label: 'Pending', icon: HelpCircle, color: 'bg-blue-50 text-blue-700' },
  { value: 'in-progress', label: 'In Progress', icon: Clock, color: 'bg-amber-50 text-amber-700' },
  { value: 'under-review', label: 'Under Review', icon: Eye, color: 'bg-purple-50 text-purple-700' },
  { value: 'on-hold', label: 'On Hold', icon: Pause, color: 'bg-orange-50 text-orange-700' },
  { value: 'waiting-for-approval', label: 'Waiting for Approval', icon: AlertTriangle, color: 'bg-yellow-50 text-yellow-700' },
  { value: 'blocked', label: 'Blocked', icon: Shield, color: 'bg-red-100 text-red-800' },
  { value: 'overdue', label: 'Overdue', icon: AlertCircle, color: 'bg-red-50 text-red-700' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-50 text-green-700' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'bg-gray-100 text-gray-800' },
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-green-50 text-green-700' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-50 text-amber-700' },
  { value: 'high', label: 'High', color: 'bg-orange-50 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-50 text-red-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
  { value: 'emergency', label: 'Emergency', color: 'bg-red-200 text-red-900' },
];

const StatusUpdateDialog: React.FC<StatusUpdateDialogProps> = ({
  taskId,
  currentStatus,
  currentPriority,
  onStatusUpdate,
  trigger,
  open: externalOpen,
  onOpenChange
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [newPriority, setNewPriority] = useState(currentPriority);
  const [comments, setComments] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (newStatus === currentStatus && newPriority === currentPriority && !comments.trim()) {
      toast.info("No changes made");
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusUpdate(taskId, newStatus, newPriority, comments);
      toast.success("Task status updated successfully");
      setOpen(false);
      setComments("");
    } catch (error) {
      toast.error("Failed to update task status");
      console.error("Status update error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const statusOption = statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.icon : HelpCircle;
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.color : 'bg-gray-50 text-gray-700';
  };

  const getPriorityColor = (priority: string) => {
    const priorityOption = priorityOptions.find(option => option.value === priority);
    return priorityOption ? priorityOption.color : 'bg-gray-50 text-gray-700';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            Update Status
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Task Status</DialogTitle>
          <DialogDescription>
            Update the status and priority of this task. You can also add comments to explain the change.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Status Display */}
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getStatusColor(currentStatus)}>
                {React.createElement(getStatusIcon(currentStatus), { className: "h-3 w-3" })}
                {statusOptions.find(option => option.value === currentStatus)?.label || currentStatus}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(currentPriority)}>
                {priorityOptions.find(option => option.value === currentPriority)?.label || currentPriority}
              </Badge>
            </div>
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {React.createElement(option.icon, { className: "h-4 w-4" })}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New Priority Selection */}
          <div className="space-y-2">
            <Label htmlFor="priority">New Priority</Label>
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select new priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={option.color}>
                        {option.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Comments (Optional)</Label>
            <Textarea
              id="comments"
              placeholder="Add comments about this status change..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {(newStatus !== currentStatus || newPriority !== currentPriority) && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(newStatus)}>
                  {React.createElement(getStatusIcon(newStatus), { className: "h-3 w-3" })}
                  {statusOptions.find(option => option.value === newStatus)?.label || newStatus}
                </Badge>
                <Badge variant="outline" className={getPriorityColor(newPriority)}>
                  {priorityOptions.find(option => option.value === newPriority)?.label || newPriority}
                </Badge>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StatusUpdateDialog;
