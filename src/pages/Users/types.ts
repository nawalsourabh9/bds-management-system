
import { z } from "zod";

export const employeeFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal('')),
  role: z.string().min(1, { message: "Please select a role." }),
  department: z.string().min(1, { message: "Please select a department." }),
  subDepartment: z.string().optional(),
  employeeId: z.string().min(1, { message: "Employee ID is required." }),
  position: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Pending"], { message: "Please select a status." }),
  phone: z.string().optional(),
  supervisorId: z.string().optional()
});

export type Employee = {
  id: string;
  name: string;
  email: string | null; // Email is now optional
  role: string;
  department: string; // This will store department ID for API calls
  subDepartment?: string; // This will store sub-department ID for API calls
  department_name?: string; // This will store main department name for display
  sub_department_name?: string; // This will store sub-department name for display
  employeeId: string;
  position?: string; // This will store position ID for API calls
  position_name?: string; // This will store position name for display
  status: "Active" | "Inactive" | "Pending";
  phone?: string;
  supervisorId?: string;
  reports_to_name?: string; // This will store reports-to name for display
  created_at?: string;
  updated_at?: string;
};

export const departmentOptions = [
  "Executive Office",
  "Quality Assurance", 
  "Production", 
  "Research & Development",
  "Supply Chain",
  "Human Resources", 
  "Finance", 
  "IT & Systems"
];

export const roleOptions = ["admin", "manager", "supervisor", "user"];
