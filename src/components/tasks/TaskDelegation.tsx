import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Task, Delegation } from '@/types/task';
import { fastapiService } from '@/services/fastapi-service';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, User, Users, UserCheck } from 'lucide-react';

interface TaskDelegationProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onDelegated?: () => void;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department_name?: string;
  position_name?: string;
}

const TaskDelegation: React.FC<TaskDelegationProps> = ({ isOpen, onClose, task, onDelegated }) => {
  const [delegationType, setDelegationType] = useState<'system' | 'offline'>('system');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [offlineName, setOfflineName] = useState('');
  const [offlineDepartment, setOfflineDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [delegations, setDelegations] = useState<Delegation[]>([]);

  useEffect(() => {
    if (isOpen && task) {
      fetchUsers();
      fetchDelegations();
      // Reset form
      setDelegationType('system');
      setSelectedUserId('');
      setOfflineName('');
      setOfflineDepartment('');
      setNotes('');
    }
  }, [isOpen, task]);

  const fetchUsers = async () => {
    try {
      const response = await fastapiService.getUsers();
      const usersData = response.users || [];
      setUsers(usersData.filter((u: any) => u.is_active));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    }
  };

  const fetchDelegations = async () => {
    if (!task) return;
    try {
      const response = await fastapiService.getTaskDelegations(task.id);
      setDelegations(response.delegations || []);
    } catch (error) {
      console.error('Error fetching delegations:', error);
    }
  };

  const handleSubmit = async () => {
    if (!task) return;

    // Validation
    if (delegationType === 'system' && !selectedUserId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a user to delegate to',
        variant: 'destructive',
      });
      return;
    }

    if (delegationType === 'offline' && (!offlineName || !offlineDepartment)) {
      toast({
        title: 'Validation Error',
        description: 'Please provide both name and department for offline worker',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await fastapiService.delegateTask(task.id, {
        delegated_to_user_id: delegationType === 'system' ? selectedUserId : null,
        offline_assignee_name: delegationType === 'offline' ? offlineName : null,
        offline_assignee_department: delegationType === 'offline' ? offlineDepartment : null,
        notes: notes || null,
      });

      toast({
        title: 'Success',
        description: 'Task delegated successfully',
      });

      onDelegated?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delegate task',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDelegationChain = () => {
    if (!task) return [];
    
    const chain: Array<{ name: string; type: 'system' | 'offline'; level: number }> = [];
    
    // Add original assignee
    if (task.assigneeDetails?.name) {
      chain.push({
        name: task.assigneeDetails.name,
        type: 'system',
        level: 0,
      });
    }
    
    // Add delegations
    delegations
      .filter(d => d.isActive)
      .sort((a, b) => a.delegationLevel - b.delegationLevel)
      .forEach(delegation => {
        if (delegation.delegatedToUserId && delegation.delegatedToUserName) {
          chain.push({
            name: delegation.delegatedToUserName,
            type: 'system',
            level: delegation.delegationLevel,
          });
        } else if (delegation.offlineAssigneeName) {
          chain.push({
            name: `${delegation.offlineAssigneeName} (${delegation.offlineAssigneeDepartment})`,
            type: 'offline',
            level: delegation.delegationLevel,
          });
        }
      });
    
    return chain;
  };

  const delegationChain = getDelegationChain();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delegate Task</DialogTitle>
          <DialogDescription>
            Delegate this task to another system user or an offline/shop floor worker
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Delegation Chain Display */}
          {delegationChain.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Current Delegation Chain</Label>
              <div className="flex items-center gap-2 flex-wrap p-3 bg-muted rounded-lg">
                {delegationChain.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.type === 'system' ? 'default' : 'secondary'}>
                        {item.type === 'system' ? (
                          <User className="w-3 h-3 mr-1" />
                        ) : (
                          <Users className="w-3 h-3 mr-1" />
                        )}
                        {item.name}
                      </Badge>
                      {item.type === 'offline' && (
                        <span className="text-xs text-muted-foreground">(Offline Worker)</span>
                      )}
                    </div>
                    {index < delegationChain.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Delegation Type Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Delegate To</Label>
            <RadioGroup value={delegationType} onValueChange={(value) => setDelegationType(value as 'system' | 'offline')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="font-normal cursor-pointer">
                  System User (Manager, Supervisor, or User)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="offline" id="offline" />
                <Label htmlFor="offline" className="font-normal cursor-pointer">
                  Offline/Shop Floor Worker (Internal but not in system)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* System User Selection */}
          {delegationType === 'system' && (
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {user.first_name} {user.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user.role} {user.department_name ? `• ${user.department_name}` : ''}
                          {user.position_name ? ` • ${user.position_name}` : ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Offline Worker Inputs */}
          {delegationType === 'offline' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="offline-name">Worker Name</Label>
                <Input
                  id="offline-name"
                  placeholder="Enter worker name"
                  value={offlineName}
                  onChange={(e) => setOfflineName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offline-department">Department/Role</Label>
                <Input
                  id="offline-department"
                  placeholder="Enter department or role"
                  value={offlineDepartment}
                  onChange={(e) => setOfflineDepartment(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Internal organization member who works offline or on shop floor
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this delegation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Delegating...' : 'Delegate Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDelegation;
