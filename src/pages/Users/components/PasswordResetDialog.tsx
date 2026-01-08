import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { adminResetPasswordRandom, adminSetPassword, generateSecurePassword } from "@/services/auth-service";
import { Employee } from "../types";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { RefreshCw, Copy, CheckCircle } from "lucide-react";

interface PasswordResetDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  employee: Employee | null;
  onPasswordReset?: () => void;
}

export function PasswordResetDialog({ isOpen, setIsOpen, employee, onPasswordReset }: PasswordResetDialogProps) {
  const { user } = useAuth();
  const currentUser = user as any;
  const userRole = currentUser?.role?.toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  const [isLoading, setIsLoading] = useState(false);
  const [resetMode, setResetMode] = useState<'auto' | 'manual'>('auto');
  const [manualPassword, setManualPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Don't render if user is not admin
  if (!isAdmin) {
    return null;
  }

  const handleGeneratePassword = async () => {
    try {
      const result = await generateSecurePassword();
      setGeneratedPassword(result.password);
      setManualPassword(result.password);
    } catch (error) {
      toast.error('Failed to generate password');
    }
  };

  const handleAutoReset = async () => {
    if (!employee) return;

    setIsLoading(true);
    try {
      // Use the already generated password (if available) or generate new one
      let passwordToUse = generatedPassword;
      if (!passwordToUse) {
        // Fallback: generate on backend
        const result = await adminResetPasswordRandom(employee.id);
        passwordToUse = result.temporary_password;
        setGeneratedPassword(passwordToUse);
      } else {
        // Use the frontend-generated password
        await adminSetPassword(passwordToUse, employee.id, undefined);
      }

      toast.success(`Password reset successfully for ${employee.email}`);
      onPasswordReset?.();
    } catch (error) {
      toast.error('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualReset = async () => {
    if (!employee || !manualPassword) return;

    setIsLoading(true);
    try {
      await adminSetPassword(manualPassword, employee.id, undefined);
      toast.success(`Password set successfully for ${employee.email}`);
      onPasswordReset?.();
      setIsOpen(false);
    } catch (error) {
      toast.error('Failed to set password');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedToClipboard(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setGeneratedPassword('');
    setManualPassword('');
    setResetMode('auto');
    setCopiedToClipboard(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reset Password for {employee?.name}</DialogTitle>
          <DialogDescription>
            Generate a new secure password or set a custom one for this user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm text-gray-600">{employee?.email}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Employee ID</Label>
              <p className="text-sm text-gray-600">{employee?.employeeId}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex space-x-2">
              <Button
                variant={resetMode === 'auto' ? 'default' : 'outline'}
                onClick={() => setResetMode('auto')}
                className="flex-1"
              >
                Auto-Generate Password
              </Button>
              <Button
                variant={resetMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setResetMode('manual')}
                className="flex-1"
              >
                Set Custom Password
              </Button>
            </div>

            {resetMode === 'auto' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Generated Password</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePassword}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Generate
                  </Button>
                </div>

                {generatedPassword && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={generatedPassword}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedPassword)}
                      className="flex items-center gap-2"
                    >
                      {copiedToClipboard ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copiedToClipboard ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                )}

                <Button
                  onClick={handleAutoReset}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Resetting...' : generatedPassword ? 'Reset Password with Generated Password' : 'Generate & Reset Password'}
                </Button>
              </div>
            )}

            {resetMode === 'manual' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="manual-password">Custom Password</Label>
                  <Input
                    id="manual-password"
                    type="password"
                    value={manualPassword}
                    onChange={(e) => setManualPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Password must be at least 6 characters long
                  </p>
                </div>

                <Button
                  onClick={handleManualReset}
                  disabled={isLoading || manualPassword.length < 6}
                  className="w-full"
                >
                  {isLoading ? 'Setting...' : 'Set Custom Password'}
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
