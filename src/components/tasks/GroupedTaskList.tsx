import React, { useState } from 'react';
import { useGroupedTasks, GroupedTask, ChildTask } from '@/hooks/use-grouped-tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Calendar, User, FileText, AlertCircle, Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { RecurringTaskWizard } from './RecurringTaskWizard';
import ChildTaskEditDialog from './ChildTaskEditDialog';
import MainTaskEditDialog from './MainTaskEditDialog';
import { useAuth } from '@/hooks/use-auth';
import { fastapiService } from '@/services/fastapi-service';

interface GroupedTaskListProps {
  className?: string;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in-progress':
      return 'bg-blue-100 text-blue-800';
    case 'not-started':
      return 'bg-gray-100 text-gray-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'on-hold':
      return 'bg-orange-100 text-orange-800';
    case 'under-review':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const ChildTaskItem: React.FC<{ 
  child: ChildTask; 
  onStatusUpdate?: (taskId: string, status: string) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: ChildTask) => void;
  canDelete?: boolean;
}> = ({ child, onStatusUpdate, onDelete, onEdit, canDelete = false }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-blue-200">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            {child.title.split(' (')[0]} {/* Show only parent title, remove timestamp */}
          </span>
          <Badge className={getPriorityColor(child.priority)}>
            {child.priority}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          {child.title.split(' (')[1]?.replace(')', '')} {/* Show only the date part */}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {child.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Due: {format(new Date(child.due_date), 'MMM dd, yyyy')}
            </div>
          )}
          {child.assignee_first_name && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {child.assignee_first_name} {child.assignee_last_name}
            </div>
          )}
          {child.completed_date && (
            <div className="flex items-center gap-1 text-green-600">
              <AlertCircle className="w-3 h-3" />
              Completed: {format(new Date(child.completed_date), 'MMM dd, yyyy')}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onEdit && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onEdit(child)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        )}
        {child.status !== 'completed' && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onStatusUpdate?.(child.id, 'completed')}
          >
            Mark Complete
          </Button>
        )}
        {canDelete && (
          <Button 
            size="sm" 
            variant="destructive"
            onClick={() => onDelete?.(child.id)}
          >
            Delete
          </Button>
        )}
        <Badge className={getStatusColor(child.status)}>
          {child.status.replace('-', ' ')}
        </Badge>
      </div>
    </div>
  );
};

