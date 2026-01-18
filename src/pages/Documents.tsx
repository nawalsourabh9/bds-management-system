import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, FileText, Database, PieChart, FileUp, History, CheckCircle, User, BookOpen, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@/hooks/use-toast";
import { DocumentRevision, TaskDocument, ApprovalHierarchy, DocumentPermissions, DocumentType } from "@/types/document";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSearchParams } from "react-router-dom";
import DocumentUploadDialog from "@/components/documents/DocumentUploadDialog";
import { useQuery } from "@tanstack/react-query";
import { useQMSManager } from "@/hooks/use-qms-manager";

const documentTypes: DocumentType[] = [
  {
    id: "sop-manufacturing",
    name: "Manufacturing SOP",
    description: "Standard Operating Procedures for manufacturing processes",
    allowedDepartments: ["Manufacturing", "Quality"],
    requiredApprovalLevels: ["initiator", "checker", "approver"] as ("initiator" | "checker" | "approver")[]
  },
  {
    id: "sop-quality",
    name: "Quality SOP",
    description: "Standard Operating Procedures for quality control processes",
    allowedDepartments: ["Quality"],
    requiredApprovalLevels: ["initiator", "checker", "approver"] as ("initiator" | "checker" | "approver")[]
  },
  {
    id: "data-format",
    name: "Quality Data Format",
    description: "Data recording formats for quality control measurements",
    allowedDepartments: ["Quality", "Manufacturing"],
    requiredApprovalLevels: ["initiator", "approver"] as ("initiator" | "checker" | "approver")[]
  },
  {
    id: "report-format",
    name: "Standard Report Format",
    description: "Standard format for quality reports",
    allowedDepartments: ["Quality", "Manufacturing", "Regulatory"],
    requiredApprovalLevels: ["initiator", "checker", "approver"] as ("initiator" | "checker" | "approver")[]
  },
  {
    id: "rules-procedures",
    name: "Rules & Procedures",
    description: "General rules and procedures for quality management",
    allowedDepartments: ["Quality", "Manufacturing", "Regulatory", "Management"],
    requiredApprovalLevels: ["initiator", "checker", "approver"] as ("initiator" | "checker" | "approver")[]
  }
];

