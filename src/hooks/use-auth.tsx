
import { useContext } from 'react';
import { AuthContext } from '@/providers/AuthProvider';
import { EmployeeData } from '@/types/auth';

export { AuthProvider } from '@/providers/AuthProvider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // Ensure we're properly checking if the user has admin role - using case insensitive comparison
  const employee = context.user as EmployeeData | null;
  const isAdmin = employee?.role?.toLowerCase() === 'admin' || employee?.role?.toLowerCase() === 'superadmin';

  // Only log in development environment - never in production
  if (process.env.NODE_ENV === 'development') {
    console.log("useAuth hook - employee ID:", employee?.id, "role:", employee?.role, "isAdmin:", isAdmin);
  }
  
  return {
    ...context,
    employee,
    isAdmin
  };
};