const ParentTaskCard: React.FC<{ 
  task: GroupedTask; 
  onStatusUpdate?: (taskId: string, status: string) => void;
  onDeleteChild?: (taskId: string) => void;
  onDeleteParent?: (taskId: string) => void;
  onEditChild?: (task: ChildTask) => void;
  onEditParent?: (task: GroupedTask) => void;
  currentUserId?: string;
}> = ({ task, onStatusUpdate, onDeleteChild, onDeleteParent, onEditChild, onEditParent, currentUserId }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const progressPercentage = task.child_count > 0 
    ? Math.round((task.completed_children / task.child_count) * 100) 
    : 0;

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{task.parent_title}</CardTitle>
              <Badge className={getStatusColor(task.parent_status)}>
                {task.parent_status.replace('-', ' ')}
              </Badge>
              <Badge className={getPriorityColor(task.parent_priority)}>
                {task.parent_priority}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{task.parent_description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {task.recurring_frequency} • {task.department_name}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {task.first_name} {task.last_name}
              </div>
              {task.attachments_required && (
                <div className="flex items-center gap-1 text-blue-600">
                  <FileText className="w-4 h-4" />
                  Attachments Required
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEditParent && currentUserId === task.created_by && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEditParent(task)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
            {task.child_count === 0 && currentUserId === task.created_by && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => onDeleteParent?.(task.parent_id)}
              >
                Delete Parent
              </Button>
            )}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
        
        {/* Progress Summary */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{task.completed_children}/{task.child_count} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              {task.completed_children} completed
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              {task.in_progress_children} in progress
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              {task.pending_children} pending
            </span>
          </div>
        </div>
      </CardHeader>
      
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Child Tasks ({task.child_count})</h4>
              {task.children.length > 0 ? (
                <div className="space-y-2">
                  {task.children.map((child) => (
                    <ChildTaskItem 
                      key={child.id} 
                      child={child} 
                      onStatusUpdate={onStatusUpdate}
                      onDelete={onDeleteChild}
                      onEdit={onEditChild}
                      canDelete={currentUserId === task.created_by} // Only creator can delete
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No child tasks created yet</p>
                  <p className="text-xs">Create the first instance to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export const GroupedTaskList: React.FC<GroupedTaskListProps> = ({ className }) => {
  const { groupedTasks, loading, error, totalParents, refreshGroupedTasks } = useGroupedTasks();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isChildEditOpen, setIsChildEditOpen] = useState(false);
  const [isParentEditOpen, setIsParentEditOpen] = useState(false);
  const [selectedChildTask, setSelectedChildTask] = useState<ChildTask | null>(null);
  const [selectedParentTask, setSelectedParentTask] = useState<GroupedTask | null>(null);
  const { employee } = useAuth();

  const handleStatusUpdate = async (taskId: string, status: string) => {
    try {
      // Use the API service to update task status
      await fastapiService.updateTaskStatus(taskId, status);
      
      // Refresh the grouped tasks to show updated data
      refreshGroupedTasks();
      
      // If the task was marked as completed, trigger the next child generation
      if (status === 'completed') {
        // The backend automatically generates the next child when a child is completed
        // We just need to refresh the data after a short delay
        setTimeout(() => {
          refreshGroupedTasks();
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDeleteChild = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this child task?')) return;
    
    try {
      await fastapiService.deleteTask(taskId);
      refreshGroupedTasks();
    } catch (error) {
      console.error('Error deleting child task:', error);
    }
  };

  const handleDeleteParent = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this parent task? This action cannot be undone.')) return;
    
    try {
      await fastapiService.deleteTask(taskId);
      refreshGroupedTasks();
    } catch (error) {
      console.error('Error deleting parent task:', error);
    }
  };

  const handleEditChild = (task: ChildTask) => {
    setSelectedChildTask(task);
    setIsChildEditOpen(true);
  };

  const handleEditParent = (task: GroupedTask) => {
    setSelectedParentTask(task);
    setIsParentEditOpen(true);
  };

  const handleUpdateChild = async (taskId: string, updates: Partial<any>) => {
    try {
      await fastapiService.updateTask(taskId, updates);
      refreshGroupedTasks();
      setIsChildEditOpen(false);
      setSelectedChildTask(null);
    } catch (error) {
      console.error('Error updating child task:', error);
    }
  };

  const handleUpdateParent = async (taskId: string, updates: Partial<any>) => {
    try {
      await fastapiService.updateTask(taskId, updates);
      refreshGroupedTasks();
      setIsParentEditOpen(false);
      setSelectedParentTask(null);
    } catch (error) {
      console.error('Error updating parent task:', error);
    }
  };

  // Convert ChildTask to Task for the edit dialog
  const convertChildTaskToTask = (childTask: ChildTask): any => {
    return {
      id: childTask.id,
      title: childTask.title,
      description: '',
      department: '',
      assignee: '', // Will need to be set properly based on available data
      dueDate: childTask.due_date,
      isCustomerRelated: false,
      customerName: '',
      status: childTask.status,
      priority: childTask.priority
    };
  };

  // Convert GroupedTask to Task for the edit dialog
  const convertGroupedTaskToTask = (groupedTask: GroupedTask): any => {
    return {
      id: groupedTask.parent_id,
      title: groupedTask.parent_title,
      description: groupedTask.parent_description || '',
      department: groupedTask.department_name || '',
      assignee: '',
      dueDate: '',
      startDate: '',
      endDate: '',
      recurringFrequency: groupedTask.recurring_frequency,
      isRecurring: true,
      isCustomerRelated: false,
      customerName: '',
      status: groupedTask.parent_status,
      priority: groupedTask.parent_priority
    };
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Recurring Tasks</h2>
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Recurring Tasks</h2>
          <Button onClick={refreshGroupedTasks} variant="outline" size="sm">
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-6">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-red-600 mb-2">Failed to load grouped tasks</p>
            <p className="text-sm text-gray-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Recurring Tasks</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {totalParents} parent task{totalParents !== 1 ? 's' : ''}
          </span>
          <Button onClick={() => setIsWizardOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Recurring Task
          </Button>
          <Button onClick={refreshGroupedTasks} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>
      
      {groupedTasks.length > 0 ? (
        <div className="space-y-4">
          {groupedTasks.map((task) => (
            <ParentTaskCard 
              key={task.parent_id} 
              task={task} 
              onStatusUpdate={handleStatusUpdate}
              onDeleteChild={handleDeleteChild}
              onDeleteParent={handleDeleteParent}
              onEditChild={handleEditChild}
              onEditParent={handleEditParent}
              currentUserId={employee?.id}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recurring Tasks</h3>
            <p className="text-gray-500 mb-4">
              Create your first recurring parent task to get started with automated task generation.
            </p>
            <Button onClick={() => setIsWizardOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Recurring Task
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Recurring Task Wizard */}
      {isWizardOpen && (
        <RecurringTaskWizard 
          onCancel={() => setIsWizardOpen(false)}
          onSuccess={() => {
            setIsWizardOpen(false);
            refreshGroupedTasks();
          }}
        />
      )}

      {/* Child Task Edit Dialog */}
      <ChildTaskEditDialog
        isOpen={isChildEditOpen}
        onClose={() => {
          setIsChildEditOpen(false);
          setSelectedChildTask(null);
        }}
        task={selectedChildTask ? convertChildTaskToTask(selectedChildTask) : null}
        onUpdate={handleUpdateChild}
      />

      {/* Parent Task Edit Dialog */}
      <MainTaskEditDialog
        isOpen={isParentEditOpen}
        onClose={() => {
          setIsParentEditOpen(false);
          setSelectedParentTask(null);
        }}
        task={selectedParentTask ? convertGroupedTaskToTask(selectedParentTask) : null}
        onUpdate={handleUpdateParent}
      />
    </div>
  );
};

export default GroupedTaskList;

