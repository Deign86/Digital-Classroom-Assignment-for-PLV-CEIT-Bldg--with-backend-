import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { GraduationCap, Building2, Lock, Mail, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../App';
import PasswordResetDialog from './PasswordResetDialog';

interface LoginFormProps {
  onLogin: (email: string, password: string) => boolean | Promise<boolean>;
  onSignup: (email: string, name: string, department: string) => boolean | Promise<boolean>;
  users: User[];
}

// Demo account information for development/testing
// These are the DEFAULT passwords set during initial setup
// Users may have changed their passwords, which won't be reflected here
// TODO: Remove this in production
const DEMO_ACCOUNT_INFO: Record<string, { password: string; label: string }> = {
  'admin@plv.edu.ph': { password: 'admin123456', label: 'Default: admin123456' },
  'faculty1@plv.edu.ph': { password: 'faculty123', label: 'Default: faculty123' },
  'faculty2@plv.edu.ph': { password: 'faculty123', label: 'Default: faculty123' },
};

export default function LoginForm({ onLogin, onSignup, users }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupData, setSignupData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    department: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const departments = ['Civil Engineering', 'Information Technology'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const success = await onLogin(email, password);
      if (!success) {
        setPassword('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields are filled
    if (!signupData.firstName.trim()) {
      toast.error('First name is required');
      return;
    }

    if (!signupData.lastName.trim()) {
      toast.error('Last name is required');
      return;
    }

    if (!signupData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!signupData.department) {
      toast.error('Please select a department');
      return;
    }

    const fullName = `${signupData.firstName.trim()} ${signupData.lastName.trim()}`;
    const success = await onSignup(
      signupData.email,
      fullName,
      signupData.department
    );
    
    if (success) {
      setSignupData({
        email: '',
        firstName: '',
        lastName: '',
        department: ''
      });
      // Automatically switch to login tab after successful signup
      setTimeout(() => {
        setActiveTab('login');
      }, 1500); // Small delay to let user see the success message
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
          <TabsTrigger value="login" className="rounded-lg">Faculty Sign In</TabsTrigger>
          <TabsTrigger value="signup" className="rounded-lg">Faculty Request</TabsTrigger>
        </TabsList>
      
        <TabsContent value="login" className="space-y-8 mt-8">
          <form onSubmit={handleSubmit} className="space-y-8">
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
          <form onSubmit={handleSignup} className="space-y-8">
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

              {/* Info message about password */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">Password Setup</p>
                    <p className="text-xs text-blue-700">
                      Your password will be set by the administrator upon approval. You will receive it via email along with your approval notification.
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

      {/* Demo Credentials */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-blue-900 text-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Quick Access Demo Accounts
          </CardTitle>
          <CardDescription className="text-blue-700/70 text-xs">
            Click to auto-fill login credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users
            .sort((a, b) => {
              // Admin first, then faculty alphabetically
              if (a.role === 'admin' && b.role === 'faculty') return -1;
              if (a.role === 'faculty' && b.role === 'admin') return 1;
              return a.name.localeCompare(b.name);
            })
            .map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  setEmail(user.email);
                  // Auto-fill with default password if available
                  const accountInfo = DEMO_ACCOUNT_INFO[user.email];
                  if (accountInfo) {
                    setPassword(accountInfo.password);
                    toast.info('Demo credentials filled', {
                      description: 'Password may have been changed if user reset it',
                      duration: 3000
                    });
                  } else {
                    toast.info('Enter password manually', {
                      description: 'This account does not have default credentials',
                      duration: 3000
                    });
                  }
                }}
                className="w-full text-left p-3 bg-white/70 hover:bg-white/90 rounded-xl border border-blue-200/50 hover:border-blue-300 transition-all duration-200 group"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-blue-900 text-sm">
                        {user.role === 'admin' ? 'Admin Account' : 'Faculty Account'}
                      </p>
                      <p className="text-blue-700/80 text-xs mt-0.5">
                        {user.name}
                        {user.department && user.role === 'faculty' && ` (${user.department})`}
                      </p>
                    </div>
                    <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  {DEMO_ACCOUNT_INFO[user.email] && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600/70">
                      <Lock className="h-3 w-3" />
                      <span>{DEMO_ACCOUNT_INFO[user.email].label}</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}