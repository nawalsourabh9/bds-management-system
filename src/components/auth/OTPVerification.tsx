import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface OTPVerificationProps {
  email: string;
  onSuccess: () => void;
  onResend: () => void;
}

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  onSuccess,
  onResend,
}) => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
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
      onSuccess();
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error('Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verify OTP</CardTitle>
        <CardDescription>
          Enter the OTP sent to {email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <Label htmlFor="otp">OTP Code</Label>
            <Input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onResend}
          >
            Resend OTP
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};