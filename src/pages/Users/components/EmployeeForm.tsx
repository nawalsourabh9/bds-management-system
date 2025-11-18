
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Employee, roleOptions } from "../types";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { fastapiService } from "@/services/fastapi-service";

interface EmployeeFormProps {
  form: UseFormReturn<Omit<Employee, "id">, any, undefined>;
  onSubmit: (values: Omit<Employee, "id">) => void;
  submitButtonText: string;
  onCancel: () => void;
  employees: Employee[];
}

interface Department {
  id: string;
  name: string;
  description?: string;
  parent_department_name?: string;
}

interface Position {
  id: string;
  name: string;
  description?: string;
  department_id: string;
  level: number;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  position_name?: string;
}

export function EmployeeForm({ 
  form, 
  onSubmit, 
  submitButtonText, 
  onCancel,
  employees 
}: EmployeeFormProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [manageableUsers, setManageableUsers] = useState<User[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  useEffect(() => {
    fetchDepartments();
    fetchManageableUsers();
  }, []);

  const selectedDepartmentId = form.watch("department");
  const selectedSubDepartmentId = form.watch("subDepartment");

  useEffect(() => {
    if (selectedDepartmentId) {
      // Filter sub-departments for the selected main department
      const mainDepartment = departments.find(dept => dept.id === selectedDepartmentId);
      const subsForMainDept = allDepartments.filter(dept => 
        dept.parent_department_name === mainDepartment?.name
      );
      setSubDepartments(subsForMainDept);
      
      // Reset sub-department selection when main department changes
      form.setValue("subDepartment", undefined);
      
      // Fetch positions for the selected department (or sub-department)
      fetchPositions(selectedDepartmentId);
    } else {
      setSubDepartments([]);
      setPositions([]);
      form.setValue("subDepartment", undefined);
    }
  }, [selectedDepartmentId, departments, allDepartments, form]);

  useEffect(() => {
    if (selectedSubDepartmentId) {
      // Fetch positions for the selected sub-department
      fetchPositions(selectedSubDepartmentId);
    } else if (selectedDepartmentId) {
      // If no sub-department selected, fetch positions for main department
      fetchPositions(selectedDepartmentId);
    }
  }, [selectedSubDepartmentId, selectedDepartmentId]);

  const fetchDepartments = async () => {
    try {
      const response = await fastapiService.getDepartments();
      const allDepartments = response.departments || [];
      
      // Separate main departments (those without parent_department_name) from sub-departments
      const mainDepartments = allDepartments.filter(dept => !dept.parent_department_name);
      setDepartments(mainDepartments);
      
      // Store all departments for sub-department filtering
      setAllDepartments(allDepartments);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchPositions = async (departmentId: string) => {
    try {
      const response = await fastapiService.getPositions(departmentId);
      setPositions(response.positions || []);
    } catch (error) {
      console.error("Error fetching positions:", error);
    }
  };

  const fetchManageableUsers = async () => {
    try {
      const response = await fastapiService.getUsers();
      setManageableUsers(response.users || []);
    } catch (error) {
      console.error("Error fetching manageable users:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee ID</FormLabel>
                <FormControl>
                  <Input placeholder="E.g. EMP001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sub-Department Field - Only show if main department is selected and has sub-departments */}
          {selectedDepartmentId && subDepartments.length > 0 && (
            <FormField
              control={form.control}
              name="subDepartment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub-Department (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sub-department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subDepartments.map(subDept => (
                        <SelectItem key={subDept.id} value={subDept.id}>
                          {subDept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {selectedDepartmentId && (
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positions.map(position => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>System Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roleOptions.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "Active"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (123) 456-7890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="supervisorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reports To</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None (Top Executive)</SelectItem>
                  {manageableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.role}) - {user.position_name || 'No Position'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
