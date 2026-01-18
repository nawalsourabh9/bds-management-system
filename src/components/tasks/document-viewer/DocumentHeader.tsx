
import React from "react";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DocumentHeaderProps {
  task: {
    title: string;
    assigneeDetails?: {
      name: string;
    };
  };
  documentType: string;
  documentTypeLabel: string;
  approvalStatus?: string;
  onNewRevision?: () => void;
  isQMSManager?: boolean;
}

const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  task,
  documentTypeLabel,
  approvalStatus,
  onNewRevision,
}) => {
  const getApprovalStatusBadge = () => {
    if (!approvalStatus) return null;
    
    switch (approvalStatus) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700">Draft</Badge>;
      case 'pending-checker':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Pending Check</Badge>;
      case 'pending-approval':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700">Pending Approval</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-muted/30 p-3 rounded-md">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">{task.title}</h3>
          <p className="text-sm text-muted-foreground">
            Assigned to: {task.assigneeDetails?.name || "Unassigned"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {documentTypeLabel}
          </Badge>
          {getApprovalStatusBadge()}
          {onNewRevision && approvalStatus === 'approved' && (
            isQMSManager ? (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onNewRevision}
                className="flex items-center gap-1"
              >
                <History className="h-4 w-4" /> New Revision
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                disabled
                title="QMS Manager only"
                className="flex items-center gap-1"
              >
                <History className="h-4 w-4" /> New Revision
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentHeader;
