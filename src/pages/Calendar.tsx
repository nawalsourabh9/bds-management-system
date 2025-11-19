
import React, { useState, useMemo, useEffect } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Task } from "@/types/task";
import { TaskPriorityBadge } from "@/components/tasks/table/TaskPriorityBadge";
import { TaskStatusBadge } from "@/components/tasks/table/TaskStatusBadge";
import { CalendarIcon, ChevronLeft, ChevronRight, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseInputDate, formatDateForDisplay } from "@/utils/dateUtils";
import { fastapiService } from "@/services/fastapi-service";

const CalendarPage = () => {
  const { data: allTasks = [], isLoading } = useTasks();
  const { employee } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [directReports, setDirectReports] = useState<string[]>([]);
  const [directReportsData, setDirectReportsData] = useState<any[]>([]);

  // Fetch direct reports (users who report to current user)
  useEffect(() => {
    const fetchDirectReports = async () => {
      if (!employee?.id) return;
      try {
        const response = await fastapiService.getUsers();
        const users = response.users || response || [];
        const reports = users.filter((user: any) => 
          user.reports_to_id === employee.id || 
          user.reportsToId === employee.id ||
          (typeof user.reports_to_id === 'string' && typeof employee.id === 'string' && user.reports_to_id === employee.id)
        );
        setDirectReports(reports.map((r: any) => r.id));
        setDirectReportsData(reports);
      } catch (error) {
        console.error("Error fetching direct reports:", error);
      }
    };
    fetchDirectReports();
  }, [employee?.id]);

  // Filter tasks: show tasks assigned to current user AND their direct reports
  const userTasks = useMemo(() => {
    if (!employee?.id) return [];
    const relevantUserIds = [employee.id, ...directReports];
    
    return allTasks.filter((task: Task) => {
      const assigneeId = task.assignee || task.assigneeDetails?.employeeId;
      return relevantUserIds.some(id => 
        assigneeId === id || 
        task.assigneeDetails?.employeeId === id ||
        (typeof assigneeId === 'string' && typeof id === 'string' && assigneeId === id)
      );
    });
  }, [allTasks, employee?.id, directReports]);

  // Group tasks by due date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    userTasks.forEach((task: Task) => {
      if (task.dueDate) {
        const dateKey = format(parseInputDate(task.dueDate) || new Date(), "yyyy-MM-dd");
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    
    return grouped;
  }, [userTasks]);

  // Get tasks for a specific date
  const getTasksForDate = (date: Date): Task[] => {
    const dateKey = format(date, "yyyy-MM-dd");
    return tasksByDate[dateKey] || [];
  };

  // Navigate months
  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Get all dates in current month with tasks
  const monthDates = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get dates with tasks for calendar modifiers
  const datesWithTasks = useMemo(() => {
    return Object.keys(tasksByDate).map(dateKey => {
      const [year, month, day] = dateKey.split('-').map(Number);
      return new Date(year, month - 1, day);
    });
  }, [tasksByDate]);

  // Get dates with urgent tasks
  const datesWithUrgentTasks = useMemo(() => {
    return datesWithTasks.filter(date => {
      const dateKey = format(date, "yyyy-MM-dd");
      const tasks = tasksByDate[dateKey] || [];
      return tasks.some(t => t.priority === 'urgent' || t.priority === 'critical' || t.priority === 'emergency');
    });
  }, [datesWithTasks, tasksByDate]);

  // Get dates with overdue tasks
  const datesWithOverdueTasks = useMemo(() => {
    return datesWithTasks.filter(date => {
      const dateKey = format(date, "yyyy-MM-dd");
      const tasks = tasksByDate[dateKey] || [];
      return tasks.some(t => {
        if (!t.dueDate) return false;
        const dueDate = parseInputDate(t.dueDate);
        return dueDate && dueDate < new Date() && t.status !== 'completed';
      });
    });
  }, [datesWithTasks, tasksByDate]);

  // Get assignee name for a task
  const getAssigneeName = (task: Task): string => {
    if (task.assigneeDetails?.name) {
      return task.assigneeDetails.name;
    }
    if (task.assignee === employee?.id) {
      return "Me";
    }
    const assignee = directReportsData.find(r => r.id === task.assignee);
    if (assignee) {
      return `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || 'Team Member';
    }
    return "Unassigned";
  };

  // Check if task is assigned to current user
  const isMyTask = (task: Task): boolean => {
    return task.assignee === employee?.id || task.assigneeDetails?.employeeId === employee?.employee_id;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  const selectedDateTasks = getTasksForDate(selectedDate);
  const totalTasks = userTasks.length;
  const myTasks = userTasks.filter(isMyTask).length;
  const teamTasks = userTasks.filter(t => !isMyTask(t)).length;
  const tasksThisMonth = monthDates.reduce((count, date) => {
    return count + getTasksForDate(date).length;
  }, 0);

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 md:mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Team Calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            View tasks assigned to you and your team members
          </p>
        </div>
        <div className="flex items-center gap-3 md:gap-6 flex-wrap">
          <div className="text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 md:h-4 md:w-4 text-primary" />
              <span className="font-semibold">{myTasks}</span>
              <span className="text-muted-foreground">my tasks</span>
            </div>
          </div>
          {directReports.length > 0 && (
            <div className="text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                <span className="font-semibold">{teamTasks}</span>
                <span className="text-muted-foreground">team tasks</span>
              </div>
            </div>
          )}
          <div className="text-xs md:text-sm text-muted-foreground">
            <span className="font-semibold">{totalTasks}</span> total
          </div>
          <div className="text-xs md:text-sm text-muted-foreground">
            <span className="font-semibold">{tasksThisMonth}</span> this month
          </div>
        </div>
      </div>

      {/* Full Page Calendar */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 gap-4 md:gap-6 min-h-0">
        {/* Calendar - Takes 4 columns */}
        <Card className="lg:col-span-4 flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <CalendarIcon className="h-4 w-4 md:h-5 md:w-5" />
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                  className="h-7 w-7 md:h-8 md:w-8"
                >
                  <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                  className="text-xs md:text-sm h-7 md:h-8"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-7 w-7 md:h-8 md:w-8"
                >
                  <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex items-center justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-md border w-full max-w-full"
                modifiers={{
                  hasTasks: datesWithTasks,
                  hasUrgentTasks: datesWithUrgentTasks,
                  hasOverdueTasks: datesWithOverdueTasks,
                }}
                modifiersClassNames={{
                  hasTasks: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 md:after:h-2 md:after:w-2 after:rounded-full after:bg-blue-500",
                  hasUrgentTasks: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 md:after:h-2 md:after:w-2 after:rounded-full after:bg-red-500",
                  hasOverdueTasks: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 md:after:h-2 md:after:w-2 after:rounded-full after:bg-red-600",
                }}
                classNames={{
                  months: "w-full",
                  month: "w-full",
                  table: "w-full",
                  head_row: "w-full",
                  row: "w-full justify-between",
                  cell: "flex-1",
                  day: "h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 p-1 font-normal aria-selected:opacity-100 relative flex flex-col items-center justify-center text-xs md:text-sm",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground font-semibold",
                }}
              />
            </div>
            
            {/* Legend */}
            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t flex items-center gap-3 md:gap-4 text-xs text-muted-foreground flex-wrap flex-shrink-0">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-red-500" />
                <span>Urgent</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-orange-500" />
                <span>High Priority</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-blue-500" />
                <span>Tasks</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-red-600" />
                <span>Overdue</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks for Selected Date - Takes 3 columns */}
        <Card className="lg:col-span-3 flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0 pb-3">
            <CardTitle className="text-lg md:text-xl">
              {isSameDay(selectedDate, new Date()) ? "Today" : format(selectedDate, "EEEE, MMMM d")}
            </CardTitle>
            <div className="text-xs md:text-sm text-muted-foreground mt-1">
              {selectedDateTasks.length === 0
                ? "No tasks due on this date"
                : `${selectedDateTasks.length} task${selectedDateTasks.length > 1 ? "s" : ""} due`}
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              {selectedDateTasks.length === 0 ? (
                <div className="text-center py-8 md:py-12 text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm md:text-base">No tasks scheduled for this date</p>
                </div>
              ) : (
                <div className="space-y-2 md:space-y-3 pr-4">
                  {selectedDateTasks.map((task) => {
                    const isOverdue = task.dueDate && 
                      parseInputDate(task.dueDate) && 
                      parseInputDate(task.dueDate)! < new Date() && 
                      task.status !== 'completed';
                    const isMyTaskFlag = isMyTask(task);
                    const assigneeName = getAssigneeName(task);
                    
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "p-4 rounded-lg border transition-colors",
                          isOverdue && "border-red-500 bg-red-50 dark:bg-red-950",
                          !isOverdue && isMyTaskFlag && "border-primary/20 bg-primary/5",
                          !isOverdue && !isMyTaskFlag && "border-border bg-card"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1">{task.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {isMyTaskFlag ? (
                                <Badge variant="outline" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  Me
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  {assigneeName}
                                </Badge>
                              )}
                              {task.department && (
                                <>
                                  <span>•</span>
                                  <span>{task.department}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {task.description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <TaskPriorityBadge priority={task.priority} />
                          <TaskStatusBadge status={task.status} comments={task.comments} />
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        
                        {task.dueDate && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Due: {formatDateForDisplay(task.dueDate)}
                          </div>
                        )}
                        
                        {task.isCustomerRelated && task.customerName && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Customer: {task.customerName}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarPage;
