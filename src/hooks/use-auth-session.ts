
import { useState, useEffect } from 'react';
import { EmployeeData } from '@/types/auth';

export const useAuthSession = () => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage for existing session
    const storedEmployee = localStorage.getItem('employee');
    const storedSession = localStorage.getItem('session');
    
    if (storedEmployee && storedSession) {
      try {
        const employee = JSON.parse(storedEmployee);
        const sessionData = JSON.parse(storedSession);
        setUser(employee);
        setSession(sessionData);
        console.log("Auth state change event: INITIAL_SESSION");
      } catch (e) {
        console.error("Error parsing stored auth data:", e);
        localStorage.removeItem('employee');
        localStorage.removeItem('session');
      }
    }
    
    setLoading(false);
  }, []);

  return { session, user, loading, error, setError, setLoading };
};
