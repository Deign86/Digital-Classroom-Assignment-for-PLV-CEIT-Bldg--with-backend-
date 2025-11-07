import React, { useState, useEffect } from 'react';
import { logger } from '../lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../lib/firebaseService';

interface PasswordResetPageProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PasswordResetPage({ onSuccess, onCancel }: PasswordResetPageProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);
  const [actionCode, setActionCode] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'fair' | 'good' | 'strong'>('weak');

  // Check if we have a valid recovery session
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('oobCode');

    if (!code) {
      setIsValidLink(false);
      toast.error('Invalid Link', {
        description: 'No action code found. This link is either invalid or has expired.',
        duration: 8000,
      });
    } else {
      setActionCode(code);
    }
  }, []);

  // Calculate password strength
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength('weak');
      return;
    }

    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (newPassword.length >= 12) strength++;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) strength++;
    if (/\d/.test(newPassword)) strength++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) strength++;

    if (strength <= 2) setPasswordStrength('weak');
    else if (strength === 3) setPasswordStrength('fair');
    else if (strength === 4) setPasswordStrength('good');
    else setPasswordStrength('strong');
  }, [newPassword]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  // Sanitize pasted passwords (remove newlines/tabs, zero-width chars, trim)
  const sanitizePassword = (pwd: string): string => {
    if (!pwd) return pwd;
    let cleaned = pwd.replace(/[\r\n\t]/g, '');
    cleaned = cleaned.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
    cleaned = cleaned.trim();
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error('Invalid Password', { description: passwordError });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!actionCode) {
      toast.error('Invalid Link', {
        description: 'The password reset link is missing a required code.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const cleanedPassword = sanitizePassword(newPassword);
      const result = await authService.confirmPasswordReset(actionCode, cleanedPassword);

      if (!result.success) {
        setIsLoading(false);
        toast.error('Failed to reset password', {
          description: result.message,
          duration: 8000,
        });
        return;
      }

      // Success
      setIsLoading(false);
      toast.success('Password reset successful!', {
        description: 'You can now log in with your new password.',
        duration: 6000,
      });
      onSuccess();
    } catch (err) {
      logger.error('❌ Password reset error:', err);
      setIsLoading(false);
      toast.error('An error occurred. Please try again.');
    }
  };

  if (!isValidLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Link Expired</CardTitle>
            <CardDescription>
              This password reset link has expired or is invalid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Password reset links expire after 1 hour for security reasons.
              Please request a new password reset link.
            </p>
            <Button onClick={onCancel} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const strengthColors = {
    weak: 'bg-red-500',
    fair: 'bg-orange-500',
    good: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  const strengthWidth = {
    weak: 'w-1/4',
    fair: 'w-2/4',
    good: 'w-3/4',
    strong: 'w-full',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>

              {newPassword && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Password strength:</span>
                    <span className={`font-medium capitalize ${
                      passwordStrength === 'weak' ? 'text-red-600' :
                      passwordStrength === 'fair' ? 'text-orange-600' :
                      passwordStrength === 'good' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {passwordStrength}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${strengthColors[passwordStrength]} ${strengthWidth[passwordStrength]}`}
                    />
                  </div>
                </div>
              )}

              <ul className="text-xs text-gray-600 space-y-1">
                <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                  • At least 8 characters
                </li>
                <li className={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? 'text-green-600' : ''}>
                  • Uppercase and lowercase letters
                </li>
                <li className={/\d/.test(newPassword) ? 'text-green-600' : ''}>
                  • At least one number
                </li>
                <li className={/[^a-zA-Z0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                  • At least one special character
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  aria-pressed={showConfirmPassword}
                  title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isLoading || newPassword !== confirmPassword}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
