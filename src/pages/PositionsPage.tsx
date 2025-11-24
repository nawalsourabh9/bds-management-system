import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Edit, Trash, Building2 } from "lucide-react";
import { fastapiService } from "@/services/fastapi-service";

interface Position {
  id: string;
  name: string;
  description?: string;
  department_id: string;
  department_name?: string;
  parent_department_id?: string;
  parent_department_name?: string;
  sub_department_name?: string; // Name of the sub-department if position belongs to one
  level: number;
  is_active: boolean;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  parent_department_name?: string;
}

export const PositionsPage = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    department_id: "",
    department_ids: [] as string[],
    applies_to_all_departments: false,
    level: 1
  });

  useEffect(() => {
    fetchPositions();
    fetchDepartments();
  }, []);

  const fetchPositions = async () => {
    try {
      const response = await fastapiService.getPositions();
      setPositions(response.positions || []);
    } catch (error) {
      console.error("Error fetching positions:", error);
      toast.error("Failed to load positions");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fastapiService.getDepartments();
      setDepartments(response.departments || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to load departments");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        department_ids: formData.applies_to_all_departments ? [] : formData.department_ids
      };
      
      if (editingPosition) {
        await fastapiService.updatePosition(editingPosition.id, submitData);
        toast.success("Position updated successfully");
      } else {
        await fastapiService.createPosition(submitData);
        toast.success("Position created successfully");
      }
      setIsCreateOpen(false);
      setIsEditOpen(false);
      setEditingPosition(null);
      // Reset form to empty fields
      setFormData({ name: "", description: "", department_id: "", department_ids: [], applies_to_all_departments: false, level: 1 });
      fetchPositions();
    } catch (error: any) {
      console.error("Error saving position:", error);
      toast.error(error.message || "Failed to save position");
    }
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    const deptIds = (position as any).departments?.map((d: any) => d.id) || 
                    (position.department_id ? [position.department_id] : []);
    setFormData({
      name: position.name,
      description: position.description || "",
      department_id: position.department_id || "",
      department_ids: deptIds,
      applies_to_all_departments: (position as any).applies_to_all_departments || false,
      level: position.level
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (positionId: string) => {
    if (!confirm("Are you sure you want to delete this position?")) return;
    
    try {
      await fastapiService.deletePosition(positionId);
      toast.success("Position deleted successfully");
      fetchPositions();
    } catch (error: any) {
      console.error("Error deleting position:", error);
      toast.error(error.message || "Failed to delete position");
    }
  };

  const getLevelName = (level: number) => {
    const levels = {
      1: "User",
      2: "Supervisor", 
      3: "Manager",
      4: "Admin",
      5: "Super Admin"
    };
    return levels[level as keyof typeof levels] || "Unknown";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading positions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Positions Management</h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Position</span>
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-medium">Position Name</th>
                <th className="text-left p-4 font-medium">Department</th>
                <th className="text-left p-4 font-medium">Sub-Department</th>
                <th className="text-left p-4 font-medium">Level</th>
                <th className="text-left p-4 font-medium">Description</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const depts = (position as any).departments || [];
                const mainDepts = depts.filter((d: any) => !d.parent_department_id);
                const subDepts = depts.filter((d: any) => d.parent_department_id);
                
                // Group sub-departments by parent department
                const groupedSubDepts: Record<string, Array<{id: string, name: string}>> = {};
                subDepts.forEach((sub: any) => {
                  const parentName = sub.parent_department_name || 'Unknown';
                  if (!groupedSubDepts[parentName]) {
                    groupedSubDepts[parentName] = [];
                  }
                  groupedSubDepts[parentName].push({ id: sub.id, name: sub.name });
                });
                
                return (
                  <tr key={position.id} className="border-b hover:bg-gray-50 align-top">
                    <td className="p-4 font-medium">{position.name}</td>
                    <td className="p-4 min-w-[200px]">
                      {(position as any).applies_to_all_departments 
                        ? <span className="font-semibold text-blue-600">All Departments</span>
                        : mainDepts.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {mainDepts.map((dept: any) => (
                              <div key={dept.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                                {dept.name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )
                      }
                    </td>
                    <td className="p-4 min-w-[250px]">
                      {(position as any).applies_to_all_departments 
                        ? <span className="text-gray-400">-</span>
                        : Object.keys(groupedSubDepts).length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {Object.entries(groupedSubDepts).map(([parentName, subs]) => (
                              <div key={parentName} className="flex flex-col gap-1">
                                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  {parentName}
                                </div>
                                <div className="flex flex-col gap-1 pl-2 border-l-2 border-gray-200">
                                  {subs.map((sub) => (
                                    <div key={sub.id} className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-sm">
                                      {sub.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )
                      }
                    </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getLevelName(position.level)}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{position.description || '-'}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      position.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {position.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(position)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(position.id)}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Position Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Position</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Position Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Quality Engineer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the position"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-departments"
                  checked={formData.applies_to_all_departments}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      applies_to_all_departments: checked as boolean,
                      department_ids: checked ? [] : []
                    });
                  }}
                />
                <Label htmlFor="all-departments" className="cursor-pointer">
                  Applies to All Departments (e.g., CTO, CEO)
                </Label>
              </div>
              
              {!formData.applies_to_all_departments && (
                <div className="space-y-2">
                  <Label htmlFor="departments">Select Departments</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-3">
                    {departments.filter(d => !d.parent_department_name).map((dept) => (
                      <div key={dept.id} className="mb-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <Checkbox
                            id={`dept-${dept.id}`}
                            checked={formData.department_ids.includes(dept.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  department_ids: [...formData.department_ids, dept.id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  department_ids: formData.department_ids.filter(id => id !== dept.id)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`dept-${dept.id}`} className="cursor-pointer font-medium">
                            {dept.name}
                          </Label>
                        </div>
                        {/* Show sub-departments */}
                        {departments.filter(sd => sd.parent_department_name === dept.name).map((subDept) => (
                          <div key={subDept.id} className="ml-6 flex items-center space-x-2">
                            <Checkbox
                              id={`subdept-${subDept.id}`}
                              checked={formData.department_ids.includes(subDept.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({
                                    ...formData,
                                    department_ids: [...formData.department_ids, subDept.id]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    department_ids: formData.department_ids.filter(id => id !== subDept.id)
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={`subdept-${subDept.id}`} className="cursor-pointer text-sm text-gray-600">
                              {subDept.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {formData.department_ids.length === 0 && (
                    <p className="text-sm text-amber-600">Please select at least one department</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Hierarchy Level</Label>
              <Select value={formData.level.toString()} onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1 - User</SelectItem>
                  <SelectItem value="2">Level 2 - Supervisor</SelectItem>
                  <SelectItem value="3">Level 3 - Manager</SelectItem>
                  <SelectItem value="4">Level 4 - Admin</SelectItem>
                  <SelectItem value="5">Level 5 - Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsCreateOpen(false);
                setFormData({ name: "", description: "", department_id: "", department_ids: [], applies_to_all_departments: false, level: 1 });
              }}>
                Cancel
              </Button>
              <Button type="submit">Create Position</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Position Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Position</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Position Name</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Quality Engineer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Input
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the position"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-all-departments"
                  checked={formData.applies_to_all_departments}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      applies_to_all_departments: checked as boolean,
                      department_ids: checked ? [] : formData.department_ids
                    });
                  }}
                />
                <Label htmlFor="edit-all-departments" className="cursor-pointer">
                  Applies to All Departments (e.g., CTO, CEO)
                </Label>
              </div>
              
              {!formData.applies_to_all_departments && (
                <div className="space-y-2">
                  <Label htmlFor="edit_departments">Select Departments</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-3">
                    {departments.filter(d => !d.parent_department_name).map((dept) => (
                      <div key={dept.id} className="mb-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <Checkbox
                            id={`edit-dept-${dept.id}`}
                            checked={formData.department_ids.includes(dept.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  department_ids: [...formData.department_ids, dept.id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  department_ids: formData.department_ids.filter(id => id !== dept.id)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`edit-dept-${dept.id}`} className="cursor-pointer font-medium">
                            {dept.name}
                          </Label>
                        </div>
                        {/* Show sub-departments */}
                        {departments.filter(sd => sd.parent_department_name === dept.name).map((subDept) => (
                          <div key={subDept.id} className="ml-6 flex items-center space-x-2">
                            <Checkbox
                              id={`edit-subdept-${subDept.id}`}
                              checked={formData.department_ids.includes(subDept.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({
                                    ...formData,
                                    department_ids: [...formData.department_ids, subDept.id]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    department_ids: formData.department_ids.filter(id => id !== subDept.id)
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={`edit-subdept-${subDept.id}`} className="cursor-pointer text-sm text-gray-600">
                              {subDept.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {formData.department_ids.length === 0 && (
                    <p className="text-sm text-amber-600">Please select at least one department</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_level">Hierarchy Level</Label>
              <Select value={formData.level.toString()} onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1 - User</SelectItem>
                  <SelectItem value="2">Level 2 - Supervisor</SelectItem>
                  <SelectItem value="3">Level 3 - Manager</SelectItem>
                  <SelectItem value="4">Level 4 - Admin</SelectItem>
                  <SelectItem value="5">Level 5 - Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEditOpen(false);
                setEditingPosition(null);
              }}>
                Cancel
              </Button>
              <Button type="submit">Update Position</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
