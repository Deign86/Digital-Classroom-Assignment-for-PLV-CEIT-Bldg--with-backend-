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

    if (!signupData.password) {
      toast.error('Please create a password');
      return;
    }

    if (signupData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const fullName = `${signupData.firstName.trim()} ${signupData.lastName.trim()}`;
    const success = await onSignup(
      signupData.email,
      fullName,
      signupData.department,
      signupData.password
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
                <p className="text-xs text-gray-500">
                  Minimum 8 characters. Mix letters, numbers, and symbols for a stronger password.
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