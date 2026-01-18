
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentContentTab from "./tabs/DocumentContentTab";
import DocumentInfoTab from "./tabs/DocumentInfoTab";
import { DocumentRevision } from "@/types/document";

interface DocumentViewerTabsProps {
  currentRevision: DocumentRevision;
  documentType: string;
  task: {
    title: string;
  };
  onUpdateRevision?: (revisionId: string) => void;
  revisions: DocumentRevision[];
  approvalStatus?: string;
  isQMSManager?: boolean;
}

const DocumentViewerTabs: React.FC<DocumentViewerTabsProps> = ({
  currentRevision,
  documentType,
  task,
  onUpdateRevision,
  revisions,
  approvalStatus,
  isQMSManager = false,
}) => {
  return (
    <Tabs defaultValue="document" className="w-full">
      <TabsList className="grid grid-cols-2">
        <TabsTrigger value="document">Document Content</TabsTrigger>
        <TabsTrigger value="info">Document Information</TabsTrigger>
      </TabsList>
      
      <TabsContent value="document" className="p-4 border rounded-md mt-2">
        <DocumentContentTab 
          currentRevision={currentRevision}
          documentType={documentType}
          task={task}
          approvalStatus={approvalStatus}
        />
      </TabsContent>
      
      <TabsContent value="info" className="p-4 border rounded-md mt-2">
        <DocumentInfoTab 
          currentRevision={currentRevision} 
          revisions={revisions}
          onUpdateRevision={onUpdateRevision}
          isQMSManager={isQMSManager}
        />
      </TabsContent>
    </Tabs>
  );
};

export default DocumentViewerTabs;
