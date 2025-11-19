
import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, CheckCircle, AlertCircle, HelpCircle, Pause, XCircle, Shield, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface StatusUpdateDialogProps {
  taskId: string;
  currentStatus: string;
  currentPriority: string;
  dueDate?: string;
  isRecurring?: boolean;
  parentTaskId?: string;
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
  dueDate,
  isRecurring,
  parentTaskId,
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{status: string, priority: string, comments: string} | null>(null);

  // Check if completing task far in advance
  const earlyCompletionWarning = useMemo(() => {
    if (newStatus !== 'completed' || !dueDate) return null;
    
    try {
      const due = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 0) {
        const isRecurringTask = isRecurring || !!parentTaskId;
        // For recurring tasks, allow up to 1 day early without confirmation
        // For non-recurring tasks, require confirmation if more than 1 day early
        const requiresConfirmation = isRecurringTask ? daysDiff > 1 : daysDiff > 1;
        
        if (requiresConfirmation) {
          return {
            daysEarly: daysDiff,
            dueDateFormatted: format(due, 'MMMM dd, yyyy'),
            requiresConfirmation: true,
            isRecurring: isRecurringTask
          };
        } else if (daysDiff === 1 && isRecurringTask) {
          return {
            daysEarly: 1,
            dueDateFormatted: format(due, 'MMMM dd, yyyy'),
            requiresConfirmation: false,
            isRecurring: true
          };
        }
      }
    } catch (e) {
      console.error("Error calculating early completion:", e);
    }
    
    return null;
  }, [newStatus, dueDate, isRecurring, parentTaskId]);

  const handleUpdate = async () => {
    if (newStatus === currentStatus && newPriority === currentPriority && !comments.trim()) {
      toast.info("No changes made");
      return;
    }

    // Check if we need confirmation for early completion
    if (earlyCompletionWarning?.requiresConfirmation) {
      setPendingUpdate({ status: newStatus, priority: newPriority, comments });
      setShowConfirmDialog(true);
      return;
    }

    await performUpdate(newStatus, newPriority, comments);
  };

  const performUpdate = async (status: string, priority: string, comments: string) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(taskId, status, priority, comments);
      toast.success("Task status updated successfully");
      setOpen(false);
      setComments("");
      setShowConfirmDialog(false);
      setPendingUpdate(null);
    } catch (error) {
      toast.error("Failed to update task status");
      console.error("Status update error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmEarlyCompletion = () => {
    if (pendingUpdate) {
      performUpdate(pendingUpdate.status, pendingUpdate.priority, pendingUpdate.comments);
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

          {/* Early Completion Warning */}
          {earlyCompletionWarning && !earlyCompletionWarning.requiresConfirmation && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Early Completion</AlertTitle>
              <AlertDescription>
                {earlyCompletionWarning.isRecurring 
                  ? `This recurring task is being completed early. Next instance will be due on ${earlyCompletionWarning.dueDateFormatted}.`
                  : `This task is being completed ${earlyCompletionWarning.daysEarly} day(s) before its due date (${earlyCompletionWarning.dueDateFormatted}).`}
              </AlertDescription>
            </Alert>
          )}

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
            <Button variant="outline" onClick={() => {
              setOpen(false);
              setShowConfirmDialog(false);
              setPendingUpdate(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
          </div>

          {/* Confirmation Dialog for Early Completion */}
          <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Complete Task Early?</AlertDialogTitle>
                <AlertDialogDescription>
                  {earlyCompletionWarning && (
                    <div className="mt-4 space-y-2">
                      <p>
                        This task is due on <strong>{earlyCompletionWarning.dueDateFormatted}</strong>, 
                        which is <strong>{earlyCompletionWarning.daysEarly} day(s)</strong> from now.
                      </p>
                      {earlyCompletionWarning.isRecurring ? (
                        <p className="text-sm text-muted-foreground">
                          For recurring tasks, the next instance will be generated based on the original due date.
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Are you sure you want to mark this task as completed now?
                        </p>
                      )}
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingUpdate(null);
                }}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmEarlyCompletion} disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Yes, Complete Now"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StatusUpdateDialog;
