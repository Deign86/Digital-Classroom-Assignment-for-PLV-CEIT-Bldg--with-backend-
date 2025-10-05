import React, { useMemo, useState } from 'react';
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
  MessageSquare,
} from 'lucide-react';
import type { SignupRequest, SignupHistory } from '../App';

interface SignupApprovalProps {
  signupRequests?: SignupRequest[];
  signupHistory?: SignupHistory[];
  onSignupApproval: (requestId: string, approved: boolean, feedback?: string) => void;
}

const getStatusBadge = (status: SignupRequest['status']) => {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-200">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="outline" className="text-green-600 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" /> Approved
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="outline" className="text-red-600 border-red-200">
          <XCircle className="h-3 w-3 mr-1" /> Rejected
        </Badge>
      );
    default:
      return null;
  }
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function SignupApproval({ signupRequests = [], signupHistory = [], onSignupApproval }: SignupApprovalProps) {
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SignupRequest['status']>('pending');

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return signupRequests
      .filter((request) => {
        if (statusFilter !== 'all' && request.status !== statusFilter) {
          return false;
        }

        if (!term) {
          return true;
        }

        return [request.name, request.email, request.department]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term));
      })
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [searchTerm, signupRequests, statusFilter]);

  const filteredHistory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return signupHistory
      .filter((history) => {
        if (statusFilter !== 'all' && history.status !== statusFilter) {
          return false;
        }

        if (!term) {
          return true;
        }

        return [history.name, history.email, history.department]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term));
      })
      .sort((a, b) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime());
  }, [searchTerm, signupHistory, statusFilter]);

  const pendingRequests = filteredRequests.filter((request) => request.status === 'pending');
  const approvedRequests = filteredRequests.filter((request) => request.status === 'approved');
  
  // Combine approved requests and history for the processed section
  const allProcessedItems = [...approvedRequests, ...filteredHistory]
    .sort((a, b) => {
      const dateA = 'resolvedAt' in a ? a.resolvedAt : a.requestDate;
      const dateB = 'resolvedAt' in b ? b.resolvedAt : b.requestDate;
      return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
    });
  
  const processedRequests = allProcessedItems;

  const handleApproval = (requestId: string, approved: boolean) => {
    const feedbackText = (feedback[requestId] ?? '').trim();

    if (!approved && !feedbackText) {
      toast.error('Please provide a reason when rejecting a request.');
      return;
    }

    onSignupApproval(requestId, approved, approved ? feedbackText || undefined : feedbackText);
    setFeedback((prev) => ({ ...prev, [requestId]: '' }));
  };

  // Helper to check if an item is from history
  const isHistoryItem = (item: SignupRequest | SignupHistory): item is SignupHistory => {
    return 'processedBy' in item;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Faculty Signup Requests</CardTitle>
          <CardDescription>Review and process faculty requests that were created via the public signup form.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="request-search">Search</Label>
            <input
              id="request-search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, or department"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-filter">Filter by status</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as SignupRequest['status'] | 'all')}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {pendingRequests.length > 0 ? (
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
                  <CardDescription className="space-y-1 mt-2">
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
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    The faculty member has already created credentials. Approving this request will activate the account; rejecting it keeps the account inactive.
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`feedback-${request.id}`}>Admin Feedback (optional)</Label>
                    <Textarea
                      id={`feedback-${request.id}`}
                      placeholder="Add comments or notes for this request..."
                      value={feedback[request.id] ?? ''}
                      onChange={(event) => setFeedback((prev) => ({ ...prev, [request.id]: event.target.value }))}
                      rows={3}
                    />
                    <p className="text-xs text-gray-500">Feedback is required when rejecting a request and optional when approving.</p>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleApproval(request.id, true)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button
                      onClick={() => handleApproval(request.id, false)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Signup Requests</h3>
            <p className="text-gray-600">All faculty signup requests have been processed.</p>
          </CardContent>
        </Card>
      )}

      {processedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Processed Requests</h3>
          <div className="grid gap-4">
            {processedRequests.slice(0, 5).map((item) => {
              const isHistory = isHistoryItem(item);
              const resolvedDate = isHistory ? item.resolvedAt : item.resolvedAt;
              
              return (
                <Card key={item.id} className="border-l-4 border-l-gray-300">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">{item.name}</span>
                          {isHistory && (
                            <Badge variant="outline" className="text-xs">
                              From History
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{item.email}</span>
                          <span>•</span>
                          <span>{item.department}</span>
                        </div>
                        {item.adminFeedback && (
                          <div className="flex items-start space-x-2 mt-2">
                            <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5" />
                            <span className="text-sm text-gray-600 italic">{item.adminFeedback}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right space-y-2">
                        {getStatusBadge(item.status)}
                        <p className="text-xs text-gray-500">{formatDate(item.requestDate)}</p>
                        {resolvedDate && (
                          <p className="text-xs text-gray-400">Processed: {formatDate(resolvedDate)}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}