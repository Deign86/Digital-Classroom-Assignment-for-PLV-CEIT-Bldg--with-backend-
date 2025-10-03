import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CheckCircle, XCircle, Clock, Calendar, MapPin, User, AlertTriangle } from 'lucide-react';
import { convertTo12Hour, formatTimeRange } from '../utils/timeUtils';
import type { BookingRequest } from '../App';

interface RequestApprovalProps {
  requests: BookingRequest[];
  onRequestApproval: (requestId: string, approved: boolean, feedback?: string) => void;
  onCancelSchedule?: (scheduleId: string, cancellationReason: string) => void;
  checkConflicts: (classroomId: string, date: string, startTime: string, endTime: string, checkPastTime?: boolean, excludeRequestId?: string) => boolean | Promise<boolean>;
}

export default function RequestApproval({ requests, onRequestApproval, onCancelSchedule, checkConflicts }: RequestApprovalProps) {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  
  // Cancellation state
  const [selectedCancelRequest, setSelectedCancelRequest] = useState<BookingRequest | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancellationDialogOpen, setIsCancellationDialogOpen] = useState(false);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');
  const cancelledRequests = requests.filter(r => r.status === 'cancelled');

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

  const handleCancelClick = (request: BookingRequest) => {
    setSelectedCancelRequest(request);
    setCancellationReason('');
    setIsCancellationDialogOpen(true);
  };

  const handleConfirmCancellation = () => {
    if (selectedCancelRequest && onCancelSchedule && cancellationReason.trim()) {
      // Pass the request details to find the corresponding schedule
      // We'll need to modify the onCancelSchedule to handle this
      // For now, let's pass a specially formatted ID that includes request details
      const scheduleIdentifier = `request:${selectedCancelRequest.id}:${selectedCancelRequest.facultyId}:${selectedCancelRequest.classroomId}:${selectedCancelRequest.date}:${selectedCancelRequest.startTime}:${selectedCancelRequest.endTime}`;
      onCancelSchedule(scheduleIdentifier, cancellationReason.trim());
      setIsCancellationDialogOpen(false);
      setSelectedCancelRequest(null);
      setCancellationReason('');
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
          <TabsList className="grid w-full grid-cols-4 h-12">
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
            <TabsTrigger value="cancelled" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Cancelled ({cancelledRequests.length})
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
                    onCancel={undefined}
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
                    onCancel={onCancelSchedule ? () => handleCancelClick(request) : undefined}
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
                    onCancel={undefined}
                    checkConflicts={checkConflicts}
                    status="rejected"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6">
            {cancelledRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-16 w-16 text-orange-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cancelled Requests</h3>
                  <p className="text-gray-500 text-center max-w-md">
                    No approved reservations have been cancelled by admin.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {cancelledRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onApprove={() => {}}
                    onReject={() => {}}
                    onCancel={undefined}
                    checkConflicts={checkConflicts}
                    status="cancelled"
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

      {/* Cancellation Dialog */}
      <Dialog open={isCancellationDialogOpen} onOpenChange={setIsCancellationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Approved Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this approved booking. The faculty member will be notified.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCancelRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium">{selectedCancelRequest.classroomName}</p>
                <p className="text-sm text-gray-600">
                  {selectedCancelRequest.facultyName} • {selectedCancelRequest.date} • {formatTimeRange(convertTo12Hour(selectedCancelRequest.startTime), convertTo12Hour(selectedCancelRequest.endTime))}
                </p>
                <p className="text-sm text-gray-500">{selectedCancelRequest.purpose}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cancellation-reason">Cancellation Reason *</Label>
                <Textarea
                  id="cancellation-reason"
                  placeholder="Please explain why this booking is being cancelled..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancellationDialogOpen(false);
                setSelectedCancelRequest(null);
                setCancellationReason('');
              }}
            >
              Keep Booking
            </Button>
            <Button
              onClick={handleConfirmCancellation}
              disabled={!cancellationReason.trim()}
              variant="destructive"
            >
              Cancel Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({ 
  request, 
  onApprove, 
  onReject,
  onCancel,
  checkConflicts,
  status 
}: {
  request: BookingRequest;
  onApprove: () => void;
  onReject: () => void;
  onCancel?: (request: BookingRequest) => void;
  checkConflicts: (classroomId: string, date: string, startTime: string, endTime: string, checkPastTime?: boolean, excludeRequestId?: string) => boolean | Promise<boolean>;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
}) {
  const [hasConflict, setHasConflict] = useState(false);

  React.useEffect(() => {
    const checkForConflicts = async () => {
      try {
        // Pass the current request ID to exclude it from conflict checking
        const result = checkConflicts(
          request.classroomId, 
          request.date, 
          request.startTime, 
          request.endTime, 
          false, // don't check past time
          request.id // exclude this request from conflict check
        );
        if (result instanceof Promise) {
          const conflict = await result;
          setHasConflict(conflict);
        } else {
          setHasConflict(result);
        }
      } catch (error) {
        console.error('Error checking conflicts:', error);
        // In case of error, assume there might be a conflict to be safe
        setHasConflict(true);
      }
    };

    if (status === 'pending') {
      checkForConflicts();
    }
  }, [request, checkConflicts, status]);

  const borderColor = status === 'pending' 
    ? (hasConflict ? 'border-l-red-500' : 'border-l-orange-500')
    : status === 'approved' 
    ? 'border-l-green-500' 
    : 'border-l-red-500';

  return (
    <Card className={`border-l-4 ${borderColor} transition-shadow hover:shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{request.facultyName}</CardTitle>
            <CardDescription className="text-sm">Request ID: {request.id.slice(0, 8)}</CardDescription>
          </div>
          <Badge variant={
            status === 'pending' ? 'secondary' : 
            status === 'approved' ? 'default' : 
            'destructive'
          }>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {hasConflict && status === 'pending' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Scheduling Conflict</p>
              <p className="text-xs text-red-700 mt-1">
                This time slot conflicts with an existing booking.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="font-medium text-gray-900">
              {new Date(request.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="text-gray-700">
              {formatTimeRange(convertTo12Hour(request.startTime), convertTo12Hour(request.endTime))}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="text-gray-700">
              {request.classroomName}
            </span>
          </div>

          <div className="flex items-start gap-3 text-sm">
            <User className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Purpose:</p>
              <p className="text-gray-700 mt-1">{request.purpose}</p>
            </div>
          </div>
        </div>

        {request.adminFeedback && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-900 mb-1">Admin Feedback:</p>
            <p className="text-sm text-gray-700">{request.adminFeedback}</p>
          </div>
        )}

        {request.cancellationReason && status === 'cancelled' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-orange-900 mb-1">Cancellation Reason:</p>
            <p className="text-sm text-orange-800">{request.cancellationReason}</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="flex gap-3 pt-3 border-t">
            <Button 
              onClick={onApprove}
              disabled={hasConflict}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button 
              onClick={onReject}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        )}

        {status === 'approved' && onCancel && (
          <div className="flex justify-end pt-3 border-t">
            <Button 
              onClick={() => onCancel(request)}
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Booking
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}