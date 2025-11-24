import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Search, Building2, Users, GitBranch } from 'lucide-react';
import { fastapiService } from '@/services/fastapi-service';
import { useToast } from '@/hooks/use-toast';

interface Position {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  parent_department_id?: string;
  department_type?: string;
  created_at: string;
  updated_at: string;
  manager_name?: string;
  user_count?: number;
  parent_department_name?: string;
  sub_department_count?: number;
  has_sub_department?: boolean;
  sub_department_name?: string;
  positions?: Position[];
  sub_departments?: Department[];
  users?: User[];
}

interface User {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  role: string;
  position_name?: string;
  employee_id?: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: '',
    parent_department_id: '',
    has_sub_department: false,
    sub_departments: [] as Array<{ name: string; description: string }>, // Multiple sub-departments
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await fastapiService.getDepartments();
      const deptData = response.departments || [];
      
      // Get user count, sub-department count, and parent department name for each department
      const departmentsWithDetails = await Promise.all(
        deptData.map(async (dept: Department) => {
          try {
            const usersResponse = await fastapiService.getUsers();
            const userCount = usersResponse.users?.filter((user: any) => 
              user.department_id === dept.id
            ).length || 0;
            
            // Get manager name if manager_id exists
            let managerName = '';
            if (dept.manager_id) {
              const manager = usersResponse.users?.find((user: any) => user.id === dept.manager_id);
              managerName = manager ? `${manager.first_name} ${manager.last_name}` : '';
            }
            
            // Get sub-department count
            const subDepartmentCount = deptData.filter((otherDept: any) => 
              otherDept.parent_department_id === dept.id
            ).length || 0;
            
            // Get parent department name if parent_department_id exists
            let parentDepartmentName = '';
            if (dept.parent_department_id) {
              const parentDept = deptData.find((otherDept: any) => otherDept.id === dept.parent_department_id);
              parentDepartmentName = parentDept ? parentDept.name : '';
            }
            
            // Determine if it's a sub-department based on parent_department_id
            const isSubDepartment = !!dept.parent_department_id;
            
            // Build sub-departments array for this department
            const subDepartments = deptData
              .filter((otherDept: any) => otherDept.parent_department_id === dept.id)
              .map(async (subDept: any) => {
                const subUserCount = usersResponse.users?.filter((user: any) => 
                  user.department_id === subDept.id
                ).length || 0;
                
                // Fetch positions for this sub-department
                let subPositions: Position[] = [];
                try {
                  const positionsResponse = await fastapiService.getPositions(subDept.id);
                  subPositions = positionsResponse.positions || [];
                } catch (error) {
                  console.error(`Error fetching positions for sub-department ${subDept.id}:`, error);
                }
                
                // Get users for this sub-department
                const subUsers = usersResponse.users?.filter((user: any) => 
                  user.department_id === subDept.id
                ) || [];
                
                return {
                  ...subDept,
                  user_count: subUserCount,
                  department_type: 'sub_department',
                  positions: subPositions,
                  users: subUsers,
                };
              });
            
            // Wait for all sub-department data to be fetched
            const subDepartmentsWithData = await Promise.all(subDepartments);
            
            // Fetch positions for main department
            let mainPositions: Position[] = [];
            try {
              const positionsResponse = await fastapiService.getPositions(dept.id);
              mainPositions = positionsResponse.positions || [];
            } catch (error) {
              console.error(`Error fetching positions for department ${dept.id}:`, error);
            }
            
            // Get users for main department
            const mainUsers = usersResponse.users?.filter((user: any) => 
              user.department_id === dept.id
            ) || [];
            
            return {
              ...dept,
              user_count: userCount,
              manager_name: managerName,
              sub_department_count: subDepartmentCount,
              parent_department_name: parentDepartmentName,
              department_type: isSubDepartment ? 'sub_department' : 'department',
              sub_departments: subDepartmentsWithData,
              positions: mainPositions,
              users: mainUsers,
            };
          } catch (error) {
            return {
              ...dept,
              user_count: 0,
              manager_name: '',
              sub_department_count: 0,
              parent_department_name: '',
              department_type: !!dept.parent_department_id ? 'sub_department' : 'department',
              sub_departments: [],
            };
          }
        })
      );
      
