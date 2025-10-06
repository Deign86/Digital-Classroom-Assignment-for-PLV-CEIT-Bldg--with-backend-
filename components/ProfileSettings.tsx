import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { 
  User as UserIcon, 
  Mail, 
  Building, 
  Shield, 
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../App';
import { authService } from '../lib/firebaseService';

interface ProfileSettingsProps {
  user: User;
}

export default function ProfileSettings({ user }: ProfileSettingsProps) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const validatePassword = (): string | null => {
    if (passwordData.newPassword.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return 'Passwords do not match';
    }

    if (passwordData.newPassword === passwordData.currentPassword) {
      return 'New password cannot be the same as the current password.';
    }

    const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
    const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
    const hasNumber = /[0-9]/.test(passwordData.newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return 'Password must contain uppercase, lowercase, number, and special character';
    }

    return null;
  };

  // Sanitize a password string coming from paste: trim, remove newlines/tabs and zero-width chars
  const sanitizePassword = (pwd: string): string => {
    if (!pwd) return pwd;
    // Remove newline/tab characters
    let cleaned = pwd.replace(/[\r\n\t]/g, '');
    // Remove common zero-width/invisible characters
    cleaned = cleaned.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
    // Trim leading/trailing whitespace
    cleaned = cleaned.trim();
    return cleaned;
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Automatically sanitize pasted/typed passwords before validation
    const sanitizedNew = sanitizePassword(passwordData.newPassword);
    const sanitizedConfirm = sanitizePassword(passwordData.confirmPassword);

    // Update form values to reflect sanitized strings (so the UI shows the cleaned value)
    setPasswordData((prev) => ({ ...prev, newPassword: sanitizedNew, confirmPassword: sanitizedConfirm }));

    const validationError = validatePassword();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Only show the confirmation dialog if validation passes
    setShowConfirmDialog(true);
  };

  const handleConfirmPasswordChange = async () => {
    setShowConfirmDialog(false);
    setIsChangingPassword(true);

    // Show immediate feedback that the process is starting
    toast.info('Updating password...', {
      description: 'Please wait while we securely update your password.',
      duration: 2000
    });

    try {
      const result = await authService.updatePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (!result.success) {
        toast.error('Failed to update password', {
          description: result.message
        });
      } else {
        // Show success message
        toast.success('Password Changed Successfully!', {
          description: 'For security, you will now be logged out. Please log back in with your new password.',
          duration: 3000
        });
        
        // Clear the form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // The logout happens automatically in updatePassword method after 1.5s
        // No need for additional logout call here
      }
    } catch (err) {
      console.error('Password update error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating password';
      toast.error('Failed to update password', {
        description: errorMessage
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    try {
      const result = await authService.resetPassword(user.email);

      if (!result.success) {
        toast.error('Failed to send reset email', {
          description: result.message
        });
      } else {
        toast.success('Password reset email sent!', {
          description: `Check your inbox at ${user.email}`,
          duration: 6000
        });
      }
    } catch (err) {
      console.error('Password reset request error:', err);
      toast.error('An error occurred');
    }
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: '', color: '' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) return { strength: 'Weak', color: 'text-red-600' };
    if (score <= 4) return { strength: 'Fair', color: 'text-yellow-600' };
    if (score <= 5) return { strength: 'Good', color: 'text-blue-600' };
    return { strength: 'Strong', color: 'text-green-600' };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  return (
    <div className="space-y-6">
      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your account details and role information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">Full Name</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{user.name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">Email Address</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{user.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">Role</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-4 w-4 text-gray-500" />
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role === 'admin' ? 'Administrator' : 'Faculty'}
                </Badge>
              </div>
            </div>

            {user.department && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Department</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{user.department}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            {/* Security Notice Alert */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Notice:</strong> For your protection, changing your password will sign you out of all active sessions on all devices. You will need to sign back in with your new password.
              </AlertDescription>
            </Alert>

            {/* Password Requirements */}
            <div>
              <p className="text-sm font-medium mb-2">Password Requirements:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>At least 8 characters long</li>
                <li>Contains uppercase and lowercase letters</li>
                <li>Contains at least one number</li>
                <li>Contains at least one special character (e.g., !@#$%^&*)</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter your current password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordData.newPassword && (
                  <p className={`text-sm font-medium ${passwordStrength.color}`}>
                    Strength: {passwordStrength.strength}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                  <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="flex-1"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleRequestPasswordReset}
                disabled={isChangingPassword}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Reset Link
              </Button>
            </div>
          </form>

          <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-500" />
                  Confirm Password Change
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <div className="space-y-3 text-sm">
                    <p>
                      Are you sure you want to change your password? This action will:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Update your account password immediately</li>
                      <li>Log you out from all devices and sessions</li>
                      <li>Require you to log back in with your new password</li>
                    </ul>
                    <p className="font-medium text-amber-600">
                      Make sure you remember your new password before proceeding.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleConfirmPasswordChange}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Yes, Change Password
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
