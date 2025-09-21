import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  Network, 
  GitBranch, 
  ArrowDown,
  ArrowRight,
  Crown,
  Shield,
  UserCheck,
  User,
  MapPin,
  Briefcase
} from "lucide-react";
import { fastapiService } from "@/services/fastapi-service";

interface Department {
  id: string;
  name: string;
  description?: string;
  parent_department_name?: string;
  positions?: Position[];
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
  department_name?: string;
  position_name?: string;
  reports_to_name?: string;
  employee_id?: string;
}

const roleIcons = {
  superadmin: Crown,
  admin: Shield,
  manager: UserCheck,
  supervisor: User,
  user: User,
};

const roleColors = {
  superadmin: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-blue-100 text-blue-800 border-blue-200",
  manager: "bg-green-100 text-green-800 border-green-200",
  supervisor: "bg-yellow-100 text-yellow-800 border-yellow-200",
  user: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function MindMapDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [departmentsResponse, usersResponse] = await Promise.all([
        fastapiService.getDepartments(),
        fastapiService.getUsers()
      ]);
      
      setDepartments(departmentsResponse.departments || []);
      setUsers(usersResponse.users || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    const IconComponent = roleIcons[role as keyof typeof roleIcons] || User;
    return <IconComponent className="h-4 w-4" />;
  };

  const getRoleBadgeColor = (role: string) => {
    return roleColors[role as keyof typeof roleColors] || roleColors.user;
  };

  // Separate main departments from sub-departments
  const mainDepartments = departments.filter(dept => !dept.parent_department_name);
  const subDepartments = departments.filter(dept => dept.parent_department_name);

  // Group sub-departments by parent
  const subDepartmentsByParent = subDepartments.reduce((acc, subDept) => {
    const parentName = subDept.parent_department_name!;
    if (!acc[parentName]) {
      acc[parentName] = [];
    }
    acc[parentName].push(subDept);
    return acc;
  }, {} as Record<string, Department[]>);

  // Get users for a department
  const getDepartmentUsers = (departmentName: string) => {
    return users.filter(user => user.department_name === departmentName);
  };

  // Get department statistics
  const getDepartmentStats = (departmentName: string) => {
    const deptUsers = getDepartmentUsers(departmentName);
    const roleCounts = deptUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { totalUsers: deptUsers.length, roleCounts };
  };

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
          <GitBranch className="h-8 w-8" />
          Department Structure Mind Map
        </h1>
        <p className="text-muted-foreground">
          Visual representation of your organizational departments and their hierarchy
        </p>
      </div>

      {/* Department Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{mainDepartments.length}</div>
            <div className="text-sm text-muted-foreground">Main Departments</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <Network className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{subDepartments.length}</div>
            <div className="text-sm text-muted-foreground">Sub-Departments</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-sm text-muted-foreground">Total Employees</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <Briefcase className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{departments.reduce((acc, dept) => acc + (dept.positions?.length || 0), 0)}</div>
            <div className="text-sm text-muted-foreground">Total Positions</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Department Structure */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizational Department Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {mainDepartments.map((mainDept, index) => {
              const stats = getDepartmentStats(mainDept.name);
              const deptUsers = getDepartmentUsers(mainDept.name);
              const deptSubDepartments = subDepartmentsByParent[mainDept.name] || [];
              
              return (
                <div key={mainDept.id} className="relative">
                  {/* Main Department Card */}
                  <Card className="border-2 border-primary/30 bg-primary/5">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{mainDept.name}</CardTitle>
                            {mainDept.description && (
                              <p className="text-sm text-muted-foreground mt-1">{mainDept.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {stats.totalUsers}
                          </Badge>
                          {deptSubDepartments.length > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Network className="h-3 w-3" />
                              {deptSubDepartments.length} sub-depts
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Department Members */}
                      {deptUsers.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Department Members
                          </h4>
                          
                          {/* Role Distribution */}
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.roleCounts).map(([role, count]) => (
                              <Badge key={role} className={`${getRoleBadgeColor(role)} flex items-center gap-1`}>
                                {getRoleIcon(role)}
                                <span className="capitalize">{role}</span>
                                <span className="ml-1">({count})</span>
                              </Badge>
                            ))}
                          </div>
                          
                          {/* Member List */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {deptUsers.slice(0, 6).map((user) => (
                              <Card key={user.id} className="border border-border">
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h5 className="font-medium text-sm">
                                        {user.first_name} {user.last_name}
                                      </h5>
                                      <Badge variant="outline" className="text-xs">
                                        {user.employee_id || 'No ID'}
                                      </Badge>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                                        {getRoleIcon(user.role)}
                                        <span className="ml-1 capitalize">{user.role}</span>
                                      </Badge>
                                    </div>
                                    
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
                            
                            {deptUsers.length > 6 && (
                              <Card className="border border-dashed border-border">
                                <CardContent className="p-3 flex items-center justify-center">
                                  <span className="text-sm text-muted-foreground">
                                    +{deptUsers.length - 6} more members
                                  </span>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Sub-Departments */}
                  {deptSubDepartments.length > 0 && (
                    <div className="mt-6 ml-8">
                      <div className="flex items-center gap-2 mb-4">
                        <ArrowDown className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium text-muted-foreground">Sub-Departments</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deptSubDepartments.map((subDept) => {
                          const subStats = getDepartmentStats(subDept.name);
                          const subUsers = getDepartmentUsers(subDept.name);
                          
                          return (
                            <Card key={subDept.id} className="border border-blue-200 bg-blue-50/50">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Network className="h-4 w-4 text-blue-600" />
                                    {subDept.name}
                                  </CardTitle>
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {subStats.totalUsers}
                                  </Badge>
                                </div>
                                {subDept.description && (
                                  <p className="text-sm text-muted-foreground">{subDept.description}</p>
                                )}
                              </CardHeader>
                              <CardContent>
                                {subUsers.length > 0 && (
                                  <div className="space-y-3">
                                    {/* Role Distribution */}
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(subStats.roleCounts).map(([role, count]) => (
                                        <Badge key={role} className={`text-xs ${getRoleBadgeColor(role)}`}>
                                          {role} ({count})
                                        </Badge>
                                      ))}
                                    </div>
                                    
                                    {/* Member Preview */}
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Members:</p>
                                      {subUsers.slice(0, 3).map((user) => (
                                        <div key={user.id} className="text-xs flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${getRoleBadgeColor(user.role).split(' ')[0]}`}></div>
                                          <span>{user.first_name} {user.last_name}</span>
                                          <Badge variant="outline" className="text-xs px-1 py-0">
                                            {user.role}
                                          </Badge>
                                        </div>
                                      ))}
                                      {subUsers.length > 3 && (
                                        <p className="text-xs text-muted-foreground">
                                          +{subUsers.length - 3} more...
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Connection Line to Next Department */}
                  {index < mainDepartments.length - 1 && (
                    <div className="flex justify-center mt-8">
                      <div className="w-px h-8 bg-gradient-to-b from-primary/30 to-transparent"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Department Hierarchy Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Department Hierarchy Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Departments Summary */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Main Departments
              </h4>
              <div className="space-y-2">
                {mainDepartments.map((dept) => {
                  const stats = getDepartmentStats(dept.name);
                  return (
                    <div key={dept.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <span className="font-medium">{dept.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {stats.totalUsers} members
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {subDepartmentsByParent[dept.name]?.length || 0} sub-depts
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Sub-Departments Summary */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Network className="h-4 w-4" />
                Sub-Departments
              </h4>
              <div className="space-y-2">
                {subDepartments.map((subDept) => {
                  const stats = getDepartmentStats(subDept.name);
                  return (
                    <div key={subDept.id} className="flex items-center justify-between p-2 rounded-md bg-blue-50/50">
                      <div>
                        <span className="font-medium">{subDept.name}</span>
                        <p className="text-xs text-muted-foreground">
                          Under: {subDept.parent_department_name}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {stats.totalUsers} members
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
