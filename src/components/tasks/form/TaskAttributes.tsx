
import React from "react";
import { Employee } from "./useEmployeeData";
import { DepartmentSelector } from "./attributes/DepartmentSelector";
import { PrioritySelector } from "./attributes/PrioritySelector";
import { DueDateSelector } from "./attributes/DueDateSelector";
import { AssigneeSelector } from "./attributes/AssigneeSelector";
import { AttachmentsSelector } from "./attributes/AttachmentsSelector";

interface TaskAttributesProps {
  department: string;
  setDepartment: (value: string) => void;
  priority: "low" | "medium" | "high" | "urgent" | "critical" | "emergency";
  setPriority: (value: "low" | "medium" | "high" | "urgent" | "critical" | "emergency") => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  assignee: string;
  setAssignee: (value: string) => void;
  employees: Employee[];
  isLoading: boolean;
  attachmentsRequired: "none" | "optional" | "required";
  setAttachmentsRequired: (value: "none" | "optional" | "required") => void;
}

export const TaskAttributes: React.FC<TaskAttributesProps> = ({
  department,
  setDepartment,
  priority,
  setPriority,
  dueDate,
  setDueDate,
  assignee,
  setAssignee,
  employees,
  isLoading,
  attachmentsRequired,
  setAttachmentsRequired,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DepartmentSelector 
          department={department} 
          setDepartment={setDepartment} 
        />

        <PrioritySelector 
          priority={priority} 
          setPriority={setPriority} 
        />

        <DueDateSelector 
          dueDate={dueDate} 
          setDueDate={setDueDate} 
        />

        <AssigneeSelector 
          assignee={assignee} 
          setAssignee={setAssignee} 
          employees={employees} 
          isLoading={isLoading} 
        />

        <AttachmentsSelector 
          attachmentsRequired={attachmentsRequired} 
          setAttachmentsRequired={setAttachmentsRequired} 
        />
      </div>
    </div>
  );
};
