import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RotateCcw, 
  Users, 
  Calendar,
  ArrowRight,
  Play,
  Pause,
  RefreshCw,
  Target
} from "lucide-react";
import { fastapiService } from "@/services/fastapi-service";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  assigned_to?: string;
  created_by?: string;
  parent_task_id?: string;
  is_recurring?: boolean;
  created_at: string;
}

const statusIcons = {
  'pending': Clock,
  'in_progress': Play,
  'completed': CheckCircle,
  'overdue': AlertCircle,
  'cancelled': Pause,
};

const statusColors = {
  'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
  'completed': 'bg-green-100 text-green-800 border-green-200',
  'overdue': 'bg-red-100 text-red-800 border-red-200',
  'cancelled': 'bg-gray-100 text-gray-800 border-gray-200',
};

const priorityColors = {
  'low': 'bg-green-100 text-green-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'high': 'bg-orange-100 text-orange-800',
  'urgent': 'bg-red-100 text-red-800',
};

export default function MindMapTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fastapiService.getTasks();
      setTasks(response.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const IconComponent = statusIcons[status as keyof typeof statusIcons] || Clock;
    return <IconComponent className="h-4 w-4" />;
  };

  const getStatusBadgeColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || statusColors.pending;
  };

  const getPriorityBadgeColor = (priority: string) => {
    return priorityColors[priority as keyof typeof priorityColors] || priorityColors.medium;
  };

  // Group tasks by status
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = [];
    }
    acc[task.status].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const overdueTasks = tasks.filter(t => t.status === 'overdue').length;
  const recurringTasks = tasks.filter(t => t.is_recurring).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Define workflow stages
  const workflowStages = [
    { status: 'pending', label: 'Pending', description: 'Tasks waiting to start' },
    { status: 'in_progress', label: 'In Progress', description: 'Tasks currently being worked on' },
    { status: 'completed', label: 'Completed', description: 'Successfully finished tasks' },
    { status: 'overdue', label: 'Overdue', description: 'Tasks past due date' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
          <ClipboardList className="h-8 w-8" />
          Task Workflow Mind Map
        </h1>
        <p className="text-muted-foreground">
          Visual representation of your task management workflow and processes
        </p>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{totalTasks}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{completedTasks}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <Play className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{inProgressTasks}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <div className="text-2xl font-bold">{overdueTasks}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <RotateCcw className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{recurringTasks}</div>
            <div className="text-sm text-muted-foreground">Recurring</div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Task Completion Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Completion Rate</span>
              <span className="text-sm text-muted-foreground">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {completedTasks} of {totalTasks} tasks completed
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Stages */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Task Workflow Stages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {workflowStages.map((stage, index) => {
              const stageTasks = groupedTasks[stage.status] || [];
              
              return (
                <div key={stage.status} className="relative">
                  {/* Connection Arrow */}
                  {index < workflowStages.length - 1 && (
                    <div className="absolute left-6 top-full w-0.5 h-6 bg-gradient-to-b from-primary/30 to-transparent z-10"></div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    {/* Stage Badge */}
                    <div className={`px-4 py-2 rounded-lg border-2 flex items-center gap-2 min-w-fit ${getStatusBadgeColor(stage.status)}`}>
                      {getStatusIcon(stage.status)}
                      <span className="font-semibold">{stage.label}</span>
                      <Badge variant="secondary" className="ml-2">
                        {stageTasks.length}
                      </Badge>
                    </div>

                    {/* Stage Description */}
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-3">{stage.description}</p>
                      
                      {/* Tasks Grid */}
                      {stageTasks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {stageTasks.slice(0, 6).map((task) => (
                            <Card key={task.id} className="border border-border hover:border-primary/50 transition-colors">
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <h4 className="font-medium text-sm line-clamp-2">
                                      {task.title}
                                    </h4>
                                    <Badge className={`text-xs ${getPriorityBadgeColor(task.priority)}`}>
                                      {task.priority}
                                    </Badge>
                                  </div>
                                  
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                                    </span>
                                  </div>
                                  
                                  {task.assigned_to && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Users className="h-3 w-3" />
                                      <span>{task.assigned_to}</span>
                                    </div>
                                  )}
                                  
                                  {task.is_recurring && (
                                    <Badge variant="outline" className="text-xs">
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                      Recurring
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          
                          {stageTasks.length > 6 && (
                            <Card className="border border-dashed border-border">
                              <CardContent className="p-3 flex items-center justify-center">
                                <span className="text-sm text-muted-foreground">
                                  +{stageTasks.length - 6} more tasks
                                </span>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No tasks in this stage</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recurring Tasks Overview */}
      {recurringTasks > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Recurring Tasks Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.filter(t => t.is_recurring).map((task) => (
                <Card key={task.id} className="border border-purple-200 bg-purple-50/50">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-purple-600" />
                        <h4 className="font-medium text-sm">{task.title}</h4>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getStatusBadgeColor(task.status)}`}>
                          {task.status}
                        </Badge>
                        <Badge className={`text-xs ${getPriorityBadgeColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                      </div>
                      
                      {task.due_date && (
                        <div className="text-xs text-muted-foreground">
                          Next due: {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
