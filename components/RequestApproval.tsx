import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CheckCircle, XCircle, Clock, Calendar, MapPin, User, AlertTriangle } from 'lucide-react';
import { convertTo12Hour, formatTimeRange, isPastBookingTime } from '../utils/timeUtils';
import type { BookingRequest } from '../App';
import RequestCard from './RequestCard';

interface RequestApprovalProps {
  requests: BookingRequest[];
  onRequestApproval: (requestId: string, approved: boolean, feedback?: string) => void;
  onCancelApproved?: (requestId: string) => void;
  checkConflicts: (classroomId: string, date: string, startTime: string, endTime: string, checkPastTime?: boolean, excludeRequestId?: string) => boolean | Promise<boolean>;
}

export default function RequestApproval({ requests, onRequestApproval, onCancelApproved, checkConflicts }: RequestApprovalProps) {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const handleAction = (request: BookingRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setFeedback('');
    setIsDialogOpen(true);
  };

  const handleConfirm = () => {
    if (selectedRequest) {
      onRequestApproval(
        selectedRequest.id,
        actionType === 'approve',
        feedback || undefined
      );
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setFeedback('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Classroom Reservation Management</h2>
          <p className="text-gray-600 mt-1">Review and manage classroom reservation requests</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved ({approvedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Rejected ({rejectedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {pendingRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Requests</h3>
                  <p className="text-gray-500 text-center max-w-md">
                    All caught up! There are no pending reservations at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onApprove={() => handleAction(request, 'approve')}
                    onReject={() => handleAction(request, 'reject')}
                    checkConflicts={checkConflicts}
                    status="pending"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            {approvedRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Approved Requests</h3>
                  <p className="text-gray-500 text-center max-w-md">
                    No reservations have been approved yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {approvedRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onApprove={() => {}}
                    onReject={() => {}}
                    onCancelApproved={onCancelApproved}
                    checkConflicts={checkConflicts}
                    status="approved"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            {rejectedRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <XCircle className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rejected Requests</h3>
                  <p className="text-gray-500 text-center max-w-md">
                    No reservations have been rejected.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rejectedRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onApprove={() => {}}
                    onReject={() => {}}
                    checkConflicts={checkConflicts}
                    status="rejected"
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Reservation
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'Approve this classroom reservation. You can provide feedback to the faculty member.'
                : 'Reject this classroom reservation. Please provide a reason for rejection.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback">
                {actionType === 'approve' ? 'Feedback (Optional)' : 'Rejection Reason (Required)'}
              </Label>
              <Textarea
                id="feedback"
                placeholder={actionType === 'approve' 
                  ? 'Enter any additional feedback...'
                  : 'Enter the reason for rejection...'}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedRequest(null);
                setFeedback('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={actionType === 'reject' && !feedback.trim()}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
