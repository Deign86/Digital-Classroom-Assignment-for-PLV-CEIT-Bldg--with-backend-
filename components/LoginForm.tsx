import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { GraduationCap, Building2, Lock, Mail, User as UserIcon, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../App';
import PasswordResetDialog from './PasswordResetDialog';
import { useSecureAuthentication, getPasswordStrengthData, getRateLimitStatus } from '../utils/secureAuthentication';

interface LoginFormProps {
  onLogin: (email: string, password: string) => boolean | Promise<boolean>;
  onSignup: (
    email: string,
    name: string,
    department: string,
    password: string
  ) => boolean | Promise<boolean>;
  users: User[];
}

export default function LoginForm({ onLogin, onSignup, users }: LoginFormProps) {
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
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  
  // Initialize secure authentication
  const {
    performSecureLogin,
    performSecureSignup,
    checkPasswordStrength,
    isRateLimited,
    rateLimitInfo,
    loginAttempts
  } = useSecureAuthentication({
    name: `${signupData.firstName} ${signupData.lastName}`,
    email: signupData.email,
    department: signupData.department
  });
  
  // Get password strength for signup
  const passwordStrength = getPasswordStrengthData(signupData.password, {
    name: `${signupData.firstName} ${signupData.lastName}`,
    email: signupData.email
  });
  
  // Get rate limit status
  const rateLimitStatus = getRateLimitStatus(rateLimitInfo);

  const departments = ['Civil Engineering', 'Information Technology'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't attempt login if fields are empty
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password');
      return;
    }
    
    // Check if rate limited
    if (isRateLimited) {
      toast.error('Too many login attempts', {
        description: 'Account is temporarily locked. Please wait before trying again.',
        duration: 5000
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await performSecureLogin(email, password, onLogin);
      if (!success) {
        setPassword('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use secure signup which includes comprehensive validation
    const fullName = `${signupData.firstName.trim()} ${signupData.lastName.trim()}`;
    
    setIsLoading(true);
    
    try {
      const success = await performSecureSignup(
        signupData.email,
        fullName,
        signupData.department,
        signupData.password,
        signupData.confirmPassword,
        onSignup
      );
      
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
        setTimeout(() => {
          setActiveTab('login');
        }, 1500); // Small delay to let user see the success message
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome Back</h1>
        <p className="text-gray-600">Sign in to access the Digital Classroom Assignment System</p>
      </div>

      {/* Login/Signup Form */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 rounded-xl p-1 mx-auto max-w-full overflow-hidden">
          <TabsTrigger value="login">Faculty Sign In</TabsTrigger>
          <TabsTrigger value="signup">Faculty Request</TabsTrigger>
        </TabsList>
      
        <TabsContent value="login" className="space-y-8 mt-8">
          {/* Rate Limit Status */}
          {rateLimitStatus && (
            <div className={`rounded-lg p-3 border ${
              rateLimitStatus.level === 'error' 
                ? 'bg-red-50 border-red-200' 
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                {rateLimitStatus.level === 'error' ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span className={`text-sm font-medium ${
                  rateLimitStatus.level === 'error' ? 'text-red-800' : 'text-amber-800'
                }`}>
                  {rateLimitStatus.message}
                </span>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8" noValidate>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@plv.edu.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl"
                    required
                  />
                </div>
                <div className="text-right">
                  <PasswordResetDialog>
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </PasswordResetDialog>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="space-y-8 mt-8">
          <form onSubmit={handleSignup} className="space-y-8" noValidate>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-firstName">First Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-firstName"
                      type="text"
                      placeholder="First name"
                      value={signupData.firstName}
                      onChange={(e) => setSignupData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="pl-10 h-12 rounded-xl"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-lastName">Last Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-lastName"
                      type="text"
                      placeholder="Last name"
                      value={signupData.lastName}
                      onChange={(e) => setSignupData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="pl-10 h-12 rounded-xl"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@plv.edu.ph"
                    value={signupData.email}
                    onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10 h-12 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-department">Department</Label>
                <Select
                  value={signupData.department}
                  onValueChange={(value: string) => setSignupData(prev => ({ ...prev, department: value }))}
                  required
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Create Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Enter a strong password"
                    value={signupData.password}
                    onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10 h-12 rounded-xl"
                    required
                  />
                </div>
                
                {/* Password Strength Indicator */}
                {signupData.password && (
                  <div className="mt-2 space-y-2">
                    {/* Strength Bar */}
                    <div className="flex space-x-1">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                            i < passwordStrength.strengthPercentage / 16.67
                              ? 'bg-current'
                              : 'bg-gray-200'
                          }`}
                          style={{
                            color: passwordStrength.strengthColor
                          }}
                        />
                      ))}
                    </div>

                    {/* Strength Text */}
                    <div className="flex justify-between items-center text-sm">
                      <span style={{ color: passwordStrength.strengthColor }} className="font-medium">
                        {passwordStrength.strengthText}
                      </span>
                      <span className="text-gray-500 text-xs">
                        Est. crack time: {passwordStrength.estimatedCrackTime}
                      </span>
                    </div>

                    {/* Feedback */}
                    {passwordStrength.feedback.length > 0 && (
                      <ul className="text-xs text-green-600 space-y-1">
                        {passwordStrength.feedback.slice(0, 3).map((item, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Errors */}
                    {passwordStrength.errors.length > 0 && (
                      <ul className="text-xs text-red-600 space-y-1">
                        {passwordStrength.errors.slice(0, 3).map((error, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  Create a strong password with letters, numbers, and symbols for better security.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pl-10 h-12 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">Account Review</p>
                    <p className="text-xs text-blue-700">
                      You can sign in with this password once the administrator approves your request. If the request is rejected, the account will remain inactive.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-green-600 hover:bg-green-700 rounded-xl"
            >
              Request Faculty Account
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}