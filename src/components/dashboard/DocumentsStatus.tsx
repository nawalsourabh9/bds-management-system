
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DocumentsStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-muted-foreground">Document management coming soon</p>
          <p className="text-sm text-muted-foreground mt-2">Track document approvals and reviews</p>
        </div>
      </CardContent>
    </Card>
  );
}
