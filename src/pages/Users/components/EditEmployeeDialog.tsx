
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmployeeForm } from "./EmployeeForm";
import { Employee, employeeFormSchema } from "../types";
import { useEffect } from "react";

interface EditEmployeeDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  employee: Employee | null;
  onSubmit: (data: Omit<Employee, "id">) => void;
  employees: Employee[];
}

export function EditEmployeeDialog({ isOpen, setIsOpen, employee, onSubmit, employees }: EditEmployeeDialogProps) {
  const form = useForm<Omit<Employee, "id">>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "",
      department: "",
      employeeId: "",
      position: undefined,
      status: "Active",
      phone: ""
    }
  });

  // Reset form when employee changes
  useEffect(() => {
    if (employee) {
      // Only log in development - never expose employee data in production
      if (process.env.NODE_ENV === 'development') {
        console.log("Setting form values for employee:", employee.id);
      }
      form.reset({
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        employeeId: employee.employeeId,
        position: employee.position,
        status: employee.status,
        phone: employee.phone,
        supervisorId: employee.supervisorId || undefined
      });
    }
  }, [employee, form]);

  const handleSubmit = (data: Omit<Employee, "id">) => {
    // Only log in development - never expose form data in production
    if (process.env.NODE_ENV === 'development') {
      console.log("Submitting employee form update");
    }
    onSubmit(data);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update employee information and permissions.
          </DialogDescription>
        </DialogHeader>
        <EmployeeForm 
          form={form} 
          onSubmit={handleSubmit}
          submitButtonText="Update Employee"
          onCancel={handleCancel}
          employees={employees.filter(emp => employee ? emp.id !== employee.id : true)}
        />
      </DialogContent>
    </Dialog>
  );
}
