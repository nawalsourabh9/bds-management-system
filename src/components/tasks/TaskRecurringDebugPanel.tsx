import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const TaskRecurringDebugPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const debugRecurringTasks = async () => {
    setIsLoading(true);
    try {
      // Debug recurring tasks via FastAPI
      const response = await fetch('/api/v1/tasks?recurring=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch recurring tasks');
      }
      
      const result = await response.json();
      toast.success(`Found ${result.length} recurring tasks`);
      console.log('Recurring tasks:', result);
    } catch (error) {
      console.error('Recurring tasks debug error:', error);
      toast.error('Failed to debug recurring tasks');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recurring Tasks Debug Panel</CardTitle>
        <CardDescription>
          Debug recurring task functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={debugRecurringTasks} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Debugging...' : 'Debug Recurring Tasks'}
        </Button>
      </CardContent>
    </Card>
  );
};