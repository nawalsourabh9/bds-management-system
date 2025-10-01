import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DocumentSelector } from './form/DocumentSelector';
import { useEmployees } from '@/pages/Users/hooks/useEmployees';
import { Task } from '@/types/task';
import { User, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DocumentData {
  selected: boolean;
  file: File | null;
  link: string;
  linkType: 'gdrive' | 'onedrive' | 'dropbox' | 'other';
}

interface DocumentUploads {
  sop: DocumentData;
  dataFormat: DocumentData;
  reportFormat: DocumentData;
  rulesAndProcedures: DocumentData;
}

interface ChildTaskEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}

const ChildTaskEditDialog: React.FC<ChildTaskEditDialogProps> = ({
  isOpen,
  onClose,
  task,
  onUpdate
}) => {
  const { employees, loading: employeesLoading } = useEmployees();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dueDate: null as Date | null,
    assignee: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent' | 'critical' | 'emergency',
    status: 'not-started' as 'not-started' | 'pending' | 'in-progress' | 'under-review' | 'on-hold' | 'blocked' | 'waiting-for-approval' | 'overdue' | 'completed' | 'cancelled',
    isCustomerRelated: false,
    customerName: '',
    attachmentsRequired: 'none' as 'none' | 'optional' | 'required',
    documents: {
      sop: { selected: false, file: null, link: '', linkType: 'other' as const },
      dataFormat: { selected: false, file: null, link: '', linkType: 'other' as const },
      reportFormat: { selected: false, file: null, link: '', linkType: 'other' as const },
      rulesAndProcedures: { selected: false, file: null, link: '', linkType: 'other' as const }
    } as DocumentUploads
  });

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        assignee: task.assignee || '',
        priority: task.priority || 'medium',
        status: task.status || 'not-started',
        isCustomerRelated: task.isCustomerRelated || false,
        customerName: task.customerName || '',
        attachmentsRequired: task.attachmentsRequired || 'none',
        documents: {
          sop: { selected: false, file: null, link: '', linkType: 'other' as const },
          dataFormat: { selected: false, file: null, link: '', linkType: 'other' as const },
          reportFormat: { selected: false, file: null, link: '', linkType: 'other' as const },
          rulesAndProcedures: { selected: false, file: null, link: '', linkType: 'other' as const }
        }
      });
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    setLoading(true);
    try {
      const updates: Partial<Task> = {
        dueDate: formData.dueDate?.toISOString().split('T')[0],
        assignee: formData.assignee,
        priority: formData.priority,
        status: formData.status,
        isCustomerRelated: formData.isCustomerRelated,
        customerName: formData.customerName,
        attachmentsRequired: formData.attachmentsRequired,
        // Note: Document uploads would need to be handled separately via file upload API
      };

      onUpdate(task.id, updates);
      onClose();
    } catch (error) {
      console.error('Error updating child task:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Edit Child Task
          </DialogTitle>
          <DialogDescription>
            Update this instance of the recurring task. Changes will only apply to this specific occurrence.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Title (Read-only) */}
          <div className="space-y-2">
            <Label>Task Title</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              {task.title}
            </div>
          </div>

          {/* Assignment & Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, dueDate: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Assignee *</Label>
              <Select 
                value={formData.assignee} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignee: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{employee.name}</span>
                          <span className="text-muted-foreground">({employee.employeeId || 'Not Set'})</span>
                        </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="waiting-for-approval">Waiting for Approval</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Documents - Only show if not 'none' */}
          {formData.attachmentsRequired !== 'none' && (
            <div className="space-y-4">
              <Label>Documents {formData.attachmentsRequired === 'required' && <span className="text-red-500">*</span>}</Label>
              <DocumentSelector
              documentUploads={formData.documents}
              onDocumentSelect={(docType, selected) => {
                setFormData(prev => ({
                  ...prev,
                  documents: {
                    ...prev.documents,
                    [docType]: {
                      ...prev.documents[docType],
                      selected
                    }
                  }
                }));
              }}
              onFileUpload={(docType, file) => {
                setFormData(prev => ({
                  ...prev,
                  documents: {
                    ...prev.documents,
                    [docType]: {
                      ...prev.documents[docType],
                      file
                    }
                  }
                }));
              }}
              onLinkUpdate={(docType, link, linkType) => {
                setFormData(prev => ({
                  ...prev,
                  documents: {
                    ...prev.documents,
                    [docType]: {
                      ...prev.documents[docType],
                      link,
                      linkType
                    }
                  }
                }));
              }}
            />
            </div>
          )}

          {/* Customer Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="customerRelated"
                checked={formData.isCustomerRelated}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, isCustomerRelated: !!checked }))
                }
              />
              <Label htmlFor="customerRelated">Customer Related Task</Label>
            </div>

            {formData.isCustomerRelated && (
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter customer name"
                />
              </div>
            )}
          </div>

          {/* Attachments Required */}
          <div className="space-y-2">
            <Label>Attachments Required</Label>
            <Select
              value={formData.attachmentsRequired}
              onValueChange={(value) => setFormData(prev => ({ ...prev, attachmentsRequired: value as 'none' | 'optional' | 'required' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="optional">Optional</SelectItem>
                <SelectItem value="required">Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.dueDate || !formData.assignee}>
              {loading ? 'Updating...' : 'Update Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChildTaskEditDialog;
