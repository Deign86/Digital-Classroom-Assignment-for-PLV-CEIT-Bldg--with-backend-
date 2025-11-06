import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { bookingRequestService, scheduleService } from '../lib/firebaseService';
import { useAnnouncer } from './Announcer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger, DialogClose } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/enhanced-tabs';
import { readPreferredTab, writeStoredTab, writeTabToHash } from '../utils/tabPersistence';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertTriangle, MessageSquare, X, Loader2 } from 'lucide-react';
import { convertTo12Hour, formatTimeRange, isPastBookingTime } from '../utils/timeUtils';
import type { Schedule, BookingRequest } from '../App';

interface FacultyScheduleProps {
  schedules: Schedule[];
  bookingRequests: BookingRequest[];
  initialTab?: 'upcoming' | 'requests' | 'approved' | 'cancelled' | 'history' | 'rejected';
  onCancelSelected?: (scheduleId: string) => Promise<void> | void;
  // Callback when user chooses to "Quick Rebook" — attempt one-click submission
  onQuickRebook?: (initialData: { classroomId: string; date: string; startTime: string; endTime: string; purpose?: string }) => void;
  userId?: string;
}

export default function FacultySchedule({ schedules, bookingRequests, initialTab = 'upcoming', onCancelSelected, onQuickRebook, userId }: FacultyScheduleProps) {
  const STORAGE_KEY_BASE = 'plv:facultySchedule:activeTab';
  const STORAGE_KEY = userId ? `${STORAGE_KEY_BASE}:${userId}` : STORAGE_KEY_BASE;
  const allowed = ['upcoming', 'requests', 'approved', 'cancelled', 'history', 'rejected'] as const;
  type TabName = typeof allowed[number];
  const [activeTab, setActiveTab] = useState<TabName>(() => readPreferredTab(STORAGE_KEY, initialTab, Array.from(allowed)) as TabName);
  // hydrated prevents a visual tab-flash when userId (and storage key) arrives asynchronously
  const [hydrated, setHydrated] = useState<boolean>(() => typeof window === 'undefined' ? true : false);
  // Mark hydrated on mount to allow client-only tab rendering and avoid a persistent empty state
  useEffect(() => {
    setHydrated(true);
  }, []);
  const { announce } = useAnnouncer();
  const [approvedSelectedIds, setApprovedSelectedIds] = useState<Record<string, boolean>>({});
  const [isCancelling, setIsCancelling] = useState(false);
  const [showBulkCancelDialog, setShowBulkCancelDialog] = useState(false);
  // Per-request cancellation processing map to show per-item loaders during bulk ops
  const [processingCancelIds, setProcessingCancelIds] = useState<Record<string, boolean>>({});
  // Quick rebook confirmation dialog state
  const [quickDialogOpen, setQuickDialogOpen] = useState(false);
  const [quickDialogData, setQuickDialogData] = useState<{ classroomId: string; date: string; startTime: string; endTime: string; purpose?: string } | null>(null);

  const openQuickDialog = (data: { classroomId: string; date: string; startTime: string; endTime: string; purpose?: string }) => {
    setQuickDialogData(data);
    setQuickDialogOpen(true);
  };
  
  const [bulkCancelReason, setBulkCancelReason] = useState('');
  const [bulkReasonError, setBulkReasonError] = useState<string | null>(null);

  // Filter schedules
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingSchedules = schedules
    .filter(s => new Date(s.date) >= today && (s.status === 'confirmed' || s.status === 'cancelled'))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastSchedules = schedules
    .filter(s => new Date(s.date) < today && (s.status === 'confirmed' || s.status === 'cancelled'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter requests
  const pendingRequests = bookingRequests.filter(r => r.status === 'pending' && !isPastBookingTime(r.date, convertTo12Hour(r.startTime)));
  const approvedRequests = bookingRequests.filter(r => r.status === 'approved');
  const rejectedRequests = bookingRequests.filter(r => r.status === 'rejected');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const ScheduleCard = ({ schedule }: { schedule: Schedule }) => {
    return (
      <Card className={`border-l-4 ${
        schedule.status === 'cancelled' ? 'border-l-red-500 bg-red-500/5' : 'border-l-blue-500'
      }`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatDateShort(schedule.date)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={schedule.status === 'cancelled' ? 'destructive' : 'default'}>
                  {schedule.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formatTimeRange(convertTo12Hour(schedule.startTime), convertTo12Hour(schedule.endTime))}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{schedule.classroomName}</span>
              </div>
            </div>

            <div>
              <p className="font-medium text-foreground">{schedule.purpose}</p>
              <p className="text-sm text-muted-foreground mt-1">{formatDate(schedule.date)}</p>
              {schedule.status === 'cancelled' && (
                <p className="text-sm text-red-600 mt-1 italic">This reservation has been cancelled</p>
              )}
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    try { announce?.('Attempting quick rebook', 'polite'); } catch (e) {}
                    openQuickDialog({
                      classroomId: schedule.classroomId,
                      date: schedule.date,
                      startTime: convertTo12Hour(schedule.startTime),
                      endTime: convertTo12Hour(schedule.endTime),
                      purpose: schedule.purpose || ''
                    });
                  }}
                >
                  Quick Rebook
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const RequestCard = ({ request }: { request: BookingRequest }) => (
    <Card className={`${
      request.status === 'rejected' ? 'border-l-4 border-l-red-500' :
      request.status === 'approved' ? 'border-l-4 border-l-green-500' :
      'border-l-4 border-l-orange-500'
    }`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{formatDateShort(request.date)}</span>
            </div>
            <Badge 
              variant={
                request.status === 'pending' ? 'secondary' :
                request.status === 'approved' ? 'default' : 'destructive'
              }
            >
              {request.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>{formatTimeRange(convertTo12Hour(request.startTime), convertTo12Hour(request.endTime))}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>{request.classroomName}</span>
            </div>
          </div>

          <div>
            <p className="font-medium text-foreground">{request.purpose}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Requested on {new Date(request.requestDate).toLocaleDateString()}
            </p>
          </div>

          {request.adminFeedback && (
            <div className="flex items-start space-x-2 p-3 bg-muted rounded-lg">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Admin Feedback:</p>
                <p className="text-sm text-foreground">{request.adminFeedback}</p>
              </div>
            </div>
          )}
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                try { announce?.('Attempting quick rebook', 'polite'); } catch (e) {}
                openQuickDialog({
                  classroomId: request.classroomId,
                  date: request.date,
                  startTime: convertTo12Hour(request.startTime),
                  endTime: convertTo12Hour(request.endTime),
                  purpose: request.purpose || ''
                });
              }}
            >
              Quick Rebook
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Schedule & Requests</CardTitle>
          <CardDescription>View your confirmed classes and reservation requests</CardDescription>
        </CardHeader>
      </Card>
      {/* Development diagnostics removed */}

  {hydrated ? (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
        {/* Desktop Tab Layout */}
        <TabsList className="hidden sm:flex w-full max-w-3xl mx-auto h-12">
          <TabsTrigger value="upcoming" className="flex-1 px-4 py-2">
            <Calendar className="h-4 w-4 mr-2" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-1 px-4 py-2 relative">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Requests
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white px-1 py-0 h-4 min-w-[16px] rounded-full flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex-1 px-4 py-2">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex-1 px-4 py-2">
            <X className="h-4 w-4 mr-2" />
            Rejected
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex-1 px-4 py-2">
            <XCircle className="h-4 w-4 mr-2" />
            Cancelled
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 px-4 py-2">
            <Clock className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>
        
        {/* Mobile Horizontal Scrollable Tabs */}
        <div className="sm:hidden mobile-tab-container">
          <TabsList className="mobile-tab-scroll bg-background/80 backdrop-blur-lg border rounded-lg h-12 p-1">
            <TabsTrigger value="upcoming" className="mobile-tab-item flex items-center space-x-2 px-4 py-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Upcoming</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="mobile-tab-item flex items-center space-x-2 px-4 py-2 relative">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Requests</span>
              {pendingRequests.length > 0 && (
                <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 h-5 min-w-[18px] rounded-full ml-1 flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="mobile-tab-item flex items-center space-x-2 px-4 py-2">
              <X className="h-4 w-4 flex-shrink-0" />
              <span>Rejected</span>
            </TabsTrigger>
            <TabsTrigger value="approved" className="mobile-tab-item flex items-center space-x-2 px-4 py-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>Approved</span>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="mobile-tab-item flex items-center space-x-2 px-4 py-2">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <span>Cancelled</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="mobile-tab-item flex items-center space-x-2 px-4 py-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingSchedules.filter(s => s.status === 'confirmed').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Upcoming Classes</h3>
                <p className="text-muted-foreground">You don't have any confirmed classes scheduled.</p>
              </CardContent>
            </Card>
          ) : (
            upcomingSchedules
              .filter(s => s.status === 'confirmed')
              .map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} />
              ))
          )}
        </TabsContent>

        {/* Quick Rebook confirmation dialog */}
        <Dialog open={quickDialogOpen} onOpenChange={(open) => setQuickDialogOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Quick Rebook</DialogTitle>
              <DialogDescription>
                Please confirm you want to submit a reservation request with the details below. If the request cannot be submitted (conflict or invalid), you'll be taken to the booking form to adjust.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              <p className="text-sm"><strong>Classroom:</strong> {quickDialogData?.classroomId}</p>
              <p className="text-sm"><strong>Date:</strong> {quickDialogData?.date}</p>
              <p className="text-sm"><strong>Time:</strong> {quickDialogData ? `${quickDialogData.startTime} - ${quickDialogData.endTime}` : ''}</p>
              {quickDialogData?.purpose && <p className="text-sm"><strong>Purpose:</strong> {quickDialogData.purpose}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  if (!quickDialogData) return;
                  setQuickDialogOpen(false);
                  // Call parent handler
                  try {
                    onQuickRebook?.(quickDialogData);
                  } catch (e) {
                    console.error('onQuickRebook handler failed', e);
                  }
                }}
              >
                Confirm Quick Rebook
              </Button>
            </div>
          </DialogContent>
        </Dialog>

          {/* Persist active tab handled by top-level useEffect */}

        <TabsContent value="requests" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground">All your requests have been processed.</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Approved Requests</h3>
                <p className="text-muted-foreground">No requests have been approved yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    aria-label="Select all approved"
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const map: Record<string, boolean> = {};
                      approvedRequests.forEach(r => { map[r.id] = checked; });
                      setApprovedSelectedIds(map);
                    }}
                    checked={approvedRequests.length > 0 && approvedRequests.every(r => approvedSelectedIds[r.id])}
                    className="h-4 w-4 text-indigo-600 rounded border-input"
                  />
                  <span className="text-sm">Select all ({approvedRequests.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const ids = Object.keys(approvedSelectedIds).filter(k => approvedSelectedIds[k]);
                        if (!ids.length) return;

                        // If a parent handler is provided, prefer it (backwards compatibility).
                        if (typeof onCancelSelected === 'function') {
                          (async () => {
                            try {
                              setIsCancelling(true);
                              for (const id of ids) {
                                try {
                                  await onCancelSelected(id);
                                } catch (err) {
                                  console.error('onCancelSelected failed for', id, err);
                                }
                              }
                              const message = `Attempted to cancel ${ids.length} reservation(s).`;
                              toast.success(message);
                              announce?.(message, 'polite');
                            } finally {
                              setIsCancelling(false);
                              setApprovedSelectedIds({});
                            }
                          })();
                          return;
                        }

                        // Open the bulk cancel dialog to collect an admin reason
                        setShowBulkCancelDialog(true);
                      }}
                      disabled={isCancelling || Object.values(approvedSelectedIds).filter(Boolean).length === 0}
                    >
                      {isCancelling ? 'Cancelling...' : `Cancel Selected (${Object.values(approvedSelectedIds).filter(Boolean).length})`}
                    </Button>

                    {/* Bulk Cancel Dialog */}
                    <Dialog open={showBulkCancelDialog} onOpenChange={(open) => { if (isCancelling) return; setShowBulkCancelDialog(open); setBulkReasonError(null); }}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cancel selected reservations</DialogTitle>
                        </DialogHeader>
                          <DialogDescription className="text-sm text-muted-foreground">
                            Cancelling approved reservations requires a reason. Please enter a brief explanation that will be shown to the faculty member(s).
                          </DialogDescription>

                        <div className="mt-4">
                          {/* Summary of selected reservations for admin confirmation */}
                          {Object.keys(approvedSelectedIds).filter(k => approvedSelectedIds[k]).length > 0 && (
                            <div className="mb-3 border rounded-md p-3 bg-muted/30">
                              <div className="text-sm font-medium mb-2">Selected reservations</div>
                              <ul className="text-sm list-none space-y-1">
                                {bookingRequests.filter(r => Object.keys(approvedSelectedIds).includes(r.id) && approvedSelectedIds[r.id]).map(r => (
                                  <li key={r.id} className="text-sm">
                                    <div className="font-medium">{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                    <div className="text-muted-foreground">{formatTimeRange(convertTo12Hour(r.startTime), convertTo12Hour(r.endTime))} · {r.classroomName}</div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <Label className="block">Reason (required)</Label>
                          <div className="mt-2">
                            <Textarea
                              value={bulkCancelReason}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v.length <= 500) {
                                  setBulkCancelReason(v);
                                  setBulkReasonError(null);
                                }
                              }}
                              maxLength={500}
                              rows={4}
                              autoFocus
                              placeholder="Explain briefly why the reservation(s) are being cancelled"
                              aria-label="Cancellation reason"
                              aria-invalid={!!bulkReasonError}
                              className="mt-0"
                            />
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                            <div className="min-h-[1.25rem]">{bulkReasonError ? <span role="alert" className="text-destructive">{bulkReasonError}</span> : null}</div>
                            <div className="text-sm text-muted-foreground">{bulkCancelReason.length}/500</div>
                          </div>
                        </div>

                        <DialogFooter className="mt-4">
                          <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => { setShowBulkCancelDialog(false); setBulkCancelReason(''); setBulkReasonError(null); }}>Cancel</Button>
                            <Button
                              variant="destructive"
                              onClick={async () => {
                                const ids = Object.keys(approvedSelectedIds).filter(k => approvedSelectedIds[k]);
                                if (!ids.length) {
                                  setShowBulkCancelDialog(false);
                                  return;
                                }

                                const reason = bulkCancelReason.trim();
                                if (!reason) {
                                  setBulkReasonError('A cancellation reason is required.');
                                  return;
                                }

                                setIsCancelling(true);

                                const successfulScheduleCancellations: string[] = [];
                                const failedScheduleCancellations: Array<{ id: string; error: unknown }> = [];

                                for (const requestId of ids) {
                                  try {
                                    // mark this request as processing (for per-item UI)
                                    setProcessingCancelIds(prev => ({ ...prev, [requestId]: true }));
                                    const correspondingSchedule = schedules.find(schedule =>
                                      schedule.facultyId === bookingRequests.find(req => req.id === requestId)?.facultyId &&
                                      schedule.date === bookingRequests.find(req => req.id === requestId)?.date &&
                                      schedule.startTime === bookingRequests.find(req => req.id === requestId)?.startTime &&
                                      schedule.endTime === bookingRequests.find(req => req.id === requestId)?.endTime &&
                                      schedule.classroomId === bookingRequests.find(req => req.id === requestId)?.classroomId
                                    );

                                    if (correspondingSchedule) {
                                      try {
                                        if (onCancelSelected) {
                                          // Delegate cancellation to parent when provided (awaitable)
                                          await onCancelSelected(correspondingSchedule.id as string);
                                          successfulScheduleCancellations.push(requestId);
                                        } else {
                                          await scheduleService.cancelApprovedBooking(correspondingSchedule.id, reason);
                                          successfulScheduleCancellations.push(requestId);
                                        }
                                      } catch (err) {
                                        console.error('Failed to cancel schedule for request', requestId, err);
                                        failedScheduleCancellations.push({ id: requestId, error: err });
                                      }
                                    } else {
                                      successfulScheduleCancellations.push(requestId);
                                    }
                                  } catch (err) {
                                    console.error('Failed to cancel schedule for request', requestId, err);
                                    failedScheduleCancellations.push({ id: requestId, error: err });
                                  } finally {
                                    // clear processing state for this request
                                    setProcessingCancelIds(prev => {
                                      const copy = { ...prev };
                                      delete copy[requestId];
                                      return copy;
                                    });
                                  }
                                }

                                // Prepare booking request updates for all ids that we attempted (mark cancelled and add adminFeedback)
                                const bookingUpdates = ids.map(id => ({ id, data: { status: 'cancelled' as const, adminFeedback: reason } }));

                                try {
                                  await bookingRequestService.bulkUpdate(bookingUpdates);
                                } catch (err) {
                                  console.error('Bulk update of booking requests failed', err);
                                  for (const u of bookingUpdates) {
                                    try {
                                      await bookingRequestService.update(u.id, u.data as Partial<any>);
                                    } catch (innerErr) {
                                      console.error('Fallback per-item update failed for', u.id, innerErr);
                                      failedScheduleCancellations.push({ id: u.id, error: innerErr });
                                    }
                                  }
                                }

                                setIsCancelling(false);
                                setApprovedSelectedIds({});
                                setBulkCancelReason('');
                                // close dialog after processing completes
                                setShowBulkCancelDialog(false);

                                const successCount = ids.length - failedScheduleCancellations.length;
                                if (failedScheduleCancellations.length === 0) {
                                  const message = `Successfully cancelled ${successCount} reservation(s).`;
                                  toast.success(message);
                                  announce?.(message, 'polite');
                                } else {
                                  const message = `Cancelled ${successCount} reservation(s). ${failedScheduleCancellations.length} failed.`;
                                  toast.error(message);
                                  announce?.(message, 'assertive');
                                }
                              }}
                              disabled={isCancelling || bulkCancelReason.trim().length === 0 || Object.values(approvedSelectedIds).filter(Boolean).length === 0}
                              aria-disabled={isCancelling || bulkCancelReason.trim().length === 0 || Object.values(approvedSelectedIds).filter(Boolean).length === 0}
                              title={bulkCancelReason.trim().length === 0 ? 'Provide a reason to enable' : Object.values(approvedSelectedIds).filter(Boolean).length === 0 ? 'No selected reservations' : undefined}
                            >
                              {isCancelling ? (
                                <span className="inline-flex items-center">
                                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                  <span className="sr-only">Cancelling selected reservations</span>
                                  Cancelling...
                                </span>
                              ) : (
                                `Confirm Cancel (${Object.values(approvedSelectedIds).filter(Boolean).length})`
                              )}
                            </Button>
                          </div>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                </div>
              </div>

              <div className="grid gap-4">
                {approvedRequests
                  .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
                  .map((request) => (
                    <div key={request.id} className="flex items-start gap-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={!!approvedSelectedIds[request.id]}
                          onChange={(e) => setApprovedSelectedIds(prev => ({ ...prev, [request.id]: e.target.checked }))}
                          className="h-4 w-4 text-indigo-600 rounded border-input mt-3"
                        />
                        {processingCancelIds[request.id] && (
                          <span className="inline-flex items-center ml-2">
                            <Loader2 className="animate-spin h-4 w-4 text-gray-500" />
                            <span className="sr-only">Cancelling reservation</span>
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <RequestCard request={request} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <X className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Rejected Requests</h3>
                <p className="text-muted-foreground">You have no rejected reservation requests.</p>
              </CardContent>
            </Card>
          ) : (
            rejectedRequests
              .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
              .map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {schedules.filter(s => s.status === 'cancelled').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Cancelled Reservations</h3>
                <p className="text-muted-foreground">You haven't cancelled any reservations yet.</p>
              </CardContent>
            </Card>
          ) : (
            schedules
              .filter(s => s.status === 'cancelled')
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} />
              ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {pastSchedules.filter(s => s.status === 'confirmed').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Past Classes</h3>
                <p className="text-muted-foreground">Your past classes will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            pastSchedules
              .filter(s => s.status === 'confirmed')
              .map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} />
              ))
          )}
        </TabsContent>
      </Tabs>
    ) : (
      <div className="p-4">
        <div className="h-12 bg-muted rounded animate-pulse" />
      </div>
    )}
    </div>
  );
}

// Helper to remove per-user persisted keys (call this on logout to cleanup stored preferences)
export function clearFacultyScheduleStorageForUser(userId?: string) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const base = 'plv:facultySchedule:activeTab';
    if (userId) {
      window.localStorage.removeItem(`${base}:${userId}`);
      console.debug('[FacultySchedule] cleared storage for user', { key: `${base}:${userId}` });
    } else {
      // best-effort: remove base key
      window.localStorage.removeItem(base);
      console.debug('[FacultySchedule] cleared base storage key', { key: base });
    }
  } catch (err) {
    console.warn('Failed to clear FacultySchedule storage key', err);
  }
}