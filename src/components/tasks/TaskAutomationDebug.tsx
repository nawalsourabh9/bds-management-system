
import React from "react";
import { useTaskAutomation } from "@/hooks/use-task-automation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Loader2 } from "lucide-react";
import TaskRecurringDebugPanel from "./TaskRecurringDebugPanel";

const TaskAutomationDebug = () => {
  const { triggerAutomation, isRunning } = useTaskAutomation();

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg">Task Automation Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={triggerAutomation}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? "Running..." : "Trigger Automation"}
            </Button>
            <span className="text-sm text-muted-foreground">
              Manually trigger the task automation process (overdue marking + recurring generation)
            </span>
          </div>
        </CardContent>
      </Card>

      <TaskRecurringDebugPanel />
    </div>
  );
};

export default TaskAutomationDebug;
