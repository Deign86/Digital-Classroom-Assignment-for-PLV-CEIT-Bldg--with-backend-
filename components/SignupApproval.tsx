import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  Building,
  Calendar,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import type { SignupRequest } from '../App';

interface SignupApprovalProps {
  signupRequests?: SignupRequest[];
  onSignupApproval: (requestId: string, approved: boolean, password?: string, feedback?: string) => void;
}

export default function SignupApproval({ signupRequests = [], onSignupApproval }: SignupApprovalProps) {
  const [feedback, setFeedback] = useState<{ [key: string]: string }>({});
  const [passwords, setPasswords] = useState<{ [key: string]: string }>({});
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedPassword, setCopiedPassword] = useState<{ [key: string]: boolean }>({});

  const pendingRequests = signupRequests.filter(request => request.status === 'pending');
  const processedRequests = signupRequests.filter(request => request.status !== 'pending');

  const generateRandomPassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special
    
    // Fill the rest
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleGeneratePassword = (requestId: string) => {
    const newPassword = generateRandomPassword();
    setPasswords(prev => ({ ...prev, [requestId]: newPassword }));
    toast.success('Password generated! Make sure to copy it before approving.');
  };

  const togglePasswordVisibility = (requestId: string) => {
    setShowPasswords(prev => ({ ...prev, [requestId]: !prev[requestId] }));
  };

  const copyToClipboard = async (requestId: string) => {
    const password = passwords[requestId];
    if (!password) {
      toast.error('No password to copy');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(prev => ({ ...prev, [requestId]: true }));
      toast.success('Password copied to clipboard!', {
        description: 'You can now share it with the user securely.'
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedPassword(prev => ({ ...prev, [requestId]: false }));
      }, 2000);
    } catch (err) {
      toast.error('Failed to copy password to clipboard');
    }
  };

  const handleApproval = (requestId: string, approved: boolean) => {
    const feedbackText = feedback[requestId] || '';
    const password = passwords[requestId] || '';
    
    if (approved) {
      // Require password when approving
      if (!password.trim()) {
        toast.error('Please generate or enter a temporary password for the new user.');
        return;
      }
      
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters long.');
        return;
      }
    } else {
      // Require feedback when rejecting
      if (!feedbackText.trim()) {
        toast.error('Please provide a reason for rejecting this request.');
        return;
      }
    }
    
    onSignupApproval(requestId, approved, password, feedbackText);
    setFeedback(prev => ({ ...prev, [requestId]: '' }));
    setPasswords(prev => ({ ...prev, [requestId]: '' }));
    setShowPasswords(prev => ({ ...prev, [requestId]: false }));
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Pending Faculty Signup Requests</h3>
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              {pendingRequests.length} pending
            </Badge>
          </div>

          <div className="grid gap-4">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-gray-600" />
                      <CardTitle className="text-lg">{request.name}</CardTitle>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{request.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building className="h-4 w-4" />
                      <span>{request.department}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Requested: {formatDate(request.requestDate)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Password Input Section */}
                  <div className="space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <Label htmlFor={`password-${request.id}`} className="text-blue-900 font-semibold">
                      Set Temporary Password
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id={`password-${request.id}`}
                          type={showPasswords[request.id] ? 'text' : 'password'}
                          placeholder="Enter or generate password"
                          value={passwords[request.id] || ''}
                          onChange={(e) => setPasswords(prev => ({ ...prev, [request.id]: e.target.value }))}
                          className="pl-10 pr-20"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(request.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title={showPasswords[request.id] ? "Hide password" : "Show password"}
                          >
                            {showPasswords[request.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(request.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy to clipboard"
                            disabled={!passwords[request.id]}
                          >
                            {copiedPassword[request.id] ? 
                              <Check className="h-4 w-4 text-green-600" /> : 
                              <Copy className="h-4 w-4" />
                            }
                          </button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleGeneratePassword(request.id)}
                        variant="outline"
                        className="border-blue-300 hover:bg-blue-100"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate
                      </Button>
                    </div>
                    <p className="text-xs text-blue-700">
                      <strong>Important:</strong> Copy this password before approving. You must share it with the user securely (email, phone, or in person).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`feedback-${request.id}`}>Admin Feedback (Optional)</Label>
                    <Textarea
                      id={`feedback-${request.id}`}
                      placeholder="Add comments or notes for this approval..."
                      value={feedback[request.id] || ''}
                      onChange={(e) => setFeedback(prev => ({ ...prev, [request.id]: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleApproval(request.id, true)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleApproval(request.id, false)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Pending Requests */}
      {pendingRequests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Signup Requests</h3>
            <p className="text-gray-600">All faculty signup requests have been processed.</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Processed Requests */}
      {processedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Processed Requests</h3>
          <div className="grid gap-4">
            {processedRequests.slice(0, 5).map((request) => (
              <Card key={request.id} className="border-l-4 border-l-gray-300">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{request.name}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{request.email}</span>
                        <span>•</span>
                        <span>{request.department}</span>
                      </div>
                      {request.adminFeedback && (
                        <div className="flex items-start space-x-2 mt-2">
                          <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5" />
                          <span className="text-sm text-gray-600 italic">{request.adminFeedback}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      {getStatusBadge(request.status)}
                      <p className="text-xs text-gray-500">{formatDate(request.requestDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}