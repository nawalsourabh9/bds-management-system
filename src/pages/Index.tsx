import { CheckCircle2, AlertTriangle, ClipboardList, FileCheck, Gauge, BarChart2, CalendarCheck, UserCheck, TrendingUp, Activity, Users, Clock } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import TaskList from "@/components/dashboard/TaskList";
import { QualityMetricsChart } from "@/components/dashboard/QualityMetricsChart";
import { DocumentsStatus } from "@/components/dashboard/DocumentsStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useTasks } from "@/hooks/use-tasks";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { tasks, loading, error } = useTasks();

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

  // Calculate stats from real data
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && task.status !== 'completed';
  }).length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;

  // Get recent tasks (limit to 6)
  const recentTasks = tasks.slice(0, 6);

  // Get upcoming tasks (next 7 days)
  const upcomingTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= nextWeek && task.status !== 'completed';
  }).slice(0, 5);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your quality management system.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tasks"
          value={totalTasks}
          icon={ClipboardList}
          description="All active tasks"
          trend="+12%"
          trendDirection="up"
        />
        <StatCard
          title="Completed"
          value={completedTasks}
          icon={CheckCircle2}
          description="Tasks completed this period"
          trend="+8%"
          trendDirection="up"
        />
        <StatCard
          title="In Progress"
          value={inProgressTasks}
          icon={Activity}
          description="Currently active tasks"
          trend="+3%"
          trendDirection="up"
        />
        <StatCard
          title="Overdue"
          value={overdueTasks}
          icon={AlertTriangle}
          description="Tasks past due date"
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
                <TaskList tasks={recentTasks} />
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
                <TaskList tasks={upcomingTasks} />
              ) : (
                <div className="text-center py-8">
                  <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming tasks</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Documents Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <DocumentsStatus />
        </motion.div>
      </div>

      {/* Quality Metrics Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <QualityMetricsChart />
      </motion.div>
    </div>
  );
}