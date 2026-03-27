import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger" | "primary";
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {
  const iconWrap = {
    default: "bg-muted text-foreground",
    success: "bg-emerald-500/10 text-success",
    warning: "bg-amber-500/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
  };

  return (
    <motion.div
      whileHover={{
        y: -2,
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card
        className={cn(
          "stat-card-visual vms-interactive border-border shadow-sm hover:shadow-md",
          "group cursor-pointer"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-vms-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            {title}
          </CardTitle>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-vms-lg vms-interactive",
              iconWrap[variant]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-vms-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {(description || trend) && (
            <div className="mt-2 flex items-center text-vms-xs text-muted-foreground">
              {trend && (
                <span className="mr-2 flex items-center gap-1 font-medium">
                  {trend.positive ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span
                    className={cn(
                      trend.positive
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-destructive"
                    )}
                  >
                    {Math.abs(trend.value)}%
                  </span>
                </span>
              )}
              {description && <span>{description}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
