
import React, { useState } from "react";
import { TaskDocument } from "@/types/document";
import { Task } from "@/types/task";
import DocumentHeader from "./DocumentHeader";
import ApprovalCard from "./ApprovalCard";
import DocumentViewerTabs from "./DocumentViewerTabs";
import NewRevisionDialog from "./dialogs/NewRevisionDialog";
import RejectDocumentDialog from "./dialogs/RejectDocumentDialog";
import { useQMSManager } from "@/hooks/use-qms-manager";

interface DocumentViewerProps {
  task: {
    id: string;
    title: string;
    assigneeDetails?: {
      name: string;
    };
  };
  document: TaskDocument;
  onUpdateRevision?: (documentType: string, revisionId: string) => void;
  onAddNewRevision?: (documentType: string, fileName: string, version: string) => void;
  currentUserId?: string;
  onUpdateApprovalStatus?: (action: 'initiate' | 'check' | 'approve' | 'reject', reason?: string) => void;
  teamMembers?: Array<{
    id: string;
    name: string;
    position: string;
    initials: string;
  }>;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  task, 
  document, 
  onUpdateRevision,
  onAddNewRevision,
  currentUserId,
  onUpdateApprovalStatus,
  teamMembers = []
}) => {
  const { isQMSManager } = useQMSManager();
  const [isNewRevisionDialogOpen, setIsNewRevisionDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  
  // Find the current revision or use the latest one
  const currentRevision = document.currentRevisionId
    ? document.revisions?.find(rev => rev.id === document.currentRevisionId)
    : document.revisions && document.revisions.length > 0
      ? document.revisions[document.revisions.length - 1]
      : null;

  const documentTypeLabel = {
    'sop': 'Standard Operating Procedure',
    'dataFormat': 'Data Recording Format',
    'reportFormat': 'Reporting Format',
    'rulesAndProcedures': 'Rules and Procedures'
  }[document.documentType] || document.documentType;

  if (!currentRevision) {
    return (
      <div className="text-center py-8 text-gray-500">
        No document revisions available
      </div>
    );
  }

  const handleNewRevisionSubmit = (fileName: string, version: string, notes: string) => {
    if (!isQMSManager) {
      return;
    }
    if (onAddNewRevision) {
      onAddNewRevision(document.documentType, fileName, version);
      setIsNewRevisionDialogOpen(false);
    }
  };

  const handleSetCurrentRevision = (revisionId: string) => {
    if (!isQMSManager) {
      return;
    }
    if (onUpdateRevision) {
      onUpdateRevision(document.documentType, revisionId);
    }
  };

  const handleRejectSubmit = (reason: string) => {
    if (onUpdateApprovalStatus) {
      onUpdateApprovalStatus('reject', reason);
      setIsRejectDialogOpen(false);
    }
  };

  // Determine if current user can take action on this document
  const canTakeAction = () => {
    if (!document.approvalHierarchy || !currentUserId) return false;
    const hierarchy = document.approvalHierarchy;
    
    // Check if user can check the document
    if (hierarchy.status === 'pending-checker' && hierarchy.checker === currentUserId) {
      return 'check';
    }
    
    // Check if user can approve the document
    if (hierarchy.status === 'pending-approval' && hierarchy.approver === currentUserId) {
      return 'approve';
    }
    
    return false;
  };

  return (
    <div className="space-y-4">
      <DocumentHeader 
        task={task}
        documentType={document.documentType}
        documentTypeLabel={documentTypeLabel}
        approvalStatus={document.approvalHierarchy?.status}
        onNewRevision={
          isQMSManager && onAddNewRevision && document.approvalHierarchy?.status === 'approved' 
            ? () => setIsNewRevisionDialogOpen(true) 
            : undefined
        }
        isQMSManager={isQMSManager}
      />

      {document.approvalHierarchy && (
        <ApprovalCard 
          approvalHierarchy={document.approvalHierarchy}
          teamMembers={teamMembers}
          canTakeAction={canTakeAction()}
          onReject={() => setIsRejectDialogOpen(true)}
          onApprove={() => {
            if (onUpdateApprovalStatus) {
              if (canTakeAction() === 'check') {
                onUpdateApprovalStatus('check');
              } else if (canTakeAction() === 'approve') {
                onUpdateApprovalStatus('approve');
              }
            }
          }}
          rejectedBy={document.approvalHierarchy.rejectedBy}
          rejectionReason={document.approvalHierarchy.rejectionReason}
        />
      )}

      <DocumentViewerTabs 
        currentRevision={currentRevision}
        documentType={document.documentType}
        task={task}
        onUpdateRevision={handleSetCurrentRevision}
        revisions={document.revisions || []}
        approvalStatus={document.approvalHierarchy?.status}
        isQMSManager={isQMSManager}
      />

      <NewRevisionDialog 
        isOpen={isNewRevisionDialogOpen}
        onClose={() => setIsNewRevisionDialogOpen(false)}
        onSubmit={handleNewRevisionSubmit}
        documentTypeLabel={documentTypeLabel}
        currentVersion={currentRevision.version}
      />
      
      <RejectDocumentDialog 
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onSubmit={handleRejectSubmit}
        documentName={currentRevision.fileName}
        documentTypeLabel={documentTypeLabel}
      />
    </div>
  );
};

export default DocumentViewer;
