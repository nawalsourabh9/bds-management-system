import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTaskUpdates } from '@/hooks/use-task-updates';
import { Loader2, Check, X } from 'lucide-react';

interface QuickUpdateDropdownProps {
  taskId: string;
  currentValue: string;
  field: 'status' | 'priority' | 'assignee';
  options: { value: string; label: string }[];
  onUpdate?: (newValue: string) => void;
}

export const QuickUpdateDropdown: React.FC<QuickUpdateDropdownProps> = ({
  taskId,
  currentValue,
  field,
  options,
  onUpdate,
}) => {
  const [selectedValue, setSelectedValue] = useState(currentValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();
  const { updateStatus: updateTaskStatus, updatePriority, updateAssignee, updating } = useTaskUpdates();

  const handleUpdate = async () => {
    if (selectedValue === currentValue) return;

    setIsUpdating(true);
    setUpdateStatus('idle');

    try {
      let result;
      switch (field) {
        case 'status':
          result = await updateTaskStatus(taskId, selectedValue);
          break;
        case 'priority':
          result = await updatePriority(taskId, selectedValue);
          break;
        case 'assignee':
          result = await updateAssignee(taskId, selectedValue);
          break;
        default:
          throw new Error('Invalid field');
      }

      setUpdateStatus('success');
      toast({
        title: 'Success',
        description: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`,
      });

      if (onUpdate) {
        onUpdate(selectedValue);
      }

      // Reset status after 2 seconds
      setTimeout(() => setUpdateStatus('idle'), 2000);
    } catch (error) {
      setUpdateStatus('error');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to update ${field}`,
        variant: 'destructive',
      });
      
      // Reset to original value on error
      setSelectedValue(currentValue);
      
      // Reset status after 3 seconds
      setTimeout(() => setUpdateStatus('idle'), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = () => {
    if (isUpdating || updating) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (updateStatus === 'success') {
      return <Check className="h-4 w-4 text-green-600" />;
    }
    if (updateStatus === 'error') {
      return <X className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getStatusColor = () => {
    if (updateStatus === 'success') return 'border-green-300 bg-green-50';
    if (updateStatus === 'error') return 'border-red-300 bg-red-50';
    return '';
  };

  return (
    <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
      <Select
        value={selectedValue}
        onValueChange={setSelectedValue}
        disabled={isUpdating || updating}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedValue !== currentValue && (
        <Button
          size="sm"
          onClick={handleUpdate}
          disabled={isUpdating || updating}
          className="h-8 px-3"
        >
          {getStatusIcon() || 'Update'}
        </Button>
      )}
    </div>
  );
};

// Status options
export const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Priority options
export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

// Assignee dropdown component
interface AssigneeDropdownProps {
  taskId: string;
  currentAssignee: string;
  users: { id: string; name: string; email: string }[];
  onUpdate?: (newAssignee: string) => void;
}

export const AssigneeDropdown: React.FC<AssigneeDropdownProps> = ({
  taskId,
  currentAssignee,
  users,
  onUpdate,
}) => {
  const [selectedAssignee, setSelectedAssignee] = useState(currentAssignee);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();
  const { updateAssignee, updating } = useTaskUpdates();

  const handleUpdate = async () => {
    if (selectedAssignee === currentAssignee) return;

    setIsUpdating(true);
    setUpdateStatus('idle');

    try {
      await updateAssignee(taskId, selectedAssignee);
      setUpdateStatus('success');
      
      toast({
        title: 'Success',
        description: 'Assignee updated successfully!',
      });

      if (onUpdate) {
        onUpdate(selectedAssignee);
      }

      setTimeout(() => setUpdateStatus('idle'), 2000);
    } catch (error) {
      setUpdateStatus('error');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update assignee',
        variant: 'destructive',
      });
      
      setSelectedAssignee(currentAssignee);
      setTimeout(() => setUpdateStatus('idle'), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = () => {
    if (isUpdating || updating) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (updateStatus === 'success') {
      return <Check className="h-4 w-4 text-green-600" />;
    }
    if (updateStatus === 'error') {
      return <X className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getStatusColor = () => {
    if (updateStatus === 'success') return 'border-green-300 bg-green-50';
    if (updateStatus === 'error') return 'border-red-300 bg-red-50';
    return '';
  };

  const getCurrentUser = () => {
    return users.find(user => user.id === selectedAssignee);
  };

  return (
    <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
      <Select
        value={selectedAssignee}
        onValueChange={setSelectedAssignee}
        disabled={isUpdating || updating}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue>
            {getCurrentUser()?.name || 'Select assignee'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedAssignee !== currentAssignee && (
        <Button
          size="sm"
          onClick={handleUpdate}
          disabled={isUpdating || updating}
          className="h-8 px-3"
        >
          {getStatusIcon() || 'Update'}
        </Button>
      )}
    </div>
  );
};
