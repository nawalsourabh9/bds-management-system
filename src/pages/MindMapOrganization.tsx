import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Building2, Network, Crown, Shield, UserCheck, AlertCircle } from "lucide-react";
import { fastapiService } from "@/services/fastapi-service";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  department_name?: string;
  position_name?: string;
  reports_to_name?: string;
  employee_id?: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  parent_department_name?: string;
}

const roleIcons = {
  superadmin: Crown,
  admin: Shield,
  manager: UserCheck,
  supervisor: Users,
  user: Users,
};

const roleColors = {
  superadmin: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-blue-100 text-blue-800 border-blue-200",
  manager: "bg-green-100 text-green-800 border-green-200",
  supervisor: "bg-yellow-100 text-yellow-800 border-yellow-200",
  user: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function MindMapOrganization() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersResponse, departmentsResponse] = await Promise.all([
        fastapiService.getUsers(),
        fastapiService.getDepartments()
      ]);
      
      setUsers(usersResponse.users || []);
      setDepartments(departmentsResponse.departments || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    const IconComponent = roleIcons[role as keyof typeof roleIcons] || Users;
    return <IconComponent className="h-4 w-4" />;
  };

  const getRoleBadgeColor = (role: string) => {
    return roleColors[role as keyof typeof roleColors] || roleColors.user;
  };

  // Group users by role hierarchy
  const groupedUsers = users.reduce((acc, user) => {
    if (!acc[user.role]) {
      acc[user.role] = [];
    }
    acc[user.role].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  // Define hierarchy order
  const hierarchyOrder = ['superadmin', 'admin', 'manager', 'supervisor', 'user'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
          <Network className="h-8 w-8" />
          Organizational Mind Map
        </h1>
        <p className="text-muted-foreground">
          Visual representation of your organizational structure and hierarchy
        </p>
      </div>

      {/* Hierarchy Overview */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizational Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {hierarchyOrder.map((role, index) => {
              const roleUsers = groupedUsers[role] || [];
              if (roleUsers.length === 0) return null;

              return (
                <div key={role} className="relative">
                  {/* Connection Line */}
                  {index > 0 && (
                    <div className="absolute left-6 top-0 w-0.5 h-6 bg-gradient-to-b from-primary/30 to-transparent"></div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    {/* Role Badge */}
                    <div className={`px-4 py-2 rounded-lg border-2 flex items-center gap-2 min-w-fit ${getRoleBadgeColor(role)}`}>
                      {getRoleIcon(role)}
                      <span className="font-semibold capitalize">{role}s</span>
                      <Badge variant="secondary" className="ml-2">
                        {roleUsers.length}
                      </Badge>
                    </div>

                    {/* Users Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 flex-1">
                      {roleUsers.map((user) => (
                        <Card key={user.id} className="border border-border hover:border-primary/50 transition-colors">
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">
                                  {user.first_name} {user.last_name}
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                  {user.employee_id || 'No ID'}
                                </Badge>
                              </div>
                              
                              {user.department_name && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3" />
                                  <span>{user.department_name}</span>
                                </div>
                              )}
                              
                              {user.position_name && (
                                <div className="text-xs text-muted-foreground">
                                  Position: {user.position_name}
                                </div>
                              )}
                              
                              {user.reports_to_name && (
                                <div className="text-xs text-muted-foreground">
                                  Reports to: {user.reports_to_name}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Department Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Department Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const deptUsers = users.filter(user => user.department_name === dept.name);
              const isSubDepartment = dept.parent_department_name;
              
              return (
                <Card key={dept.id} className={`border-2 ${isSubDepartment ? 'border-blue-200 bg-blue-50/50' : 'border-primary/20'}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{dept.name}</span>
                      <Badge variant={isSubDepartment ? "secondary" : "default"}>
                        {isSubDepartment ? "Sub-Dept" : "Main"}
                      </Badge>
                    </CardTitle>
                    {isSubDepartment && (
                      <p className="text-sm text-muted-foreground">
                        Under: {dept.parent_department_name}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        <span>{deptUsers.length} members</span>
                      </div>
                      
                      {deptUsers.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Members:</p>
                          <div className="space-y-1">
                            {deptUsers.slice(0, 3).map((user) => (
                              <div key={user.id} className="text-xs flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${getRoleBadgeColor(user.role).split(' ')[0]}`}></div>
                                <span>{user.first_name} {user.last_name}</span>
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {user.role}
                                </Badge>
                              </div>
                            ))}
                            {deptUsers.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{deptUsers.length - 3} more...
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{departments.filter(d => !d.parent_department_name).length}</div>
            <div className="text-sm text-muted-foreground">Main Departments</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{departments.filter(d => d.parent_department_name).length}</div>
            <div className="text-sm text-muted-foreground">Sub-Departments</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <Crown className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{hierarchyOrder.reduce((acc, role) => acc + (groupedUsers[role]?.length || 0), 0)}</div>
            <div className="text-sm text-muted-foreground">Total Roles</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
