import React, { useRef, useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Database, PieChart, BookOpen, Upload, Link, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DocumentData {
  selected: boolean;
  file: File | null;
  link: string;
  linkType: 'gdrive' | 'onedrive' | 'dropbox' | 'other';
}

interface DocumentUploads {
  sop: DocumentData;
  dataFormat: DocumentData;
  reportFormat: DocumentData;
  rulesAndProcedures: DocumentData;
}

interface DocumentSelectorProps {
  documentUploads: DocumentUploads;
  onDocumentSelect: (docType: "sop" | "dataFormat" | "reportFormat" | "rulesAndProcedures", selected: boolean) => void;
  onFileUpload: (docType: "sop" | "dataFormat" | "reportFormat" | "rulesAndProcedures", file: File | null) => void;
  onLinkUpdate: (docType: "sop" | "dataFormat" | "reportFormat" | "rulesAndProcedures", link: string, linkType: string) => void;
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  documentUploads,
  onDocumentSelect,
  onFileUpload,
  onLinkUpdate
}) => {
  const fileInputRefs = {
    sop: useRef<HTMLInputElement>(null),
    dataFormat: useRef<HTMLInputElement>(null),
    reportFormat: useRef<HTMLInputElement>(null),
    rulesAndProcedures: useRef<HTMLInputElement>(null)
  };

  const documentTypes = [
    {
      key: 'sop' as const,
      label: 'Standard Operating Procedures (SOP)',
      icon: FileText,
      description: 'Document outlining standard procedures'
    },
    {
      key: 'dataFormat' as const,
      label: 'Data Format Template',
      icon: Database,
      description: 'Template for data collection and formatting'
    },
    {
      key: 'reportFormat' as const,
      label: 'Report Format Template',
      icon: PieChart,
      description: 'Template for generating reports'
    },
    {
      key: 'rulesAndProcedures' as const,
      label: 'Rules and Procedures',
      icon: BookOpen,
      description: 'Company rules and procedures documentation'
    }
  ];

  const handleFileSelect = (docType: keyof DocumentUploads, file: File | null) => {
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
        'image/png'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, Word, Excel, or image file",
          variant: "destructive"
        });
        return;
      }
    }
    
    onFileUpload(docType, file);
  };

  const handleLinkChange = (docType: keyof DocumentUploads, link: string) => {
    let linkType: string = 'other';
    
    if (link.includes('drive.google.com')) {
      linkType = 'gdrive';
    } else if (link.includes('onedrive.live.com') || link.includes('1drv.ms')) {
      linkType = 'onedrive';
    } else if (link.includes('dropbox.com')) {
      linkType = 'dropbox';
    }
    
    onLinkUpdate(docType, link, linkType);
  };

  const getLinkIcon = (linkType: string) => {
    switch (linkType) {
      case 'gdrive': return '🔗'; // Google Drive
      case 'onedrive': return '🔗'; // OneDrive
      case 'dropbox': return '🔗'; // Dropbox
      default: return '🔗';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Required Documents</Label>
      <p className="text-sm text-muted-foreground">
        Upload files or provide links to cloud storage (Google Drive, OneDrive, Dropbox)
      </p>
      
      <div className="space-y-4">
        {documentTypes.map((doc) => {
          const IconComponent = doc.icon;
          const docData = documentUploads[doc.key];
          
          return (
            <div key={doc.key} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id={doc.key}
                  checked={docData.selected}
                  onCheckedChange={(checked) => onDocumentSelect(doc.key, checked as boolean)}
                />
                <IconComponent className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <Label htmlFor={doc.key} className="text-sm font-medium">
                    {doc.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{doc.description}</p>
                </div>
              </div>

              {docData.selected && (
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload File
                    </TabsTrigger>
                    <TabsTrigger value="link" className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Share Link
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <input
                        ref={fileInputRefs[doc.key]}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileSelect(doc.key, e.target.files?.[0] || null)}
                      />
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRefs[doc.key].current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                      
                      {docData.file && (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium">{docData.file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(docData.file.size)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFileSelect(doc.key, null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="link" className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Share Link</Label>
                      <Input
                        type="url"
                        placeholder="https://drive.google.com/file/... or https://1drv.ms/..."
                        value={docData.link}
                        onChange={(e) => handleLinkChange(doc.key, e.target.value)}
                        className="w-full"
                      />
                      
                      {docData.link && (
                        <div className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
                          <span className="text-lg">{getLinkIcon(docData.linkType)}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {docData.linkType === 'gdrive' && 'Google Drive'}
                              {docData.linkType === 'onedrive' && 'OneDrive'}
                              {docData.linkType === 'dropbox' && 'Dropbox'}
                              {docData.linkType === 'other' && 'External Link'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {docData.link}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};