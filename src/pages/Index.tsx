import { CheckCircle2, AlertTriangle, ClipboardList, FileCheck, Gauge, BarChart2, CalendarCheck, UserCheck, TrendingUp, Activity, Users, Clock, Bell, User, Plus, Eye } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskListDisplay } from "@/components/dashboard/TaskListDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useTasks } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { tasks, loading, error } = useTasks();
  const { employee } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Safety check for tasks
  const safeTasks = tasks || [];
  const currentUserId = employee?.id;

  // Calculate comprehensive stats
  const totalTasks = safeTasks.length;
  const completedTasks = safeTasks.filter(task => task.status === 'completed').length;
  const pendingTasks = safeTasks.filter(task => task.status === 'pending' || task.status === 'not-started').length;
  const inProgressTasks = safeTasks.filter(task => task.status === 'in-progress').length;
  
  const overdueTasks = safeTasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && task.status !== 'completed';
  }).length;

  // User-specific statistics
  const userAssignedTasks = safeTasks.filter(task => task.assignee === currentUserId);
  const userCreatedTasks = safeTasks.filter(task => task.createdBy === currentUserId);
  
  const userPendingTasks = userAssignedTasks.filter(task => task.status === 'pending' || task.status === 'not-started').length;
  const userOverdueTasks = userAssignedTasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && task.status !== 'completed';
  }).length;
  
  const userInProgressTasks = userAssignedTasks.filter(task => task.status === 'in-progress').length;
  const userCompletedTasks = userAssignedTasks.filter(task => task.status === 'completed').length;

  // Get recent tasks (limit to 6)
  const recentTasks = safeTasks.slice(0, 6);

  // Get upcoming tasks (next 7 days)
  const upcomingTasks = safeTasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= nextWeek && task.status !== 'completed';
  }).slice(0, 5);

  // Get user's assigned tasks for warnings
  const userUpcomingTasks = userAssignedTasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= nextWeek && task.status !== 'completed';
  });

  // Recurring task warnings
  const userRecurringTasks = userAssignedTasks.filter(task => task.isRecurring);
  const userRecurringOverdue = userRecurringTasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && task.status !== 'completed';
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {employee?.first_name || 'User'}! Here's your task overview and system status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {employee?.role || 'User'}
          </Badge>
        </div>
      </div>

      {/* User Warnings */}
      {(userOverdueTasks > 0 || userRecurringOverdue.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">⚠️ Attention Required</h3>
              <div className="text-sm text-red-700 mt-1">
                {userOverdueTasks > 0 && (
                  <p>• You have {userOverdueTasks} overdue task{userOverdueTasks > 1 ? 's' : ''}</p>
                )}
                {userRecurringOverdue.length > 0 && (
                  <p>• You have {userRecurringOverdue.length} overdue recurring task{userRecurringOverdue.length > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* User Task Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Your Task Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{userAssignedTasks.length}</div>
              <div className="text-sm text-muted-foreground">Assigned to You</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{userCompletedTasks}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{userPendingTasks}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{userCreatedTasks.length}</div>
              <div className="text-sm text-muted-foreground">Created by You</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Tasks"
          value={totalTasks}
          icon={ClipboardList}
          description="All system tasks"
          trend="+12%"
          trendDirection="up"
        />
        <StatCard
          title="Pending"
          value={pendingTasks}
          icon={Clock}
          description="Awaiting action"
          trend="+5%"
          trendDirection="up"
          variant={pendingTasks > 0 ? "secondary" : "default"}
        />
        <StatCard
          title="In Progress"
          value={inProgressTasks}
          icon={Activity}
          description="Currently active"
          trend="+3%"
          trendDirection="up"
        />
        <StatCard
          title="Completed"
          value={completedTasks}
          icon={CheckCircle2}
          description="Successfully finished"
          trend="+8%"
          trendDirection="up"
        />
        <StatCard
          title="Overdue"
          value={overdueTasks}
          icon={AlertTriangle}
          description="Past due date"
          trend={overdueTasks > 0 ? "-2%" : "0%"}
          trendDirection={overdueTasks > 0 ? "down" : "neutral"}
          variant={overdueTasks > 0 ? "destructive" : "default"}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Recent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTasks.length > 0 ? (
                <TaskListDisplay tasks={recentTasks} />
              ) : (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No tasks found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5" />
                Upcoming This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length > 0 ? (
                <TaskListDisplay tasks={upcomingTasks} />
              ) : (
                <div className="text-center py-8">
                  <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming tasks</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* User's Upcoming Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Upcoming Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userUpcomingTasks.length > 0 ? (
                <TaskListDisplay tasks={userUpcomingTasks} />
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming tasks assigned to you</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Task Distribution Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Task Distribution Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{totalTasks}</div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">{pendingTasks}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{completedTasks}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">{overdueTasks}</div>
                <div className="text-sm text-muted-foreground">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}