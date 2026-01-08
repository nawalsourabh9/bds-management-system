
import { useContext, useMemo } from 'react';
import { AuthContext } from '@/providers/AuthProvider';
import { EmployeeData } from '@/types/auth';

export { AuthProvider } from '@/providers/AuthProvider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Memoize role calculations to prevent unnecessary re-computations
  const authData = useMemo(() => {
    const employee = context.user as EmployeeData | null;
    const userRole = employee?.role?.toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'superadmin';
    const isManager = userRole === 'manager';
    const isManagerOrAdmin = isManager || isAdmin;

    // Only log in development environment - never in production
    if (process.env.NODE_ENV === 'development') {
      console.log("useAuth hook - employee ID:", employee?.id, "role:", employee?.role, "isAdmin:", isAdmin);
    }

    return {
      ...context,
      employee,
      isAdmin,
      isManager,
      isManagerOrAdmin,
      userRole
    };
  }, [context]);

  return authData;
};
