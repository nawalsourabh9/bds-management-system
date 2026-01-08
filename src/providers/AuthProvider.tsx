
import React, { createContext, useEffect, useState } from 'react';
import { AuthContextType, EmployeeData } from '@/types/auth';
import { useAuthSession } from '@/hooks/use-auth-session';
import * as authService from '@/services/auth-service';
import * as approvalService from '@/services/approval-service';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, user, loading, error, setError, setLoading } = useAuthSession();
  const [employee, setEmployee] = useState<EmployeeData | null>(null);

  useEffect(() => {
    const storedEmployee = localStorage.getItem('employee');
    if (storedEmployee) {
      try {
        setEmployee(JSON.parse(storedEmployee));
      } catch (e) {
        console.error("Error parsing employee data:", e);
        localStorage.removeItem('employee');
      }
    }
  }, []);

  const handleAsyncOperation = async <T,>(operation: () => Promise<T>): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      return result;
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const contextValue: AuthContextType = {
    session,
    user: employee || user,
    loading,
    error,
    signIn: (email: string, password: string) => 
      handleAsyncOperation(async () => {
        const result = await authService.signIn(email, password);
        if (result && result.employee) {
          const { password_hash, ...safeEmployeeData } = result.employee;
          setEmployee(safeEmployeeData);
          localStorage.setItem('employee', JSON.stringify(safeEmployeeData));
        }
        return result;
      }),
    signUp: (email: string, password: string, userData?: any) =>
      handleAsyncOperation(async () => {
        await authService.signUp(email, password, userData);
        return { user: null, session: null };
      }),
    signOut: () => handleAsyncOperation(async () => {
      await authService.signOut();
      setEmployee(null);
      localStorage.removeItem('employee');
    }),
    resetPassword: (email: string) => 
      handleAsyncOperation(() => authService.resetPassword(email)),
    updatePassword: (password: string) => 
      handleAsyncOperation(() => authService.updatePassword(password)),
    updateProfile: (data: { first_name?: string; last_name?: string; email?: string }) => 
      handleAsyncOperation(() => authService.updateProfile(data, user?.id || '')),
    changePassword: (currentPassword: string, newPassword: string) => 
      handleAsyncOperation(() => authService.changePassword(currentPassword, newPassword, user?.id || '')),
    approveUser: (userId: string) => 
      handleAsyncOperation(() => approvalService.approveUser(userId)),
    rejectUser: (userId: string) => 
      handleAsyncOperation(() => approvalService.rejectUser(userId)),
    checkUserApprovalStatus: () => 
      handleAsyncOperation(() => approvalService.checkUserApprovalStatus(user?.id || '', user?.email || '')),
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
