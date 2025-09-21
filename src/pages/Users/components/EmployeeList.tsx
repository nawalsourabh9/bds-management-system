
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";
import { Employee } from "../types";

interface EmployeeListProps {
  employees: Employee[];
  openEditDialog: (employee: Employee) => void;
  setEmployeeToDelete: (id: string) => void;
  setIsDeleteDialogOpen: (isOpen: boolean) => void;
}

export function EmployeeList({ 
  employees, 
  openEditDialog, 
  setEmployeeToDelete, 
  setIsDeleteDialogOpen 
}: EmployeeListProps) {
  return (
    <div className="border-border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="excel-header border-b border-border text-left">
            <th className="px-4 py-2 font-medium">Employee ID</th>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Position</th>
            <th className="px-4 py-2 font-medium">Department</th>
            <th className="px-4 py-2 font-medium">Reports To</th>
            <th className="px-4 py-2 font-medium">Role</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id} className="excel-row border-b border-border">
              <td className="px-4 py-2 font-mono text-sm">{employee.employeeId}</td>
              <td className="px-4 py-2">{employee.name}</td>
              <td className="px-4 py-2">{employee.email}</td>
              <td className="px-4 py-2">{employee.position_name || 'No Position'}</td>
              <td className="px-4 py-2">{employee.department_name || 'No Department'}</td>
              <td className="px-4 py-2">{employee.reports_to_name || 'No Manager'}</td>
              <td className="px-4 py-2">{employee.role}</td>
              <td className="px-4 py-2">
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  employee.status === "Active" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {employee.status}
                </span>
              </td>
              <td className="px-4 py-2">
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="excel-button h-8 w-8 p-0" 
                    onClick={() => openEditDialog(employee)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="excel-button h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600" 
                    onClick={() => {
                      setEmployeeToDelete(employee.id);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
