import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

/**
 * Universal Bulk Operation Loader
 * 
 * A reusable, accessible modal component for displaying progress and results
 * of bulk operations across the entire application (classroom CRUD, user management,
 * reservation approvals, push notifications, schedule actions, etc.)
 * 
 * Features:
 * - Real-time progress tracking with visual progress bar
 * - Per-item status display (pending, processing, success, failed, cancelled)
 * - Configurable title, description, and status messages
 * - Retry failed items functionality
 * - Cancellable operations
 * - WCAG compliant with ARIA labels and focus management
 * - Mobile-responsive with scrollable results list
 * - Focus trap to prevent navigation outside modal during operations
 */

export type BulkItemStatus = 'pending' | 'processing' | 'fulfilled' | 'rejected' | 'cancelled';

export interface BulkOperationItem {
  /** Unique identifier for the item */
  id: string;
  /** Display label (falls back to id if not provided) */
  label?: string;
  /** Additional metadata for custom rendering */
  metadata?: Record<string, any>;
}

export interface BulkOperationResult {
  /** Current status of the item */
  status: BulkItemStatus;
  /** Success value (if fulfilled) */
  value?: any;
  /** Error reason (if rejected) */
  reason?: any;
}

export interface BulkOperationLoaderProps {
  /** Controls dialog visibility */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Items being processed */
  items: BulkOperationItem[];
  /** Number of items processed so far */
  processed: number;
  /** Total number of items */
  total: number;
  /** Results for each item (aligned with items array by index) */
  results: BulkOperationResult[];
  /** Whether operation is currently running */
  running: boolean;
  /** Optional callback to cancel ongoing operation */
  onCancel?: () => void;
  /** Optional callback to retry failed items */
  onRetry?: () => void;
  /** Optional callback when operation completes (success or failure) */
  onComplete?: (results: BulkOperationResult[]) => void;
  /** Optional custom title (defaults to "Bulk Operation Progress") */
  title?: string;
  /** Optional custom description */
  description?: string;
  /** Optional operation type label (e.g., "Deleting", "Approving", "Processing") */
  operationType?: string;
  /** Optional success message template (use {count} for succeeded count) */
  successMessage?: string;
  /** Optional failure message template (use {count} for failed count) */
  failureMessage?: string;
  /** Optional: show detailed error messages in results list */
  showErrorDetails?: boolean;
  /** Optional: disable closing modal while operation is running */
  preventCloseWhileRunning?: boolean;
  /** Optional: custom status labels for different states */
  statusLabels?: {
    pending?: string;
    processing?: string;
    fulfilled?: string;
    rejected?: string;
    cancelled?: string;
  };
  /** Optional: custom icons for different states */
  customIcons?: {
    pending?: React.ReactNode;
    processing?: React.ReactNode;
    fulfilled?: React.ReactNode;
    rejected?: React.ReactNode;
    cancelled?: React.ReactNode;
  };
}

