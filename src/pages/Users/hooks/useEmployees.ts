
import { useState, useEffect } from "react";
import { Employee } from "../types";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { fastapiService } from "@/services/fastapi-service";

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fastapiService.getUsers();
      const usersData = response.users || [];

      // Map database fields to our Employee type
      const formattedEmployees: Employee[] = usersData.map((user: any) => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
        department: user.department_id || '', // Store department ID for API calls
        department_name: user.parent_department_name 
          ? `${user.department_name} (${user.parent_department_name})` 
          : user.department_name || 'No Department', // Store department name with parent for display
        employeeId: user.employee_id || 'Not Set',
        position: user.position_id || undefined, // Store position ID for API calls
        position_name: user.position_name || 'No Position', // Store position name for display
        status: user.is_active ? "Active" : "Inactive",
        phone: user.phone || undefined,
        supervisorId: user.reports_to_id || undefined,
        reports_to_name: user.reports_to_name || 'No Manager', // Store reports-to name for display
        created_at: user.created_at,
        updated_at: user.updated_at
      }));

      setEmployees(formattedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const addEmployee = async (employeeData: Omit<Employee, 'id'>) => {
    try {
      // Use sub-department if selected, otherwise use main department
      const finalDepartmentId = employeeData.subDepartment || employeeData.department;
      
      const response = await fastapiService.createUser({
        employee_id: employeeData.employeeId,
        email: employeeData.email,
        first_name: employeeData.name.split(' ')[0],
        last_name: employeeData.name.split(' ').slice(1).join(' '),
        role: employeeData.role,
        department_id: finalDepartmentId || null,
        position_id: employeeData.position || null,
        reports_to_id: employeeData.supervisorId || null,
        is_active: employeeData.status === 'Active'
      });

      fetchEmployees(); // Refresh the list
      return response; // Return response with password
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast.error(error.message || 'Failed to add employee');
      throw error;
    }
  };

  const updateEmployee = async (id: string, employeeData: Partial<Employee>) => {
    try {
      // Use sub-department if selected, otherwise use main department
      const finalDepartmentId = employeeData.subDepartment || employeeData.department;
      
      await fastapiService.updateUser(id, {
        employee_id: employeeData.employeeId,
        email: employeeData.email,
        first_name: employeeData.name?.split(' ')[0],
        last_name: employeeData.name?.split(' ').slice(1).join(' '),
        role: employeeData.role,
        department_id: finalDepartmentId || null,
        position_id: employeeData.position || null,
        reports_to_id: employeeData.supervisorId || null,
        is_active: employeeData.status === 'Active'
      });

      toast.success('Employee updated successfully');
      fetchEmployees(); // Refresh the list
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast.error(error.message || 'Failed to update employee');
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      await fastapiService.deleteUser(id);

      toast.success('Employee deleted successfully');
      fetchEmployees(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast.error(error.message || 'Failed to delete employee');
    }
  };

  return {
    employees,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: fetchEmployees
  };
};
