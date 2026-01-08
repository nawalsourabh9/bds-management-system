
import React, { useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Employee } from "../useEmployeeData";

interface AssigneeSelectorProps {
  assignee: string;
  setAssignee: (value: string) => void;
  employees: Employee[];
  isLoading: boolean;
}

export const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({
  assignee,
  setAssignee,
  employees,
  isLoading,
}) => {
  // Log when component renders
  useEffect(() => {
    if (employees.length > 0) {
      console.log("AssigneeSelector rendered with employees:", employees.length);
      if (assignee && assignee !== "unassigned") {
        const validEmployee = employees.some(emp => emp.id === assignee);
        console.log(`Assignee ID ${assignee} validated as ${validEmployee ? 'existing' : 'NOT FOUND'} in employees list.`);
      }
    }
  }, [assignee, employees]);
  
  const selectedEmployee = employees.find(emp => emp.id === assignee);
  
  return (
    <div className="space-y-3">
      <Label htmlFor="assignee" className="text-sm font-medium text-gray-700">
        Assignee
      </Label>
      <Select value={assignee} onValueChange={setAssignee}>
        <SelectTrigger className="apple-select h-12">
          <SelectValue placeholder="Select assignee" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] apple-modal">
          <SelectItem value="unassigned" className="py-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 text-sm">?</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">Unassigned</div>
                <div className="text-sm text-gray-500">No assignee selected</div>
              </div>
            </div>
          </SelectItem>
          {employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id} className="py-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{employee.name}</div>
                  <div className="text-sm text-gray-500">{employee.position} • {employee.department}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Selected assignee preview */}
      {selectedEmployee && (
        <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium">
                {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{selectedEmployee.name}</div>
              <div className="text-sm text-gray-600">{selectedEmployee.email}</div>
              <div className="text-xs text-gray-500">{selectedEmployee.position} • {selectedEmployee.department}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
