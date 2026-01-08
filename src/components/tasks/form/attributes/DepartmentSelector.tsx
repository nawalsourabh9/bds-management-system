
import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DepartmentSelectorProps {
  department: string;
  setDepartment: (value: string) => void;
}

export const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({
  department,
  setDepartment,
}) => {
  const departments = [
    { value: "Executive Office", label: "Executive Office", icon: "👔", color: "bg-purple-100 text-purple-600" },
    { value: "Quality Assurance", label: "Quality Assurance", icon: "🔍", color: "bg-green-100 text-green-600" },
    { value: "Production", label: "Production", icon: "🏭", color: "bg-blue-100 text-blue-600" },
    { value: "Research & Development", label: "R&D", icon: "🔬", color: "bg-orange-100 text-orange-600" },
    { value: "Supply Chain", label: "Supply Chain", icon: "📦", color: "bg-indigo-100 text-indigo-600" },
    { value: "Human Resources", label: "Human Resources", icon: "👥", color: "bg-pink-100 text-pink-600" },
    { value: "Finance", label: "Finance", icon: "💰", color: "bg-emerald-100 text-emerald-600" },
    { value: "IT & Systems", label: "IT & Systems", icon: "💻", color: "bg-gray-100 text-gray-600" },
  ];

  const selectedDept = departments.find(d => d.value === department);

  return (
    <div className="space-y-3">
      <Label htmlFor="department" className="text-sm font-medium text-gray-700">
        Department
      </Label>
      <Select value={department} onValueChange={setDepartment}>
        <SelectTrigger className="apple-select h-12">
          <SelectValue placeholder="Select department" />
        </SelectTrigger>
        <SelectContent className="apple-modal">
          {departments.map((dept) => (
            <SelectItem key={dept.value} value={dept.value} className="py-3">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full ${dept.color} flex items-center justify-center`}>
                  <span className="text-lg">{dept.icon}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{dept.label}</div>
                  <div className="text-sm text-gray-500">{dept.value}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Selected department preview */}
      {selectedDept && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full ${selectedDept.color} flex items-center justify-center`}>
              <span className="text-xl">{selectedDept.icon}</span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{selectedDept.label}</div>
              <div className="text-sm text-gray-600">{selectedDept.value}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
