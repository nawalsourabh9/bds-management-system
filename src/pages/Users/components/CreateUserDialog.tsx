import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fastapiService } from "@/services/fastapi-service";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Copy } from "lucide-react";
import { Label } from "@/components/ui/label";

interface CreateUserDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onUserCreated: () => void;
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

const createUserSchema = z.object({
  employeeId: z.string().min(1, { message: "Employee ID is required." }),
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  role: z.string().min(1, { message: "Role is required." }),
  department: z.string().min(1, { message: "Department is required." }),
  subDepartment: z.string().optional(),
  position: z.string().optional(),
  reportsTo: z.string().optional(),
});

export const CreateUserDialog = ({ isOpen, setIsOpen, onUserCreated }: CreateUserDialogProps) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [manageableUsers, setManageableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      employeeId: "",
      name: "",
      email: "",
      role: "user",
      department: "",
      subDepartment: undefined,
      position: undefined,
      reportsTo: undefined,
    },
  });

  const selectedDepartmentId = form.watch("department");
  const selectedSubDepartmentId = form.watch("subDepartment");

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchManageableUsers();
    }
  }, [isOpen]);

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
      setLoadingDepartments(true);
      const response = await fastapiService.getDepartments();
      const allDepartments = response.departments || [];
      
      // Separate main departments (those without parent_department_name) from sub-departments
      const mainDepartments = allDepartments.filter(dept => !dept.parent_department_name);
      setDepartments(mainDepartments);
      
      // Store all departments for sub-department filtering
      setAllDepartments(allDepartments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to load departments");
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchPositions = async (departmentId: string) => {
    try {
      // Fetch positions for the selected department
      // Positions that apply to this department (via many-to-many or all departments)
      const response = await fastapiService.getPositions(departmentId);
      setPositions(response.positions || []);
    } catch (error) {
      console.error("Error fetching positions:", error);
      toast.error("Failed to load positions");
    }
  };

  const fetchManageableUsers = async () => {
    try {
      const response = await fastapiService.getUsers();
      setManageableUsers(response.users || []);
    } catch (error) {
      console.error("Error fetching manageable users:", error);
      toast.error("Failed to load users");
    }
  };

  const onSubmit = async (values: z.infer<typeof createUserSchema>) => {
    setLoading(true);

    try {
      // Split name: first word is first_name, rest is last_name (can be empty)
      const nameParts = values.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || null; // null if empty
      
      // Use sub-department ID if selected, otherwise use main department ID
      const finalDepartmentId = values.subDepartment || values.department;
      
      const response = await fastapiService.createUser({
        employee_id: values.employeeId,
        email: values.email && values.email.trim() ? values.email.trim() : undefined, // Optional email
        first_name: firstName,
        last_name: lastName || undefined, // Send undefined if null to allow backend to handle NULL
        role: values.role,
        department_id: finalDepartmentId || null,
        position_id: values.position || null,
        reports_to_id: values.reportsTo || null,
        is_active: true,
      });

      // Show credentials dialog if password was returned
      if (response.password) {
        setCredentials({ 
          email: values.email && values.email.trim() ? values.email.trim() : values.employeeId, // Use employee ID if no email
          password: response.password 
        });
        setShowCredentials(true);
        setIsOpen(false); // Close create dialog
      } else {
      toast.success("User created successfully");
      setIsOpen(false);
      form.reset();
      }
      onUserCreated();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        
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
                      <Input placeholder="e.g. EMP001" {...field} />
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
                      <Input placeholder="First Last" {...field} />
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
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs text-gray-500">
                      Optional - Login uses Employee ID
                    </FormDescription>
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
                          <SelectValue placeholder="Select main department" />
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

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="reportsTo"
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
                        {manageableUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.last_name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Credentials Dialog */}
      <Dialog open={showCredentials} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              User Created Successfully
            </DialogTitle>
            <DialogDescription>
              Save these credentials - they won't be shown again!
            </DialogDescription>
          </DialogHeader>
          
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-700" />
            <AlertDescription className="text-yellow-700">
              The user must log in with these credentials and change their password immediately.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {credentials?.email && credentials.email.includes('@') ? 'Email' : 'Employee ID'}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={credentials?.email || ''}
                  readOnly
                  className="bg-muted font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(credentials?.email || '');
                    toast.success("Email copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Password</Label>
              <div className="flex gap-2">
                <Input
                  value={credentials?.password || ''}
                  readOnly
                  className="bg-muted font-mono text-sm font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(credentials?.password || '');
                    toast.success("Password copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowCredentials(false);
                form.reset();
                setCredentials(null);
              }}
            >
              I've Saved the Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
