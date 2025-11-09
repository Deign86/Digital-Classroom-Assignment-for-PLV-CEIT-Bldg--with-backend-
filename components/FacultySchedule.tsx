import React, { useState, useEffect, useMemo, useRef } from 'react';
import { logger } from '../lib/logger';
import { toast } from 'sonner';
import { bookingRequestService, scheduleService } from '../lib/firebaseService';
import useBulkRunner, { BulkTask } from '../hooks/useBulkRunner';
import BulkProgressDialog from './BulkProgressDialog';
import { useAnnouncer } from './Announcer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/enhanced-tabs';
import { readPreferredTab } from '../utils/tabPersistence';
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
  // bulk runner for cancellable, per-item progress
  const bulkRunner = useBulkRunner();
  const [showBulkProgress, setShowBulkProgress] = useState(false);
  const lastCancelTasksRef = useRef<BulkTask[] | null>(null);
  const lastCancelIdsRef = useRef<string[] | null>(null);

  // reflect runner's processing statuses into the per-item processing map used by the UI
  useEffect(() => {
    const map: Record<string, boolean> = {};
    if (lastCancelIdsRef.current && bulkRunner.results && bulkRunner.results.length > 0) {
      bulkRunner.results.forEach((res, idx) => {
        const id = lastCancelIdsRef.current?.[idx];
        if (!id) return;
        map[id] = res.status === 'processing';
      });
    }
    setProcessingCancelIds(map);
  }, [bulkRunner.results, bulkRunner.running]);

  // Filter schedules
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingSchedules = schedules
    .filter(s => new Date(s.date) >= today && (s.status === 'confirmed' || s.status === 'cancelled'))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastSchedules = schedules
    .filter(s => new Date(s.date) < today && (s.status === 'confirmed' || s.status === 'cancelled'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Deduplicate booking requests by ID (defensive programming to prevent duplicate rendering)
  const uniqueBookingRequests = useMemo(() => {
    const seen = new Set<string>();
    return bookingRequests.filter(r => {
      if (seen.has(r.id)) {
        logger.warn(`⚠️ Duplicate booking request detected and filtered: ${r.id}`);
        return false;
      }
      seen.add(r.id);
      return true;
    });
  }, [bookingRequests]);

  // Filter requests
  const pendingRequests = uniqueBookingRequests.filter(r => r.status === 'pending' && !isPastBookingTime(r.date, convertTo12Hour(r.startTime)));
  const approvedRequests = uniqueBookingRequests.filter(r => r.status === 'approved');
  const rejectedRequests = uniqueBookingRequests.filter(r => r.status === 'rejected');

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
        schedule.status === 'cancelled' ? 'border-l-red-500 bg-red-50' : 'border-l-blue-500'
      }`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
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
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{formatTimeRange(convertTo12Hour(schedule.startTime), convertTo12Hour(schedule.endTime))}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{schedule.classroomName}</span>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-900">{schedule.purpose}</p>
              <p className="text-sm text-gray-500 mt-1">{formatDate(schedule.date)}</p>
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
            <p className="font-medium text-gray-900">{request.purpose}</p>
            <p className="text-sm text-gray-500 mt-1">
              Requested on {new Date(request.requestDate).toLocaleDateString()}
            </p>
          </div>

          {request.adminFeedback && (
            <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
              <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Admin Feedback:</p>
                <p className="text-sm text-gray-800">{request.adminFeedback}</p>
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
          <div className="tab-scroll-indicator"></div>
        </div>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingSchedules.filter(s => s.status === 'confirmed').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Classes</h3>
                <p className="text-gray-600">You don't have any confirmed classes scheduled.</p>
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
                    logger.error('onQuickRebook handler failed', e);
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
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
                <p className="text-gray-600">All your requests have been processed.</p>
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
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Approved Requests</h3>
                <p className="text-gray-600">No requests have been approved yet.</p>
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
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300"
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
                                  logger.error('onCancelSelected failed for', id, err);
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
                            Please provide a reason for cancelling your approved reservation(s). This will be sent to the administrators.
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
                              placeholder="Explain why you need to cancel your reservation(s)"
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

                                // Build per-item tasks so we can show progress and allow cancel
                                const tasks: BulkTask<string>[] = ids.map((requestId) => async () => {
                                  // per-item cancellation and booking request update
                                  try {
                                    const req = bookingRequests.find(r => r.id === requestId);
                                    const correspondingSchedule = schedules.find(schedule =>
                                      schedule.facultyId === req?.facultyId &&
                                      schedule.date === req?.date &&
                                      schedule.startTime === req?.startTime &&
                                      schedule.endTime === req?.endTime &&
                                      schedule.classroomId === req?.classroomId
                                    );

                                    if (correspondingSchedule) {
                                      if (onCancelSelected) {
                                        await onCancelSelected(correspondingSchedule.id as string);
                                      } else {
                                        await scheduleService.cancelApprovedBooking(correspondingSchedule.id, reason);
                                      }
                                    }

                                    // update booking request state per-item
                                    try {
                                      await bookingRequestService.update(requestId, { status: 'cancelled', adminFeedback: reason } as Partial<any>);
                                    } catch (err) {
                                      // bubble up per-item failure (the runner will record rejection)
                                      throw err;
                                    }

                                    return requestId;
                                  } catch (err) {
                                    throw err;
                                  }
                                });

                                // store ids/tasks for mapping results and potential retry
                                lastCancelTasksRef.current = tasks;
                                lastCancelIdsRef.current = ids;

                                // open progress dialog before starting so Cancel works
                                setShowBulkProgress(true);

                                try {
                                  const results = await bulkRunner.start(tasks, 4, undefined);

                                  // compute succeeded/failed
                                  const succeeded = results.filter(r => r.status === 'fulfilled').length;
                                  const failed = results.filter(r => r.status === 'rejected').length;

                                  setApprovedSelectedIds({});
                                  setBulkCancelReason('');
                                  setShowBulkCancelDialog(false);
                                  if (failed === 0) {
                                    const message = `Successfully cancelled ${succeeded} reservation(s).`;
                                    toast.success(message);
                                    announce?.(message, 'polite');
                                  } else {
                                    const message = `Cancelled ${succeeded} reservation(s). ${failed} failed.`;
                                    toast.error(message);
                                    announce?.(message, 'assertive');
                                  }
                                } catch (err) {
                                  logger.error('Bulk cancellation failed', err);
                                  toast.error('Bulk cancellation encountered an error. Some items may have been processed.');
                                  announce?.('Bulk cancellation encountered an error.', 'assertive');
                                } finally {
                                  setIsCancelling(false);
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
                    {/* Bulk Progress Dialog for cancellable, long-running operations */}
                    <BulkProgressDialog
                      open={showBulkProgress}
                      onOpenChange={(open) => setShowBulkProgress(open)}
                      items={lastCancelIdsRef.current ? lastCancelIdsRef.current.map(id => ({ id, label: bookingRequests.find(r => r.id === id)?.classroomName ?? id })) : []}
                      processed={bulkRunner.processed}
                      total={bulkRunner.total}
                      results={bulkRunner.results}
                      running={bulkRunner.running}
                      onCancel={() => {
                        bulkRunner.cancel();
                        toast('Bulk cancel cancelled.');
                        setShowBulkProgress(false);
                      }}
                      onRetry={async () => {
                        const failedIds = (bulkRunner.results || []).map((r, idx) => r.status === 'rejected' ? lastCancelIdsRef.current?.[idx] : null).filter(Boolean) as string[];
                        if (!failedIds.length) return;
                        const retryTasks: BulkTask<string>[] = failedIds.map((requestId) => async () => {
                          const req = bookingRequests.find(r => r.id === requestId);
                          const correspondingSchedule = schedules.find(schedule =>
                            schedule.facultyId === req?.facultyId &&
                            schedule.date === req?.date &&
                            schedule.startTime === req?.startTime &&
                            schedule.endTime === req?.endTime &&
                            schedule.classroomId === req?.classroomId
                          );
                          if (correspondingSchedule) {
                            if (onCancelSelected) {
                              await onCancelSelected(correspondingSchedule.id as string);
                            } else {
                              await scheduleService.cancelApprovedBooking(correspondingSchedule.id, bulkCancelReason);
                            }
                          }
                          await bookingRequestService.update(requestId, { status: 'cancelled', adminFeedback: bulkCancelReason } as Partial<any>);
                          return requestId;
                        });

                        lastCancelTasksRef.current = retryTasks;
                        bulkRunner.retry();
                        setShowBulkProgress(true);
                        try {
                          await bulkRunner.start(retryTasks, 4, undefined);
                        } catch (err) {
                          logger.error('Retry bulk cancellation failed', err);
                          toast.error('Retry encountered an error.');
                        }
                      }}
                    />
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
                          className="h-4 w-4 text-indigo-600 rounded border-gray-300 mt-3"
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Rejected Requests</h3>
                <p className="text-gray-600">You have no rejected reservation requests.</p>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Cancelled Reservations</h3>
                <p className="text-gray-600">You haven't cancelled any reservations yet.</p>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Past Classes</h3>
                <p className="text-gray-600">Your past classes will appear here.</p>
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
        <div className="h-12 bg-gray-100 rounded animate-pulse" />
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
      logger.debug('[FacultySchedule] cleared storage for user', { key: `${base}:${userId}` });
    } else {
      // best-effort: remove base key
      window.localStorage.removeItem(base);
      logger.debug('[FacultySchedule] cleared base storage key', { key: base });
    }
  } catch (err) {
    logger.warn('Failed to clear FacultySchedule storage key', err);
  }
}