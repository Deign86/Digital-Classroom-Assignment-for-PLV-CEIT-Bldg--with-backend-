import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { readPreferredTab, writeStoredTab, writeTabToHash } from '../utils/tabPersistence';
import { GraduationCap, Building2, Lock, Mail, User as UserIcon, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAnnouncer } from './Announcer';
import { logger } from '../lib/logger';
import type { User } from '../App';
import PasswordResetDialog from './PasswordResetDialog';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

// Load reCAPTCHA script dynamically with environment variable
const loadRecaptchaScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!RECAPTCHA_SITE_KEY) {
      logger.warn('reCAPTCHA site key not configured');
      resolve();
      return;
    }

    // Check if script already loaded
    if (window.grecaptcha?.enterprise) {
      resolve();
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="recaptcha/enterprise.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', reject);
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      logger.log('reCAPTCHA script loaded successfully');
      resolve();
    };
    script.onerror = (error) => {
      logger.error('Failed to load reCAPTCHA script:', error);
      reject(new Error('Failed to load reCAPTCHA'));
    };
    document.head.appendChild(script);
  });
};

interface LoginFormProps {
  onLogin: (email: string, password: string) => boolean | Promise<boolean>;
  onSignup: (
    email: string,
    name: string,
    department: string,
    password: string,
    recaptchaToken?: string
  ) => boolean | Promise<boolean>;
  users: User[];
  isLocked?: boolean;
  accountLockedMessage?: string | null;
}

