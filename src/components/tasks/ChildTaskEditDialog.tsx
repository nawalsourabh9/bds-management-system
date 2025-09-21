import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentSelector } from './form/DocumentSelector';
import { useEmployees } from '@/pages/Users/hooks/useEmployees';
import { Task } from '@/types/task';
import { User, Calendar } from 'lucide-react';

interface DocumentUploads {
  sop: {
    selected: boolean;
    file: File | null;
  };
  dataFormat: {
    selected: boolean;
    file: File | null;
  };
  reportFormat: {
    selected: boolean;
    file: File | null;
  };
  rulesAndProcedures: {
    selected: boolean;
    file: File | null;
  };
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
  const [formData, setFormData] = useState({
    dueDate: '',
    assignee: '',
    isCustomerRelated: false,
    customerName: '',
    documents: {
      sop: { selected: false, file: null },
      dataFormat: { selected: false, file: null },
      reportFormat: { selected: false, file: null },
      rulesAndProcedures: { selected: false, file: null }
    } as DocumentUploads
  });

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        assignee: task.assignee || '',
        isCustomerRelated: task.isCustomerRelated || false,
        customerName: task.customerName || '',
        documents: {
          sop: { selected: false, file: null },
          dataFormat: { selected: false, file: null },
          reportFormat: { selected: false, file: null },
          rulesAndProcedures: { selected: false, file: null }
        }
      });
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    const updates: Partial<Task> = {
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      assignee: formData.assignee,
      isCustomerRelated: formData.isCustomerRelated,
      customerName: formData.customerName,
      // Note: Document uploads would need to be handled separately via file upload API
    };

    onUpdate(task.id, updates);
    onClose();
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Edit Child Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Title (Read-only) */}
          <div className="space-y-2">
            <Label>Task Title</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              {task.title}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              required
            />
          </div>

          {/* Assignee */}
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
                {employees.map(employee => (
                  <SelectItem key={employee.id} value={employee.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{employee.first_name} {employee.last_name}</span>
                      <span className="text-muted-foreground">({employee.employee_id || 'Not Set'})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Documents */}
          <div className="space-y-2">
            <Label>Documents</Label>
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
            />
          </div>

          {/* Customer Related */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="customerRelated"
                checked={formData.isCustomerRelated}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, isCustomerRelated: !!checked }))
                }
              />
              <Label htmlFor="customerRelated">Customer Related</Label>
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

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.dueDate || !formData.assignee}>
              Update Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChildTaskEditDialog;
