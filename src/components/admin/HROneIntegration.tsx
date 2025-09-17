
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Download, Upload, RefreshCw, Settings } from "lucide-react";
import { fastapiService } from "@/services/fastapi-service";

export function HROneIntegration() {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [syncConfig, setSyncConfig] = useState({
    autoSync: false,
    syncInterval: "24", // hours
    syncEmployees: true,
    syncDepartments: true
  });

  // Import employees and departments from HROne
  const handleImport = async () => {
    try {
      setIsImporting(true);
      
      // Import employees
      const employeesResponse = await fastapiService.hroneIntegration({
        action: "import_employees"
      });
      
      if (employeesResponse.error) {
        throw new Error(`Failed to import employees: ${employeesResponse.error.message}`);
      }
      
      // Import departments
      const departmentsResponse = await fastapiService.hroneIntegration({
        action: "import_departments"
      });
      
      if (departmentsResponse.error) {
        throw new Error(`Failed to import departments: ${departmentsResponse.error.message}`);
      }
      
      const employeesCount = employeesResponse.data?.result?.imported || 0;
      const departmentsCount = departmentsResponse.data?.result?.imported || 0;
      
      toast.success(`Import completed successfully: ${employeesCount} employees and ${departmentsCount} departments imported.`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error(`Error during import: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Export employees and departments to HROne
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Export employees
      const employeesResponse = await fastapiService.hroneIntegration({
        action: "export_employees"
      });
      
      if (employeesResponse.error) {
        throw new Error(`Failed to export employees: ${employeesResponse.error.message}`);
      }
      
      // Export departments
      const departmentsResponse = await fastapiService.hroneIntegration({
        action: "export_departments"
      });
      
      if (departmentsResponse.error) {
        throw new Error(`Failed to export departments: ${departmentsResponse.error.message}`);
      }
      
      toast.success("Export to HROne completed successfully.");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Error during export: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Perform two-way sync between our system and HROne
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      
      const response = await fastapiService.hroneIntegration({
        action: "sync"
      });
      
      if (response.error) {
        throw new Error(`Sync failed: ${response.error.message}`);
      }
      
      const employeesImported = response.data?.employees?.imported || 0;
      const employeesExported = response.data?.employees?.exported || 0;
      const departmentsImported = response.data?.departments?.imported || 0;
      const departmentsExported = response.data?.departments?.exported || 0;
      
      toast.success(`Sync completed: ${employeesImported} employees imported, ${employeesExported} exported, ${departmentsImported} departments imported, ${departmentsExported} exported.`);
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(`Error during sync: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Update sync configuration
  const updateSyncConfig = (key, value) => {
    setSyncConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Toggle auto-sync scheduling
  const handleToggleAutoSync = async (enabled) => {
    updateSyncConfig('autoSync', enabled);
    
    if (enabled) {
      toast.success(`Auto-sync enabled. Will sync every ${syncConfig.syncInterval} hours.`);
    } else {
      toast.info("Auto-sync disabled. You'll need to sync manually.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>HROne Integration</CardTitle>
          <CardDescription>
            Manage the synchronization of employee data and organizational structure with HROne.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-medium">Import from HROne</h3>
                <p className="text-sm text-muted-foreground">
                  Get the latest employee data and departments from HROne
                </p>
              </div>
              <Button 
                className="w-full sm:w-auto"
                onClick={handleImport} 
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Import Data
                  </>
                )}
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-medium">Export to HROne</h3>
                <p className="text-sm text-muted-foreground">
                  Send your current employee data and departments to HROne
                </p>
              </div>
              <Button 
                className="w-full sm:w-auto"
                onClick={handleExport} 
                disabled={isExporting}
                variant="outline"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Export Data
                  </>
                )}
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-medium">Two-Way Synchronization</h3>
                <p className="text-sm text-muted-foreground">
                  Perform a complete sync between both systems
                </p>
              </div>
              <Button 
                className="w-full sm:w-auto"
                onClick={handleSync} 
                disabled={isSyncing}
                variant="default"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Sync Configuration
          </CardTitle>
          <CardDescription>
            Configure automatic synchronization settings
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync">Automatic Synchronization</Label>
              <p className="text-sm text-muted-foreground">
                Enable regular automatic data synchronization
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={syncConfig.autoSync}
              onCheckedChange={(checked) => handleToggleAutoSync(checked)}
            />
          </div>
          
          <div>
            <Label htmlFor="sync-interval">Sync Interval (hours)</Label>
            <div className="flex w-full max-w-sm items-center space-x-2 mt-1.5">
              <Input
                id="sync-interval"
                type="number"
                min="1"
                max="168"
                value={syncConfig.syncInterval}
                onChange={(e) => updateSyncConfig('syncInterval', e.target.value)}
                disabled={!syncConfig.autoSync}
              />
              <Button 
                type="submit" 
                variant="outline"
                disabled={!syncConfig.autoSync}
                onClick={() => toast.success(`Sync interval updated to ${syncConfig.syncInterval} hours`)}
              >
                Apply
              </Button>
            </div>
          </div>
          
          <div className="grid gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="employees"
                checked={syncConfig.syncEmployees}
                onCheckedChange={(checked) => updateSyncConfig('syncEmployees', checked)}
                disabled={!syncConfig.autoSync}
              />
              <Label htmlFor="employees">Sync Employee Data</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="departments"
                checked={syncConfig.syncDepartments}
                onCheckedChange={(checked) => updateSyncConfig('syncDepartments', checked)}
                disabled={!syncConfig.autoSync}
              />
              <Label htmlFor="departments">Sync Department Structure</Label>
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Last sync: Never
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
