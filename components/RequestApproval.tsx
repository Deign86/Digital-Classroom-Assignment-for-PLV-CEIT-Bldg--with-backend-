import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { readPreferredTab, writeStoredTab, writeTabToHash } from '../utils/tabPersistence';
import { CheckCircle, XCircle, Clock, Calendar, MapPin, User, AlertTriangle } from 'lucide-react';
import { convertTo12Hour, formatTimeRange, isPastBookingTime } from '../utils/timeUtils';
import type { BookingRequest } from '../App';
import RequestCard from './RequestCard';
import { toast } from 'sonner';
import { useAnnouncer } from './Announcer';

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

  // Throttled concurrency runner used by multiple handlers (bulk confirm + retry)
  const runWithConcurrency = async <T,>(
    tasks: Array<() => Promise<T>>,
    concurrency: number,
    onProgress?: (processed: number, total: number) => void
  ): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: any }>> => {
    const results: Array<any> = [];
    let index = 0;
    let processed = 0;
    const total = tasks.length;

    const workers: Promise<void>[] = new Array(Math.min(concurrency, tasks.length)).fill(Promise.resolve()).map(async () => {
      while (true) {
        const i = index++;
        if (i >= tasks.length) return;
        try {
          const value = await tasks[i]();
          results[i] = { status: 'fulfilled', value };
        } catch (err) {
          results[i] = { status: 'rejected', reason: err };
        } finally {
          processed += 1;
          if (onProgress) onProgress(processed, total);
        }
      }
    });

    await Promise.all(workers);
    return results;
  };

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

    // Use a throttled runner for bulk operations so UI stays responsive and we can show progress
    const runWithConcurrency = async <T,>(
      tasks: Array<() => Promise<T>>,
      concurrency: number,
      onProgress?: (processed: number, total: number) => void
    ) : Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: any }>> => {
      const results: Array<any> = [];
      let index = 0;
      let processed = 0;
      const total = tasks.length;

      const workers: Promise<void>[] = new Array(Math.min(concurrency, tasks.length)).fill(Promise.resolve()).map(async () => {
        while (true) {
          const i = index++;
          if (i >= tasks.length) return;
          try {
            const value = await tasks[i]();
            results[i] = { status: 'fulfilled', value };
          } catch (err) {
            results[i] = { status: 'rejected', reason: err };
          } finally {
            processed += 1;
            if (onProgress) onProgress(processed, total);
          }
        }
      });

      await Promise.all(workers);
      return results;
    };

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

      const results = await runWithConcurrency(tasks, 4, (processed, total) => setBulkProgress({ processed, total }));

      const succeeded: string[] = [];
      const failed: { id: string; error?: unknown }[] = [];

      results.forEach((res, idx) => {
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

    const tasks = ids.map((id) => async () => {
  await onRequestApproval(id, actionType === 'approve', feedback || undefined, true);
      return { id, ok: true };
    });

    const results = await runWithConcurrency(tasks, 4, (processed, total) => setBulkProgress({ processed, total }));

    const succeeded: string[] = [];
    const failed: { id: string; error?: unknown }[] = [];
    results.forEach((res, idx) => {
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
            <TabsTrigger value="expired" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Expired ({expiredRequests.length})
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
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

                  <div className="flex items-center gap-2">
                    <Button onClick={() => startBulkAction('approve')} disabled={selectedCount === 0 || isProcessingBulk}>
                      {isProcessingBulk ? `Processing… (${bulkProgress.processed}/${bulkProgress.total})` : `Approve Selected (${selectedCount})`}
                    </Button>
                    <Button variant="destructive" onClick={() => startBulkAction('reject')} disabled={selectedCount === 0 || isProcessingBulk}>
                      {isProcessingBulk ? 'Processing…' : `Reject Selected (${selectedCount})`}
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
                      onToggleSelect={(checked) => toggleSelect(request.id, checked)}
                      disabled={isProcessingBulk}
                    />
                  ))}
                </div>
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
                      onToggleSelect={(checked) => toggleApprovedSelect(request.id, checked)}
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
          <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Reservation' : 'Reject Reservation'}
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
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.length <= 500) {
                    setFeedback(v);
                    setFeedbackError(null);
                  } else {
                    setFeedbackError('Reason must be 500 characters or less.');
                  }
                }}
                className="min-h-[100px]"
                maxLength={500}
              />
              <div className="flex items-center justify-end mt-1">
                <p className="text-xs text-gray-500">{feedback.length}/500</p>
              </div>
              {feedbackError && <p className="text-xs text-red-600 mt-1">{feedbackError}</p>}
            </div>
          </div>
            <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                if (isProcessingBulk) return;
                setIsDialogOpen(false);
                setSelectedRequest(null);
                setFeedback('');
              }}
              disabled={isProcessingBulk}
            >
              {isProcessingBulk ? 'Processing…' : 'Cancel'}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessingBulk || (actionType === 'reject' && (!feedback.trim() || !!feedbackError))}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
                {actionType === 'approve' ? 'Approve Reservation' : 'Reject Reservation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk results are now shown as a single Sonner toast summary via showBulkSummary() */}
    </div>
  );
}
