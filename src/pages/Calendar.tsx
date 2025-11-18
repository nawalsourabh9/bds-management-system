
import React, { useState, useMemo } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Task } from "@/types/task";
import { TaskPriorityBadge } from "@/components/tasks/table/TaskPriorityBadge";
import { TaskStatusBadge } from "@/components/tasks/table/TaskStatusBadge";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseInputDate, formatDateForDisplay } from "@/utils/dateUtils";

const CalendarPage = () => {
  const { data: allTasks = [], isLoading } = useTasks();
  const { employee } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Filter tasks to show only tasks assigned to current user
  const userTasks = useMemo(() => {
    if (!employee?.id) return [];
    return allTasks.filter((task: Task) => {
      // Check if task is assigned to current user
      return task.assignee === employee.id || task.assigneeDetails?.employeeId === employee.employee_id;
    });
  }, [allTasks, employee?.id, employee?.employee_id]);

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

  // Handle date click
  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    const tasks = getTasksForDate(date);
    if (tasks.length > 0) {
      // If multiple tasks, show first one (or we could show a list)
      setSelectedTask(tasks[0]);
      setIsTaskDialogOpen(true);
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  const selectedDateTasks = getTasksForDate(selectedDate);
  const totalTasks = userTasks.length;
  const tasksThisMonth = monthDates.reduce((count, date) => {
    return count + getTasksForDate(date).length;
  }, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Calendar</h1>
          <p className="text-muted-foreground mt-1">
            View your tasks by due date
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold">{totalTasks}</span> total tasks
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold">{tasksThisMonth}</span> this month
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateClick}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border"
              modifiers={{
                hasTasks: datesWithTasks,
                hasUrgentTasks: datesWithUrgentTasks,
                hasOverdueTasks: datesWithOverdueTasks,
              }}
              modifiersClassNames={{
                hasTasks: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-blue-500",
                hasUrgentTasks: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-red-500",
                hasOverdueTasks: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-red-600",
              }}
              classNames={{
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground font-semibold",
              }}
            />
            
            {/* Legend */}
            <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>Urgent</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <span>High Priority</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Tasks</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-red-600" />
                <span>Overdue</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isSameDay(selectedDate, new Date()) ? "Today" : format(selectedDate, "EEEE, MMMM d")}
            </CardTitle>
            <CardDescription>
              {selectedDateTasks.length === 0
                ? "No tasks due on this date"
                : `${selectedDateTasks.length} task${selectedDateTasks.length > 1 ? "s" : ""} due`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tasks scheduled for this date</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {selectedDateTasks.map((task) => {
                  const isOverdue = task.dueDate && 
                    parseInputDate(task.dueDate) && 
                    parseInputDate(task.dueDate)! < new Date() && 
                    task.status !== 'completed';
                  
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent",
                        isOverdue && "border-red-500 bg-red-50 dark:bg-red-950"
                      )}
                      onClick={() => {
                        setSelectedTask(task);
                        setIsTaskDialogOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <TaskPriorityBadge priority={task.priority} />
                        <TaskStatusBadge status={task.status} />
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      {task.department && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Department: {task.department}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>
              {selectedTask?.dueDate && (
                <span>Due: {formatDateForDisplay(selectedTask.dueDate)}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4 mt-4">
              {selectedTask.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Priority</h4>
                  <TaskPriorityBadge priority={selectedTask.priority} />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Status</h4>
                  <TaskStatusBadge status={selectedTask.status} />
                </div>
                {selectedTask.department && (
                  <div>
                    <h4 className="font-semibold mb-2">Department</h4>
                    <p className="text-sm text-muted-foreground">{selectedTask.department}</p>
                  </div>
                )}
                {selectedTask.dueDate && (
                  <div>
                    <h4 className="font-semibold mb-2">Due Date</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDateForDisplay(selectedTask.dueDate)}
                    </p>
                  </div>
                )}
              </div>

              {selectedTask.isCustomerRelated && selectedTask.customerName && (
                <div>
                  <h4 className="font-semibold mb-2">Customer</h4>
                  <p className="text-sm text-muted-foreground">{selectedTask.customerName}</p>
                </div>
              )}

              {selectedTask.isRecurring && (
                <div>
                  <h4 className="font-semibold mb-2">Recurring Task</h4>
                  <p className="text-sm text-muted-foreground">
                    Frequency: {selectedTask.recurringFrequency || "N/A"}
                  </p>
                </div>
              )}

              {selectedTask.attachmentsRequired !== 'none' && (
                <div>
                  <h4 className="font-semibold mb-2">Attachments</h4>
                  <Badge variant="outline">
                    {selectedTask.attachmentsRequired === 'required' ? 'Required' : 'Optional'}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;

