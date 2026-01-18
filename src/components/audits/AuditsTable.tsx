
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Audit } from "@/types/task";
import { Calendar, Clock, CheckCircle, AlertTriangle, FileBarChart } from "lucide-react";

interface AuditsTableProps {
  audits: Audit[];
  onViewAudit: (audit: Audit) => void;
  onUpdateAudit: (audit: Audit) => void;
  onDeleteAudit: (auditId: string) => void;
  setSelectedAudit: (audit: Audit | null) => void;
  isQMSManager?: boolean;
}

const AuditsTable: React.FC<AuditsTableProps> = ({
  audits,
  onViewAudit,
  onUpdateAudit,
  onDeleteAudit,
  setSelectedAudit,
  isQMSManager = false
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
      case 'in-progress':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 flex items-center gap-1"><Clock className="h-3 w-3" /> In Progress</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 flex items-center gap-1"><Calendar className="h-3 w-3" /> Scheduled</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Cancelled</Badge>;
      case 'postponed':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 flex items-center gap-1"><Clock className="h-3 w-3" /> Postponed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAuditTypeBadge = (auditType: string) => {
    switch (auditType) {
      case 'internal':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Internal</Badge>;
      case 'external':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700">External</Badge>;
      case 'supplier':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Supplier</Badge>;
      case 'customer':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Customer</Badge>;
      case 'regulatory':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Regulatory</Badge>;
      default:
        return <Badge variant="outline">{auditType}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Audit</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Department</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Scheduled Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No audits found
                  </td>
                </tr>
              ) : (
                audits.map((audit) => (
                  <tr key={audit.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {audit.title}
                          <FileBarChart className="h-4 w-4 text-muted-foreground" />
                        </p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {audit.description}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getAuditTypeBadge(audit.auditType)}
                    </td>
                    <td className="px-4 py-3 text-sm">{audit.department}</td>
                    <td className="px-4 py-3 text-sm">{audit.scheduledDate}</td>
                    <td className="px-4 py-3">
                      {getStatusBadge(audit.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => onViewAudit(audit)}>
                          View
                        </Button>
                        {isQMSManager ? (
                          <Button size="sm" variant="outline" onClick={() => setSelectedAudit(audit)}>
                            Edit
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled title="QMS Manager only">
                            Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuditsTable;
