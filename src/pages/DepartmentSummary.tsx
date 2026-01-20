import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, ClipboardList, CheckCircle, Clock, AlertCircle, TrendingUp, Bell, Activity, UserPlus, Plus, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fastapiService } from "@/services/fastapi-service";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface DepartmentSummary {
  tasks_count: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  users_count: number;
  departments: Array<{
    id: string;
    name: string;
    parent_department_id?: string;
    parent_department_name?: string;
    tasks_count?: number;
    completed_tasks?: number;
    pending_tasks?: number;
    overdue_tasks?: number;
    users_count?: number;
  }>;
}

interface PositionInfo {
  id: string;
  name: string;
  level: number;
  departments: Array<{
    id: string;
    name: string;
    parent_department_id?: string;
    parent_department_name?: string;
  }>;
}

interface Activity {
  id: string;
  type: 'notification' | 'audit';
  title?: string;
  message: string;
  notification_type?: string;
  action?: string;
  table_name?: string;
  created_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    employee_id: string;
    department_id?: string;
    department_name?: string;
  };
  task_id?: string;
  task?: {
    id?: string;
    title?: string;
    status?: string;
    priority?: string;
    due_date?: string;
    assignee_name?: string;
    accountable_name?: string;
  };
  target_user?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    employee_id?: string;
    email?: string;
    position_name?: string;
    department_name?: string;
  };
}

