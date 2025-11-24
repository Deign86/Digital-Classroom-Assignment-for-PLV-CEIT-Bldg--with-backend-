import React, { useState, useEffect } from 'react';
import { logger } from '../lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import {
  User as UserIcon,
  Mail,
  Building,
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Bell,
  X,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../App';
import { authService, userService } from '../lib/firebaseService';
import { pushService } from '../lib/pushService';
import { useDarkMode } from '../hooks/useDarkMode';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import ProcessingFieldset from './ui/ProcessingFieldset';

interface ProfileSettingsProps {
  user: User;
  onTogglePush?: (enabled: boolean) => Promise<any> | void;
}

export default function ProfileSettings({ user, onTogglePush }: ProfileSettingsProps) {
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
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => !!(user as any).pushEnabled);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const [pushSupported, setPushSupported] = useState<boolean>(true);
  const { theme, setTheme } = useDarkMode();

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    departments: (user.departments && user.departments.length > 0 ? user.departments : (user.department ? [user.department] : [])) as string[]
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState({
    name: '',
    departments: ''
  });

  // Keep local state in sync when the parent `user` prop updates (for example after refresh)
  // But DON'T update if user is currently editing to avoid overwriting their changes
  useEffect(() => {
    if (isEditingProfile || isSavingProfile) {
      // Don't reset form data while user is editing or saving
      return;
    }

    try {
      setPushEnabled(!!(user as any).pushEnabled);
      setProfileData({
        name: user.name,
        departments: (user.departments && user.departments.length > 0 ? user.departments : (user.department ? [user.department] : [])) as string[]
      });
    } catch (err) {
      // If something odd happens, keep current local state and log for diagnostics
      logger.warn('Failed to sync pushEnabled from user prop:', err);
    }
  }, [user?.pushEnabled, user?.name, user?.department, user?.departments]); // Remove isEditingProfile and isSavingProfile from dependencies

  // Detect runtime push support (useful for iOS/Safari where web push may be unavailable)
  useEffect(() => {
    try {
      const supported = pushService.isPushSupported ? pushService.isPushSupported() : true;
      setPushSupported(!!supported);
    } catch (e) {
      setPushSupported(false);
    }
  }, []);

  // Auto-check password matching in real-time
  useEffect(() => {
    if (passwordData.newPassword && passwordData.confirmPassword) {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    } else if (passwordData.confirmPassword && !passwordData.newPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Please enter new password first' }));
    }
  }, [passwordData.newPassword, passwordData.confirmPassword]);

  const validateProfileData = (): boolean => {
    const newErrors = {
      name: '',
      departments: ''
    };

    let isValid = true;

    // Validate name
    if (!profileData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (profileData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
      isValid = false;
    }

    // Validate departments
    const validDepartments = ['Information Technology', 'Civil Engineering', 'Electrical Engineering'];
    if (profileData.departments.length === 0) {
      newErrors.departments = 'Please select at least one department';
      isValid = false;
    } else if (!profileData.departments.every(dept => validDepartments.includes(dept))) {
      newErrors.departments = 'Please select valid departments only';
      isValid = false;
    }

    setProfileErrors(newErrors);
    return isValid;
  };

  const handleProfileSave = async () => {
    if (!validateProfileData()) {
      return;
    }

    // Check if any changes were actually made
    const originalDepartments = user.departments && user.departments.length > 0
      ? user.departments
      : (user.department ? [user.department] : []);

    const nameUnchanged = profileData.name.trim() === user.name;
    const departmentsUnchanged =
      profileData.departments.length === originalDepartments.length &&
      profileData.departments.every((dept, index) => dept === originalDepartments[index]);

    if (nameUnchanged && departmentsUnchanged) {
      // No changes detected, just exit edit mode without saving or reloading
      logger.info('No profile changes detected, exiting edit mode');
      setIsEditingProfile(false);
      toast.info('No changes to save');
      return;
    }

    setIsSavingProfile(true);
    try {
      const trimmedData = {
        name: profileData.name.trim(),
        department: profileData.departments[0], // Primary department for backward compatibility
        departments: profileData.departments
      };

      logger.info('Saving profile data:', {
        userId: user.id,
        currentName: user.name,
        newName: trimmedData.name,
        currentDepartment: user.department,
        newDepartment: trimmedData.department,
        currentDepartments: user.departments,
        newDepartments: trimmedData.departments
      });

      // Update Firestore user document
      const updatedUser = await userService.update(user.id, trimmedData);

      // CRITICAL: Also update Firebase Auth displayName to prevent it from overwriting Firestore on next auth state change
      try {
        const auth = await import('firebase/auth');
        const currentUser = auth.getAuth().currentUser;
        if (currentUser && trimmedData.name !== currentUser.displayName) {
          await auth.updateProfile(currentUser, {
            displayName: trimmedData.name
          });
          logger.info('Firebase Auth displayName updated to:', trimmedData.name);
        }
      } catch (authError) {
        logger.error('Failed to update Firebase Auth displayName:', authError);
        // Don't fail the whole operation if this fails
      }

      logger.info('Profile updated successfully:', updatedUser);

      toast.success('Profile updated successfully', {
        description: `Name: ${updatedUser.name}, Department: ${updatedUser.department || 'N/A'}`
      });

      setIsEditingProfile(false);

      // Wait a moment then reload to ensure all state is fresh
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      logger.error('Profile update error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating profile';
      toast.error('Failed to update profile', {
        description: errorMessage
      });
      setIsSavingProfile(false);
    }
  };

  const handleProfileCancel = () => {
    setProfileData({
      name: user.name,
      departments: (user.departments && user.departments.length > 0 ? user.departments : (user.department ? [user.department] : [])) as string[]
    });
    setProfileErrors({
      name: '',
      departments: ''
    });
    setIsEditingProfile(false);
  };

  const handlePasswordFieldBlur = (field: 'currentPassword' | 'newPassword' | 'confirmPassword') => {
    const newErrors = { ...errors };

    if (field === 'currentPassword') {
      if (!passwordData.currentPassword.trim()) {
        newErrors.currentPassword = 'Current password is required';
      } else {
        newErrors.currentPassword = '';
      }
    }

    if (field === 'newPassword') {
      if (!passwordData.newPassword.trim()) {
        newErrors.newPassword = 'New password is required';
      } else if (passwordData.newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters';
      } else {
        const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
        const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
        const hasNumber = /[0-9]/.test(passwordData.newPassword);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword);

        if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
          newErrors.newPassword = 'Must contain uppercase, lowercase, number, and special character';
        } else if (passwordData.newPassword === passwordData.currentPassword) {
          newErrors.newPassword = 'New password cannot be the same as current password';
        } else {
          newErrors.newPassword = '';
        }
      }
    }

    if (field === 'confirmPassword') {
      if (!passwordData.confirmPassword.trim()) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (passwordData.newPassword !== passwordData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      } else {
        newErrors.confirmPassword = '';
      }
    }

    setErrors(newErrors);
  };

  const validatePassword = (): boolean => {
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };

    let isValid = true;

    // Validate current password
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
      isValid = false;
    }

    // Validate new password
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
      isValid = false;
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
      isValid = false;
    } else {
      const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
      const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
      const hasNumber = /[0-9]/.test(passwordData.newPassword);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword);

      if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
        newErrors.newPassword = 'Password must contain uppercase, lowercase, number, and special character';
        isValid = false;
      } else if (passwordData.newPassword === passwordData.currentPassword) {
        newErrors.newPassword = 'New password cannot be the same as the current password';
        isValid = false;
      }
    }

    // Validate confirm password
    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
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

    // Clear previous errors
    setErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    // Automatically sanitize pasted/typed passwords before validation
    const sanitizedNew = sanitizePassword(passwordData.newPassword);
    const sanitizedConfirm = sanitizePassword(passwordData.confirmPassword);

    // Update form values to reflect sanitized strings (so the UI shows the cleaned value)
    setPasswordData((prev) => ({ ...prev, newPassword: sanitizedNew, confirmPassword: sanitizedConfirm }));

    // Validate with a slight delay to ensure state is updated
    setTimeout(() => {
      const isValid = validatePassword();
      if (!isValid) {
        return;
      }

      // Only show the confirmation dialog if validation passes
      setShowConfirmDialog(true);
    }, 0);
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
      logger.error('Password update error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating password';
      toast.error('Failed to update password', {
        description: errorMessage
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleTogglePush = async (enabled: boolean) => {
    setIsTogglingPush(true);
    try {
      if (!pushSupported) {
        throw new Error('Push-not-supported');
      }

      // Show a helpful toast while waiting for service worker
      const loadingToast = toast.loading(
        enabled
          ? 'Initializing push notifications...'
          : 'Disabling push notifications...'
      );

      try {
        // Prefer parent handler when present (await it). Parent may handle push token lifecycle and update user record.
        if (typeof onTogglePush === 'function') {
          const res: any = await onTogglePush(enabled);
          // If parent handler returns an object with explicit failure, surface it
          if (res && res.success === false) {
            throw new Error(res.message || 'Failed to change push preference');
          }
          // If parent provided an updated pushEnabled value, use it
          if (res && typeof res.pushEnabled === 'boolean') {
            setPushEnabled(res.pushEnabled);
          } else {
            // best-effort: assume success and set local flag
            setPushEnabled(!!enabled);
          }
          toast.dismiss(loadingToast);
          toast.success(enabled ? 'Push notifications enabled!' : 'Push notifications disabled');
          return;
        }

        // Local fallback behaviour: manage push tokens and call server-side setPushEnabled
        if (enabled) {
          const res = await pushService.enablePush();
          if (res.success && res.token) {
            setPushToken(res.token);
            // Call the Cloud Function to set pushEnabled flag server-side
            const setPushRes = await pushService.setPushEnabledOnServer(true);
            if (setPushRes.success) {
              setPushEnabled(true);
              toast.dismiss(loadingToast);
              toast.success('Push notifications enabled!');
            } else {
              throw new Error(setPushRes.message || 'Failed to update push preference');
            }
          } else {
            throw new Error(res.message || 'Failed to enable push');
          }
        } else {
          // try to get current token if we don't have it
          const current = pushToken || await pushService.getCurrentToken();
          if (current) {
            await pushService.disablePush(current);
          }
          // Call the Cloud Function to set pushEnabled flag server-side
          const setPushRes = await pushService.setPushEnabledOnServer(false);
          if (setPushRes.success) {
            setPushEnabled(false);
            setPushToken(null);
            toast.dismiss(loadingToast);
            toast.success('Push notifications disabled');
          } else {
            throw new Error(setPushRes.message || 'Failed to update push preference');
          }
        }
      } catch (err) {
        toast.dismiss(loadingToast);
        throw err; // Re-throw to be caught by outer catch
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Push toggle error:', msg);
      if (msg === 'Push-not-supported' || /not supported/i.test(msg)) {
        toast.error('Push is not supported in this browser/device. On iOS use Safari 16.4+ or enable Web Push in system settings.');
      } else if (/permission not granted|denied/i.test(msg) || /permission/i.test(msg)) {
        toast.error('Notification permission denied. Please enable notifications in your browser or system settings.');
      } else if (/service worker|still initializing/i.test(msg)) {
        toast.error('Service worker is still starting up', {
          description: 'Please wait a few seconds and try again. The page will be ready shortly.',
          duration: 5000
        });
      } else if (/ready timeout|no active service worker|subscription failed/i.test(msg)) {
        toast.error('Unable to enable push notifications', {
          description: 'Please refresh the page and try again in a moment.',
          duration: 5000
        });
      } else {
        // generic fallback
        toast.error('Push notification change failed', {
          description: msg.length < 100 ? msg : 'An unexpected error occurred'
        });
      }
    } finally {
      setIsTogglingPush(false);
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your account details and role information
              </CardDescription>
            </div>
            {!isEditingProfile ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center gap-2"
              >
                <UserIcon className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleProfileCancel}
                  disabled={isSavingProfile}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleProfileSave}
                  disabled={isSavingProfile}
                  className="flex items-center gap-2"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProcessingFieldset isProcessing={isSavingProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="text-sm font-medium text-gray-600">Full Name</Label>
              {isEditingProfile ? (
                <div className="space-y-1">
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="profile-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={profileData.name}
                      onChange={(e) => {
                        setProfileData(prev => ({ ...prev, name: e.target.value }));
                        if (profileErrors.name) {
                          setProfileErrors(prev => ({ ...prev, name: '' }));
                        }
                      }}
                      className={`pl-10 ${profileErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                  </div>
                  {profileErrors.name && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {profileErrors.name}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <UserIcon className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{user.name}</span>
                </div>
              )}
            </div>

            {/* Email Field - Read Only */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">Email Address</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{user.email}</span>
              </div>
            </div>

            {/* Role Field - Read Only */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">Role</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-4 w-4 text-gray-500" />
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role === 'admin' ? 'Administrator' : 'Faculty'}
                </Badge>
              </div>
            </div>

            {/* Department Field */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">Department{isEditingProfile && 's'}</Label>
              {isEditingProfile ? (
                <div className="space-y-2">
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !profileData.departments.includes(value)) {
                        setProfileData(prev => ({
                          ...prev,
                          departments: [...prev.departments, value]
                        }));
                        if (profileErrors.departments) {
                          setProfileErrors(prev => ({ ...prev, departments: '' }));
                        }
                      }
                    }}
                  >
                    <SelectTrigger className={`${profileErrors.departments ? 'border-red-500 focus-visible:ring-red-500' : ''}`}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <SelectValue placeholder="Select departments" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="Information Technology"
                        disabled={profileData.departments.includes('Information Technology')}
                        className={profileData.departments.includes('Information Technology') ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        Information Technology
                      </SelectItem>
                      <SelectItem
                        value="Civil Engineering"
                        disabled={profileData.departments.includes('Civil Engineering')}
                        className={profileData.departments.includes('Civil Engineering') ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        Civil Engineering
                      </SelectItem>
                      <SelectItem
                        value="Electrical Engineering"
                        disabled={profileData.departments.includes('Electrical Engineering')}
                        className={profileData.departments.includes('Electrical Engineering') ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        Electrical Engineering
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Selected Departments Badges */}
                  {profileData.departments.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
                      {profileData.departments.map((dept) => (
                        <Badge key={dept} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                          {dept}
                          <button
                            type="button"
                            onClick={() => {
                              setProfileData(prev => ({
                                ...prev,
                                departments: prev.departments.filter(d => d !== dept)
                              }));
                            }}
                            className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {profileErrors.departments && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {profileErrors.departments}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Building className="h-4 w-4 text-gray-500" />
                  {user.departments && user.departments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.departments.map(dept => (
                        <Badge key={dept} variant="secondary">{dept}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="font-medium">{user.department || 'Not specified'}</span>
                  )}
                </div>
              )}
            </div>
          </ProcessingFieldset>
        </CardContent>
      </Card>

      {/* Push Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage browser and device push notifications for important updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProcessingFieldset isProcessing={isTogglingPush} className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <p className="font-medium">Browser & Device Push</p>
              <p className="text-sm text-muted-foreground">Receive push notifications even when the app is closed (via browser/service worker).</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={pushEnabled}
                onCheckedChange={(val) => handleTogglePush(!!val)}
                aria-label="Enable push notifications"
                disabled={isTogglingPush || !pushSupported}
              />
              {isTogglingPush && (
                <Loader2 className="h-4 w-4 text-gray-500 animate-spin" />
              )}
            </div>
          </ProcessingFieldset>
          {!pushSupported && (
            <p className="mt-2 text-xs text-muted-foreground">Push notifications are not supported in this browser or device. On iOS use Safari 16.4+ and enable Web Push in system settings.</p>
          )}
        </CardContent>
      </Card>

      {/* System Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            System Preferences
          </CardTitle>
          <CardDescription>
            Customize your interface experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <p className="font-medium">Theme Preference</p>
              <p className="text-sm text-muted-foreground">
                Choose between Light, Dark, or System default theme.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select value={theme} onValueChange={(val) => setTheme(val as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      <span>Light</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      <span>Dark</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>System</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
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

            <ProcessingFieldset isProcessing={isChangingPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter your current password"
                    value={passwordData.currentPassword}
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }));
                      if (errors.currentPassword) {
                        setErrors(prev => ({ ...prev, currentPassword: '' }));
                      }
                    }}
                    onBlur={() => handlePasswordFieldBlur('currentPassword')}
                    className={`pl-10 pr-10 ${errors.currentPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    aria-pressed={showCurrentPassword}
                    title={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    aria-hidden="true"
                  >
                    {showCurrentPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.currentPassword}
                  </p>
                )}
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
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                      if (errors.newPassword) {
                        setErrors(prev => ({ ...prev, newPassword: '' }));
                      }
                    }}
                    onBlur={() => handlePasswordFieldBlur('newPassword')}
                    className={`pl-10 pr-10 ${errors.newPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                    aria-pressed={showPassword}
                    title={showPassword ? 'Hide new password' : 'Show new password'}
                    aria-hidden="true"
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword ? (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.newPassword}
                  </p>
                ) : passwordData.newPassword && (
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
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      if (errors.confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: '' }));
                      }
                    }}
                    onBlur={() => handlePasswordFieldBlur('confirmPassword')}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    aria-pressed={showConfirmPassword}
                    title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    aria-hidden="true"
                  >
                    {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword ? (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.confirmPassword}
                  </p>
                ) : passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                  <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
              </div>
            </ProcessingFieldset>

            <div className="flex gap-3 mt-6">
              <Button
                type="submit"
                disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="flex-1"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>

          <AlertDialog open={showConfirmDialog} onOpenChange={(v) => { if (isChangingPassword) return; setShowConfirmDialog(v); }}>
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
                <AlertDialogCancel disabled={isChangingPassword}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmPasswordChange}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Updating…' : 'Yes, Change Password'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div >
  );
}
