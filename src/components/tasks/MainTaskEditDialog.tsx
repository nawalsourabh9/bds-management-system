import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentSelector } from './form/DocumentSelector';
import { Task } from '@/types/task';
import { Calendar, Clock, Repeat } from 'lucide-react';

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

interface MainTaskEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}

const MainTaskEditDialog: React.FC<MainTaskEditDialogProps> = ({
  isOpen,
  onClose,
  task,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    frequency: '',
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
        title: task.title || '',
        startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
        endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
        frequency: task.recurringFrequency || '',
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
      title: formData.title,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      recurringFrequency: formData.frequency,
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
            <Repeat className="h-5 w-5" />
            Edit Main Recurring Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Start Date *
            </Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              required
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="endDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              End Date *
            </Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              required
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Frequency *
            </Label>
            <Select 
              value={formData.frequency} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
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
            <Button type="submit" disabled={!formData.title || !formData.startDate || !formData.endDate || !formData.frequency}>
              Update Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MainTaskEditDialog;
