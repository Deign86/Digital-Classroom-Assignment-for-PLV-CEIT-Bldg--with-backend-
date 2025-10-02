import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
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
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
    const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
    const hasNumber = /[0-9]/.test(passwordData.newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      toast.error('Password must contain uppercase, lowercase, number, and special character');
      return;
    }

    setIsChangingPassword(true);

    try {
      const result = await authService.updatePassword(passwordData.newPassword);

      if (!result.success) {
        toast.error('Failed to update password', {
          description: result.message
        });
      } else {
        toast.success('Password updated successfully!', {
          description: 'Your password has been changed. Use it for your next login.',
          duration: 5000
        });
        setPasswordData({
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (err) {
      console.error('Password update error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating password';
      toast.error('Failed to update password', {
        description: errorMessage
      });
    } finally {
      // Ensure loading state is always reset
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
          <form onSubmit={handlePasswordChange} className="space-y-6">
            {/* Password Requirements Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Password Requirements:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>At least 8 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Contains at least one number</li>
                  <li>Contains at least one special character (!@#$%^&*)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
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
                disabled={isChangingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
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
        </CardContent>
      </Card>
    </div>
  );
}
