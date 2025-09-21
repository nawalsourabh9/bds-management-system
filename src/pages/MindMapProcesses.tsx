import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  GitBranch, 
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  Calendar,
  Target,
  Settings,
  Shield,
  TrendingUp
} from "lucide-react";

interface ProcessStep {
  id: string;
  name: string;
  description: string;
  role: string;
  duration?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  nextSteps: string[];
}

interface Process {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: ProcessStep[];
  estimatedDuration: string;
  responsibleRole: string;
}

const processCategories = {
  'quality': {
    name: 'Quality Management',
    icon: Shield,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'IATF 16949 compliant quality processes'
  },
  'hr': {
    name: 'Human Resources',
    icon: Users,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Employee management and development'
  },
  'operations': {
    name: 'Operations',
    icon: Settings,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Manufacturing and operational processes'
  },
  'compliance': {
    name: 'Compliance',
    icon: FileText,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Regulatory and audit compliance'
  }
};

const statusIcons = {
  'pending': Clock,
  'in_progress': Play,
  'completed': CheckCircle,
  'blocked': AlertTriangle,
};

const statusColors = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'in_progress': 'bg-blue-100 text-blue-800',
  'completed': 'bg-green-100 text-green-800',
  'blocked': 'bg-red-100 text-red-800',
};