      setDepartments(departmentsWithDetails);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch departments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fastapiService.getUsers();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleCreateDepartment = async () => {
    try {
      // If parent_department_id is provided, this is a sub-department
      if (formData.parent_department_id) {
        const subDeptData = {
          name: formData.name,
          description: formData.description,
          manager_id: formData.manager_id || null,
          parent_department_id: formData.parent_department_id,
        };
        await fastapiService.createDepartment(subDeptData);
        
        toast({
          title: 'Success',
          description: 'Sub-department created successfully',
        });
      } else {
        // Create main department first
        const mainDeptData = {
          name: formData.name,
          description: formData.description,
          manager_id: formData.manager_id || null,
        };
        
        const mainDeptResp = await fastapiService.createDepartment(mainDeptData);
        const mainDepartment = (mainDeptResp && mainDeptResp.department) ? mainDeptResp.department : mainDeptResp;
        
        // Create all sub-departments if any
        if (formData.has_sub_department && formData.sub_departments.length > 0) {
          const subDeptPromises = formData.sub_departments
            .filter(subDept => subDept.name.trim()) // Only create non-empty sub-departments
            .map(subDept => {
              const subDeptData = {
                name: subDept.name,
                description: subDept.description || `Sub-department of ${formData.name}`,
                manager_id: formData.manager_id || null,
                parent_department_id: mainDepartment?.id,
              };
              return fastapiService.createDepartment(subDeptData);
            });
          await Promise.all(subDeptPromises);
        }
        
        toast({
          title: 'Success',
          description: formData.has_sub_department && formData.sub_departments.length > 0
            ? `Department and ${formData.sub_departments.filter(s => s.name.trim()).length} sub-department(s) created successfully`
            : 'Department created successfully',
        });
      }
      
      setIsCreateDialogOpen(false);
      resetForm();
      fetchDepartments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create department',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartment) return;

    try {
      // Update department
      const updateData = {
        name: formData.name,
        description: formData.description,
        manager_id: formData.manager_id || null,
        parent_department_id: formData.parent_department_id || null,
      };
      
      await fastapiService.updateDepartment(editingDepartment.id, updateData);
      
      // Create/update sub-departments if any
      if (formData.has_sub_department && formData.sub_departments.length > 0) {
        // Get existing sub-departments
        const existingSubDepts = departments.filter(dept => 
          dept.parent_department_id === editingDepartment.id
        );
        
        // Create new sub-departments that don't exist yet
        const newSubDepts = formData.sub_departments.filter(subDept => 
          subDept.name && !existingSubDepts.find(existing => existing.name === subDept.name)
        );
        
        if (newSubDepts.length > 0) {
          const subDeptPromises = newSubDepts.map(subDept => {
            const subDeptData = {
              name: subDept.name,
              description: subDept.description || `Sub-department of ${formData.name}`,
              manager_id: formData.manager_id || null,
              parent_department_id: editingDepartment.id,
            };
            return fastapiService.createDepartment(subDeptData);
          });
          await Promise.all(subDeptPromises);
        }
      }
      
      toast({
        title: 'Success',
        description: formData.has_sub_department && formData.sub_departments.length > 0
          ? `Department updated and ${formData.sub_departments.length} sub-department(s) created successfully`
          : 'Department updated successfully',
      });
      setIsEditDialogOpen(false);
      setEditingDepartment(null);
      resetForm();
      fetchDepartments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update department',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (!confirm('Are you sure you want to delete this department? This action cannot be undone.')) return;

    try {
      await fastapiService.deleteDepartment(departmentId);
      toast({
        title: 'Success',
        description: 'Department deleted successfully',
      });
      fetchDepartments();
    } catch (error: any) {
      const errorMessage = error?.message || error?.detail || 'Failed to delete department';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    // Get existing sub-departments for this department
    const existingSubDepts = departments
      .filter(d => d.parent_department_id === department.id)
      .map(d => ({ name: d.name, description: d.description || '' }));
    
    setFormData({
      name: department.name,
      description: department.description || '',
      manager_id: department.manager_id || '',
      parent_department_id: department.parent_department_id || '',
      has_sub_department: existingSubDepts.length > 0,
      sub_departments: existingSubDepts.length > 0 ? existingSubDepts : [],
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      manager_id: '',
      parent_department_id: '',
      has_sub_department: false,
      sub_departments: [],
    });
  };

  // Group departments: main departments with their sub-departments
  // First pass: create entries for ALL departments (main and sub)
  const groupedDepartments = departments.reduce((acc, dept) => {
    acc[dept.id] = {
      ...dept,
      sub_departments: []
    };
    return acc;
  }, {} as Record<string, Department & { sub_departments: Department[] }>);

  // Second pass: add sub-departments to their parents
  departments.forEach(dept => {
    if (dept.parent_department_id) {
      const parentId = dept.parent_department_id;
      // Parent should exist from first pass, but check to be safe
      if (groupedDepartments[parentId]) {
        groupedDepartments[parentId].sub_departments.push(dept);
      }
    }
  });

  // Only show main departments (those without a parent), with their sub-departments nested
  const filteredDepartments = Object.values(groupedDepartments)
    .filter(dept => !dept.parent_department_id) // Only main departments
    .filter(dept =>
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      dept.sub_departments.some(sub => 
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.description && sub.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Department Management</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
            <p className="text-gray-600">Organize users into departments and assign department heads</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
              <DialogDescription>
                Add a new department to organize users and assign responsibilities.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parent_department">Parent Department (Optional)</Label>
                <Select 
                  value={formData.parent_department_id || 'none'} 
                  onValueChange={(value) => setFormData({ ...formData, parent_department_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent department (leave empty for main department)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Main Department)</SelectItem>
                    {departments
                      .filter(dept => !dept.parent_department_id)
                      .map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {formData.parent_department_id 
                    ? 'This will create a sub-department'
                    : 'This will create a main department'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter department name"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="has_sub_department"
                    checked={formData.has_sub_department}
                    onChange={(e) => {
                      const hasSub = e.target.checked;
                      setFormData({
                        ...formData,
                        has_sub_department: hasSub,
                        sub_departments: hasSub && formData.sub_departments.length === 0
                          ? [{ name: '', description: '' }]
                          : formData.sub_departments,
                      });
                    }}
                    className="rounded"
                    disabled={!!formData.parent_department_id}
                  />
                  <Label htmlFor="has_sub_department" className={formData.parent_department_id ? 'text-gray-400' : ''}>
                    Has Sub-Departments (only for main departments)
                  </Label>
                </div>
                {formData.has_sub_department && !formData.parent_department_id && (
                  <div className="space-y-2">
                    <Label>Sub-Departments</Label>
                    <div className="space-y-2">
                      {formData.sub_departments.map((subDept, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={subDept.name}
                            onChange={(e) => {
                              const updated = [...formData.sub_departments];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setFormData({ ...formData, sub_departments: updated });
                            }}
                            placeholder="Sub-department name"
                            className="flex-1"
                          />
                          <Textarea
                            value={subDept.description}
                            onChange={(e) => {
                              const updated = [...formData.sub_departments];
                              updated[index] = { ...updated[index], description: e.target.value };
                              setFormData({ ...formData, sub_departments: updated });
                            }}
                            placeholder="Description (optional)"
                            className="flex-1"
                            rows={1}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updated = formData.sub_departments.filter((_, i) => i !== index);
                              setFormData({ ...formData, sub_departments: updated });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            sub_departments: [...formData.sub_departments, { name: '', description: '' }],
                          });
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Sub-Department
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter department description"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager">Department Head (Optional)</Label>
                <Select value={formData.manager_id} onValueChange={(value) => setFormData({ ...formData, manager_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department head" />
                  </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name || ''} ({user.email || 'No email'})
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDepartment}>Create Department</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Departments ({filteredDepartments.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Show only main departments at top-level; sub-departments render inside their parent */}
            {filteredDepartments
              .filter((d) => !d.parent_department_id)
              .map((department) => (
              <Card key={department.id} className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-green-600" />
                        <CardTitle className="text-lg">{department.name}</CardTitle>
                        {!department.parent_department_id ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Main Department
                          </span>
                        ) : (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                            Sub Department{department.parent_department_name ? ` of ${department.parent_department_name}` : ''}
                          </span>
                        )}
                      </div>
                      {department.description && (
                        <p className="text-sm text-gray-600 mt-1">{department.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(department)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteDepartment(department.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Main Department Info */}
                    <div className="space-y-2 text-sm">
                      {department.manager_name && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span><strong>Department Head:</strong> {department.manager_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-600" />
                        <span><strong>Users:</strong> {department.user_count || 0}</span>
                      </div>
                      
                      {/* Main Department Users */}
                      {department.users && department.users.length > 0 && (
                        <div className="mt-2 pl-6">
                          <div className="text-xs font-medium text-gray-700 mb-1">Department Users:</div>
                          <div className="space-y-1">
                            {department.users.slice(0, 5).map((user) => (
                              <div key={user.id} className="text-xs text-gray-700">
                                {user.first_name} {user.last_name || ''}
                                {user.position_name && <span className="text-gray-500"> - {user.position_name}</span>}
                                {user.employee_id && <span className="text-gray-400"> ({user.employee_id})</span>}
                              </div>
                            ))}
                            {department.users.length > 5 && (
                              <span className="text-xs text-gray-500">
                                +{department.users.length - 5} more users
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500">
                        Created: {new Date(department.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Sub-Departments */}
                    {department.sub_departments && department.sub_departments.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <GitBranch className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-gray-700">Sub-Departments</span>
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                            {department.sub_departments.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {department.sub_departments.map((subDept) => (
                            <div key={subDept.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <GitBranch className="w-3 h-3 text-orange-600" />
                                    <span className="text-sm font-medium text-gray-900">{subDept.name}</span>
                                    <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                      Sub Department
                                    </span>
                                  </div>
                                  {subDept.description && (
                                    <p className="text-xs text-gray-600 mt-1">{subDept.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                    <span>Users: {subDept.user_count || 0}</span>
                                    <span>Created: {new Date(subDept.created_at).toLocaleDateString()}</span>
                                  </div>
                                  
                                  {/* Sub-department positions */}
                                  {subDept.positions && subDept.positions.length > 0 && (
                                    <div className="mt-2">
                                      <div className="flex items-center gap-1 mb-1">
                                        <Users className="w-3 h-3 text-blue-600" />
                                        <span className="text-xs font-medium text-gray-700">Positions:</span>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                                          {subDept.positions.length}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {subDept.positions.slice(0, 3).map((position) => (
                                          <span key={position.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                                            {position.name}
                                          </span>
                                        ))}
                                        {subDept.positions.length > 3 && (
                                          <span className="text-xs text-gray-500">
                                            +{subDept.positions.length - 3} more
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Sub-department users */}
                                  {subDept.users && subDept.users.length > 0 && (
                                    <div className="mt-2">
                                      <div className="flex items-center gap-1 mb-1">
                                        <Users className="w-3 h-3 text-green-600" />
                                        <span className="text-xs font-medium text-gray-700">Users:</span>
                                        <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">
                                          {subDept.users.length}
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        {subDept.users.slice(0, 3).map((user) => (
                                          <div key={user.id} className="text-xs text-gray-700">
                                            {user.first_name} {user.last_name || ''} 
                                            {user.position_name && <span className="text-gray-500"> - {user.position_name}</span>}
                                            {user.employee_id && <span className="text-gray-400"> ({user.employee_id})</span>}
                                          </div>
                                        ))}
                                        {subDept.users.length > 3 && (
                                          <span className="text-xs text-gray-500">
                                            +{subDept.users.length - 3} more users
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(subDept)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteDepartment(subDept.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Positions */}
                    {department.positions && department.positions.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">Positions</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {department.positions.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {department.positions.map((position) => (
                            <div key={position.id} className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-3 h-3 text-blue-600" />
                                    <span className="text-sm font-medium text-gray-900">{position.name}</span>
                                  </div>
                                  {position.description && (
                                    <p className="text-xs text-gray-600 mt-1">{position.description}</p>
                                  )}
                                </div>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  Active
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredDepartments.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No departments found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information and department head assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Department Name</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter department name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_parent_department">Parent Department</Label>
              <Select 
                value={formData.parent_department_id || 'none'} 
                onValueChange={(value) => setFormData({ ...formData, parent_department_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent department (leave empty for main department)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Main Department)</SelectItem>
                  {departments
                    .filter(dept => !dept.parent_department_id && dept.id !== editingDepartment?.id)
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {formData.parent_department_id 
                  ? 'This department is a sub-department'
                  : 'This is a main department'}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_has_sub_department"
                  checked={formData.has_sub_department}
                  onChange={(e) => {
                    const hasSub = e.target.checked;
                    setFormData({
                      ...formData,
                      has_sub_department: hasSub,
                      sub_departments: hasSub && formData.sub_departments.length === 0
                        ? [{ name: '', description: '' }]
                        : formData.sub_departments,
                    });
                  }}
                  className="rounded"
                  disabled={!!formData.parent_department_id}
                />
                <Label htmlFor="edit_has_sub_department" className={formData.parent_department_id ? 'text-gray-400' : ''}>
                  Has Sub-Departments (only for main departments)
                </Label>
              </div>
              {formData.has_sub_department && !formData.parent_department_id && (
                <div className="space-y-2">
                  <Label>Sub-Departments</Label>
                  <div className="space-y-2">
                    {formData.sub_departments.map((subDept, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={subDept.name}
                          onChange={(e) => {
                            const updated = [...formData.sub_departments];
                            updated[index] = { ...updated[index], name: e.target.value };
                            setFormData({ ...formData, sub_departments: updated });
                          }}
                          placeholder="Sub-department name"
                          className="flex-1"
                        />
                        <Textarea
                          value={subDept.description}
                          onChange={(e) => {
                            const updated = [...formData.sub_departments];
                            updated[index] = { ...updated[index], description: e.target.value };
                            setFormData({ ...formData, sub_departments: updated });
                          }}
                          placeholder="Description (optional)"
                          className="flex-1"
                          rows={1}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = formData.sub_departments.filter((_, i) => i !== index);
                            setFormData({ ...formData, sub_departments: updated });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          sub_departments: [...formData.sub_departments, { name: '', description: '' }],
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Sub-Department
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter department description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_manager">Department Head (Optional)</Label>
              <Select value={formData.manager_id} onValueChange={(value) => setFormData({ ...formData, manager_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a department head" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name || ''} ({user.email || 'No email'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDepartment}>Update Department</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
