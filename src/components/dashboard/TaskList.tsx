
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Clock, User, Building2, RefreshCw } from "lucide-react";
import { API_BASE, API_ENDPOINTS } from "@/config/api";
import { TaskSkeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'completed' | 'in-progress' | 'overdue' | 'not-started';
  assignee_name?: string;
  assignee_id?: string;
  department?: string;
  is_customer_related?: boolean;
  customer_name?: string;
  created_at: string;
  updated_at: string;
}

interface TaskListProps {
  limit?: number;
  showRefresh?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({ limit = 5, showRefresh = true }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks from API
  const fetchTasks = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log("Fetching recent tasks from API...");
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.TASKS}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const tasksData = data.tasks || [];
      
      // Sort by updated_at (most recent first) and limit
      const recentTasks = tasksData
        .sort((a: Task, b: Task) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, limit);
      
      console.log(`Fetched ${recentTasks.length} recent tasks from API`);
      setTasks(recentTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTasks();
  }, [limit]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTasks(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [limit]);

  // Format due date to DD-MM-YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd-MM-yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] || "") + (nameParts[1][0] || "");
    }
    return name.substring(0, 1).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="glass-effect">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              Recent Tasks
              {refreshing && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="h-4 w-4 text-orange-500" />
                </motion.div>
              )}
            </CardTitle>
            {showRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchTasks(true)}
                disabled={refreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: limit }).map((_, index) => (
                <TaskSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTasks()}
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-gray-400 mb-2">📋</div>
              <p className="text-sm text-muted-foreground">No recent tasks found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, index) => (
              <motion.div 
                key={task.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="group flex items-start justify-between p-4 border border-gray-200/50 rounded-xl hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-orange-100/30 hover:border-orange-200/50 transition-all duration-300 hover:shadow-md cursor-pointer"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-3">
                    <h3 className="font-semibold text-sm group-hover:text-orange-600 transition-colors leading-tight">
                      {task.title}
                    </h3>
                    {task.is_customer_related && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-xs">
                        {task.customer_name || 'Customer'}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {task.priority}
                    </Badge>
                    <Badge 
                      variant={task.status === 'completed' ? 'outline' : 
                              task.status === 'overdue' ? 'destructive' : 
                              task.status === 'in-progress' ? 'default' : 
                              'secondary'}
                      className="text-xs"
                    >
                      {task.status}
                    </Badge>
                    {task.department && (
                      <Badge variant="outline" className="bg-gray-50 text-xs">
                        {task.department}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(task.due_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {task.department || 'General'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Assigned to</div>
                    <div className="text-sm font-medium">{task.assignee_name || 'Unassigned'}</div>
                  </div>
                  <Avatar className="h-10 w-10 ring-2 ring-orange-200 group-hover:ring-orange-300 transition-all">
                    <AvatarFallback className="bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 font-semibold">
                      {getInitials(task.assignee_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </motion.div>
            ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TaskList;
