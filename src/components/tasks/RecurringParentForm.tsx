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
import { useRecurringTasks } from '@/hooks/use-recurring-tasks';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const recurringParentSchema = z.object({
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

type RecurringParentFormData = z.infer<typeof recurringParentSchema>;

interface RecurringParentFormProps {
  onSuccess?: (parentId: string) => void;
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

export const RecurringParentForm: React.FC<RecurringParentFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [departments, setDepartments] = useState<any[]>([]);
  const { toast } = useToast();
  const { createParent, loading } = useRecurringTasks();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RecurringParentFormData>({
    resolver: zodResolver(recurringParentSchema),
    defaultValues: {
      is_customer_related: false,
      attachments_required: false,
    },
  });

  const isCustomerRelated = watch('is_customer_related');

  React.useEffect(() => {
    // Fetch departments (you might want to use a departments hook)
    // For now, using mock data
    setDepartments([
      { id: '1', name: 'Quality Assurance' },
      { id: '2', name: 'Production' },
      { id: '3', name: 'Engineering' },
    ]);
  }, []);

  const onSubmit = async (data: RecurringParentFormData) => {
    try {
      const result = await createParent(data);
      toast({
        title: 'Success',
        description: 'Recurring parent task created successfully!',
      });
      
      if (onSuccess) {
        onSuccess(result.data.id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create recurring parent task',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Recurring Task</CardTitle>
        <CardDescription>
          Create a parent task that will generate child instances automatically
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Task Name *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter recurring task name"
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurring_frequency">Recurring Frequency *</Label>
              <Select onValueChange={(value) => setValue('recurring_frequency', value as any)}>
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
              {errors.recurring_frequency && (
                <p className="text-sm text-red-600">{errors.recurring_frequency.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
              {errors.start_date && (
                <p className="text-sm text-red-600">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date (Optional)</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
              />
              <p className="text-xs text-gray-500">Leave empty for infinite recurring</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department_id">Department *</Label>
            <Select onValueChange={(value) => setValue('department_id', value)}>
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
            {errors.department_id && (
              <p className="text-sm text-red-600">{errors.department_id.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_customer_related"
                checked={isCustomerRelated}
                onCheckedChange={(checked) => setValue('is_customer_related', checked as boolean)}
              />
              <Label htmlFor="is_customer_related">Customer Related Task</Label>
            </div>

            {isCustomerRelated && (
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  id="customer_name"
                  {...register('customer_name')}
                  placeholder="Enter customer name"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="attachments_required"
                {...register('attachments_required')}
              />
              <Label htmlFor="attachments_required">Attachments Required</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Recurring Task'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
