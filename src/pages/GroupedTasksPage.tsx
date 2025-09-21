import React from 'react';
import { GroupedTaskList } from '@/components/tasks/GroupedTaskList';

const GroupedTasksPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <GroupedTaskList />
    </div>
  );
};

export default GroupedTasksPage;

