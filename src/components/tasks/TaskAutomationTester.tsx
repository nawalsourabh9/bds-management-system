import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const TaskAutomationTester: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const testTaskAutomation = async () => {
    setIsLoading(true);
    try {
      // Test task automation via FastAPI
      const response = await fetch('/api/v1/tasks/trigger-recurring', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger task automation');
      }
      
      const result = await response.json();
      toast.success('Task automation triggered successfully');
      console.log('Task automation result:', result);
    } catch (error) {
      console.error('Task automation error:', error);
      toast.error('Failed to trigger task automation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Automation Tester</CardTitle>
        <CardDescription>
          Test task automation functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={testTaskAutomation} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing...' : 'Test Task Automation'}
        </Button>
      </CardContent>
    </Card>
  );
};