export default function BulkOperationLoader({
  open,
  onOpenChange,
  items,
  processed,
  total,
  results,
  running,
  onCancel,
  onRetry,
  onComplete,
  title = 'Bulk Operation Progress',
  description,
  operationType = 'Processing',
  successMessage,
  failureMessage,
  showErrorDetails = false,
  preventCloseWhileRunning = false,
  statusLabels = {},
  customIcons = {},
}: BulkOperationLoaderProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousRunningRef = useRef(running);

  // Count results by status
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const cancelled = results.filter(r => r.status === 'cancelled').length;
  const pending = results.filter(r => r.status === 'pending').length;
  const processing = results.filter(r => r.status === 'processing').length;

  // Calculate progress percentage
  const progressPercent = total === 0 ? 0 : Math.round((processed / total) * 100);

  // Determine if operation completed (was running, now stopped)
  useEffect(() => {
    if (previousRunningRef.current && !running && onComplete) {
      onComplete(results);
    }
    previousRunningRef.current = running;
  }, [running, results, onComplete]);

  // Focus trap: keep focus within modal while open
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventCloseWhileRunning && !running) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, running, preventCloseWhileRunning, onOpenChange]);

  // Auto-announce progress for screen readers
  const ariaLiveMessage = running
    ? `${operationType} ${processed} of ${total} items. ${succeeded} succeeded, ${failed} failed.`
    : `Operation complete. ${succeeded} succeeded, ${failed} failed.`;

  const handleCloseAttempt = () => {
    if (preventCloseWhileRunning && running) {
      // Optionally show a toast or warning
      return;
    }
    onOpenChange(false);
  };

  // Default status labels
  const defaultLabels = {
    pending: 'Pending',
    processing: 'Processing',
    fulfilled: 'Success',
    rejected: 'Failed',
    cancelled: 'Cancelled',
    ...statusLabels,
  };

  // Default icons for each status
  const getStatusIcon = (status: BulkItemStatus) => {
    if (customIcons[status]) return customIcons[status];

    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
      case 'fulfilled':
        return <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-500" aria-hidden="true" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />;
    }
  };

  // Status badge variant
  const getStatusBadgeVariant = (status: BulkItemStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'fulfilled':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      case 'processing':
        return 'default';
      default:
        return 'outline';
    }
  };

  // Generate dynamic description
  const dynamicDescription = description || (running
    ? `${operationType} ${processed}/${total} item(s). This may take a few moments.`
    : `Operation complete. ${succeeded} succeeded, ${failed} failed.`);

  return (
    <Dialog open={open} onOpenChange={handleCloseAttempt}>
      <DialogContent
        ref={dialogRef}
        className="sm:max-w-2xl p-6 max-h-[90vh] flex flex-col"
        aria-describedby="bulk-operation-description"
        aria-live="polite"
        aria-atomic="false"
      >
        <DialogHeader>
          <DialogTitle id="bulk-operation-title">{title}</DialogTitle>
          <DialogDescription id="bulk-operation-description">
            {dynamicDescription}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="my-4" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`Operation progress: ${progressPercent}%`}>
          <div className="w-full bg-gray-200 rounded h-2.5 overflow-hidden">
            <div
              className="h-2.5 bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-1 text-center" aria-live="polite">
            {progressPercent}% Complete ({processed}/{total})
          </div>
        </div>

        {/* Results List */}
        <div
          className="space-y-2 max-h-64 overflow-y-auto border rounded p-2 bg-gray-50"
          role="log"
          aria-label="Operation results"
          aria-live="polite"
          aria-relevant="additions"
        >
          {items.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-4">No items to process</div>
          ) : (
            items.map((item, idx) => {
              const result = results[idx];
              const status = result?.status ?? 'pending';
              const itemLabel = item.label || item.id;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 px-3 border-b last:border-b-0 bg-white rounded"
                  role="listitem"
                  aria-label={`${itemLabel}: ${defaultLabels[status]}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="flex-shrink-0">{getStatusIcon(status)}</span>
                    <span className="truncate text-sm font-medium" title={itemLabel}>
                      {itemLabel}
                    </span>
                  </div>
                  <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                    <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
                      {defaultLabels[status]}
                    </Badge>
                  </div>
                  {showErrorDetails && status === 'rejected' && result.reason && (
                    <div className="ml-2 text-xs text-red-600 truncate max-w-xs" title={String(result.reason)}>
                      {String(result.reason)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Summary Statistics */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600 py-2 border-t" aria-live="polite">
          <div className="flex items-center gap-4">
            {succeeded > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                <strong>{succeeded}</strong> succeeded
              </span>
            )}
            {failed > 0 && (
              <span className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
                <strong>{failed}</strong> failed
              </span>
            )}
            {cancelled > 0 && (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-gray-500" aria-hidden="true" />
                <strong>{cancelled}</strong> cancelled
              </span>
            )}
          </div>
        </div>

        {/* Success/Failure Messages */}
        {!running && (succeeded > 0 || failed > 0) && (
          <div className="space-y-2">
            {successMessage && succeeded > 0 && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2" role="alert">
                {successMessage.replace('{count}', String(succeeded))}
              </div>
            )}
            {failureMessage && failed > 0 && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2" role="alert">
                {failureMessage.replace('{count}', String(failed))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2 sm:gap-4 pt-4">
          <div className="w-full sm:w-auto" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onRetry && !running && failed > 0 && (
              <Button variant="outline" onClick={onRetry} className="flex-1 sm:flex-initial" aria-label="Retry failed items">
                Retry Failed ({failed})
              </Button>
            )}
            {onCancel && running && (
              <Button variant="destructive" onClick={onCancel} className="flex-1 sm:flex-initial" aria-label="Cancel operation">
                Cancel
              </Button>
            )}
            <Button
              onClick={handleCloseAttempt}
              className="flex-1 sm:flex-initial"
              disabled={preventCloseWhileRunning && running}
              aria-label={running ? 'Close (available after completion)' : 'Close'}
            >
              {running ? 'Close' : 'Done'}
            </Button>
          </div>
        </DialogFooter>

        {/* Screen reader live region */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {ariaLiveMessage}
        </div>
      </DialogContent>
    </Dialog>
  );
}
