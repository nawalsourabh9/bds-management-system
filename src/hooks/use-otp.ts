import { useState } from 'react';
import { toast } from 'sonner';

export const useOTP = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendOTP = async (email: string) => {
    setIsLoading(true);
    try {
      // Send OTP via FastAPI
      const response = await fetch('/api/v1/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send OTP');
      }
      
      toast.success('OTP sent successfully');
    } catch (error) {
      console.error('OTP send error:', error);
      toast.error('Failed to send OTP');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      // Verify OTP via FastAPI
      const response = await fetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });
      
      if (!response.ok) {
        throw new Error('Invalid OTP');
      }
      
      toast.success('OTP verified successfully');
      return true;
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error('Invalid OTP');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendOTP,
    verifyOTP,
    isLoading,
  };
};