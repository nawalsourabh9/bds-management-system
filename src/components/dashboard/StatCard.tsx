
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
  variant = "default"
}: StatCardProps) {
  const variantClassMap = {
    default: "bg-gradient-to-br from-white to-gray-50/50 border-gray-200/50 hover:border-gray-300/50",
    success: "bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50 hover:border-green-300/50",
    warning: "bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50 hover:border-amber-300/50",
    danger: "bg-gradient-to-br from-red-50 to-red-100/50 border-red-200/50 hover:border-red-300/50",
    primary: "bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/50 hover:border-orange-300/50"
  };
  
  const iconClassMap = {
    default: "text-blue-600 bg-gradient-to-br from-blue-100 to-blue-200/50",
    success: "text-green-600 bg-gradient-to-br from-green-100 to-green-200/50",
    warning: "text-amber-600 bg-gradient-to-br from-amber-100 to-amber-200/50",
    danger: "text-red-600 bg-gradient-to-br from-red-100 to-red-200/50",
    primary: "text-orange-600 bg-gradient-to-br from-orange-100 to-orange-200/50"
  };

  return (
    <motion.div
      whileHover={{ 
        scale: 1.02,
        y: -2,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={cn(
        "border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group",
        variantClassMap[variant]
      )}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
            {title}
          </CardTitle>
          <motion.div 
            className={cn("p-3 rounded-xl transition-all duration-300 group-hover:scale-110", iconClassMap[variant])}
            whileHover={{ rotate: 5 }}
          >
            <Icon className="h-5 w-5" />
          </motion.div>
        </CardHeader>
        <CardContent>
          <motion.div 
            className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {value}
          </motion.div>
          {(description || trend) && (
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              {trend && (
                <motion.div
                  className="flex items-center gap-1 mr-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {trend.positive ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span 
                    className={cn(
                      "font-medium",
                      trend.positive ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {Math.abs(trend.value)}%
                  </span>
                </motion.div>
              )}
              {description && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {description}
                </motion.span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
