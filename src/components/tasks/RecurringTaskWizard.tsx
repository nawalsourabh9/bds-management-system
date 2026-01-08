import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useRecurringTasks, useChildTasks } from '@/hooks/use-recurring-tasks';
import { ChevronLeft, ChevronRight, Calendar, User, Clock } from 'lucide-react';

// Step 1: Parent Task Schema
const parentTaskSchema = z.object({
  title: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  recurring_frequency: z.enum(['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  department_id: z.string().min(1, 'Department is required'),
  is_customer_related: z.boolean().default(false),
  customer_name: z.string().optional(),
  attachments_required: z.boolean().default(false),
});

// Step 2: First Child Task Schema
const childTaskSchema = z.object({
  due_date: z.string().min(1, 'Due date is required'),
  assignee_id: z.string().min(1, 'Assignee is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type ParentTaskData = z.infer<typeof parentTaskSchema>;
type ChildTaskData = z.infer<typeof childTaskSchema>;

interface RecurringTaskWizardProps {
  onSuccess?: (parentId: string, childId: string) => void;
  onCancel?: () => void;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const RecurringTaskWizard: React.FC<RecurringTaskWizardProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [createdParentId, setCreatedParentId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { toast } = useToast();
  const { createParent, loading: parentLoading } = useRecurringTasks();
  const { createFirstChild, loading: childLoading } = useChildTasks();

  // Parent form
  const parentForm = useForm<ParentTaskData>({
    resolver: zodResolver(parentTaskSchema),
    defaultValues: {
      is_customer_related: false,
      attachments_required: false,
    },
  });

  // Child form
  const childForm = useForm<ChildTaskData>({
    resolver: zodResolver(childTaskSchema),
    defaultValues: {
      priority: 'medium',
    },
  });

  const isCustomerRelated = parentForm.watch('is_customer_related');

  React.useEffect(() => {
    // Fetch departments and users
    setDepartments([
      { id: '1', name: 'Quality Assurance' },
      { id: '2', name: 'Production' },
      { id: '3', name: 'Engineering' },
    ]);
    
    setUsers([
      { id: '1', name: 'John Smith', email: 'john@example.com' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com' },
      { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
    ]);
  }, []);

  const handleNextStep = async () => {
    if (currentStep === 1) {
      const isValid = await parentForm.trigger();
      if (isValid) {
        try {
          const parentData = parentForm.getValues();
          const result = await createParent(parentData);
          setCreatedParentId(result.data.id);
          setCurrentStep(2);
          
          toast({
            title: 'Step 1 Complete',
            description: 'Parent task created successfully!',
          });
        } catch (error) {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to create parent task',
            variant: 'destructive',
          });
        }
      }
    } else if (currentStep === 2) {
      const isValid = await childForm.trigger();
      if (isValid && createdParentId) {
        try {
          const childData = childForm.getValues();
          const result = await createFirstChild(createdParentId, childData);
          
          toast({
            title: 'Success!',
            description: 'Recurring task setup completed successfully!',
          });
          
          if (onSuccess) {
            onSuccess(createdParentId, result.data.id);
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to create first child task',
            variant: 'destructive',
          });
        }
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isLoading = parentLoading || childLoading;

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Calendar className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-lg font-semibold">Create Recurring Task Template</h3>
        <p className="text-gray-600">Define the recurring task that will generate instances automatically</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="title">Task Name *</Label>
          <Input
            id="title"
            {...parentForm.register('title')}
            placeholder="e.g., Daily Equipment Check"
          />
          {parentForm.formState.errors.title && (
            <p className="text-sm text-red-600">{parentForm.formState.errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="recurring_frequency">Recurring Frequency *</Label>
          <Select onValueChange={(value) => parentForm.setValue('recurring_frequency', value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {parentForm.formState.errors.recurring_frequency && (
            <p className="text-sm text-red-600">{parentForm.formState.errors.recurring_frequency.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...parentForm.register('description')}
          placeholder="Describe what this recurring task involves"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date *</Label>
          <Input
            id="start_date"
            type="date"
            {...parentForm.register('start_date')}
          />
          {parentForm.formState.errors.start_date && (
            <p className="text-sm text-red-600">{parentForm.formState.errors.start_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">End Date (Optional)</Label>
          <Input
            id="end_date"
            type="date"
            {...parentForm.register('end_date')}
          />
          <p className="text-xs text-gray-500">Leave empty for infinite recurring</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department_id">Department *</Label>
        <Select onValueChange={(value) => parentForm.setValue('department_id', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {parentForm.formState.errors.department_id && (
          <p className="text-sm text-red-600">{parentForm.formState.errors.department_id.message}</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_customer_related"
            checked={isCustomerRelated}
            onCheckedChange={(checked) => parentForm.setValue('is_customer_related', checked as boolean)}
          />
          <Label htmlFor="is_customer_related">Customer Related Task</Label>
        </div>

        {isCustomerRelated && (
          <div className="space-y-2">
            <Label htmlFor="customer_name">Customer Name</Label>
            <Input
              id="customer_name"
              {...parentForm.register('customer_name')}
              placeholder="Enter customer name"
            />
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="attachments_required"
            {...parentForm.register('attachments_required')}
          />
          <Label htmlFor="attachments_required">Attachments Required</Label>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <User className="mx-auto h-12 w-12 text-green-600 mb-4" />
        <h3 className="text-lg font-semibold">Create First Instance</h3>
        <p className="text-gray-600">Set up the first child task that will be created immediately</p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-800 mb-2">Parent Task Created:</h4>
        <p className="text-green-700">
          <strong>{parentForm.getValues('title')}</strong> - {parentForm.getValues('recurring_frequency')} recurring
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date *</Label>
          <Input
            id="due_date"
            type="date"
            {...childForm.register('due_date')}
          />
          {childForm.formState.errors.due_date && (
            <p className="text-sm text-red-600">{childForm.formState.errors.due_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority *</Label>
          <Select onValueChange={(value) => childForm.setValue('priority', value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {childForm.formState.errors.priority && (
            <p className="text-sm text-red-600">{childForm.formState.errors.priority.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignee_id">Assignee *</Label>
        <Select onValueChange={(value) => childForm.setValue('assignee_id', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select assignee" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {childForm.formState.errors.assignee_id && (
          <p className="text-sm text-red-600">{childForm.formState.errors.assignee_id.message}</p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">What happens next?</h4>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• First child task will be created immediately</li>
              <li>• When completed, next instance will auto-generate</li>
              <li>• Process continues until end date (or indefinitely)</li>
              <li>• You'll receive notifications for each step</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Create Recurring Task</CardTitle>
            <CardDescription>
              Step {currentStep} of 2: {currentStep === 1 ? 'Task Template' : 'First Instance'}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {[1, 2].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}

        <div className="flex justify-between pt-6">
          <div>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handlePrevStep} disabled={isLoading}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex space-x-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            
            {currentStep < 2 ? (
              <Button onClick={handleNextStep} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Next Step'}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleNextStep} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
