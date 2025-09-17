
import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AttachmentsSelectorProps {
  attachmentsRequired: "none" | "optional" | "required";
  setAttachmentsRequired: (value: "none" | "optional" | "required") => void;
}

export const AttachmentsSelector: React.FC<AttachmentsSelectorProps> = ({
  attachmentsRequired,
  setAttachmentsRequired,
}) => {
  const attachmentOptions = [
    { value: "none", label: "None", icon: "❌", color: "bg-gray-100 text-gray-600", description: "No attachments needed" },
    { value: "optional", label: "Optional", icon: "📎", color: "bg-blue-100 text-blue-600", description: "Attachments are optional" },
    { value: "required", label: "Required", icon: "📋", color: "bg-red-100 text-red-600", description: "Attachments are mandatory" },
  ];

  const selectedOption = attachmentOptions.find(opt => opt.value === attachmentsRequired);

  return (
    <div className="space-y-3">
      <Label htmlFor="attachmentsRequired" className="text-sm font-medium text-gray-700">
        Attachments
      </Label>
      <Select value={attachmentsRequired} onValueChange={setAttachmentsRequired}>
        <SelectTrigger className="apple-select h-12">
          <SelectValue placeholder="Select attachment requirement" />
        </SelectTrigger>
        <SelectContent className="apple-modal">
          {attachmentOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="py-3">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full ${option.color} flex items-center justify-center`}>
                  <span className="text-lg">{option.icon}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Selected option preview */}
      {selectedOption && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full ${selectedOption.color} flex items-center justify-center`}>
              <span className="text-xl">{selectedOption.icon}</span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{selectedOption.label}</div>
              <div className="text-sm text-gray-600">{selectedOption.description}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
