
import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PrioritySelectorProps {
  priority: "low" | "medium" | "high" | "urgent" | "critical" | "emergency";
  setPriority: (value: "low" | "medium" | "high" | "urgent" | "critical" | "emergency") => void;
}

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  priority,
  setPriority,
}) => {
  const priorities = [
    { value: "low", label: "Low", icon: "🟢", color: "bg-green-100 text-green-600", description: "Normal priority" },
    { value: "medium", label: "Medium", icon: "🟡", color: "bg-yellow-100 text-yellow-600", description: "Moderate priority" },
    { value: "high", label: "High", icon: "🟠", color: "bg-orange-100 text-orange-600", description: "Important priority" },
    { value: "urgent", label: "Urgent", icon: "🔴", color: "bg-red-100 text-red-600", description: "Urgent priority" },
    { value: "critical", label: "Critical", icon: "🚨", color: "bg-red-200 text-red-700", description: "Critical priority" },
    { value: "emergency", label: "Emergency", icon: "🚨", color: "bg-red-300 text-red-800", description: "Emergency priority" },
  ];

  const selectedPriority = priorities.find(p => p.value === priority);

  return (
    <div className="space-y-3">
      <Label htmlFor="priority" className="text-sm font-medium text-gray-700">
        Priority
      </Label>
      <Select value={priority} onValueChange={setPriority}>
        <SelectTrigger className="apple-select h-12">
          <SelectValue placeholder="Select priority" />
        </SelectTrigger>
        <SelectContent className="apple-modal">
          {priorities.map((p) => (
            <SelectItem key={p.value} value={p.value} className="py-3">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full ${p.color} flex items-center justify-center`}>
                  <span className="text-lg">{p.icon}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{p.label}</div>
                  <div className="text-sm text-gray-500">{p.description}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Selected priority preview */}
      {selectedPriority && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full ${selectedPriority.color} flex items-center justify-center`}>
              <span className="text-xl">{selectedPriority.icon}</span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{selectedPriority.label}</div>
              <div className="text-sm text-gray-600">{selectedPriority.description}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