export default function LoginForm({ onLogin, onSignup, users, isLocked = false, accountLockedMessage = null }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupData, setSignupData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    department: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [signupIsLoading, setSignupIsLoading] = useState(false);
  const STORAGE_KEY = 'plv:loginForm:activeTab';
  const allowed = ['login', 'signup'];
  const [activeTab, setActiveTab] = useState<string>(() => readPreferredTab(STORAGE_KEY, 'login', allowed));

  // Load reCAPTCHA script on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && RECAPTCHA_SITE_KEY) {
      loadRecaptchaScript().catch((error) => {
        logger.error('Failed to load reCAPTCHA on mount:', error);
      });
    }
  }, []);

  useEffect(() => {
    try {
      writeStoredTab(STORAGE_KEY, activeTab);
      writeTabToHash(activeTab);
    } catch (e) {
      // ignore
    }
  }, [activeTab]);
  const [loginErrors, setLoginErrors] = useState({
    email: '',
    password: ''
  });
  const [signupErrors, setSignupErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    password: '',
    confirmPassword: ''
  });

  // Password visibility states for login/signup fields
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  const { announce } = useAnnouncer();

  const departments = ['Civil Engineering', 'Information Technology'];

  // Shared sanitizer for password fields
  const sanitizePassword = (pwd: string) => {
    if (!pwd) return pwd;
    let cleaned = pwd.replace(/[[\r\n\t]]/g, '');
    cleaned = cleaned.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
    cleaned = cleaned.trim();
    return cleaned;
  };

  const validateSignupData = (data: typeof signupData) => {
    const errors = {
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      password: '',
      confirmPassword: ''
    };
    let hasErrors = false;

    if (!data.firstName.trim()) {
      errors.firstName = 'First name is required';
      hasErrors = true;
    }

    if (!data.lastName.trim()) {
      errors.lastName = 'Last name is required';
      hasErrors = true;
    }

    if (!data.email.trim()) {
      errors.email = 'Email is required';
      hasErrors = true;
    }

    if (!data.department) {
      errors.department = 'Please select a department';
      hasErrors = true;
    }

    if (!data.password) {
      errors.password = 'Please create a password';
      hasErrors = true;
    } else if (data.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
      hasErrors = true;
    }

    if (!data.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
      hasErrors = true;
    } else if (data.password !== data.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      hasErrors = true;
    }

    return { errors, hasErrors } as const;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Defensive guard: if the app has flagged this account as locked,
    // prevent any submission attempt (defends against races or manual JS triggers).
    if (isLocked) {
      try {
        if (accountLockedMessage) toast.error(accountLockedMessage);
        else toast.error('Your account is currently locked. Please contact your administrator or support.');
      } catch (toastErr) {
        /* swallow toast errors */
      }
      try { announce('Account locked. Sign in is disabled.'); } catch (e) {}
      return;
    }
    
    // Clear previous errors
    setLoginErrors({ email: '', password: '' });
    
    // Don't attempt login if fields are empty
    // Sanitize password in case user pasted it
    const cleanedPassword = sanitizePassword(password);
    if (cleanedPassword !== password) setPassword(cleanedPassword);

    // Validate fields
    const errors = { email: '', password: '' };
    let hasErrors = false;

    if (!email.trim()) {
      errors.email = 'Email is required';
      hasErrors = true;
    }

    if (!cleanedPassword.trim()) {
      errors.password = 'Password is required';
      hasErrors = true;
    }

    if (hasErrors) {
      setLoginErrors(errors);
      try { announce(Object.values(errors).filter(Boolean).join('. '), 'assertive'); } catch (e) {}
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await onLogin(email, cleanedPassword);
      if (!success) {
        setPassword('');
        // Announce failure to screen reader users (if enabled)
        try { announce('Login failed. Please check your email and password.', 'assertive'); } catch (e) {}
      } else {
        try { announce('Login successful. Redirecting to your dashboard.', 'polite'); } catch (e) {}
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setSignupErrors({
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      password: '',
      confirmPassword: ''
    });

    const { errors, hasErrors } = validateSignupData(signupData);
    if (hasErrors) {
      setSignupErrors(errors);
      return;
    }

    // Sanitize signup password fields and persist sanitized versions if changed
    const cleaned = sanitizePassword(signupData.password);
    const cleanedConfirm = sanitizePassword(signupData.confirmPassword);
    if (cleaned !== signupData.password || cleanedConfirm !== signupData.confirmPassword) {
      setSignupData(prev => ({ ...prev, password: cleaned, confirmPassword: cleanedConfirm }));
    }

    setSignupIsLoading(true);
    let success = false;
    try {
      // Execute reCAPTCHA before signup
      let recaptchaToken: string | undefined;
      if (RECAPTCHA_SITE_KEY && typeof window !== 'undefined' && window.grecaptcha?.enterprise) {
        try {
          await new Promise<void>((resolve) => {
            window.grecaptcha!.enterprise.ready(() => resolve());
          });
          
          recaptchaToken = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { 
            action: 'SIGNUP' 
          });
          logger.log('reCAPTCHA token obtained for signup');
        } catch (recaptchaError) {
          logger.error('reCAPTCHA execution failed:', recaptchaError);
          const errorMessage = recaptchaError instanceof Error ? recaptchaError.message : 'Unknown error';
          toast.error(`Security verification failed: ${errorMessage}. Please refresh and try again.`, {
            duration: 5000,
          });
          return;
        }
      } else {
        logger.warn('reCAPTCHA not configured or unavailable');
      }

      const fullName = `${signupData.firstName.trim()} ${signupData.lastName.trim()}`;
      success = await onSignup(
        signupData.email,
        fullName,
        signupData.department,
        signupData.password,
        recaptchaToken
      );
    } finally {
      setSignupIsLoading(false);
    }

    if (success) {
      setSignupData({
        email: '',
        firstName: '',
        lastName: '',
        department: '',
        password: '',
        confirmPassword: ''
      });
      // Automatically switch to login tab after successful signup
      try { announce('Signup request submitted. You will be notified when your account is approved.', 'polite'); } catch (e) {}
      setTimeout(() => {
        setActiveTab('login');
      }, 1500); // Small delay to let user see the success message
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 sm:space-y-3 lg:space-y-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-900">Welcome Back</h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">Sign in to access the Digital Classroom Assignment System</p>
      </div>

      {/* Login/Signup Form */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 bg-gray-100 rounded-xl p-1.5 sm:p-1 mx-auto max-w-full sm:max-w-md md:max-w-lg overflow-hidden">
          <TabsTrigger value="login" className="text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap">
            <span className="hidden xs:inline">Faculty Sign In</span>
            <span className="xs:hidden">Sign In</span>
          </TabsTrigger>
          <TabsTrigger value="signup" className="text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap">
            <span className="hidden xs:inline">Faculty Request</span>
            <span className="xs:hidden">Request</span>
          </TabsTrigger>
        </TabsList>
      
        <TabsContent value="login" className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 max-w-md mx-auto" noValidate>
            <div className="space-y-5 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@plv.edu.ph"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (loginErrors.email) {
                        setLoginErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    className={`pl-9 sm:pl-11 h-11 sm:h-12 md:h-14 rounded-xl text-sm sm:text-base ${loginErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    required
                  />
                </div>
                {loginErrors.email && (
                  <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {loginErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginErrors.password) {
                        setLoginErrors(prev => ({ ...prev, password: '' }));
                      }
                    }}
                    className={`pl-9 sm:pl-11 h-11 sm:h-12 md:h-14 rounded-xl text-sm sm:text-base ${loginErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-0 shadow-none focus:outline-none focus:ring-0"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showLoginPassword}
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <Eye className="h-4 w-4 sm:h-5 sm:w-5" /> : <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {loginErrors.password}
                  </p>
                )}
                <div className="text-right">
                  <PasswordResetDialog>
                    <button
                      type="button"
                      className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </PasswordResetDialog>
                </div>
              </div>
            </div>

            {isLocked && (
              <div className="mb-3 text-xs sm:text-sm text-red-600">
                {accountLockedMessage ? (
                  <span className="font-medium">{accountLockedMessage}</span>
                ) : (
                  'Your account is locked. You cannot sign in while the account is locked. Please contact your administrator or support.'
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || isLocked}
              aria-busy={isLoading}
              className={
                isLoading
                  ? 'w-full h-11 sm:h-12 md:h-14 rounded-full px-6 text-sm sm:text-base bg-white text-blue-700 border border-blue-200 shadow-none transition-all duration-150 ease-linear'
                  : 'w-full h-11 sm:h-12 md:h-14 rounded-full px-6 text-sm sm:text-base bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_6px_18px_rgba(14,165,233,0.12)] transition-all duration-150 ease-linear hover:from-blue-400 hover:to-blue-500 hover:shadow-[0_10px_30px_rgba(14,165,233,0.18)]'
              }
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          <form onSubmit={handleSignup} className="space-y-6 sm:space-y-8 max-w-2xl mx-auto" noValidate>
            <div className="space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-firstName" className="text-sm sm:text-base">First Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <Input
                      id="signup-firstName"
                      type="text"
                      placeholder="First name"
                      value={signupData.firstName}
                      onChange={(e) => {
                        setSignupData(prev => ({ ...prev, firstName: e.target.value }));
                        if (signupErrors.firstName) {
                          setSignupErrors(prev => ({ ...prev, firstName: '' }));
                        }
                      }}
                      className={`pl-9 sm:pl-11 h-11 sm:h-12 md:h-13 rounded-xl text-sm sm:text-base ${signupErrors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      required
                    />
                  </div>
                  {signupErrors.firstName && (
                    <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {signupErrors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-lastName" className="text-sm sm:text-base">Last Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <Input
                      id="signup-lastName"
                      type="text"
                      placeholder="Last name"
                      value={signupData.lastName}
                      onChange={(e) => {
                        setSignupData(prev => ({ ...prev, lastName: e.target.value }));
                        if (signupErrors.lastName) {
                          setSignupErrors(prev => ({ ...prev, lastName: '' }));
                        }
                      }}
                      className={`pl-9 sm:pl-11 h-11 sm:h-12 md:h-13 rounded-xl text-sm sm:text-base ${signupErrors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      required
                    />
                  </div>
                  {signupErrors.lastName && (
                    <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {signupErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-sm sm:text-base">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@plv.edu.ph"
                    value={signupData.email}
                    onChange={(e) => {
                      setSignupData(prev => ({ ...prev, email: e.target.value }));
                      if (signupErrors.email) {
                        setSignupErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    className={`pl-9 sm:pl-11 h-11 sm:h-12 md:h-13 rounded-xl text-sm sm:text-base ${signupErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    required
                  />
                </div>
                {signupErrors.email && (
                  <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {signupErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-department" className="text-sm sm:text-base">Department</Label>
                <Select
                  value={signupData.department}
                  onValueChange={(value: string) => {
                    setSignupData(prev => ({ ...prev, department: value }));
                    if (signupErrors.department) {
                      setSignupErrors(prev => ({ ...prev, department: '' }));
                    }
                  }}
                  required
                >
                  <SelectTrigger className={`h-11 sm:h-12 md:h-13 rounded-xl text-sm sm:text-base ${signupErrors.department ? 'border-red-500 focus-visible:ring-red-500' : ''}`}>
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {signupErrors.department && (
                  <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {signupErrors.department}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-sm sm:text-base">Create Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input
                    id="signup-password"
                    type={showSignupPassword ? 'text' : 'password'}
                    placeholder="Enter a strong password"
                    value={signupData.password}
                    onChange={(e) => {
                      setSignupData(prev => ({ ...prev, password: e.target.value }));
                      if (signupErrors.password) {
                        setSignupErrors(prev => ({ ...prev, password: '' }));
                      }
                    }}
                    className={`pl-9 sm:pl-11 h-11 sm:h-12 md:h-13 rounded-xl text-sm sm:text-base ${signupErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-0 shadow-none focus:outline-none focus:ring-0"
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showSignupPassword}
                    title={showSignupPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignupPassword ? <Eye className="h-4 w-4 sm:h-5 sm:w-5" /> : <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </button>
                </div>
                {signupErrors.password ? (
                  <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {signupErrors.password}
                  </p>
                ) : (
                  <div className="text-xs sm:text-sm text-gray-700 text-left">
                    <p className="font-medium mb-1">Password Requirements:</p>
                    <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 text-xs text-gray-600 text-left pl-3 sm:pl-4">
                      <li>At least 8 characters long</li>
                      <li>Contains uppercase and lowercase letters</li>
                      <li>Contains at least one number</li>
                      <li>Contains at least one special character (e.g., !@#$%^&*)</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password" className="text-sm sm:text-base">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input
                    id="signup-confirm-password"
                    type={showSignupConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={signupData.confirmPassword}
                    onChange={(e) => {
                      setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      if (signupErrors.confirmPassword) {
                        setSignupErrors(prev => ({ ...prev, confirmPassword: '' }));
                      }
                    }}
                    className={`pl-9 sm:pl-11 h-11 sm:h-12 md:h-13 rounded-xl text-sm sm:text-base ${signupErrors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-0 shadow-none focus:outline-none focus:ring-0"
                    aria-label={showSignupConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    aria-pressed={showSignupConfirmPassword}
                    title={showSignupConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showSignupConfirmPassword ? <Eye className="h-4 w-4 sm:h-5 sm:w-5" /> : <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </button>
                </div>
                {signupErrors.confirmPassword && (
                  <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {signupErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-blue-900">Account Review</p>
                    <p className="text-xs text-blue-700">
                      You can sign in with this password once the administrator approves your request. If the request is rejected, the account will remain inactive.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={signupIsLoading}
              aria-busy={signupIsLoading}
              className={
                signupIsLoading
                  ? 'w-full h-11 sm:h-12 md:h-14 rounded-full px-6 text-sm sm:text-base bg-white text-blue-700 border border-blue-200 shadow-none transition-all duration-150 ease-linear'
                  : 'w-full h-11 sm:h-12 md:h-14 rounded-full px-6 text-sm sm:text-base bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_6px_18px_rgba(14,165,233,0.12)] transition-all duration-150 ease-linear hover:from-blue-400 hover:to-blue-500 hover:shadow-[0_10px_30px_rgba(14,165,233,0.18)]'
              }
            >
              {signupIsLoading ? 'Requesting...' : 'Request Faculty Account'}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}