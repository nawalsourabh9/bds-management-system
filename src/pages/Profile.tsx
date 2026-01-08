import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Pencil, Save, Lock, Eye, EyeOff, User, Mail, Phone, Building2, 
  Briefcase, Users, Calendar, Clock, Activity, Shield, UserCheck
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fastapiService } from "@/services/fastapi-service";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserProfile {
  id: string;
  employee_id: string;
  email: string | null;
  first_name: string;
  last_name: string | null;
  role: string;
  department_id: string | null;
  department_name: string | null;
  sub_department_name?: string | null;
  position_id: string | null;
  position_name?: string | null;
  reports_to_id: string | null;
  reports_to_name?: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PositionInfo {
  id: string;
  name: string;
  level: number;
  description?: string;
  applies_to_all_departments: boolean;
  departments: Array<{
    id: string;
    name: string;
    parent_department_id?: string;
    parent_department_name?: string;
  }>;
}

interface DepartmentSummary {
  departments: Array<{
    id: string;
    name: string;
    parent_department_id?: string;
    parent_department_name?: string;
  }>;
}

export default function Profile() {
  const { employee, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [positionInfo, setPositionInfo] = useState<PositionInfo | null>(null);
  const [departmentSummary, setDepartmentSummary] = useState<DepartmentSummary | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  useEffect(() => {
    fetchUserData();
  }, [employee, user]);
  
  const fetchUserData = async () => {
    // Try multiple ways to get user ID
    const userId = (employee as any)?.id || (user as any)?.id || (user as any)?.employee?.id;
    const employeeId = (employee as any)?.employee_id || (user as any)?.employee_id;
    
    // Only log in development - never expose sensitive user data in production
    if (process.env.NODE_ENV === 'development') {
      console.log("Profile - userId:", userId, "employeeId:", employeeId);
    }
    
    if (!userId && !employeeId) {
      console.warn("No user ID or employee ID found");
      setLoadingUser(false);
      return;
    }
    
    try {
      setLoadingUser(true);
      
      let userResponse;
      
      // Try to fetch by UUID first
      if (userId) {
        try {
          userResponse = await fastapiService.getUser(userId);
        } catch (error: any) {
          console.warn("Failed to fetch user by UUID, trying by employee_id:", error);
          // If UUID lookup fails and we have employee_id, try to find user by employee_id
          if (employeeId && error.message?.includes('404')) {
            try {
              const allUsersResponse = await fastapiService.getUsers();
              const users = Array.isArray(allUsersResponse) ? allUsersResponse : allUsersResponse.users || [];
              const foundUser = users.find((u: any) => u.employee_id === employeeId);
              if (foundUser) {
                userResponse = await fastapiService.getUser(foundUser.id);
              } else {
                throw new Error("User not found by employee_id");
              }
            } catch (fallbackError) {
              console.error("Failed to find user by employee_id:", fallbackError);
              throw error; // Throw original error
            }
          } else {
            throw error;
          }
        }
      } else if (employeeId) {
        // If no UUID, try to find by employee_id
        const allUsersResponse = await fastapiService.getUsers();
        const users = Array.isArray(allUsersResponse) ? allUsersResponse : allUsersResponse.users || [];
        const foundUser = users.find((u: any) => u.employee_id === employeeId);
        if (foundUser) {
          userResponse = await fastapiService.getUser(foundUser.id);
        } else {
          throw new Error("User not found");
        }
      } else {
        throw new Error("No valid user identifier found");
      }
      
      // Fetch position details if position_id exists
      let positionName = null;
      if (userResponse.position_id) {
        try {
          const positionResponse = await fastapiService.getPosition(userResponse.position_id);
          positionName = positionResponse.name;
        } catch (e) {
          console.error("Error fetching position:", e);
        }
      }
      
      // Fetch supervisor details if reports_to_id exists
      let supervisorName = null;
      if (userResponse.reports_to_id) {
        try {
          const supervisorResponse = await fastapiService.getUser(userResponse.reports_to_id);
          supervisorName = `${supervisorResponse.first_name} ${supervisorResponse.last_name || ''}`.trim();
        } catch (e) {
          console.error("Error fetching supervisor:", e);
        }
      }
      
      // Fetch department details
      let subDepartmentName = null;
      if (userResponse.department_id) {
        try {
          const departmentsResponse = await fastapiService.getDepartments();
          const departments = Array.isArray(departmentsResponse) ? departmentsResponse : departmentsResponse.departments || [];
          const userDept = departments.find((d: any) => d.id === userResponse.department_id);
          if (userDept?.parent_department_id) {
            // This is a sub-department
            const mainDept = departments.find((d: any) => d.id === userDept.parent_department_id);
            subDepartmentName = userDept.name;
            userResponse.department_name = mainDept?.name || userDept.name;
          }
        } catch (e) {
          console.error("Error fetching departments:", e);
        }
      }
      
      const profileData: UserProfile = {
        id: userResponse.id,
        employee_id: userResponse.employee_id,
        email: userResponse.email,
        first_name: userResponse.first_name,
        last_name: userResponse.last_name,
        role: userResponse.role,
        department_id: userResponse.department_id,
        department_name: userResponse.department_name,
        sub_department_name: subDepartmentName,
        position_id: userResponse.position_id,
        position_name: positionName,
        reports_to_id: userResponse.reports_to_id,
        reports_to_name: supervisorName,
        phone: userResponse.phone || null,
        is_active: userResponse.is_active,
        created_at: userResponse.created_at,
        updated_at: userResponse.updated_at
      };
      
      // Set profile first so fetchPositionInfo can access it
      setProfile(profileData);
      setFormData({
        first_name: userResponse.first_name,
        last_name: userResponse.last_name || '',
        email: userResponse.email || '',
        phone: userResponse.phone || ''
      });
      
      // Fetch position details and departments (pass user's department_id as fallback)
      if (userResponse.position_id) {
        await fetchPositionInfo(userResponse.position_id, userResponse.department_id);
      }
      
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      const errorMessage = error?.message || "Failed to load profile data";
      
      // If user not found, try to provide more helpful message
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        toast.error("User profile not found. Please contact administrator.");
      } else {
        toast.error(errorMessage);
      }
      
      // Set profile to null so we show the "No profile data" message
      setProfile(null);
    } finally {
      setLoadingUser(false);
    }
  };
  
  const fetchPositionInfo = async (positionId: string, userDepartmentId?: string | null) => {
    try {
      // Get position details
      const positionResponse = await fastapiService.getPosition(positionId);
      
      // Get departments for this position
      let departments = positionResponse.departments || [];
      
      // If not in position response, try the dedicated endpoint
      if (!departments || departments.length === 0) {
        try {
          const departmentsResponse = await fastapiService.getPositionDepartments(positionId);
          departments = departmentsResponse.departments || [];
        } catch (error: any) {
          console.warn("Failed to fetch position departments:", error);
          departments = [];
        }
      }
      
      // If still no departments and position doesn't apply to all, check user's department as fallback
      if (departments.length === 0 && !positionResponse.applies_to_all_departments && userDepartmentId) {
        try {
          const departmentsResponse = await fastapiService.getDepartments();
          const allDepartments = Array.isArray(departmentsResponse) ? departmentsResponse : departmentsResponse.departments || [];
          const userDept = allDepartments.find((d: any) => d.id === userDepartmentId);
          if (userDept) {
            departments = [{
              id: userDept.id,
              name: userDept.name,
              parent_department_id: userDept.parent_department_id,
              parent_department_name: userDept.parent_department_name
            }];
          }
        } catch (error) {
          console.warn("Failed to fetch user's department:", error);
        }
      }
      
      const positionData: PositionInfo = {
        id: positionId,
        name: positionResponse.name,
        level: positionResponse.level || 0,
        description: positionResponse.description,
        applies_to_all_departments: positionResponse.applies_to_all_departments || false,
        departments: departments
      };
      
      setPositionInfo(positionData);
      
      // Set department summary
      setDepartmentSummary({
        departments: departments
      });
    } catch (error) {
      console.error("Error fetching position info:", error);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSave = async () => {
    if (!profile) return;
    
    setLoading(true);
    
    try {
      await fastapiService.updateUser(profile.id, {
        first_name: formData.first_name,
        last_name: formData.last_name || null,
        email: formData.email || null,
        phone: formData.phone || null
      });
      
      await fetchUserData();
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordChange = async () => {
    if (!passwordData.new || passwordData.new !== passwordData.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    
    if (passwordData.new.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    if (!passwordData.current) {
      toast.error("Please enter your current password");
      return;
    }
    
    try {
      setLoading(true);
      const userId = (employee as any)?.id || (user as any)?.id;
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          current_password: passwordData.current,
          new_password: passwordData.new
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to change password');
      }
      
      toast.success("Password changed successfully");
      setShowPasswordDialog(false);
      setPasswordData({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };
  
  const getRoleIcon = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('super') || roleLower.includes('admin')) {
      return <Shield className="h-4 w-4" />;
    } else if (roleLower.includes('manager')) {
      return <UserCheck className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
  };
  
  const getLevelName = (level: number) => {
    const levels: Record<number, string> = {
      1: "User",
      2: "Supervisor",
      3: "Manager",
      4: "Admin",
      5: "Super Admin"
    };
    return levels[level] || "Unknown";
  };
  
  
  if (loadingUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">No profile data available</p>
        </div>
      </div>
    );
  }
  
  const fullName = `${profile.first_name} ${profile.last_name || ''}`.trim();
  const initials = `${profile.first_name[0]}${profile.last_name?.[0] || ''}`.toUpperCase();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">View and manage your profile information</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                className="gap-2" 
                onClick={() => setShowPasswordDialog(true)}
              >
                <Lock className="h-4 w-4" />
                Change Password
              </Button>
            <Button 
              variant={editing ? "default" : "outline"}
              className="gap-2" 
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={loading}
            >
              {editing ? (
                <>
                  <Save className="h-4 w-4" />
                  {loading ? "Saving..." : "Save Changes"}
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  Edit Profile
                </>
              )}
            </Button>
            </div>
      </div>
      
      {/* Profile Overview Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage src="" alt={fullName} />
              <AvatarFallback className="text-2xl bg-primary text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{fullName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleIcon(profile.role)}
                    <Badge variant="outline" className="capitalize">{profile.role}</Badge>
                    {profile.is_active ? (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span>{profile.email || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Employee ID:</span>
                  <span className="font-medium">{profile.employee_id}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Member since:</span>
                  <span>{new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Company:</span>
                  <span className="font-medium">BDS Manufacturing</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Position Information */}
          {positionInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Position Information
                </CardTitle>
                <CardDescription>Your current position and responsibilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Position Name</Label>
                    <p className="font-semibold text-lg">{positionInfo.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Level</Label>
                    <p className="font-medium">{getLevelName(positionInfo.level)} (Level {positionInfo.level})</p>
                  </div>
                  {positionInfo.description && (
                    <div className="md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm">{positionInfo.description}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">Applies To</Label>
                    <p className="font-medium">
                      {positionInfo.applies_to_all_departments ? (
                        <Badge className="bg-blue-100 text-blue-800">All Departments</Badge>
                      ) : positionInfo.departments.length > 0 ? (
                        <Badge variant="outline">{positionInfo.departments.length} Department{positionInfo.departments.length !== 1 ? 's' : ''}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">Not assigned to any department</Badge>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Department Summary */}
          {departmentSummary && departmentSummary.departments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Department Summary
                </CardTitle>
                <CardDescription>Departments associated with your position</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const mainDepartments = departmentSummary.departments.filter(d => !d.parent_department_id);
                    const subDepartments = departmentSummary.departments.filter(d => d.parent_department_id);
                    const groupedSubDepts = subDepartments.reduce((acc, sub) => {
                      const parentName = sub.parent_department_name || "Unknown";
                      if (!acc[parentName]) {
                        acc[parentName] = [];
                      }
                      acc[parentName].push(sub);
                      return acc;
                    }, {} as Record<string, typeof subDepartments>);
                    
                    return (
                      <>
                        {mainDepartments.map((dept) => (
                          <div key={dept.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-blue-600" />
                                {dept.name}
                              </h3>
                              <Badge className="bg-blue-100 text-blue-800">Main Department</Badge>
                            </div>
                            {Object.keys(groupedSubDepts).some(parent => parent === dept.name) && (
                              <div className="mt-3 ml-7">
                                <p className="text-sm font-medium text-gray-700 mb-2">Sub-Departments:</p>
                                <div className="flex flex-wrap gap-2">
                                  {groupedSubDepts[dept.name]?.map((sub) => (
                                    <Badge key={sub.id} variant="outline" className="text-xs">
                                      {sub.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Standalone Sub-Departments */}
                        {subDepartments.filter(sub => !mainDepartments.some(main => main.name === sub.parent_department_name)).length > 0 && (
                          <div className="border-t pt-4 mt-4">
                            <h3 className="font-semibold mb-3">Sub-Departments</h3>
                            <div className="grid gap-2 md:grid-cols-2">
                              {subDepartments
                                .filter(sub => !mainDepartments.some(main => main.name === sub.parent_department_name))
                                .map((sub) => (
                                  <div key={sub.id} className="border rounded p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{sub.name}</span>
                                      <span className="text-xs text-gray-500">
                                        {sub.parent_department_name}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
          
          {!positionInfo && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No position assigned</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Personal Info Tab */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                <Input 
                    id="first_name"
                    name="first_name"
                    value={formData.first_name || ''}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                <Input 
                    id="last_name"
                    name="last_name"
                    value={formData.last_name || ''}
                    onChange={handleInputChange}
                    disabled={!editing}
                    className="rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  name="email"
                  type="email"
                    value={formData.email || ''}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone"
                  name="phone"
                    value={formData.phone || ''}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className="rounded-sm"
                />
              </div>
            <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input 
                    id="employee_id"
                    value={profile.employee_id}
                    disabled
                    className="rounded-sm bg-muted"
                  />
                </div>
            </div>
            
            {editing && (
                <div className="pt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                      setFormData({
                        first_name: profile.first_name,
                        last_name: profile.last_name || '',
                        email: profile.email || '',
                        phone: profile.phone || ''
                      });
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organizational Information</CardTitle>
              <CardDescription>Your role and position in the organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Department</Label>
                      <p className="font-medium">{profile.department_name || 'Not assigned'}</p>
                      {profile.sub_department_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Sub-Department: {profile.sub_department_name}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Position</Label>
                      <p className="font-medium">{profile.position_name || 'Not assigned'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Reports To</Label>
                      <p className="font-medium">{profile.reports_to_name || 'No supervisor'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Role</Label>
                      <Badge className="capitalize">{profile.role}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Account Created</Label>
                      <p className="font-medium">{new Date(profile.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Last Updated</Label>
                      <p className="font-medium">{new Date(profile.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>
      
      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordData({ current: "", new: "", confirm: "" });
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handlePasswordChange} disabled={loading}>
              {loading ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
