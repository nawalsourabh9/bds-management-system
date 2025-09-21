
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function QualityMetricsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Metrics</CardTitle>
        <CardDescription>Real-time quality indicators from your system</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-muted-foreground">Quality metrics will be displayed here</p>
            <p className="text-sm text-muted-foreground mt-2">Connect your quality data to see real metrics</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
