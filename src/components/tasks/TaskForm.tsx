
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Task } from "@/types/task";
import { Separator } from "@/components/ui/separator";

// Import components
import { TaskBasicInfo } from "./form/TaskBasicInfo";
import { TaskAttributes } from "./form/TaskAttributes";
import { DocumentSelector } from "./form/DocumentSelector";
import { CustomerRelatedSection } from "./form/CustomerRelatedSection";
import { RecurringTaskSection } from "./form/RecurringTaskSection";

// Import hooks
import { useTaskFormState } from "./form/useTaskFormState";
import { useTaskFormSubmit } from "./form/useTaskFormSubmit";

interface TaskFormProps {
  onSubmit: (task: Task) => void;
  initialData?: Partial<Task>;
}

const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  initialData = {}
}) => {
  // Use the form state hook to manage all form state
  const formState = useTaskFormState(initialData);
  
  // Use the form submit hook for submission logic
  const { handleSubmit } = useTaskFormSubmit(onSubmit, initialData, formState.employees);
  
  // Log initial data on mount
  useEffect(() => {
    if (initialData.id) {
      console.log("TaskForm is in EDIT mode with ID:", initialData.id);
    } else {
      console.log("TaskForm is in CREATE mode");
    }
    
    console.log("Initial data in TaskForm:", {
      ...initialData,
      recurrenceCountInPeriod: {
        value: initialData.recurrenceCountInPeriod,
        type: typeof initialData.recurrenceCountInPeriod
      }
    });
    
    if (initialData.assignee) {
      console.log("Setting initial assignee from props:", initialData.assignee);
    } else {
      console.log("No initial assignee in props, using unassigned");
    }
  }, [initialData.id]);

  // Create a submit handler that uses the form state
  const onFormSubmit = (e: React.FormEvent) => {
    // Ensure we never pass invalid recurrence count data from the form
    const formData = {
      title: formState.title,
      description: formState.description,
      department: formState.department,
      priority: formState.priority,
      dueDate: formState.dueDate,
      assignee: formState.assignee,
      isRecurring: formState.isRecurring,
      recurringFrequency: formState.isRecurring ? formState.recurringFrequency : undefined,
      startDate: formState.isRecurring ? formState.startDate : undefined,
      endDate: formState.isRecurring ? formState.endDate : undefined,
      isCustomerRelated: formState.isCustomerRelated,
      customerName: formState.customerName,
      attachmentsRequired: formState.attachmentsRequired,
      documentUploads: formState.documentUploads
    };

    console.log("TaskForm submitting clean form data (no recurrenceCountInPeriod):", formData);
    
    handleSubmit(e, formData);
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-8">
        {/* Task basic info section */}
        <div className="apple-card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium">📝</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              <p className="text-sm text-gray-500">Task title and description</p>
            </div>
          </div>
          <TaskBasicInfo 
            title={formState.title}
            setTitle={formState.setTitle}
            description={formState.description}
            setDescription={formState.setDescription}
          />
        </div>

        {/* Task attributes section */}
        <div className="apple-card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 font-medium">⚙️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Task Attributes</h3>
              <p className="text-sm text-gray-500">Department, priority, assignee, and due date</p>
            </div>
          </div>
          <TaskAttributes 
            department={formState.department}
            setDepartment={formState.setDepartment}
            priority={formState.priority}
            setPriority={formState.setPriority}
            dueDate={formState.dueDate}
            setDueDate={formState.setDueDate}
            assignee={formState.assignee}
            setAssignee={formState.setAssignee}
            employees={formState.employees}
            isLoading={formState.isLoading}
            attachmentsRequired={formState.attachmentsRequired}
            setAttachmentsRequired={formState.setAttachmentsRequired}
          />
        </div>
        
        {/* Recurring task section */}
        <div className="apple-card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-purple-600 font-medium">🔄</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recurring Options</h3>
              <p className="text-sm text-gray-500">Set up recurring task schedule</p>
            </div>
          </div>
          <RecurringTaskSection 
            isRecurring={formState.isRecurring}
            setIsRecurring={formState.setIsRecurring}
            recurringFrequency={formState.recurringFrequency}
            setRecurringFrequency={formState.setRecurringFrequency}
            startDate={formState.startDate}
            setStartDate={formState.setStartDate}
            endDate={formState.endDate}
            setEndDate={formState.setEndDate}
          />
        </div>
        
        {/* Documents section */}
        <div className="apple-card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-orange-600 font-medium">📎</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
              <p className="text-sm text-gray-500">Attach relevant documents</p>
            </div>
          </div>
          <DocumentSelector 
            documentUploads={formState.documentUploads}
            onDocumentSelect={formState.handleDocumentSelect}
            onFileUpload={formState.handleFileUpload}
          />
        </div>

        {/* Customer related section */}
        <div className="apple-card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 font-medium">👥</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
              <p className="text-sm text-gray-500">Customer-related task details</p>
            </div>
          </div>
          <CustomerRelatedSection 
            isCustomerRelated={formState.isCustomerRelated}
            setIsCustomerRelated={formState.setIsCustomerRelated}
            customerName={formState.customerName}
            setCustomerName={formState.setCustomerName}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6">
        <Button type="submit" className="apple-button px-8 py-3 text-base">
          {initialData.id ? "Update Task" : "Create Task"}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;