export default function MindMapProcesses() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

  useEffect(() => {
    // Mock data for demonstration
    const mockProcesses: Process[] = [
      {
        id: '1',
        name: 'New Employee Onboarding',
        description: 'Complete process for bringing new employees into the organization',
        category: 'hr',
        estimatedDuration: '2 weeks',
        responsibleRole: 'HR Manager',
        steps: [
          {
            id: '1.1',
            name: 'Application Review',
            description: 'Review and screen job applications',
            role: 'HR Manager',
            duration: '2 days',
            status: 'completed',
            nextSteps: ['1.2']
          },
          {
            id: '1.2',
            name: 'Interview Process',
            description: 'Conduct interviews with candidates',
            role: 'Department Manager',
            duration: '3 days',
            status: 'completed',
            nextSteps: ['1.3']
          },
          {
            id: '1.3',
            name: 'Background Check',
            description: 'Perform background verification',
            role: 'HR Assistant',
            duration: '5 days',
            status: 'in_progress',
            nextSteps: ['1.4']
          },
          {
            id: '1.4',
            name: 'Offer Letter',
            description: 'Send formal offer letter to candidate',
            role: 'HR Manager',
            duration: '1 day',
            status: 'pending',
            nextSteps: ['1.5']
          },
          {
            id: '1.5',
            name: 'First Day Setup',
            description: 'Prepare workspace and equipment',
            role: 'IT Department',
            duration: '1 day',
            status: 'pending',
            nextSteps: ['1.6']
          },
          {
            id: '1.6',
            name: 'Orientation',
            description: 'Conduct new employee orientation',
            role: 'HR Manager',
            duration: '2 days',
            status: 'pending',
            nextSteps: []
          }
        ]
      },
      {
        id: '2',
        name: 'Quality Control Inspection',
        description: 'Standard quality control process for manufactured products',
        category: 'quality',
        estimatedDuration: '4 hours',
        responsibleRole: 'Quality Inspector',
        steps: [
          {
            id: '2.1',
            name: 'Initial Inspection',
            description: 'Visual inspection of raw materials',
            role: 'Quality Inspector',
            duration: '1 hour',
            status: 'completed',
            nextSteps: ['2.2']
          },
          {
            id: '2.2',
            name: 'Dimensional Check',
            description: 'Measure critical dimensions',
            role: 'Quality Inspector',
            duration: '2 hours',
            status: 'completed',
            nextSteps: ['2.3']
          },
          {
            id: '2.3',
            name: 'Functional Testing',
            description: 'Test product functionality',
            role: 'Quality Engineer',
            duration: '1 hour',
            status: 'in_progress',
            nextSteps: ['2.4']
          },
          {
            id: '2.4',
            name: 'Documentation',
            description: 'Record inspection results',
            role: 'Quality Inspector',
            duration: '30 minutes',
            status: 'pending',
            nextSteps: ['2.5']
          },
          {
            id: '2.5',
            name: 'Final Approval',
            description: 'Approve or reject batch',
            role: 'Quality Manager',
            duration: '15 minutes',
            status: 'pending',
            nextSteps: []
          }
        ]
      },
      {
        id: '3',
        name: 'Internal Audit Process',
        description: 'IATF 16949 internal audit procedure',
        category: 'compliance',
        estimatedDuration: '2 weeks',
        responsibleRole: 'Audit Manager',
        steps: [
          {
            id: '3.1',
            name: 'Audit Planning',
            description: 'Plan audit scope and schedule',
            role: 'Audit Manager',
            duration: '2 days',
            status: 'completed',
            nextSteps: ['3.2']
          },
          {
            id: '3.2',
            name: 'Audit Team Assignment',
            description: 'Assign qualified auditors',
            role: 'Audit Manager',
            duration: '1 day',
            status: 'completed',
            nextSteps: ['3.3']
          },
          {
            id: '3.3',
            name: 'Opening Meeting',
            description: 'Conduct audit opening meeting',
            role: 'Lead Auditor',
            duration: '2 hours',
            status: 'in_progress',
            nextSteps: ['3.4']
          },
          {
            id: '3.4',
            name: 'Field Audit',
            description: 'Execute on-site audit activities',
            role: 'Audit Team',
            duration: '1 week',
            status: 'pending',
            nextSteps: ['3.5']
          },
          {
            id: '3.5',
            name: 'Closing Meeting',
            description: 'Present audit findings',
            role: 'Lead Auditor',
            duration: '2 hours',
            status: 'pending',
            nextSteps: ['3.6']
          },
          {
            id: '3.6',
            name: 'Corrective Actions',
            description: 'Implement corrective actions',
            role: 'Process Owner',
            duration: '1 week',
            status: 'pending',
            nextSteps: []
          }
        ]
      }
    ];

    setProcesses(mockProcesses);
  }, []);

  const getStatusIcon = (status: string) => {
    const IconComponent = statusIcons[status as keyof typeof statusIcons] || Clock;
    return <IconComponent className="h-4 w-4" />;
  };

  const getStatusBadgeColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || statusColors.pending;
  };

  const getCategoryInfo = (category: string) => {
    return processCategories[category as keyof typeof processCategories] || processCategories.quality;
  };

  // Group processes by category
  const processesByCategory = processes.reduce((acc, process) => {
    if (!acc[process.category]) {
      acc[process.category] = [];
    }
    acc[process.category].push(process);
    return acc;
  }, {} as Record<string, Process[]>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
          <GitBranch className="h-8 w-8" />
          Process Maps & Workflows
        </h1>
        <p className="text-muted-foreground">
          Visual representation of business processes and operational workflows
        </p>
      </div>

      {/* Process Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <GitBranch className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{processes.length}</div>
            <div className="text-sm text-muted-foreground">Total Processes</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <Shield className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{processes.filter(p => p.category === 'quality').length}</div>
            <div className="text-sm text-muted-foreground">Quality Processes</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{processes.filter(p => p.category === 'hr').length}</div>
            <div className="text-sm text-muted-foreground">HR Processes</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <FileText className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{processes.filter(p => p.category === 'compliance').length}</div>
            <div className="text-sm text-muted-foreground">Compliance Processes</div>
          </CardContent>
        </Card>
      </div>

      {/* Process Categories */}
      <div className="space-y-6">
        {Object.entries(processesByCategory).map(([category, categoryProcesses]) => {
          const categoryInfo = getCategoryInfo(category);
          const IconComponent = categoryInfo.icon;
          
          return (
            <Card key={category} className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5" />
                  {categoryInfo.name}
                  <Badge className={categoryInfo.color}>
                    {categoryProcesses.length} processes
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{categoryInfo.description}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryProcesses.map((process) => (
                    <Card 
                      key={process.id} 
                      className="border border-border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedProcess(process)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{process.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{process.description}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Duration:</span>
                            <Badge variant="outline">{process.estimatedDuration}</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Responsible:</span>
                            <span className="font-medium">{process.responsibleRole}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Steps:</span>
                            <Badge variant="secondary">{process.steps.length} steps</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress:</span>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span className="text-xs">
                                {process.steps.filter(s => s.status === 'completed').length}/{process.steps.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Process Detail Modal */}
      {selectedProcess && (
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{selectedProcess.name}</CardTitle>
              <Button variant="outline" onClick={() => setSelectedProcess(null)}>
                Close
              </Button>
            </div>
            <p className="text-muted-foreground">{selectedProcess.description}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Process Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-medium">Duration</div>
                    <div className="text-sm text-muted-foreground">{selectedProcess.estimatedDuration}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-medium">Responsible</div>
                    <div className="text-sm text-muted-foreground">{selectedProcess.responsibleRole}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-medium">Total Steps</div>
                    <div className="text-sm text-muted-foreground">{selectedProcess.steps.length}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Process Steps Flow */}
              <div>
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Process Steps
                </h4>
                <div className="space-y-4">
                  {selectedProcess.steps.map((step, index) => (
                    <div key={step.id} className="relative">
                      {/* Connection Line */}
                      {index < selectedProcess.steps.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-8 bg-gradient-to-b from-primary/30 to-transparent"></div>
                      )}
                      
                      <Card className={`ml-4 ${step.status === 'completed' ? 'border-green-200 bg-green-50/50' : step.status === 'in_progress' ? 'border-blue-200 bg-blue-50/50' : 'border-border'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Step Number */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            
                            {/* Step Content */}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium">{step.name}</h5>
                                <div className="flex items-center gap-2">
                                  <Badge className={`${getStatusBadgeColor(step.status)} flex items-center gap-1`}>
                                    {getStatusIcon(step.status)}
                                    <span className="capitalize">{step.status.replace('_', ' ')}</span>
                                  </Badge>
                                  {step.duration && (
                                    <Badge variant="outline" className="text-xs">
                                      {step.duration}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-sm text-muted-foreground">{step.description}</p>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Responsible: {step.role}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
