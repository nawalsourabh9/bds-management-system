
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Audit } from "@/types/task";
import AuditsTable from "@/components/audits/AuditsTable";
import AuditForm from "@/components/audits/AuditForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQMSManager } from "@/hooks/use-qms-manager";

// Sample audit data
const sampleAudits: Audit[] = [
  {
    id: "1",
    title: "Supplier Quality Audit - ABC Corp",
    description: "Comprehensive audit of supplier's quality management system",
    auditType: "supplier",
    department: "Quality",
    auditor: "JD",
    scheduledDate: "2025-05-10",
    status: "scheduled",
    createdAt: "2025-04-05",
  },
  {
    id: "2",
    title: "Internal Process Audit - Production Line 1",
    description: "Review of production line processes for efficiency and compliance",
    auditType: "internal",
    department: "Production",
    auditor: "SM",
    scheduledDate: "2025-05-15",
    status: "in-progress",
    createdAt: "2025-04-08",
  },
  {
    id: "3",
    title: "Regulatory Compliance Audit - Environmental Standards",
    description: "Audit to ensure compliance with environmental regulations",
    auditType: "regulatory",
    department: "EHS",
    auditor: "RJ",
    scheduledDate: "2025-05-20",
    status: "completed",
    createdAt: "2025-04-12",
    completedAt: "2025-05-20",
  },
];

const Audits = () => {
  const { isQMSManager, loading: positionLoading } = useQMSManager();
  const [audits, setAudits] = useState<Audit[]>(sampleAudits);
  const [searchTerm, setSearchTerm] = useState("");
  const [auditTypeFilter, setAuditTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);

  const filteredAudits = audits.filter(audit => {
    const matchesSearch = 
      audit.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      audit.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAuditType = !auditTypeFilter || audit.auditType === auditTypeFilter;
    const matchesStatus = !statusFilter || audit.status === statusFilter;
    
    return matchesSearch && matchesAuditType && matchesStatus;
  });

  const handleViewAudit = (audit: Audit) => {
    console.log("View audit:", audit);
    toast({
      title: "Audit Selected",
      description: `Viewing audit: ${audit.title}`
    });
    // Audit viewing logic here
  };

  const handleCreateAudit = (newAudit: Audit) => {
    if (!isQMSManager) {
      toast({
        title: "Access Denied",
        description: "Only QMS Manager can create audits.",
        variant: "destructive"
      });
      return;
    }
    setAudits([...audits, { ...newAudit, id: String(Date.now()) }]);
    setIsCreateDialogOpen(false);
    toast({
      title: "Audit Created",
      description: `New audit "${newAudit.title}" has been created.`
    });
  };

  const handleUpdateAudit = (updatedAudit: Audit) => {
    if (!isQMSManager) {
      toast({
        title: "Access Denied",
        description: "Only QMS Manager can edit audits.",
        variant: "destructive"
      });
      return;
    }
    const updatedAudits = audits.map(audit =>
      audit.id === updatedAudit.id ? updatedAudit : audit
    );
    setAudits(updatedAudits);
    setSelectedAudit(null);
    toast({
      title: "Audit Updated",
      description: `Audit "${updatedAudit.title}" has been updated.`
    });
  };

  const handleDeleteAudit = (auditId: string) => {
    if (!isQMSManager) {
      toast({
        title: "Access Denied",
        description: "Only QMS Manager can delete audits.",
        variant: "destructive"
      });
      return;
    }
    const remainingAudits = audits.filter(audit => audit.id !== auditId);
    setAudits(remainingAudits);
    toast({
      title: "Audit Deleted",
      description: `Audit has been deleted.`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audits</h1>
          <p className="text-muted-foreground">Manage and track all your audits</p>
        </div>
        {!positionLoading && (
          isQMSManager ? (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> New Audit
            </Button>
          ) : (
            <Button disabled variant="outline">
              <Lock className="mr-1 h-4 w-4" /> QMS Manager Only
            </Button>
          )
        )}
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search audits..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={auditTypeFilter || "all-types"} onValueChange={(value) => setAuditTypeFilter(value === "all-types" ? null : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Audit Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-types">All Types</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="external">External</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="regulatory">Regulatory</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter || "all-statuses"} onValueChange={(value) => setStatusFilter(value === "all-statuses" ? null : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-statuses">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="postponed">Postponed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AuditsTable 
        audits={filteredAudits} 
        onViewAudit={handleViewAudit}
        onUpdateAudit={handleUpdateAudit}
        onDeleteAudit={handleDeleteAudit}
        setSelectedAudit={setSelectedAudit}
        isQMSManager={isQMSManager}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Audit</DialogTitle>
          </DialogHeader>
          <AuditForm 
            onSubmit={handleCreateAudit} 
            initialData={{}} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={selectedAudit !== null} onOpenChange={(open) => !open && setSelectedAudit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Audit</DialogTitle>
          </DialogHeader>
          {selectedAudit && (
            <AuditForm 
              onSubmit={handleUpdateAudit} 
              initialData={selectedAudit}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Audits;
