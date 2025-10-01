import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
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
  MessageSquare
} from 'lucide-react';
import type { SignupRequest } from '../App';

interface SignupApprovalProps {
  signupRequests?: SignupRequest[];
  onSignupApproval: (requestId: string, approved: boolean, feedback?: string) => void;
}

export default function SignupApproval({ signupRequests = [], onSignupApproval }: SignupApprovalProps) {
  const [feedback, setFeedback] = useState<{ [key: string]: string }>({});

  const pendingRequests = signupRequests.filter(request => request.status === 'pending');
  const processedRequests = signupRequests.filter(request => request.status !== 'pending');

  const handleApproval = (requestId: string, approved: boolean) => {
    const feedbackText = feedback[requestId] || '';
    
    // Require feedback when rejecting
    if (!approved && !feedbackText.trim()) {
      toast.error('Please provide a reason for rejecting this request.');
      return;
    }
    
    onSignupApproval(requestId, approved, feedbackText);
    setFeedback(prev => ({ ...prev, [requestId]: '' }));
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
                  <div className="space-y-2">
                    <Label htmlFor={`feedback-${request.id}`}>Admin Feedback</Label>
                    <Textarea
                      id={`feedback-${request.id}`}
                      placeholder="Add comments for approval or provide reason for rejection (required when rejecting)..."
                      value={feedback[request.id] || ''}
                      onChange={(e) => setFeedback(prev => ({ ...prev, [request.id]: e.target.value }))}
                      rows={3}
                    />
                    <p className="text-xs text-gray-500">
                      <strong>Note:</strong> Feedback is required when rejecting requests and will be sent via email to the applicant.
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleApproval(request.id, true)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Account
                    </Button>
                    <Button
                      onClick={() => handleApproval(request.id, false)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Request
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