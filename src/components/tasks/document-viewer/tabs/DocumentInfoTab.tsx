
import React from "react";
import { FileType, Calendar, User, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentRevision } from "@/types/document";

interface DocumentInfoTabProps {
  currentRevision: DocumentRevision;
  revisions: DocumentRevision[];
  onUpdateRevision?: (revisionId: string) => void;
  isQMSManager?: boolean;
}

const DocumentInfoTab: React.FC<DocumentInfoTabProps> = ({
  currentRevision,
  revisions,
  onUpdateRevision,
  isQMSManager = false
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <FileType className="h-5 w-5 text-gray-500" />
        <div>
          <p className="text-sm font-medium">File Name</p>
          <p className="text-sm text-muted-foreground">{currentRevision.fileName}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Badge variant="outline">v{currentRevision.version}</Badge>
        <div>
          <p className="text-sm font-medium">Version</p>
          <p className="text-sm text-muted-foreground">
            {revisions.length > 1 ? 
              `${revisions.indexOf(currentRevision) + 1} of ${revisions.length}` : 
              'Initial version'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-gray-500" />
        <div>
          <p className="text-sm font-medium">Upload Date</p>
          <p className="text-sm text-muted-foreground">
            {new Date(currentRevision.uploadDate).toLocaleDateString()}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <User className="h-5 w-5 text-gray-500" />
        <div>
          <p className="text-sm font-medium">Uploaded By</p>
          <p className="text-sm text-muted-foreground">{currentRevision.uploadedBy}</p>
        </div>
      </div>
      
      {currentRevision.notes && (
        <div>
          <p className="text-sm font-medium">Revision Notes</p>
          <p className="text-sm text-muted-foreground p-2 bg-gray-50 rounded border mt-1">
            {currentRevision.notes}
          </p>
        </div>
      )}
      
      <RevisionHistory 
        revisions={revisions} 
        currentRevisionId={currentRevision.id} 
        onUpdateRevision={onUpdateRevision}
        isQMSManager={isQMSManager}
      />
    </div>
  );
};

const RevisionHistory: React.FC<{
  revisions: DocumentRevision[];
  currentRevisionId: string;
  onUpdateRevision?: (revisionId: string) => void;
  isQMSManager?: boolean;
}> = ({ revisions, currentRevisionId, onUpdateRevision, isQMSManager = false }) => {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">Revision History</h3>
      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Version</th>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">User</th>
              <th className="text-left p-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {revisions.map((rev) => (
              <tr key={rev.id} className={rev.id === currentRevisionId ? "bg-blue-50" : ""}>
                <td className="p-2">v{rev.version}</td>
                <td className="p-2">{new Date(rev.uploadDate).toLocaleDateString()}</td>
                <td className="p-2">{rev.uploadedBy}</td>
                <td className="p-2">
                  {rev.id !== currentRevisionId && onUpdateRevision ? (
                    isQMSManager ? (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2"
                        onClick={() => onUpdateRevision(rev.id)}
                      >
                        Set Current
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2"
                        disabled
                        title="QMS Manager only"
                      >
                        Set Current
                      </Button>
                    )
                  ) : (
                    <span className="text-xs flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" /> Current
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentInfoTab;
