import { CheckCircle2, AlertTriangle, ClipboardList, BarChart2, CalendarCheck, Activity, Clock, Bell, User, Eye } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskListDisplay } from "@/components/dashboard/TaskListDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useTasks } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { data: tasks = [], isLoading: loading, error } = useTasks();
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
  const currentUserId = employee?.id; // UUID from database
  const currentEmployeeId = employee?.employee_id; // Display ID like "EMP002"

  console.log("Dashboard - Current user:", { 
    userId: currentUserId, 
    employeeId: currentEmployeeId,
    totalTasks: safeTasks.length 
  });

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
  // Match by UUID (assignee_id) - this is the primary identifier
  // task.assignee should be the UUID from assignee_id, not employee_id
  const userAssignedTasks = safeTasks.filter(task => {
    // task.assignee should be UUID (assignee_id), compare with currentUserId (UUID)
    const matches = task.assignee === currentUserId;
    if (matches) {
      console.log("Matched task:", { taskId: task.id, title: task.title, assignee: task.assignee });
    }
    return matches;
  });
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-vms-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-vms-base text-muted-foreground">
            Welcome back, {employee?.first_name || 'User'}! Here's your task overview and system status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral" className="flex items-center gap-1 normal-case">
            <User className="h-3 w-3" />
            {employee?.role || 'User'}
          </Badge>
        </div>
      </div>

      {/* User Warnings */}
      {(userOverdueTasks > 0 || userRecurringOverdue.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="rounded-vms-xl border border-destructive/20 bg-destructive/5 p-5 dark:bg-destructive/10"
        >
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <h3 className="text-vms-sm font-semibold text-destructive">Attention required</h3>
              <div className="mt-1 text-vms-sm text-destructive/90">
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
      <div className="status-highlight-card p-6 md:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h2 className="text-vms-xl font-semibold text-foreground">Your task summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          <div className="text-center">
            <div className="text-vms-xl font-semibold text-foreground">{userAssignedTasks.length}</div>
            <div className="text-vms-sm text-muted-foreground">Assigned to you</div>
          </div>
          <div className="text-center">
            <div className="text-vms-xl font-semibold text-success">{userCompletedTasks}</div>
            <div className="text-vms-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-vms-xl font-semibold text-warning">{userPendingTasks}</div>
            <div className="text-vms-sm text-muted-foreground">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-vms-xl font-semibold text-primary">{userCreatedTasks.length}</div>
            <div className="text-vms-sm text-muted-foreground">Created by you</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Tasks"
          value={totalTasks}
          icon={ClipboardList}
          description="All system tasks"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Pending"
          value={pendingTasks}
          icon={Clock}
          description="Awaiting action"
          trend={{ value: 5, positive: true }}
          variant={pendingTasks > 0 ? "warning" : "default"}
        />
        <StatCard
          title="In Progress"
          value={inProgressTasks}
          icon={Activity}
          description="Currently active"
          trend={{ value: 3, positive: true }}
        />
        <StatCard
          title="Completed"
          value={completedTasks}
          icon={CheckCircle2}
          description="Successfully finished"
          trend={{ value: 8, positive: true }}
          variant="success"
        />
        <StatCard
          title="Overdue"
          value={overdueTasks}
          icon={AlertTriangle}
          description="Past due date"
          trend={{ value: overdueTasks > 0 ? 2 : 0, positive: overdueTasks === 0 }}
          variant={overdueTasks > 0 ? "danger" : "default"}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          <Card className="rounded-vms-xl border border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-vms-base font-semibold">
                <ClipboardList className="h-5 w-5 text-primary" />
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}
        >
          <Card className="rounded-vms-xl border border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-vms-base font-semibold">
                <CalendarCheck className="h-5 w-5 text-primary" />
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16, ease: [0.4, 0, 0.2, 1] }}
        >
          <Card className="rounded-vms-xl border border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-vms-base font-semibold">
                <User className="h-5 w-5 text-primary" />
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.24, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="white-box !p-6 md:!p-8">
          <div className="mb-6 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <h2 className="text-vms-xl font-semibold text-foreground">Task distribution overview</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            <div className="rounded-vms-lg bg-muted/40 px-4 py-5 text-center dark:bg-muted/20">
              <div className="text-vms-xl font-semibold text-foreground">{totalTasks}</div>
              <div className="text-vms-sm text-muted-foreground">Total tasks</div>
            </div>
            <div className="rounded-vms-lg bg-amber-500/10 px-4 py-5 text-center">
              <div className="text-vms-xl font-semibold text-warning">{pendingTasks}</div>
              <div className="text-vms-sm text-muted-foreground">Pending</div>
            </div>
            <div className="rounded-vms-lg bg-emerald-500/10 px-4 py-5 text-center">
              <div className="text-vms-xl font-semibold text-success">{completedTasks}</div>
              <div className="text-vms-sm text-muted-foreground">Completed</div>
            </div>
            <div className="rounded-vms-lg bg-destructive/10 px-4 py-5 text-center">
              <div className="text-vms-xl font-semibold text-destructive">{overdueTasks}</div>
              <div className="text-vms-sm text-muted-foreground">Overdue</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}