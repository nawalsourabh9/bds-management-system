
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { InviteFormData } from "./InviteUserForm";

import { API_BASE, API_ENDPOINTS } from '@/config/api';

interface InviteUserFormFieldsProps {
  formData: InviteFormData;
  onChange: (field: keyof InviteFormData, value: string) => void;
}

interface Department {
  id: string;
  name: string;
}

interface Supervisor {
  id: string;
  name: string;
  position: string;
}

export function InviteUserFormFields({ formData, onChange }: InviteUserFormFieldsProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingSupervisors, setLoadingSupervisors] = useState(true);

  // Fetch departments from the database
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoadingDepartments(true);
        
        const response = await fetch(`${API_BASE}/api/v1/departments`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const departmentsData = data.departments || [];
        
        console.log("Fetched departments:", departmentsData);
        setDepartments(departmentsData);
      } catch (error: any) {
        console.error("Error fetching departments:", error);
        toast.error(`Failed to load departments: ${error.message}`);
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  // Fetch potential supervisors
  useEffect(() => {
    const fetchSupervisors = async () => {
      try {
        setLoadingSupervisors(true);
        
        const response = await fetch(`${API_BASE}/api/v1/users`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const usersData = data.users || [];
        
        // Map users to supervisors format
        const supervisorsData = usersData
          .filter((user: any) => user.is_active)
          .map((user: any) => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            position: user.role
          }));
        
        console.log("Fetched potential supervisors:", supervisorsData);
        setSupervisors(supervisorsData);
      } catch (error: any) {
        console.error("Error fetching supervisors:", error);
        toast.error(`Failed to load supervisors: ${error.message}`);
      } finally {
        setLoadingSupervisors(false);
      }
    };

    fetchSupervisors();
  }, []);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center">
          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
          Email *
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          value={formData.email}
          onChange={(e) => onChange("email", e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="firstName" className="flex items-center">
          <User className="h-4 w-4 mr-2 text-muted-foreground" />
          First Name *
        </Label>
        <Input
          id="firstName"
          type="text"
          placeholder="John"
          value={formData.firstName}
          onChange={(e) => onChange("firstName", e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="lastName" className="flex items-center">
          <User className="h-4 w-4 mr-2 text-muted-foreground" />
          Last Name *
        </Label>
        <Input
          id="lastName"
          type="text"
          placeholder="Doe"
          value={formData.lastName}
          onChange={(e) => onChange("lastName", e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone" className="flex items-center">
          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
          Phone Number
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={formData.phone || ""}
          onChange={(e) => onChange("phone", e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="position" className="flex items-center">Position *</Label>
        <Input
          id="position"
          type="text"
          placeholder="Quality Manager"
          value={formData.position}
          onChange={(e) => onChange("position", e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="role">Role *</Label>
        <Select 
          value={formData.role} 
          onValueChange={(value) => onChange("role", value)} 
          required
        >
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="supervisor">Reports To</Label>
        <Select 
          value={formData.supervisorId || undefined} 
          onValueChange={(value) => onChange("supervisorId", value)}
        >
          <SelectTrigger id="supervisor" disabled={loadingSupervisors}>
            <SelectValue placeholder="Select supervisor" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px]">
            {loadingSupervisors ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-4 w-4 animate-spin mb-2" />
                Loading supervisors...
              </div>
            ) : supervisors.length > 0 ? (
              supervisors.map((supervisor) => (
                <SelectItem key={supervisor.id} value={supervisor.id}>
                  {supervisor.name} - {supervisor.position}
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No supervisors found
              </div>
            )}
          </SelectContent>
        </Select>
        {loadingSupervisors && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Loading supervisors...
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Select 
          value={formData.departmentId || undefined} 
          onValueChange={(value) => onChange("departmentId", value)}
        >
          <SelectTrigger id="department" disabled={loadingDepartments}>
            <SelectValue placeholder="Select a department" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px]">
            {loadingDepartments ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-4 w-4 animate-spin mb-2" />
                Loading departments...
              </div>
            ) : departments.length > 0 ? (
              departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No departments found
              </div>
            )}
          </SelectContent>
        </Select>
        {loadingDepartments && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Loading departments...
          </div>
        )}
      </div>
    </>
  );
}