const Documents = () => {
  const { isQMSManager, loading: positionLoading } = useQMSManager();
  const [documents, setDocuments] = useState<TaskDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<'sop' | 'dataFormat' | 'reportFormat' | 'rulesAndProcedures'>('sop');
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; } | null>({ id: 'user-1', name: 'John Doe' });
  const [teamMembers, setTeamMembers] = useState([
    { id: 'user-1', name: 'John Doe', position: 'Manager', initials: 'JD' },
    { id: 'user-2', name: 'Sarah Miller', position: 'Engineer', initials: 'SM' },
    { id: 'user-3', name: 'Robert Johnson', position: 'Specialist', initials: 'RJ' }
  ]);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<DocumentPermissions>({
    canInitiate: true,
    canCheck: true,
    canApprove: true,
    allowedDocumentTypes: ['sop-manufacturing', 'sop-quality', 'data-format', 'report-format', 'rules-procedures'],
    allowedDepartments: ['Quality', 'Manufacturing', 'Regulatory', 'Management']
  });

  const filteredDocuments = documents.filter(document =>
    document.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUploadDocument = (documentType: 'sop' | 'dataFormat' | 'reportFormat' | 'rulesAndProcedures', file: File, version: string, notes: string, approvalHierarchy: ApprovalHierarchy) => {
    if (!isQMSManager) {
      toast({
        title: "Access Denied",
        description: "Only QMS Manager can upload documents.",
        variant: "destructive"
      });
      return;
    }
    const newDocument: TaskDocument = {
      id: `doc-${Math.random().toString(36).substring(2, 11)}`,
      fileName: file.name,
      fileType: file.name.split('.').pop() || '',
      documentType,
      version,
      uploadDate: new Date().toISOString(),
      uploadedBy: currentUser?.name || 'Current User',
      notes,
      approvalHierarchy,
      revisions: [
        {
          id: `rev-${Math.random().toString(36).substring(2, 11)}`,
          fileName: file.name,
          version,
          uploadDate: new Date().toISOString(),
          uploadedBy: currentUser?.name || 'Current User',
          notes
        }
      ]
    };

    setDocuments(prevDocuments => [...prevDocuments, newDocument]);
    
    toast({
      title: "Document Uploaded",
      description: `Successfully uploaded ${file.name}`
    });
    
    setIsUploadDialogOpen(false);
  };

  const sampleDocuments: TaskDocument[] = [
    {
      id: "doc-1",
      fileName: "Manufacturing Process SOP-001",
      fileType: "pdf",
      documentType: "sop",
      version: "1.2",
      uploadDate: "2025-03-15",
      uploadedBy: "John Doe",
      notes: "Updated to include new equipment procedures",
      approvalHierarchy: {
        initiator: "user-1",
        checker: "user-2",
        approver: "user-3",
        status: "approved",
        initiatorApproved: true,
        checkerApproved: true,
        approverApproved: true,
        initiatedAt: "2025-03-10T10:30:00Z",
        checkedAt: "2025-03-12T14:20:00Z",
        approvedAt: "2025-03-15T09:15:00Z"
      },
      revisions: [
        {
          id: "rev-1-1",
          fileName: "Manufacturing Process SOP-001",
          version: "1.0",
          uploadDate: "2025-01-10",
          uploadedBy: "John Doe"
        },
        {
          id: "rev-1-2",
          fileName: "Manufacturing Process SOP-001",
          version: "1.1",
          uploadDate: "2025-02-20",
          uploadedBy: "John Doe"
        },
        {
          id: "rev-1-3",
          fileName: "Manufacturing Process SOP-001",
          version: "1.2",
          uploadDate: "2025-03-15",
          uploadedBy: "John Doe",
          notes: "Updated to include new equipment procedures"
        }
      ]
    },
    {
      id: "doc-2",
      fileName: "Quality Control Data Format QC-DF-42",
      fileType: "xlsx",
      documentType: "dataFormat",
      version: "2.0",
      uploadDate: "2025-03-20",
      uploadedBy: "Sarah Miller",
      approvalHierarchy: {
        initiator: "user-2",
        approver: "user-3",
        status: "pending-approval",
        initiatorApproved: true,
        initiatedAt: "2025-03-20T11:45:00Z"
      },
      revisions: [
        {
          id: "rev-2-1",
          fileName: "Quality Control Data Format QC-DF-42",
          version: "1.0",
          uploadDate: "2024-10-15",
          uploadedBy: "Robert Johnson"
        },
        {
          id: "rev-2-2",
          fileName: "Quality Control Data Format QC-DF-42",
          version: "2.0",
          uploadDate: "2025-03-20",
          uploadedBy: "Sarah Miller"
        }
      ]
    },
    {
      id: "doc-3",
      fileName: "Customer Complaint Handling RP-CC-01",
      fileType: "pdf",
      documentType: "rulesAndProcedures",
      version: "1.0",
      uploadDate: "2025-04-01",
      uploadedBy: "Robert Johnson",
      notes: "Initial version of customer complaint handling procedure",
      approvalHierarchy: {
        initiator: "user-3",
        checker: "user-2",
        approver: "user-1",
        status: "pending-checker",
        initiatorApproved: true,
        initiatedAt: "2025-04-01T15:20:00Z"
      },
      revisions: [
        {
          id: "rev-3-1",
          fileName: "Customer Complaint Handling RP-CC-01",
          version: "1.0",
          uploadDate: "2025-04-01",
          uploadedBy: "Robert Johnson",
          notes: "Initial version of customer complaint handling procedure"
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">Manage and track all your quality documents</p>
        </div>
        {!positionLoading && (
          isQMSManager ? (
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <FileUp className="mr-1 h-4 w-4" /> Upload Document
            </Button>
          ) : (
            <Button disabled variant="outline">
              <Lock className="mr-1 h-4 w-4" /> QMS Manager Only
            </Button>
          )
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {sampleDocuments.map(document => (
          <Card key={document.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {document.documentType === 'sop' && <FileText className="h-5 w-5 text-green-500" />}
                {document.documentType === 'dataFormat' && <Database className="h-5 w-5 text-blue-500" />}
                {document.documentType === 'reportFormat' && <PieChart className="h-5 w-5 text-amber-500" />}
                 {document.documentType === 'rulesAndProcedures' && <BookOpen className="h-5 w-5 text-purple-500" />}
                {document.fileName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-none">{document.uploadedBy}</p>
                  <p className="text-sm text-muted-foreground">
                    Uploaded on {new Date(document.uploadDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Badge variant="secondary">Version: {document.version}</Badge>
                {document.approvalHierarchy && (
                  <Badge variant="outline">Status: {document.approvalHierarchy.status}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isQMSManager && (
        <DocumentUploadDialog
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          onUpload={handleUploadDocument}
          documentType={selectedDocumentType}
          currentUserId={currentUser?.id || 'user-1'}
          currentUserPermissions={currentUserPermissions}
          teamMembers={teamMembers}
          documentTypes={documentTypes}
        />
      )}
    </div>
  );
};

export default Documents;
