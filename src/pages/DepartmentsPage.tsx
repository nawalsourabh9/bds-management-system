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
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
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
    sub_department_name: '',
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
              .map((subDept: any) => {
                const subUserCount = usersResponse.users?.filter((user: any) => 
                  user.department_id === subDept.id
                ).length || 0;
                
                return {
                  ...subDept,
                  user_count: subUserCount,
                  department_type: 'sub_department',
                };
              });
            
            return {
              ...dept,
              user_count: userCount,
              manager_name: managerName,
              sub_department_count: subDepartmentCount,
              parent_department_name: parentDepartmentName,
              department_type: isSubDepartment ? 'sub_department' : 'department',
              sub_departments: subDepartments,
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
        
        const mainDepartment = await fastapiService.createDepartment(mainDeptData);
        
        // If sub-department is requested, create it
        if (formData.has_sub_department && formData.sub_department_name) {
          const subDeptData = {
            name: formData.sub_department_name,
            description: `Sub-department of ${formData.name}`,
            manager_id: formData.manager_id || null,
            parent_department_id: mainDepartment.id,
          };
          await fastapiService.createDepartment(subDeptData);
        }
        
        toast({
          title: 'Success',
          description: formData.has_sub_department 
            ? 'Department and sub-department created successfully'
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
      
      // If sub-department is requested and doesn't exist, create it
      if (formData.has_sub_department && formData.sub_department_name) {
        // Check if sub-department already exists
        const existingSubDept = departments.find(dept => 
          dept.parent_department_id === editingDepartment.id
        );
        
        if (!existingSubDept) {
          const subDeptData = {
            name: formData.sub_department_name,
            description: `Sub-department of ${formData.name}`,
            manager_id: formData.manager_id || null,
            parent_department_id: editingDepartment.id,
          };
          await fastapiService.createDepartment(subDeptData);
        }
      }
      
      toast({
        title: 'Success',
        description: formData.has_sub_department 
          ? 'Department updated and sub-department created successfully'
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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete department',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || '',
      manager_id: department.manager_id || '',
      parent_department_id: department.parent_department_id || '',
      has_sub_department: department.has_sub_department || false,
      sub_department_name: department.sub_department_name || '',
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
      sub_department_name: '',
    });
  };

  // Group departments: main departments with their sub-departments
  const groupedDepartments = departments.reduce((acc, dept) => {
    if (!dept.parent_department_id) {
      // Main department
      acc[dept.id] = {
        ...dept,
        sub_departments: []
      };
    } else {
      // Sub-department - find its parent
      const parentId = dept.parent_department_id;
      if (acc[parentId]) {
        acc[parentId].sub_departments.push(dept);
      }
    }
    return acc;
  }, {} as Record<string, Department & { sub_departments: Department[] }>);

  const filteredDepartments = Object.values(groupedDepartments).filter(dept =>
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
            <p className="text-gray-600">Organize users into departments and assign managers</p>
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
                  value={formData.parent_department_id} 
                  onValueChange={(value) => setFormData({ ...formData, parent_department_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent department (leave empty for main department)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Main Department)</SelectItem>
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
                    onChange={(e) => setFormData({ ...formData, has_sub_department: e.target.checked })}
                    className="rounded"
                    disabled={!!formData.parent_department_id}
                  />
                  <Label htmlFor="has_sub_department" className={formData.parent_department_id ? 'text-gray-400' : ''}>
                    Has Sub-Department (only for main departments)
                  </Label>
                </div>
                {formData.has_sub_department && !formData.parent_department_id && (
                  <div className="space-y-2">
                    <Label htmlFor="sub_department_name">Sub-Department Name</Label>
                    <Input
                      id="sub_department_name"
                      value={formData.sub_department_name}
                      onChange={(e) => setFormData({ ...formData, sub_department_name: e.target.value })}
                      placeholder="Enter sub-department name"
                    />
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
                <Label htmlFor="manager">Department Manager (Optional)</Label>
                <Select value={formData.manager_id} onValueChange={(value) => setFormData({ ...formData, manager_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a manager" />
                  </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
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
                          <span><strong>Manager:</strong> {department.manager_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-600" />
                        <span><strong>Users:</strong> {department.user_count || 0}</span>
                      </div>
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
              Update department information and manager assignment.
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
                value={formData.parent_department_id || ''} 
                onValueChange={(value) => setFormData({ ...formData, parent_department_id: value || '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent department (leave empty for main department)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Main Department)</SelectItem>
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
                  onChange={(e) => setFormData({ ...formData, has_sub_department: e.target.checked })}
                  className="rounded"
                  disabled={!!formData.parent_department_id}
                />
                <Label htmlFor="edit_has_sub_department" className={formData.parent_department_id ? 'text-gray-400' : ''}>
                  Has Sub-Department (only for main departments)
                </Label>
              </div>
              {formData.has_sub_department && !formData.parent_department_id && (
                <div className="space-y-2">
                  <Label htmlFor="edit_sub_department_name">Sub-Department Name</Label>
                  <Input
                    id="edit_sub_department_name"
                    value={formData.sub_department_name}
                    onChange={(e) => setFormData({ ...formData, sub_department_name: e.target.value })}
                    placeholder="Enter sub-department name"
                  />
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
              <Label htmlFor="edit_manager">Department Manager (Optional)</Label>
              <Select value={formData.manager_id} onValueChange={(value) => setFormData({ ...formData, manager_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
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
