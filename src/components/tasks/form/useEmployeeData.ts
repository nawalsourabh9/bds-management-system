
import { useState, useEffect } from "react";

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  employee_id: string;
}

import { API_BASE, API_ENDPOINTS } from '@/config/api';

export const useEmployeeData = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching employee data for task assignment from FastAPI...");
        
        // Fetch employees from our new FastAPI backend
        const response = await fetch(`${API_BASE}/api/v1/users`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const usersData = data.users || [];
        
        console.log("Successfully fetched employee data from FastAPI:", usersData.length, "records");
        
        // Map the data to our Employee interface
        const formattedEmployees: Employee[] = usersData
          .filter((user: any) => user.is_active) // Only active users
          .map((user: any) => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            department: user.department || 'Unknown',
            position: user.role || 'User',
            employee_id: user.id // Using id as employee_id for now
          }));
        
        // Filter out any potential null values just to be safe
        const validEmployees = formattedEmployees.filter(emp => emp && emp.id);
        setEmployees(validEmployees);
        
        // Log all employee IDs for debugging
        console.log("All employee IDs:", validEmployees.map(emp => emp.id));
      } catch (error) {
        console.error("Error in useEmployeeData hook:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEmployees();
  }, []);

  return { employees, isLoading };
};
