
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TaskBasicInfoProps {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
}

export const TaskBasicInfo: React.FC<TaskBasicInfoProps> = ({
  title,
  setTitle,
  description,
  setDescription
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label htmlFor="title" className="text-sm font-medium text-gray-700">
          Task Title <span className="text-red-500">*</span>
        </label>
        <Input 
          id="title" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          required 
          placeholder="Enter a descriptive task title" 
          className="apple-input h-12 text-base" 
        />
        {title && (
          <div className="text-sm text-gray-500">
            {title.length} characters
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label htmlFor="description" className="text-sm font-medium text-gray-700">
          Description <span className="text-red-500">*</span>
        </label>
        <Textarea 
          id="description" 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          required 
          placeholder="Provide detailed description of the task, requirements, and expected outcomes" 
          rows={4} 
          className="apple-input resize-none" 
        />
        {description && (
          <div className="text-sm text-gray-500">
            {description.length} characters
          </div>
        )}
      </div>
    </div>
  );
};
