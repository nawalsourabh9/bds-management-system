import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Save, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fastapiService } from "@/services/fastapi-service";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Profile() {
  const { employee } = useAuth();
  const [user, setUser] = useState<any>(null);
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
  }, [employee]);
  
  const fetchUserData = async () => {
    if (!employee?.id) {
      setLoadingUser(false);
      return;
    }
    
    try {
      setLoadingUser(true);
      const response = await fastapiService.getUsers();
      const currentUser = response.users?.find((u: any) => u.id === employee.id);
      
      if (currentUser) {
        const userData = {
          id: currentUser.id,
          name: `${currentUser.first_name} ${currentUser.last_name}`,
          email: currentUser.email,
          employee_id: currentUser.employee_id,
          role: currentUser.role,
          department: currentUser.department_name || "",
          phone: currentUser.phone || "",
          bio: currentUser.bio || ""
        };
        setUser(userData);
        setFormData(userData);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoadingUser(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSave = async () => {
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setUser(formData);
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: employee?.id,
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
  
  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">No profile data available</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">View and update your profile information</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="h-fit border-border">
          <CardContent className="pt-6 flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src="" alt={user.name} />
              <AvatarFallback className="text-4xl bg-primary text-white">
                {user.name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.role}</p>
              <p className="text-sm text-muted-foreground">{user.department}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Pencil className="h-4 w-4" />
              Change Photo
            </Button>
          </CardContent>
        </Card>
        
        <Card className="col-span-2 border-border">
          <CardHeader className="excel-header flex flex-row justify-between items-center">
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Manage your personal details</CardDescription>
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input 
                  id="employee_id"
                  name="employee_id"
                  value={formData.employee_id}
                  disabled
                  className="rounded-sm bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input 
                  id="role"
                  name="role"
                  value={formData.role}
                  disabled
                  className="rounded-sm bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input 
                  id="department"
                  name="department"
                  value={formData.department}
                  disabled
                  className="rounded-sm bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className="rounded-sm"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea 
                id="bio"
                name="bio"
                rows={3}
                value={formData.bio}
                onChange={handleInputChange}
                disabled={!editing}
                className="w-full min-h-[80px] rounded-sm border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            
            {editing && (
              <div className="pt-4 flex justify-end">
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={() => {
                    setFormData(user);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
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