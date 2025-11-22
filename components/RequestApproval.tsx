import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { readPreferredTab, writeStoredTab, writeTabToHash } from '../utils/tabPersistence';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import ProcessingFieldset from './ui/ProcessingFieldset';
import { convertTo12Hour, isPastBookingTime } from '../utils/timeUtils';
import type { BookingRequest } from '../App';
import RequestCard from './RequestCard';
import { toast } from 'sonner';
import BulkOperationLoader from './BulkOperationLoader';
import useBulkRunner, { BulkTask } from '../hooks/useBulkRunner';
import { useAnnouncer } from './Announcer';
import ScrollableBulkList, { ScrollableBulkSummary } from './ui/ScrollableBulkList';

interface RequestApprovalProps {
  requests: BookingRequest[];
  onRequestApproval: (requestId: string, approved: boolean, feedback?: string, suppressToast?: boolean) => Promise<void>;
  onCancelApproved?: (requestId: string, reason: string) => void;
  checkConflicts: (classroomId: string, date: string, startTime: string, endTime: string, checkPastTime?: boolean, excludeRequestId?: string) => boolean | Promise<boolean>;
  userId?: string;
}

export default function RequestApproval({ requests, onRequestApproval, onCancelApproved, checkConflicts, userId }: RequestApprovalProps) {
  const STORAGE_KEY_BASE = 'plv:requestApproval:activeTab';
  const STORAGE_KEY = userId ? `${STORAGE_KEY_BASE}:${userId}` : STORAGE_KEY_BASE;
  const allowedTabs = ['pending', 'approved', 'rejected', 'expired'];
  const [activeTab, setActiveTab] = useState<string>(() => readPreferredTab(STORAGE_KEY, 'pending', allowedTabs));

  useEffect(() => {
    try {
      writeStoredTab(STORAGE_KEY, activeTab);
      // also reflect to hash for shareability
      try { writeTabToHash(activeTab); } catch (e) { /* ignore */ }
    } catch (err) {
      // ignore
    }
  }, [activeTab, STORAGE_KEY]);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const { announce } = useAnnouncer();

  // Consider a request expired if server-marked or if it's still pending but its start time is in the past
  const expiredRequests = requests.filter(r => r.status === 'expired' || (r.status === 'pending' && isPastBookingTime(r.date, convertTo12Hour(r.startTime))));

  // Pending requests exclude server-marked expired ones (status === 'expired') and time-based expired ones
  const pendingRequests = requests.filter(r => r.status === 'pending' && !isPastBookingTime(r.date, convertTo12Hour(r.startTime)));
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const handleAction = (request: BookingRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setFeedback('');
    setIsDialogOpen(true);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => ({ ...prev, [id]: checked }));
  };

  const clearSelection = () => setSelectedIds({});

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  const startBulkAction = (type: 'approve' | 'reject') => {
    setSelectedRequest(null);
    setActionType(type);
    setFeedback('');
    setIsDialogOpen(true);
  };

  // Bulk runner for cancellable, per-item progress (shares implementation used elsewhere)
  const bulkRunner = useBulkRunner();
  const lastTasksRef = useRef<BulkTask[] | null>(null);
  const [lastItems, setLastItems] = useState<{ id: string; label?: string }[]>([]);
  const [showBulkProgress, setShowBulkProgress] = useState(false);

  // Approved-tab bulk cancel state
  const [approvedSelectedIds, setApprovedSelectedIds] = useState<Record<string, boolean>>({});
  const approvedSelectedCount = Object.values(approvedSelectedIds).filter(Boolean).length;

  const toggleApprovedSelect = (id: string, checked: boolean) => {
    setApprovedSelectedIds(prev => ({ ...prev, [id]: checked }));
  };

  const clearApprovedSelection = () => setApprovedSelectedIds({});

  const startBulkCancelApproved = () => {
    // reuse dialog to gather feedback (required)
    setSelectedRequest(null);
    setActionType('reject'); // treat cancel as a reject operation for feedback purposes
    setFeedback('');
    setIsDialogOpen(true);
  };

  const handleConfirm = () => {
    // Determine target ids: prefer dialog-origin selection. If dialog opened by approved-tab bulk cancel,
    // and no selectedRequest is set, and there are approvedSelectedIds, use those.
    const pendingTargetIds = Object.keys(selectedIds).filter(id => selectedIds[id]);
    const approvedTargetIds = Object.keys(approvedSelectedIds).filter(id => approvedSelectedIds[id]);

    let targetIds: string[];
    if (selectedRequest) {
      targetIds = [selectedRequest.id];
    } else if (approvedTargetIds.length > 0 && activeTab === 'approved') {
      targetIds = approvedTargetIds;
    } else {
      targetIds = pendingTargetIds;
    }
    if (targetIds.length === 0) {
      setIsDialogOpen(false);
      return;
    }

    // bulk processing now uses shared useBulkRunner for cancellable per-item progress

  (async () => {
      if (targetIds.length === 0) {
        setIsDialogOpen(false);
        return;
      }

      const fb = (feedback || '').trim();
      if (actionType === 'reject' && activeTab === 'approved' && !fb) {
        setFeedbackError('Please provide a reason for cancelling approved reservations.');
        return setIsDialogOpen(true);
      }

      if (fb.length > 500) {
        setFeedbackError('Reason must be 500 characters or less.');
        return setIsDialogOpen(true);
      }

      setFeedbackError(null);
      setIsProcessingBulk(true);
      setBulkProgress({ processed: 0, total: targetIds.length });

        const tasks = targetIds.map((id) => async () => {
          if (activeTab === 'approved' && actionType === 'reject' && onCancelApproved) {
            try {
              await Promise.resolve(onCancelApproved(id, fb));
              return { id, ok: true };
            } catch (err) {
              // fall back to update via onRequestApproval
              await onRequestApproval(id, false, fb || undefined, true);
              return { id, ok: true };
            }
          }
          await onRequestApproval(id, actionType === 'approve', fb || undefined, true);
          return { id, ok: true };
        });

      // Save tasks/items for retrying or progress dialog
      const itemsForDialog = targetIds.map(id => ({ id, label: `Request ${id}` }));
      lastTasksRef.current = tasks;
      setLastItems(itemsForDialog);
      // Only show bulk progress dialog for multiple items
      if (targetIds.length > 1) {
        setShowBulkProgress(true);
      }

      const results = await bulkRunner.start(tasks, 4, (processed, total) => setBulkProgress({ processed, total }));

      const succeeded: string[] = [];
      const failed: { id: string; error?: unknown }[] = [];

      results.forEach((res: any, idx: number) => {
        const id = targetIds[idx];
        if (res?.status === 'fulfilled') succeeded.push(id);
        else failed.push({ id, error: res?.reason });
      });

      setBulkResults({ succeeded, failed });
      showBulkSummary(succeeded, failed);

      setIsProcessingBulk(false);
      setBulkProgress({ processed: 0, total: 0 });

      clearSelection();
      clearApprovedSelection();
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setFeedback('');
      // Aggregated toast is handled by showBulkSummary above.
    })();
  };

  // Bulk processing UI state
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState<{ succeeded: string[]; failed: { id: string; error?: unknown }[] }>({ succeeded: [], failed: [] });

  // Show a single Sonner toast summary for bulk actions (replaces the old modal-based flow)
  const showBulkSummary = (succeeded: string[], failed: { id: string; error?: unknown }[]) => {
    setBulkResults({ succeeded, failed });
    if (succeeded.length > 0 && failed.length === 0) {
      const msg = `${succeeded.length} reservation(s) processed successfully.`;
      toast.success(msg);
      try { announce(msg, 'polite'); } catch (e) {}
    } else if (succeeded.length > 0 && failed.length > 0) {
      const msg = `${succeeded.length} processed, ${failed.length} failed.`;
      toast.success(msg);
      try { announce(msg, 'polite'); } catch (e) {}
    } else {
      const msg = 'Failed to process selected reservations.';
      toast.error(msg);
      try { announce(msg, 'assertive'); } catch (e) {}
    }
  };

  const retryFailed = async () => {
    if (!bulkResults.failed.length) return;
    setIsProcessingBulk(true);
    const ids = bulkResults.failed.map(f => f.id);
    setBulkProgress({ processed: 0, total: ids.length });

    const tasks: BulkTask[] = ids.map((id) => async () => {
      await onRequestApproval(id, actionType === 'approve', feedback || undefined, true);
      return { id, ok: true };
    });

    lastTasksRef.current = tasks;
    setLastItems(ids.map(id => ({ id, label: `Request ${id}` })));
    // Only show bulk progress dialog for multiple items
    if (ids.length > 1) {
      setShowBulkProgress(true);
    }

    const results = await bulkRunner.start(tasks, 4, (processed, total) => setBulkProgress({ processed, total }));

    const succeeded: string[] = [];
    const failed: { id: string; error?: unknown }[] = [];
    results.forEach((res: any, idx: number) => {
      const id = ids[idx];
      if (res?.status === 'fulfilled') succeeded.push(id);
      else failed.push({ id, error: res?.reason });
    });

    setBulkResults({ succeeded, failed });
    showBulkSummary(succeeded, failed);
    setIsProcessingBulk(false);
    setBulkProgress({ processed: 0, total: 0 });
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <div className="flex flex-col space-y-3 sm:space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Classroom Reservation Management</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Review and manage classroom reservation requests</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop: regular grid tabs (visible on sm+) */}
          <TabsList className="hidden sm:grid w-full grid-cols-4 h-11 md:h-12">
            <TabsTrigger value="pending" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden md:inline">Pending ({pendingRequests.length})</span>
              <span className="md:hidden">({pendingRequests.length})</span>
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden md:inline">Approved ({approvedRequests.length})</span>
              <span className="md:hidden">({approvedRequests.length})</span>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden md:inline">Rejected ({rejectedRequests.length})</span>
              <span className="md:hidden">({rejectedRequests.length})</span>
            </TabsTrigger>
            <TabsTrigger value="expired" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
              <span className="hidden md:inline">Expired ({expiredRequests.length})</span>
              <span className="md:hidden">({expiredRequests.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Mobile: scrollable tab pills */}
          <div className="sm:hidden mobile-tab-container">
            <TabsList className="mobile-tab-scroll bg-background/80 backdrop-blur-lg border rounded-lg">
              <TabsTrigger value="pending" className="mobile-tab-item flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="mobile-tab-item flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved ({approvedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="mobile-tab-item flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Rejected ({rejectedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="expired" className="mobile-tab-item flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                Expired ({expiredRequests.length})
              </TabsTrigger>
            </TabsList>
            <div className="tab-scroll-indicator" />
          </div>

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
              <ProcessingFieldset isProcessing={isProcessingBulk} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      aria-label="Select all pending requests"
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const newMap: Record<string, boolean> = {};
                        pendingRequests.forEach(r => { newMap[r.id] = checked; });
                        setSelectedIds(newMap);
                      }}
                      checked={pendingRequests.length > 0 && pendingRequests.every(r => selectedIds[r.id])}
                      className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                    />
                    <span className="text-sm">Select all ({pendingRequests.length})</span>
                  </div>

                  <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
                    <Button onClick={() => startBulkAction('approve')} disabled={selectedCount === 0 || isProcessingBulk} className="w-full xs:w-auto text-xs xs:text-sm">
                      {isProcessingBulk ? (
                        <span className="inline-flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {`Processing… (${bulkProgress.processed}/${bulkProgress.total})`}
                        </span>
                      ) : (
                        `Approve Selected (${selectedCount})`
                      )}
                    </Button>
                    <Button variant="destructive" onClick={() => startBulkAction('reject')} disabled={selectedCount === 0 || isProcessingBulk} className="w-full xs:w-auto text-xs xs:text-sm">
                      {isProcessingBulk ? (
                        <span className="inline-flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing…
                        </span>
                      ) : (
                        `Reject Selected (${selectedCount})`
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {pendingRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onApprove={() => handleAction(request, 'approve')}
                      onReject={() => handleAction(request, 'reject')}
                      checkConflicts={checkConflicts}
                      status="pending"
                      showSelect
                      selected={!!selectedIds[request.id]}
                      onToggleSelect={(checked: boolean) => toggleSelect(request.id, checked)}
                      disabled={isProcessingBulk}
                    />
                  ))}
                </div>
              </ProcessingFieldset>
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      aria-label="Select all approved requests"
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const newMap: Record<string, boolean> = {};
                        approvedRequests.forEach(r => { newMap[r.id] = checked; });
                        setApprovedSelectedIds(newMap);
                      }}
                      checked={approvedRequests.length > 0 && approvedRequests.every(r => approvedSelectedIds[r.id])}
                      className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                    />
                    <span className="text-sm">Select all ({approvedRequests.length})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="destructive" onClick={startBulkCancelApproved} disabled={approvedSelectedCount === 0 || isProcessingBulk}>
                      {isProcessingBulk ? 'Processing…' : `Cancel Selected (${approvedSelectedCount})`}
                    </Button>
                  </div>
                </div>

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
                      showSelect
                      selected={!!approvedSelectedIds[request.id]}
                      onToggleSelect={(checked: boolean) => toggleApprovedSelect(request.id, checked)}
                      disabled={isProcessingBulk}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="expired" className="mt-6">
            {expiredRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Expired Requests</h3>
                  <p className="text-gray-500 text-center max-w-md">
                    There are no expired pending requests.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {expiredRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    status="expired"
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

  <Dialog open={isDialogOpen} onOpenChange={(v) => { if (isProcessingBulk) return; setIsDialogOpen(v); }}>
    <DialogContent className="max-h-[95vh] sm:max-h-[85vh] flex flex-col p-2 xs:p-3 sm:p-6 w-[calc(100vw-16px)] xs:w-[calc(100vw-32px)] sm:w-auto sm:max-w-[700px] gap-2 sm:gap-4">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xs sm:text-xl flex items-center gap-2">
              {actionType === 'approve' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Approve Reservation
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Reject Reservation
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-[10px] sm:text-sm">
              {actionType === 'approve' 
                ? 'You are about to approve this classroom reservation request. The faculty member will be notified.'
                : 'You are about to reject this classroom reservation request. Please provide a clear reason for the faculty member.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <ProcessingFieldset isProcessing={isProcessingBulk}>
            {/* Show request details if single request */}
            {selectedRequest && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 xs:p-3 sm:p-4 space-y-1.5 xs:space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs xs:text-sm font-medium text-gray-900">Request Details</span>
                  <span className="text-xs text-gray-500">
                    {new Date(selectedRequest.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="text-xs xs:text-sm text-gray-700 space-y-0.5 xs:space-y-1">
                  <div className="flex items-center gap-1.5 xs:gap-2">
                    <Clock className="h-3 w-3 xs:h-4 xs:w-4 text-gray-500 flex-shrink-0" />
                    <span>{convertTo12Hour(selectedRequest.startTime)} - {convertTo12Hour(selectedRequest.endTime)}</span>
                  </div>
                  <div className="flex flex-col xs:flex-row xs:items-center gap-0.5 xs:gap-2">
                    <span className="font-medium text-xs xs:text-sm">Purpose:</span>
                    <span className="text-xs xs:text-sm break-words">{selectedRequest.purpose}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Show selected reservations list if bulk operation */}
            {!selectedRequest && (Object.values(selectedIds).filter(Boolean).length > 0 || Object.values(approvedSelectedIds).filter(Boolean).length > 0) && (() => {
              const currentIds = activeTab === 'approved' ? approvedSelectedIds : selectedIds;
              const selectedReservations = requests.filter(r => currentIds[r.id]);
              
              return (
                <div className="flex-shrink-0 max-h-[30vh] sm:max-h-[40vh] overflow-y-auto">
                <ScrollableBulkList
                  items={selectedReservations}
                  visibleCount={5}
                  maxScrollHeight="100%"
                  ariaLabel={`Selected reservations to ${actionType === 'approve' ? 'approve' : activeTab === 'approved' ? 'cancel' : 'reject'}`}
                  renderItem={(reservation: BookingRequest) => (
                    <div className="p-2 xs:p-3 border rounded-lg bg-white text-xs xs:text-sm hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-1.5 xs:gap-2">
                        <div className="space-y-0.5 xs:space-y-1 flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-xs xs:text-sm">{reservation.facultyName}</p>
                          <p className="text-gray-700 text-xs xs:text-sm">{reservation.classroomName}</p>
                          <p className="text-gray-600 text-[10px] xs:text-xs leading-tight">
                            {new Date(reservation.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                          <p className="text-gray-600 text-[10px] xs:text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            {convertTo12Hour(reservation.startTime)} - {convertTo12Hour(reservation.endTime)}
                          </p>
                          <p className="text-gray-500 text-[10px] xs:text-xs line-clamp-2 xs:truncate break-words" title={reservation.purpose}>
                            {reservation.purpose}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                />
                </div>
              );
            })()}
            
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              <Label htmlFor="feedback" className="flex-shrink-0 text-[10px] sm:text-sm">
                {actionType === 'approve' ? 'Feedback (Optional)' : activeTab === 'approved' ? 'Cancellation Reason (Required)' : 'Rejection Reason (Required)'}
              </Label>
              <Textarea
                id="feedback"
                placeholder={actionType === 'approve' 
                  ? 'Feedback (optional)'
                  : 'Reason for decision'}
                value={feedback}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.length <= 500) {
                    setFeedback(v);
                    setFeedbackError(null);
                  } else {
                    setFeedbackError('Reason must be 500 characters or less.');
                  }
                }}
                className="text-[10px] sm:text-sm flex-1 resize-none min-h-[60px]"
                maxLength={500}
                rows={2}
              />
              <div className="flex items-center justify-end mt-2">
                <p className="text-xs text-gray-500">{feedback.length}/500</p>
              </div>
              {feedbackError && <p className="text-sm text-destructive">{feedbackError}</p>}
            </div>
            </ProcessingFieldset>
          </div>
            <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row gap-2 justify-end">
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => {
                if (isProcessingBulk) return;
                setIsDialogOpen(false);
                setSelectedRequest(null);
                setFeedback('');
              }}
              disabled={isProcessingBulk}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleConfirm}
              disabled={isProcessingBulk || (actionType === 'reject' && (!feedback.trim() || !!feedbackError))}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {isProcessingBulk ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : actionType === 'approve' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Reservation
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Reservation
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        {/* Bulk results are now shown as a single Sonner toast summary via showBulkSummary() */}

        <BulkOperationLoader
          open={showBulkProgress}
          onOpenChange={setShowBulkProgress}
          items={lastItems}
          processed={bulkRunner.processed}
          total={bulkRunner.total}
          results={bulkRunner.results}
          running={bulkRunner.running}
          onCancel={() => bulkRunner.cancel()}
          title="Bulk Reservation Processing"
          operationType="Processing"
          successMessage="{count} reservation(s) processed successfully"
          failureMessage="{count} reservation(s) failed to process"
          showErrorDetails={true}
          preventCloseWhileRunning={true}
          onRetry={async () => {
            // Re-run failed items using bulkRunner
            const failedIds = bulkResults.failed.map(f => f.id);
            if (failedIds.length === 0) return;
            const fb = (feedback || '').trim();
            const tasks: BulkTask[] = failedIds.map((id) => async () => {
              await onRequestApproval(id, actionType === 'approve', fb || undefined, true);
              return { id, ok: true };
            });
            lastTasksRef.current = tasks;
            setLastItems(failedIds.map(id => ({ id, label: `Request ${id}` })));
            bulkRunner.retry();
            await bulkRunner.start(tasks, 4, (processed, total) => setBulkProgress({ processed, total }));
            const results = bulkRunner.results;
            const succeeded: string[] = [];
            const failed: { id: string; error?: unknown }[] = [];
            results.forEach((res: any, idx: number) => {
              const id = failedIds[idx];
              if (res?.status === 'fulfilled') succeeded.push(id);
              else failed.push({ id, error: res?.reason });
            });
            setBulkResults({ succeeded, failed });
            showBulkSummary(succeeded, failed);
          }}
        />
    </div>
  );
}
