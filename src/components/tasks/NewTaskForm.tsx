import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ArrowRight, ArrowLeft, User, Building, Users } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DocumentSelector } from "./form/DocumentSelector";
import { fastapiService } from "@/services/fastapi-service";
import { toast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  name: string;
  email: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  department_name?: string;
  department_id?: string;
  position_name?: string;
  reports_to_name?: string;
  sub_department_name?: string;
}

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

interface TaskFormData {
  title: string;
  startDate?: Date;
  endDate?: Date;
  dueDate?: Date;
  frequency?: string;
  assignee: string;
  department: string;
  subDepartment: string;
  position: string;
  reportsTo: string;
  // Parent-level data (inherited by all children)
  parentDocuments: DocumentUploads;
  parentIsCustomerRelated: boolean;
  parentCustomerName: string;
  // Child-level data (can override parent defaults)
  childDocuments: DocumentUploads;
  childIsCustomerRelated: boolean;
  childCustomerName: string;
  attachmentsRequired: 'none' | 'optional' | 'required';
}

interface NewTaskFormProps {
  taskType: 'one-time' | 'recurring';
  onSubmit: (taskData: any) => void;
  onCancel: () => void;
}

const NewTaskForm: React.FC<NewTaskFormProps> = ({ taskType, onSubmit, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    assignee: '',
    department: '',
    subDepartment: '',
    position: '',
    reportsTo: '',
    // Parent-level data (defaults for all children)
    parentDocuments: {
      sop: { selected: false, file: null, link: '', linkType: 'other' as const },
      dataFormat: { selected: false, file: null, link: '', linkType: 'other' as const },
      reportFormat: { selected: false, file: null, link: '', linkType: 'other' as const },
      rulesAndProcedures: { selected: false, file: null, link: '', linkType: 'other' as const }
    },
    parentIsCustomerRelated: false,
    parentCustomerName: '',
    // Child-level data (can override parent defaults)
    childDocuments: {
      sop: { selected: false, file: null, link: '', linkType: 'other' as const },
      dataFormat: { selected: false, file: null, link: '', linkType: 'other' as const },
      reportFormat: { selected: false, file: null, link: '', linkType: 'other' as const },
      rulesAndProcedures: { selected: false, file: null, link: '', linkType: 'other' as const }
    },
    childIsCustomerRelated: false,
    childCustomerName: '',
    attachmentsRequired: 'none' as 'none' | 'optional' | 'required'
  });

  const maxSteps = taskType === 'recurring' ? 2 : 1;

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fastapiService.getUsers();
      setEmployees(response.users || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof TaskFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDocumentLinkUpdate = (docType: "sop" | "dataFormat" | "reportFormat" | "rulesAndProcedures", link: string, linkType: string, isParent: boolean = true) => {
    const docField = isParent ? 'parentDocuments' : 'childDocuments';
    setFormData(prev => ({
      ...prev,
      [docField]: {
        ...prev[docField],
        [docType]: {
          ...prev[docField][docType],
          link,
          linkType: linkType as 'gdrive' | 'onedrive' | 'dropbox' | 'other'
        }
      }
    }));
  };

  const handleAssigneeChange = (assigneeId: string) => {
    const selectedEmployee = employees.find(emp => emp.id === assigneeId);
    if (selectedEmployee) {
      setFormData(prev => ({
        ...prev,
        assignee: assigneeId,
        department: selectedEmployee.department_id || '', // Use department_id instead of name
        subDepartment: selectedEmployee.sub_department_name || '',
        position: selectedEmployee.position_name || '',
        reportsTo: selectedEmployee.reports_to_name || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        assignee: assigneeId,
        department: '',
        subDepartment: '',
        position: '',
        reportsTo: ''
      }));
    }
  };

  const handleNext = () => {
    if (currentStep < maxSteps) {
      setCurrentStep(currentStep + 1);
      // Auto-scroll to top with smooth animation
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Auto-scroll to top with smooth animation
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validate document requirements
      if (formData.attachmentsRequired === 'required') {
        const hasParentDocuments = Object.values(formData.parentDocuments).some(doc => doc.selected && (doc.file || doc.link));
        const hasChildDocuments = Object.values(formData.childDocuments).some(doc => doc.selected && (doc.file || doc.link));
        
        if (!hasParentDocuments && !hasChildDocuments) {
          toast({
            title: "Document Required",
            description: "At least one document must be uploaded when 'Required' is selected.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }

      // Find the selected employee to get their department information
      const selectedEmployee = employees.find(emp => emp.id === formData.assignee);
      
      // Create payload for backend API
      const taskPayload = {
        title: formData.title,
        description: `${taskType === 'recurring' ? 'Recurring' : 'One-time'} task: ${formData.title}`,
        department: selectedEmployee?.department_name || 'Quality',
        priority: 'medium',
        status: 'not-started',
        is_recurring: taskType === 'recurring',
        recurring_frequency: taskType === 'recurring' ? formData.frequency : undefined,
        start_date: taskType === 'recurring' ? formData.startDate?.toISOString().split('T')[0] : undefined,
        end_date: taskType === 'recurring' ? formData.endDate?.toISOString().split('T')[0] : undefined,
        
        // Parent-level data (stored in parent task for inheritance)
        is_customer_related: taskType === 'recurring' ? formData.parentIsCustomerRelated : formData.childIsCustomerRelated,
        customer_name: taskType === 'recurring' ? formData.parentCustomerName : formData.childCustomerName,
        attachments_required: formData.attachmentsRequired,
      };
      
      // Add assignee and due_date based on task type
      if (taskType === 'one-time') {
        taskPayload.assignee = formData.assignee;
        taskPayload.due_date = formData.dueDate?.toISOString().split('T')[0];
      } else if (taskType === 'recurring') {
        // For recurring tasks, send child instance data
        taskPayload.assignee = formData.assignee;
        taskPayload.due_date = formData.dueDate?.toISOString().split('T')[0];
        taskPayload.child_customer_name = formData.childCustomerName || null;
        taskPayload.child_customer_email = null;
        taskPayload.child_is_customer_related = formData.childIsCustomerRelated;
        taskPayload.child_attachments_required = formData.attachmentsRequired;
      }
      
      console.log('NewTaskForm: Task payload being submitted:', taskPayload);

      onSubmit(taskPayload);
    } catch (error) {
      console.error('Error submitting task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    if (currentStep === 1) {
      if (taskType === 'one-time') {
        return formData.title && formData.dueDate && formData.assignee;
      } else {
        return formData.title && formData.startDate && formData.endDate && formData.frequency;
      }
    }
    if (currentStep === 2) {
      return formData.assignee && formData.dueDate;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      {maxSteps > 1 && (
        <div className="flex items-center justify-center space-x-4 mb-6">
          {Array.from({ length: maxSteps }, (_, i) => (
            <div key={i} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep > i + 1 ? "bg-green-500 text-white" :
                currentStep === i + 1 ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
              )}>
                {i + 1}
              </div>
              {i < maxSteps - 1 && (
                <div className={cn(
                  "w-16 h-1 mx-2",
                  currentStep > i + 1 ? "bg-green-500" : "bg-gray-200"
                )} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
          <div className="text-center">
            <h3 className="text-lg font-semibold">
              {taskType === 'one-time' ? 'Create One-Time Task' : 'Basic Task Information'}
            </h3>
            <p className="text-muted-foreground">
              {taskType === 'one-time' 
                ? 'Fill in the basic details for your task'
                : 'Set up the recurring task parameters'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
              />
            </div>

            {/* Date Fields */}
            {taskType === 'one-time' ? (
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
                      selected={formData.dueDate}
                      onSelect={(date) => handleInputChange('dueDate', date)}
                      disabled={(date) => {
                        // Compare only the date part (set both to midnight)
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const compareDate = new Date(date);
                        compareDate.setHours(0, 0, 0, 0);
                        return compareDate < today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.startDate ? format(formData.startDate, "PPP") : "Pick start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.startDate}
                        onSelect={(date) => handleInputChange('startDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.endDate ? format(formData.endDate, "PPP") : "Pick end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) => handleInputChange('endDate', date)}
                        disabled={(date) => formData.startDate ? date < formData.startDate : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Frequency (Recurring only) */}
            {taskType === 'recurring' && (
              <div className="space-y-2">
                <Label>Frequency *</Label>
                <Select value={formData.frequency} onValueChange={(value) => handleInputChange('frequency', value)}>
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
            )}

            {/* Assignee (One-time only) */}
            {taskType === 'one-time' && (
              <div className="space-y-2">
                <Label>Assignee *</Label>
                <Select value={formData.assignee} onValueChange={handleAssigneeChange}>
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
            )}

            {/* Document Requirements */}
            <div className="space-y-2">
              <Label>Document Requirements</Label>
              <Select
                value={formData.attachmentsRequired}
                onValueChange={(value) => setFormData(prev => ({ ...prev, attachmentsRequired: value as 'none' | 'optional' | 'required' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - No documents required</SelectItem>
                  <SelectItem value="optional">Optional - Documents can be uploaded</SelectItem>
                  <SelectItem value="required">Required - Documents must be uploaded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Documents - Only show if not 'none' */}
            {formData.attachmentsRequired !== 'none' && (
              <div className="space-y-2">
                <Label>Documents {formData.attachmentsRequired === 'required' && <span className="text-red-500">*</span>}</Label>
                <DocumentSelector
                documentUploads={formData.parentDocuments}
                onDocumentSelect={(docType, selected) => {
                  setFormData(prev => ({
                    ...prev,
                    parentDocuments: {
                      ...prev.parentDocuments,
                      [docType]: {
                        ...prev.parentDocuments[docType],
                        selected
                      }
                    }
                  }));
                }}
                onFileUpload={(docType, file) => {
                  setFormData(prev => ({
                    ...prev,
                    parentDocuments: {
                      ...prev.parentDocuments,
                      [docType]: {
                        ...prev.parentDocuments[docType],
                        file
                      }
                    }
                  }));
                }}
                onLinkUpdate={(docType, link, linkType) => {
                  handleDocumentLinkUpdate(docType, link, linkType, true);
                }}
              />
              </div>
            )}

            {/* Customer Related */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="customerRelated"
                checked={formData.parentIsCustomerRelated}
                onCheckedChange={(checked) => handleInputChange('parentIsCustomerRelated', checked)}
              />
              <Label htmlFor="customerRelated">Is Customer Related</Label>
            </div>

            {formData.parentIsCustomerRelated && (
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  placeholder="Enter customer name"
                  value={formData.parentCustomerName}
                  onChange={(e) => handleInputChange('parentCustomerName', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: First Instance Creation (Recurring only) */}
      {currentStep === 2 && taskType === 'recurring' && (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Create First Instance</h3>
            <p className="text-muted-foreground">
              Set up the first instance of your recurring task
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Assignee */}
            <div className="space-y-2">
              <Label>Assignee *</Label>
              <Select value={formData.assignee} onValueChange={handleAssigneeChange}>
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

            {/* Due Date */}
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
                    {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick due date for first instance"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => handleInputChange('dueDate', date)}
                    disabled={(date) => {
                      // Compare only the date part (set both to midnight)
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const compareDate = new Date(date);
                      compareDate.setHours(0, 0, 0, 0);
                      return compareDate < today;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Documents - Only show if not 'none' */}
            {formData.attachmentsRequired !== 'none' && (
              <div className="space-y-2">
                <Label>Override Documents (Optional) {formData.attachmentsRequired === 'required' && <span className="text-red-500">*</span>}</Label>
                <DocumentSelector
                documentUploads={formData.childDocuments}
                onDocumentSelect={(docType, selected) => {
                  setFormData(prev => ({
                    ...prev,
                    childDocuments: {
                      ...prev.childDocuments,
                      [docType]: {
                        ...prev.childDocuments[docType],
                        selected
                      }
                    }
                  }));
                }}
                onFileUpload={(docType, file) => {
                  setFormData(prev => ({
                    ...prev,
                    childDocuments: {
                      ...prev.childDocuments,
                      [docType]: {
                        ...prev.childDocuments[docType],
                        file
                      }
                    }
                  }));
                }}
                onLinkUpdate={(docType, link, linkType) => {
                  handleDocumentLinkUpdate(docType, link, linkType, false);
                }}
              />
              </div>
            )}

            {/* Customer Related (Override Parent) */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="customerRelated-step2"
                checked={formData.childIsCustomerRelated}
                onCheckedChange={(checked) => handleInputChange('childIsCustomerRelated', checked)}
              />
              <Label htmlFor="customerRelated-step2">Override Customer Info (Optional)</Label>
            </div>

            {formData.childIsCustomerRelated && (
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={formData.childCustomerName}
                  onChange={(e) => handleInputChange('childCustomerName', e.target.value)}
                  placeholder="Enter customer name for this instance"
                />
              </div>
            )}

            {/* Auto-populated fields from assignee */}
            {formData.assignee && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Department
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {formData.department || 'Not assigned'}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Sub-Department
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {formData.subDepartment || 'Not assigned'}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Position
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {formData.position || 'Not assigned'}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Reports To
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {formData.reportsTo || 'Not assigned'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {currentStep < maxSteps ? (
            <Button onClick={handleNext} disabled={!isStepValid()}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!isStepValid() || loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewTaskForm;
