import React, { useMemo, useState, useRef } from 'react';
import { logger } from '../lib/logger';
// react-router navigation removed for bulk results to avoid unexpected full-screen navigation
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './ui/dialog';
import { toast } from 'sonner';
import BulkOperationLoader from './BulkOperationLoader';
import useBulkRunner, { BulkTask } from '../hooks/useBulkRunner';
import { useAnnouncer } from './Announcer';
import ScrollableBulkList from './ui/ScrollableBulkList';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Building,
  Calendar,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import type { SignupRequest, SignupHistory } from '../App';
import ProcessingFieldset from './ui/ProcessingFieldset';

interface SignupApprovalProps {
  signupRequests?: SignupRequest[];
  signupHistory?: SignupHistory[];
  // added optional skipConfirm flag so bulk flows can perform destructive actions without per-item dialog
  onSignupApproval: (requestId: string, approved: boolean, feedback?: string, skipConfirm?: boolean) => Promise<void>;
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
  const { announce } = useAnnouncer();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [feedbackErrors, setFeedbackErrors] = useState<Record<string, string | null>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  // Per-request processing indicators to show loader on specific approve/reject actions
  // Use a Set so multiple per-item operations can run concurrently without stomping each other.
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ requestId: string; approved: boolean; request: SignupRequest | null }>({ requestId: '', approved: false, request: null });
  const [confirmFeedback, setConfirmFeedback] = useState('');
  const [confirmProcessing, setConfirmProcessing] = useState(false);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => ({ ...prev, [id]: checked }));
  };

  const clearSelection = () => setSelectedIds({});

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

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

  // Ensure each processed item appears individually and only once (de-duplicate by id)
  const processedRequests = (() => {
    const seen = new Set<string>();
    const result: Array<SignupRequest | SignupHistory> = [];
    for (const it of allProcessedItems) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        result.push(it);
      }
    }
    return result;
  })();

  // Open confirmation dialog before approving/rejecting
  const openConfirmDialog = (requestId: string, approved: boolean) => {
    const request = signupRequests.find(r => r.id === requestId);
    const existingFeedback = feedback[requestId] ?? '';
    
    if (!approved && !existingFeedback.trim()) {
      toast.error('Please provide a reason when rejecting a request.');
      return;
    }
    
    setConfirmAction({ requestId, approved, request: request || null });
    setConfirmFeedback(existingFeedback);
    setConfirmDialogOpen(true);
  };

  const handleApproval = async (requestId: string, approved: boolean) => {
    const feedbackText = (feedback[requestId] ?? '').trim();

    if (!approved && !feedbackText) {
      toast.error('Please provide a reason when rejecting a request.');
      return;
    }

    try {
      setProcessingIds(prev => {
        const s = new Set(prev);
        s.add(requestId);
        return s;
      });
      await onSignupApproval(requestId, approved, approved ? feedbackText || undefined : feedbackText);
      setFeedback((prev) => ({ ...prev, [requestId]: '' }));
    } catch (err) {
      logger.error('Signup approval error:', err);
      toast.error('Failed to process signup request');
    } finally {
      setProcessingIds(prev => {
        const s = new Set(prev);
        s.delete(requestId);
        return s;
      });
    }
  };

  const handleConfirmDialogConfirm = async () => {
    setConfirmProcessing(true);
    await handleApproval(confirmAction.requestId, confirmAction.approved);
    setConfirmProcessing(false);
    setConfirmDialogOpen(false);
    setConfirmAction({ requestId: '', approved: false, request: null });
    setConfirmFeedback('');
  };
  const showBulkSummary = (succeeded: string[], failed: { id: string; error?: unknown }[]) => {
    setBulkResults({ succeeded, failed });
    if (succeeded.length > 0 && failed.length === 0) {
      const msg = `${succeeded.length} request(s) processed successfully.`;
      toast.success(msg);
      try { announce(msg, 'polite'); } catch (e) {}
    } else if (succeeded.length > 0 && failed.length > 0) {
      const msg = `${succeeded.length} processed, ${failed.length} failed.`;
      toast.success(msg);
      try { announce(msg, 'polite'); } catch (e) {}
    } else {
      const msg = 'Failed to process selected requests.';
      toast.error(msg);
      try { announce(msg, 'assertive'); } catch (e) {}
    }
  };

  // Bulk runner setup for cancellable progress UI
  const bulkRunner = useBulkRunner();
  const lastTasksRef = useRef<BulkTask[] | null>(null);
  const [lastItems, setLastItems] = useState<{ id: string; label?: string }[]>([]);
  const [showBulkProgress, setShowBulkProgress] = useState(false);

  const startBulkApproval = async (approved: boolean) => {
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    if (ids.length === 0) return;

    setIsProcessingBulk(true);
    setBulkProgress({ processed: 0, total: ids.length });

    const tasks: BulkTask[] = ids.map(id => async () => {
      const feedbackText = (feedback[id] ?? '').trim();
      return onSignupApproval(id, approved, approved ? feedbackText || undefined : feedbackText, true);
    });

    // prepare items for dialog
    const itemsForDialog = ids.map(id => ({ id, label: `Signup ${id}` }));
    lastTasksRef.current = tasks;
    setLastItems(itemsForDialog);
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
    clearSelection();
  };

  // Bulk dialog state
  const [isBulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkActionApprove, setBulkActionApprove] = useState<boolean | null>(null);
  const [bulkFeedback, setBulkFeedback] = useState('');
  const [bulkFeedbackError, setBulkFeedbackError] = useState<string | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ succeeded: string[]; failed: { id: string; error?: unknown }[] }>({ succeeded: [], failed: [] });
  const [bulkProgress, setBulkProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });

  // Whether the confirm button should be enabled. For approvals feedback is optional;
  // for rejections feedback is required and must be non-empty and not exceed length limits.
  const canConfirmBulk = (() => {
    if (isProcessingBulk) return false;
    if (bulkActionApprove === null) return false;
    if (bulkActionApprove) return true;
    // rejecting: require non-empty feedback and no validation error
    return bulkFeedback.trim().length > 0 && !bulkFeedbackError;
  })();

  // local runner removed in favor of useBulkRunner

  const openBulkDialog = (approved: boolean) => {
    setBulkActionApprove(approved);
    // When approving, prefill with empty string; when rejecting we require feedback
    setBulkFeedback('');
    setBulkDialogOpen(true);
  };

  const confirmBulkAction = async () => {
    if (bulkActionApprove === null) return setBulkDialogOpen(false);
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    if (ids.length === 0) {
      setBulkDialogOpen(false);
      return;
    }

    // If rejecting, ensure there's feedback provided
    if (!bulkActionApprove && !bulkFeedback.trim()) {
      toast.error('Please provide feedback for rejected requests.');
      return;
    }

  // Execute bulk operations in parallel and summarize the results.
  // Keep the dialog open while processing and disable closing/actions.
  setIsProcessingBulk(true);

    // Build tasks
    const tasks = ids.map(id => async () => onSignupApproval(id, bulkActionApprove, bulkFeedback.trim() || undefined, true));

  // Use a concurrency of 4 to avoid throttling spikes
  setBulkProgress({ processed: 0, total: ids.length });
  // prepare items and run with shared bulk runner
  const itemsForDialog = ids.map(id => ({ id, label: `Signup ${id}` }));
  lastTasksRef.current = tasks;
  setLastItems(itemsForDialog);
  // Only show bulk progress dialog for multiple items
  if (ids.length > 1) {
    setShowBulkProgress(true);
  }
  const results = await bulkRunner.start(tasks, 4, (processed, total) => setBulkProgress({ processed, total }));

    const succeeded: string[] = [];
    const failed: { id: string; error?: unknown }[] = [];

    results.forEach((res, idx) => {
      const id = ids[idx];
      if (res?.status === 'fulfilled') {
        succeeded.push(id);
      } else {
        failed.push({ id, error: res?.reason });
      }
    });

  setBulkResults({ succeeded, failed });
  // show a single summary toast instead of opening the bulk results dialog
  if (succeeded.length > 0 && failed.length === 0) {
  const message = `Bulk ${bulkActionApprove ? 'approval' : 'rejection'} completed. ${succeeded.length} reservation(s) processed.`;
    toast.success(message);
    announce?.(message, 'polite');
    } else if (succeeded.length > 0 && failed.length > 0) {
      const message = `Bulk ${bulkActionApprove ? 'approval' : 'rejection'} completed. ${succeeded.length} reservation(s) succeeded, ${failed.length} failed.`;
    toast.success(message);
    announce?.(message, 'polite');
  } else if (succeeded.length === 0 && failed.length > 0) {
    const message = `Bulk ${bulkActionApprove ? 'approval' : 'rejection'} failed for all ${failed.length} items.`;
    toast.error(message);
    announce?.(message, 'assertive');
  }
  setIsProcessingBulk(false);
  setBulkProgress({ processed: 0, total: 0 });
  // Close the dialog after processing completes
  setBulkDialogOpen(false);

    clearSelection();
    // Announce summary for screen readers
    if (succeeded.length > 0 && failed.length === 0) {
      const message = `Bulk ${bulkActionApprove ? 'approval' : 'rejection'} completed. ${succeeded.length} reservation(s) processed.`;
      announce?.(message, 'polite');
    } else if (succeeded.length > 0 && failed.length > 0) {
      const message = `Bulk ${bulkActionApprove ? 'approval' : 'rejection'} completed. ${succeeded.length} succeeded, ${failed.length} failed.`;
      announce?.(message, 'polite');
    } else if (succeeded.length === 0 && failed.length > 0) {
      const message = `Bulk ${bulkActionApprove ? 'approval' : 'rejection'} failed for all ${failed.length} items.`;
      announce?.(message, 'assertive');
    }
  };

  const retryFailed = async () => {
    if (!bulkResults.failed.length) return;
    setIsProcessingBulk(true);

    const ids = bulkResults.failed.map(f => f.id);
    const tasks: BulkTask[] = ids.map(id => async () => onSignupApproval(id, bulkActionApprove ?? false, bulkFeedback.trim() || undefined, true));
    setBulkProgress({ processed: 0, total: ids.length });
    lastTasksRef.current = tasks;
    setLastItems(ids.map(id => ({ id, label: `Signup ${id}` })));
    // Only show bulk progress dialog for multiple items
    if (ids.length > 1) {
      setShowBulkProgress(true);
    }
    bulkRunner.retry();
    const results = await bulkRunner.start(tasks, 4, (processed, total) => setBulkProgress({ processed, total }));

    const succeeded: string[] = [];
    const failed: { id: string; error?: unknown }[] = [];
    results.forEach((res, idx) => {
      const id = ids[idx];
      if (res?.status === 'fulfilled') succeeded.push(id);
      else failed.push({ id, error: res?.reason });
    });

    setBulkResults({ succeeded, failed });
    // show summary
    if (succeeded.length > 0 && failed.length === 0) {
      toast.success(`${succeeded.length} reservation(s) processed successfully.`);
    } else if (succeeded.length > 0 && failed.length > 0) {
      toast.success(`${succeeded.length} reservation(s) processed. ${failed.length} failed.`);
    } else {
      toast.error('Failed to process selected requests.');
    }
    setIsProcessingBulk(false);
    setBulkProgress({ processed: 0, total: 0 });
  };

  // Scroll to a matching history entry (if present) or to the processed list.
  const highlightAndScroll = (el: HTMLElement | null) => {
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-indigo-400', 'bg-indigo-50');
      setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-400', 'bg-indigo-50'), 2500);
    } catch (e) {
      // ignore
    }
  };

  const viewInHistory = (failedId: string) => {
    const req = signupRequests.find(r => r.id === failedId);
    if (!req) {
      // fallback: scroll to processed list
      const listEl = document.getElementById('processed-requests');
      if (listEl) highlightAndScroll(listEl);
      toast.info('No matching signup request found in memory.');
      return;
    }
    // Scroll to processed list to show the history
    // Note: Full-page history routes are not implemented, using in-page navigation instead
    const listEl = document.getElementById('processed-requests');
    if (listEl) {
      highlightAndScroll(listEl);
      toast.info('No matching history entry found yet. Check Recent Processed Requests.');
    } else {
      toast.info('History not available in this view.');
    }
  };

  // No-op: route-based focusing is handled by the dedicated SignupHistoryPage route

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
        <ProcessingFieldset isProcessing={isProcessingBulk} className="space-y-4">
          
          <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                type="checkbox"
                aria-label="Select all signups"
                onChange={(e) => {
                  const checked = e.target.checked;
                  const map: Record<string, boolean> = {};
                  pendingRequests.forEach(r => { map[r.id] = checked; });
                  setSelectedIds(map);
                }}
                checked={pendingRequests.length > 0 && pendingRequests.every(r => selectedIds[r.id])}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 flex-shrink-0"
              />
              <h3 className="text-sm sm:text-lg font-semibold break-words min-w-0">Pending Faculty Signup Requests</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Badge variant="outline" className="text-orange-600 border-orange-200 text-[10px] sm:text-xs self-start sm:self-center">
                {pendingRequests.length} pending
              </Badge>
              <Button onClick={() => openBulkDialog(true)} disabled={selectedCount === 0 || isProcessingBulk} className="w-full sm:w-auto text-xs sm:text-sm">
                {isProcessingBulk ? 'Processing…' : `Approve Selected (${selectedCount})`}
              </Button>
              <Button variant="destructive" onClick={() => openBulkDialog(false)} disabled={selectedCount === 0 || isProcessingBulk} className="w-full sm:w-auto text-xs sm:text-sm">
                {isProcessingBulk ? 'Processing…' : `Reject Selected (${selectedCount})`}
              </Button>
            </div>
            {isProcessingBulk && bulkProgress.total > 0 && (
              <div className="w-full mt-2">
                <div className="text-xs text-gray-600 mb-1">Processing {bulkProgress.processed} of {bulkProgress.total}</div>
                <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                  <div className="bg-indigo-600 h-2" style={{ width: `${Math.round((bulkProgress.processed / bulkProgress.total) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <input type="checkbox" aria-label={`Select signup ${request.id}`} checked={!!selectedIds[request.id]} onChange={(e) => toggleSelect(request.id, e.target.checked)} className="h-4 w-4 text-indigo-600 rounded border-gray-300 flex-shrink-0" />
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 flex-shrink-0" />
                      <CardTitle className="text-sm sm:text-lg break-words min-w-0">{request.name}</CardTitle>
                    </div>
                    <div className="self-start sm:self-center">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                  <CardDescription className="space-y-1 mt-2">
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="break-words min-w-0">{request.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                      <Building className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="break-words min-w-0">{request.department}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="break-words min-w-0">Requested: {formatDate(request.requestDate)}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-4 text-[10px] sm:text-sm text-blue-800">
                    <span className="break-words">The faculty member has already created credentials. Approving this request will activate the account; rejecting it keeps the account inactive.</span>
                  </div>

                  <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                    <Label htmlFor={`feedback-${request.id}`} className="mb-2 block text-xs sm:text-sm">Admin Feedback (optional)</Label>
                    <Textarea
                      id={`feedback-${request.id}`}
                      placeholder="Add comments or notes for this request..."
                      value={feedback[request.id] ?? ''}
                      onChange={(event) => {
                        const v = event.target.value;
                        setFeedback((prev) => ({ ...prev, [request.id]: v }));
                        setFeedbackErrors((prev) => ({ ...prev, [request.id]: v.length > 500 ? 'Feedback must be 500 characters or less.' : null }));
                      }}
                      rows={3}
                      maxLength={500}
                      className="text-xs sm:text-sm"
                    />
                    <div className="flex items-center justify-end mt-2">
                      <p className="text-[10px] sm:text-xs text-gray-500">{(feedback[request.id] ?? '').length}/500</p>
                    </div>
                    {feedbackErrors[request.id] && <p className="text-xs sm:text-sm text-destructive mt-1">{feedbackErrors[request.id]}</p>}
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 break-words">Feedback is required when rejecting a request and optional when approving.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => openConfirmDialog(request.id, true)}
                      className="flex-1 w-full text-xs sm:text-sm"
                      disabled={processingIds.has(request.id)}
                      aria-busy={processingIds.has(request.id)}
                    >
                      {processingIds.has(request.id) ? (
                        <>
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin flex-shrink-0" /> <span className="break-words">Approving…</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" /> <span className="break-words">Approve</span>
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => openConfirmDialog(request.id, false)}
                      variant="destructive"
                      className="flex-1 w-full text-xs sm:text-sm"
                      disabled={processingIds.has(request.id)}
                      aria-busy={processingIds.has(request.id)}
                    >
                      {processingIds.has(request.id) ? (
                        <>
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin flex-shrink-0" /> <span className="break-words">Rejecting…</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" /> <span className="break-words">Reject</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ProcessingFieldset>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Signup Requests</h3>
            <p className="text-gray-600">All faculty signup requests have been processed.</p>
          </CardContent>
        </Card>
      )}

      {/* Bulk action dialog for collect admin feedback when rejecting */}
      <Dialog open={isBulkDialogOpen} onOpenChange={(v) => { if (isProcessingBulk) return; setBulkDialogOpen(v); }}>
        {isBulkDialogOpen && (
          <DialogContent className="max-h-[95vh] sm:max-h-[85vh] flex flex-col p-3 sm:p-6 w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] sm:max-w-[700px] gap-2 sm:gap-4">
            <ProcessingFieldset isProcessing={isProcessingBulk} className="flex flex-col flex-1 min-h-0">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-xs sm:text-lg">{bulkActionApprove ? 'Approve Selected' : 'Reject Selected'}</DialogTitle>
                <DialogDescription className="text-[10px] sm:text-sm">
                  {bulkActionApprove
                    ? 'Optionally add admin feedback to apply to all selected approvals.'
                    : 'Provide a reason for rejecting the selected requests. This feedback will be sent to the users.'}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-shrink-0 max-h-[30vh] sm:max-h-[40vh] overflow-y-auto">
                <ScrollableBulkList
                  items={(signupRequests || []).filter(req => selectedIds[req.id])}
                  visibleCount={5}
                  maxScrollHeight="100%"
                  ariaLabel={`Selected signup requests to ${bulkActionApprove ? 'approve' : 'reject'}`}
                  renderItem={(signup: SignupRequest) => (
                    <div className="p-2 sm:p-3 border rounded-lg bg-white text-xs hover:bg-gray-50 transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900 text-xs sm:text-sm break-words">{signup.name}</p>
                        <p className="text-gray-600 text-[10px] sm:text-xs flex items-center gap-1">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="break-words min-w-0">{signup.email}</span>
                        </p>
                        <p className="text-gray-600 text-[10px] sm:text-xs flex items-center gap-1">
                          <Building className="h-3 w-3 flex-shrink-0" />
                          <span className="break-words min-w-0">{signup.department}</span>
                        </p>
                        <p className="text-gray-500 text-[10px] sm:text-xs flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          {new Date(signup.requestDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                />
              </div>

              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <Label htmlFor="bulk-feedback" className="flex-shrink-0 text-[10px] sm:text-sm">
                  Feedback {bulkActionApprove ? '(optional)' : '*'}
                </Label>
                <Textarea
                  id="bulk-feedback"
                  rows={2}
                  value={bulkFeedback}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBulkFeedback(v);
                    setBulkFeedbackError(v.length > 500 ? 'Feedback must be 500 characters or less.' : null);
                  }}
                  placeholder={bulkActionApprove ? 'Optional comments' : 'Reason for rejection'}
                  className="text-[10px] sm:text-sm flex-1 resize-none min-h-[60px]"
                  maxLength={500}
                />
                {/* Keep a compact live character counter (per request) */}
                <div className="flex items-center justify-end mt-2">
                  <p className="text-xs text-gray-500">{bulkFeedback.length}/500</p>
                </div>
                {bulkFeedbackError && <p className="text-sm text-destructive mt-1">{bulkFeedbackError}</p>}
              </div>

              <DialogFooter className="flex-shrink-0 flex flex-col-reverse sm:flex-row gap-2">
                <Button className="w-full sm:w-auto" variant="secondary" onClick={() => { if (isProcessingBulk) return; setBulkDialogOpen(false); }} disabled={isProcessingBulk}>Cancel</Button>
                <Button className="w-full sm:w-auto" onClick={confirmBulkAction} disabled={!canConfirmBulk}>
                  {isProcessingBulk ? 'Processing…' : (bulkActionApprove ? 'Approve Selected' : 'Reject Selected')}
                </Button>
              </DialogFooter>
              {!isProcessingBulk && <DialogClose />}
            </ProcessingFieldset>
          </DialogContent>
        )}
      </Dialog>

      {/* Bulk results are summarized via Sonner toasts; detailed dialog removed to avoid full-screen navigation */}

      {processedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Processed Requests</h3>
          <div id="processed-requests" className="grid gap-4">
            {processedRequests.slice(0, 5).map((item) => {
              const isHistory = isHistoryItem(item);
              const resolvedDate = isHistory ? item.resolvedAt : item.resolvedAt;
              
              return (
                <Card key={item.id} id={isHistory ? `history-item-${item.id}` : undefined} className="border-l-4 border-l-gray-300">
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

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[700px] p-3 sm:p-6 w-[calc(100vw-32px)] gap-2 sm:gap-4">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base break-words">
              {confirmAction.approved ? 'Approve Faculty Account' : 'Reject Faculty Account'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm break-words">
              {confirmAction.approved 
                ? `Are you sure you want to approve the faculty account for ${confirmAction.request?.name || 'this user'}? This will activate their account and grant them access to the system.`
                : `Are you sure you want to reject the faculty account request for ${confirmAction.request?.name || 'this user'}? This will keep their account inactive.`
              }
            </DialogDescription>
          </DialogHeader>
          
          {confirmAction.request && (
            <div className="space-y-2 sm:space-y-3 py-3 sm:py-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-4 space-y-2">
                <div className="flex items-center space-x-2 text-xs sm:text-sm">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                  <span className="font-medium break-words min-w-0">{confirmAction.request.name}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="break-words min-w-0">{confirmAction.request.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <Building className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="break-words min-w-0">{confirmAction.request.department}</span>
                </div>
              </div>
              
              {confirmFeedback && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                  <p className="text-xs sm:text-sm font-medium text-blue-900 mb-1">Admin Feedback:</p>
                  <p className="text-xs sm:text-sm text-blue-800 break-words">{confirmFeedback}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setConfirmAction({ requestId: '', approved: false, request: null });
                setConfirmFeedback('');
              }}
              disabled={confirmProcessing}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction.approved ? 'default' : 'destructive'}
              onClick={handleConfirmDialogConfirm}
              disabled={confirmProcessing}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              {confirmProcessing ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin flex-shrink-0" />
                  <span className="break-words">Processing...</span>
                </>
              ) : confirmAction.approved ? (
                <>
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" /> <span className="break-words">Confirm Approval</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" /> <span className="break-words">Confirm Rejection</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkOperationLoader
        open={showBulkProgress}
        onOpenChange={setShowBulkProgress}
        items={lastItems}
        processed={bulkRunner.processed}
        total={bulkRunner.total}
        results={bulkRunner.results}
        running={bulkRunner.running}
        onCancel={() => bulkRunner.cancel()}
        title="Bulk Signup Processing"
        operationType="Processing"
        successMessage="{count} signup(s) processed successfully"
        failureMessage="{count} signup(s) failed to process"
        showErrorDetails={true}
        preventCloseWhileRunning={true}
        onRetry={async () => {
          const failedIds = bulkResults.failed.map(f => f.id);
          if (failedIds.length === 0) return;
          const tasks: BulkTask[] = failedIds.map(id => async () => onSignupApproval(id, bulkActionApprove ?? false, bulkFeedback.trim() || undefined, true));
          lastTasksRef.current = tasks;
          setLastItems(failedIds.map(id => ({ id, label: `Signup ${id}` })));
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