export default function DepartmentSummary() {
  const { user, employee } = useAuth();
  const [summary, setSummary] = useState<DepartmentSummary | null>(null);
  const [positionInfo, setPositionInfo] = useState<PositionInfo | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userInfo, setUserInfo] = useState<{firstName: string; lastName: string; departmentName: string} | null>(null);

  useEffect(() => {
    if (user) {
      checkAccessAndLoadSummary();
    }
  }, [user]);

  const checkAccessAndLoadSummary = async () => {
    try {
      setLoading(true);
      
      // Get user's position information
      // user can be either from useAuth (has id) or employee from localStorage
      const userId = (user as any)?.id || (user as any)?.employee?.id;
      
      if (!userId) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Get user details including position
      const userResponse = await fastapiService.getUser(userId);
      const positionId = userResponse.position_id;
      
      // Store user info for welcome message
      const firstName = userResponse.first_name || employee?.first_name || 'User';
      const lastName = userResponse.last_name || employee?.last_name || '';
      const userName = `${firstName} ${lastName}`.trim();

      if (!positionId) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Get position details and departments
      const positionResponse = await fastapiService.getPosition(positionId);
      const positionLevel = positionResponse.level || 0;
      
      // Check if position level is supervisor (2), manager (3), admin (4), or super admin (5)
      const isManagerOrAbove = positionLevel >= 2;
      
      // Get departments for this position
      // Try to get from position response first (it includes departments)
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
      
      // Always include user's own department if it exists and is not already in the list
      if (userResponse.department_id) {
        const userDeptId = userResponse.department_id;
        const userDeptAlreadyIncluded = departments.some((d: any) => d.id === userDeptId);
        
        if (!userDeptAlreadyIncluded) {
          try {
            const departmentsResponse = await fastapiService.getDepartments();
            const allDepartments = Array.isArray(departmentsResponse) ? departmentsResponse : departmentsResponse.departments || [];
            const userDept = allDepartments.find((d: any) => d.id === userDeptId);
            if (userDept) {
              // Add user's department to the beginning of the list
              departments = [{
                id: userDept.id,
                name: userDept.name,
                parent_department_id: userDept.parent_department_id,
                parent_department_name: userDept.parent_department_name
              }, ...departments];
            }
          } catch (error) {
            console.warn("Failed to fetch user's department:", error);
          }
        }
      }
      
      // If still no departments and position doesn't apply to all, use user's own department as fallback
      if (departments.length === 0 && !positionResponse.applies_to_all_departments && userResponse.department_id) {
        try {
          const departmentsResponse = await fastapiService.getDepartments();
          const allDepartments = Array.isArray(departmentsResponse) ? departmentsResponse : departmentsResponse.departments || [];
          const userDept = allDepartments.find((d: any) => d.id === userResponse.department_id);
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
      
      // Check if position has departments assigned or applies to all
      // Managers and above should see summary if they have at least one department or apply to all
      const hasDepartments = departments.length > 0 || positionResponse.applies_to_all_departments;

      if (isManagerOrAbove && hasDepartments) {
        setHasAccess(true);
        setPositionInfo({
          id: positionId,
          name: positionResponse.name,
          level: positionLevel,
          departments: departments
        });
        
        // Set user info for welcome message - prioritize user's own department
        let primaryDepartment = 'your department';
        if (userResponse.department_name) {
          primaryDepartment = userResponse.department_name;
        } else if (userResponse.department_id) {
          // Try to fetch department name if not in userResponse
          try {
            const departmentsResponse = await fastapiService.getDepartments();
            const allDepartments = Array.isArray(departmentsResponse) ? departmentsResponse : departmentsResponse.departments || [];
            const userDept = allDepartments.find((d: any) => d.id === userResponse.department_id);
            if (userDept) {
              primaryDepartment = userDept.name;
            }
          } catch (error) {
            console.warn("Failed to fetch user's department name:", error);
            // Fallback to first position department
            if (departments.length > 0) {
              primaryDepartment = departments[0].name;
            }
          }
        } else if (departments.length > 0) {
          // Fallback to first position department if user has no department
          primaryDepartment = departments[0].name;
        }
        
        setUserInfo({
          firstName: firstName,
          lastName: lastName,
          departmentName: primaryDepartment
        });

        // Get department summary
        let summaryFailed = false;
        try {
          const summaryResponse = await fastapiService.getUserDepartmentSummary(userId);
          
          // If summary has no departments but user has a department, ensure it's included
          if (summaryResponse && (!summaryResponse.departments || summaryResponse.departments.length === 0)) {
            if (userResponse.department_id) {
              // Find user's department in the departments list we built
              const userDept = departments.find((d: any) => d.id === userResponse.department_id);
              if (userDept) {
                summaryResponse.departments = [{
                  id: userDept.id,
                  name: userDept.name,
                  parent_department_id: userDept.parent_department_id,
                  parent_department_name: userDept.parent_department_name,
                  tasks_count: 0,
                  completed_tasks: 0,
                  pending_tasks: 0,
                  overdue_tasks: 0,
                  users_count: 0
                }];
              }
            }
          }
          
          setSummary(summaryResponse);
        } catch (error: any) {
          // Handle 404 - endpoint might not be deployed yet
          // Check multiple ways the error might indicate 404
          const errorMessage = error?.message || '';
          const errorStatus = error?.status || error?.response?.status;
          const is404 = errorStatus === 404 || 
                       errorMessage.includes('404') ||
                       errorMessage.includes('Not Found') ||
                       errorMessage.includes('department-summary') ||
                       (errorMessage.includes('Get department summary failed') && !errorMessage.includes('500')); // If endpoint fails and it's not 500, assume 404
          
          if (is404) {
            console.warn("Department summary endpoint not available (not deployed yet). Using fallback data.", error);
            summaryFailed = true;
            // Set empty summary as fallback, but ensure user's department is included
            const fallbackDepartments = departments.length > 0 
              ? departments.map(d => ({
                  id: d.id,
                  name: d.name,
                  parent_department_id: d.parent_department_id,
                  parent_department_name: d.parent_department_name,
                  tasks_count: 0,
                  completed_tasks: 0,
                  pending_tasks: 0,
                  overdue_tasks: 0,
                  users_count: 0
                }))
              : (userResponse.department_id && userResponse.department_name ? [{
                  id: userResponse.department_id,
                  name: userResponse.department_name,
                  parent_department_id: null,
                  parent_department_name: null,
                  tasks_count: 0,
                  completed_tasks: 0,
                  pending_tasks: 0,
                  overdue_tasks: 0,
                  users_count: 0
                }] : []);
            
            setSummary({
              tasks_count: 0,
              completed_tasks: 0,
              pending_tasks: 0,
              overdue_tasks: 0,
              users_count: 0,
              departments: fallbackDepartments
            });
            // When summary endpoint fails, show empty activities
            setActivities([]);
            // Don't re-throw 404 errors - they're handled gracefully
            // Continue execution - summaryFailed flag will prevent activities fetch
          } else {
            // Re-throw non-404 errors to be caught by outer catch
            console.error("Non-404 error getting department summary:", error);
            throw error;
          }
        }

        // Get activities for all departments (only if summary didn't fail)
        if (!summaryFailed && summary) {
          // Use department IDs from the summary response (includes sub-departments)
          const departmentIds = summary.departments?.map(d => d.id) || departments.map(d => d.id);
          if (departmentIds.length > 0) {
            try {
              const activitiesResponse = await fastapiService.getDepartmentActivities(departmentIds, 100);
              const realActivities = activitiesResponse.activities || [];
              
              // Always use real activities, even if empty
              setActivities(realActivities);
            } catch (error) {
              console.error("Error fetching activities:", error);
              // On error, show empty activities instead of mock
              setActivities([]);
            }
          } else {
            // No departments, show empty activities
            setActivities([]);
          }
        } else {
          // Summary failed, show empty activities instead of mock
          setActivities([]);
        }
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error("Error loading department summary:", error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Department Summary</h1>
            <p className="text-gray-600">Loading summary...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Department Summary</h1>
            <p className="text-gray-600">Access restricted to department managers and heads</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
              <p className="text-gray-600">
                Department Summary is only available for users with positions that:
              </p>
              <ul className="text-left mt-4 space-y-2 text-gray-600 max-w-md mx-auto">
                <li>• Have at least one department assigned or apply to all departments</li>
                <li>• Have a level of Supervisor (2), Manager (3), Admin (4), or Super Admin (5)</li>
              </ul>
              {positionInfo && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-gray-600">
                    <strong>Your Position:</strong> {positionInfo.name} (Level {positionInfo.level} - {getLevelName(positionInfo.level)})
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Departments:</strong> {positionInfo.departments.length === 0 
                      ? "None assigned" 
                      : positionInfo.departments.length === 1 
                        ? positionInfo.departments[0].name 
                        : `${positionInfo.departments.length} departments`}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group departments by main and sub
  const mainDepartments = summary?.departments.filter(d => !d.parent_department_id) || [];
  const subDepartments = summary?.departments.filter(d => d.parent_department_id) || [];
  const groupedSubDepts = subDepartments.reduce((acc, sub) => {
    const parentName = sub.parent_department_name || "Unknown";
    if (!acc[parentName]) {
      acc[parentName] = [];
    }
    acc[parentName].push(sub);
    return acc;
  }, {} as Record<string, typeof subDepartments>);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      {userInfo && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Welcome {userInfo.firstName} {userInfo.lastName}!
                </h1>
                <p className="text-lg text-gray-700">
                  Here's what's happening in <span className="font-semibold text-blue-700">{userInfo.departmentName}</span>
                </p>
                {positionInfo && (
                  <p className="text-sm text-gray-600 mt-1">
                    {positionInfo.name} • {getLevelName(positionInfo.level)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold">Department Summary</h2>
          <p className="text-gray-600">
            Overview for {positionInfo?.name} position ({getLevelName(positionInfo?.level || 0)})
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.tasks_count || 0}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary?.completed_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.tasks_count 
                ? `${Math.round((summary.completed_tasks / summary.tasks_count) * 100)}% completion rate`
                : "No tasks"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary?.pending_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">Tasks in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary?.overdue_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Departments Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{summary?.users_count ?? 0}</div>
            <p className="text-sm text-muted-foreground">Total users across departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Departments Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{summary?.departments.length || 0}</div>
            <p className="text-sm text-muted-foreground">
              {mainDepartments.length} main department{mainDepartments.length !== 1 ? 's' : ''}
              {subDepartments.length > 0 && `, ${subDepartments.length} sub-department${subDepartments.length !== 1 ? 's' : ''}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Department Sections - Grouped by Department */}
      {summary?.departments && summary.departments.length > 0 && (
        <div className="space-y-6">
          {(() => {
            // Group departments by main and sub
            const mainDepts = summary.departments.filter(d => !d.parent_department_id);
            const subDepts = summary.departments.filter(d => d.parent_department_id);
            const groupedSubDepts = subDepts.reduce((acc, sub) => {
              const parentName = sub.parent_department_name || "Unknown";
              if (!acc[parentName]) {
                acc[parentName] = [];
              }
              acc[parentName].push(sub);
              return acc;
            }, {} as Record<string, typeof subDepts>);
            
            return (
              <>
                {/* Main Departments with their summaries */}
                {mainDepts.map((dept) => {
                  const deptSubs = groupedSubDepts[dept.name] || [];
                  return (
                    <Card key={dept.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-blue-600" />
                            <div>
                              <CardTitle className="text-xl">{dept.name}</CardTitle>
                              <CardDescription>Main Department</CardDescription>
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">Main Department</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Department Statistics */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                          <div className="text-center p-4 border rounded-lg bg-gray-50">
                            <div className="text-2xl font-bold">{dept.tasks_count || 0}</div>
                            <div className="text-xs text-muted-foreground mt-1">Total Tasks</div>
                          </div>
                          <div className="text-center p-4 border rounded-lg bg-green-50">
                            <div className="text-2xl font-bold text-green-600">{dept.completed_tasks || 0}</div>
                            <div className="text-xs text-muted-foreground mt-1">Completed</div>
                          </div>
                          <div className="text-center p-4 border rounded-lg bg-yellow-50">
                            <div className="text-2xl font-bold text-yellow-600">{dept.pending_tasks || 0}</div>
                            <div className="text-xs text-muted-foreground mt-1">Pending</div>
                          </div>
                          <div className="text-center p-4 border rounded-lg bg-red-50">
                            <div className="text-2xl font-bold text-red-600">{dept.overdue_tasks || 0}</div>
                            <div className="text-xs text-muted-foreground mt-1">Overdue</div>
                          </div>
                          <div className="text-center p-4 border rounded-lg bg-blue-50">
                            <div className="text-2xl font-bold text-blue-600">{dept.users_count || 0}</div>
                            <div className="text-xs text-muted-foreground mt-1">Users</div>
                          </div>
                        </div>
                        
                        {/* Sub-Departments under this main department */}
                        {deptSubs.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Sub-Departments ({deptSubs.length})
                            </h4>
                            <div className="grid gap-4 md:grid-cols-2">
                              {deptSubs.map((sub) => (
                                <Card key={sub.id} className="bg-gray-50">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-base">{sub.name}</CardTitle>
                                    <CardDescription>Sub-Department</CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="grid grid-cols-4 gap-2 text-sm">
                                      <div>
                                        <div className="font-semibold">{sub.tasks_count || 0}</div>
                                        <div className="text-xs text-muted-foreground">Tasks</div>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-green-600">{sub.completed_tasks || 0}</div>
                                        <div className="text-xs text-muted-foreground">Done</div>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-yellow-600">{sub.pending_tasks || 0}</div>
                                        <div className="text-xs text-muted-foreground">Pending</div>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-blue-600">{sub.users_count || 0}</div>
                                        <div className="text-xs text-muted-foreground">Users</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                
                {/* Standalone Sub-Departments (not under any main department) */}
                {subDepts.filter(sub => !mainDepts.some(main => main.name === sub.parent_department_name)).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Sub-Departments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        {subDepts
                          .filter(sub => !mainDepts.some(main => main.name === sub.parent_department_name))
                          .map((sub) => (
                            <Card key={sub.id} className="bg-gray-50">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base">{sub.name}</CardTitle>
                                  <Badge variant="outline" className="text-xs">
                                    {sub.parent_department_name}
                                  </Badge>
                                </div>
                                <CardDescription>Sub-Department</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-4 gap-2 text-sm">
                                  <div>
                                    <div className="font-semibold">{sub.tasks_count || 0}</div>
                                    <div className="text-xs text-muted-foreground">Tasks</div>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-green-600">{sub.completed_tasks || 0}</div>
                                    <div className="text-xs text-muted-foreground">Done</div>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-yellow-600">{sub.pending_tasks || 0}</div>
                                    <div className="text-xs text-muted-foreground">Pending</div>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-blue-600">{sub.users_count || 0}</div>
                                    <div className="text-xs text-muted-foreground">Users</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Activities Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-2">No recent activities</p>
              <p className="text-xs text-gray-400">Activities will appear here as they occur</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 border rounded-lg transition-colors hover:bg-gray-50"
                >
                  <div className="flex-shrink-0 mt-1">
                    {activity.type === 'notification' ? (
                      <Bell className={`h-5 w-5 ${
                        activity.notification_type === 'success' ? 'text-green-600' :
                        activity.notification_type === 'warning' ? 'text-yellow-600' :
                        activity.notification_type === 'error' ? 'text-red-600' :
                        'text-blue-600'
                      }`} />
                    ) : activity.action?.toLowerCase().includes('create') || activity.action?.toLowerCase().includes('insert') ? (
                      <Plus className="h-5 w-5 text-green-600" />
                    ) : activity.action?.toLowerCase().includes('delete') ? (
                      <Trash2 className="h-5 w-5 text-red-600" />
                    ) : activity.action?.toLowerCase().includes('update') ? (
                      <Edit className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Activity className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title || activity.message}
                        </p>
                        {activity.title && activity.message !== activity.title && (
                          <p className="text-sm text-gray-600 mt-1">{activity.message}</p>
                        )}
                        
                        {/* Task Details */}
                        {activity.task && (
                          <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                            <div className="font-semibold text-blue-900 mb-1">Task: {activity.task.title}</div>
                            <div className="space-y-1">
                              {activity.task.status && (
                                <div>Status: <span className="font-medium">{activity.task.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></div>
                              )}
                              {activity.task.priority && (
                                <div>Priority: <span className="font-medium">{activity.task.priority.charAt(0).toUpperCase() + activity.task.priority.slice(1)}</span></div>
                              )}
                              {activity.task.due_date && (
                                <div>Due Date: <span className="font-medium">{new Date(activity.task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                              )}
                              {activity.task.assignee_name && (
                                <div>Responsible: <span className="font-medium">{activity.task.assignee_name}</span></div>
                              )}
                              {activity.task.accountable_name && (
                                <div>Accountable: <span className="font-medium">{activity.task.accountable_name}</span></div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* User Details */}
                        {activity.target_user && (
                          <div className="mt-2 text-xs text-gray-600 bg-green-50 p-2 rounded border border-green-200">
                            <div className="font-semibold text-green-900 mb-1">
                              User: {activity.target_user.first_name} {activity.target_user.last_name}
                            </div>
                            <div className="space-y-1">
                              {activity.target_user.employee_id && (
                                <div>Employee ID: <span className="font-medium">{activity.target_user.employee_id}</span></div>
                              )}
                              {activity.target_user.email && (
                                <div>Email: <span className="font-medium">{activity.target_user.email}</span></div>
                              )}
                              {activity.target_user.position_name && (
                                <div>Position: <span className="font-medium">{activity.target_user.position_name}</span></div>
                              )}
                              {activity.target_user.department_name && (
                                <div>Department: <span className="font-medium">{activity.target_user.department_name}</span></div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {activity.user.first_name} {activity.user.last_name}
                            {activity.user.employee_id && ` (${activity.user.employee_id})`}
                          </span>
                          {activity.user.department_name && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {activity.user.department_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    {activity.type === 'audit' && activity.new_values && (
                      <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        {activity.table_name === 'tasks' && activity.new_values.assignee_id && (
                          <div>Responsible: {activity.new_values.assignee_id}</div>
                        )}
                        {activity.table_name === 'tasks' && activity.new_values.accountable_id && (
                          <div>Accountable: {activity.new_values.accountable_id}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

