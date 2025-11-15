import React, { useState, useEffect } from 'react';
import { logger } from '../lib/logger';
import { useAnnouncer } from './Announcer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { CheckCircle, XCircle, Clock, Calendar, MapPin, User, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { convertTo12Hour, formatTimeRange, isPastBookingTime } from '../utils/timeUtils';
import type { BookingRequest } from '../App';
import ProcessingFieldset from './ui/ProcessingFieldset';

export default function RequestCard({
  request,
  onApprove,
  onReject,
  onCancelApproved,
  checkConflicts,
  status,
  // New props for selection
  showSelect,
  selected,
  onToggleSelect,
  disabled,
}: {
  request: BookingRequest;
  onApprove?: () => void;
  onReject?: () => void;
  onCancelApproved?: (requestId: string, reason: string) => void;
  checkConflicts?: (classroomId: string, date: string, startTime: string, endTime: string, checkPastTime?: boolean, excludeRequestId?: string) => boolean | Promise<boolean>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  showSelect?: boolean;
  selected?: boolean;
  onToggleSelect?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const [hasConflict, setHasConflict] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const { announce } = useAnnouncer();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const checkForConflicts = async () => {
      if (typeof checkConflicts !== 'function') return;
      try {
        const result = checkConflicts(
          request.classroomId,
          request.date,
          request.startTime,
          request.endTime,
          false,
          request.id
        );
        if (result instanceof Promise) {
          const conflict = await result;
          setHasConflict(conflict);
        } else {
          setHasConflict(result);
        }
      } catch (error) {
        logger.error('Error checking conflicts:', error);
        setHasConflict(true);
      }
    };

    if (status === 'pending' && typeof checkConflicts === 'function') {
      checkForConflicts();
    }
  }, [request, checkConflicts, status]);

  const isServerExpired = request.status === 'expired';
  const isExpired = isServerExpired || (status === 'pending' && isPastBookingTime(request.date, convertTo12Hour(request.startTime)));
  // For approved bookings, determine if the reservation has already started or passed.
  // The backend already rejects cancellations for already-started/past bookings, so reflect that in the UI.
  const isLapsedBooking = isServerExpired || isPastBookingTime(request.date, convertTo12Hour(request.startTime));

  const borderColor = status === 'pending'
    ? (hasConflict ? 'border-l-red-500' : 'border-l-orange-500')
    : status === 'approved'
      ? 'border-l-green-500'
      : status === 'rejected'
        ? 'border-l-red-500'
        : 'border-l-gray-400';

  return (
    <Card className={`border-l-4 ${borderColor} transition-shadow hover:shadow-md`}>
      <CardHeader className="pb-2 xs:pb-3 px-3 xs:px-6 pt-3 xs:pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 xs:gap-3 flex-1 min-w-0">
            {showSelect && (
              <div className="mt-0.5 xs:mt-1 flex-shrink-0">
                <input
                  type="checkbox"
                  aria-label={`Select request ${request.id}`}
                  checked={!!selected}
                  onChange={(e) => onToggleSelect?.(e.target.checked)}
                  disabled={!!disabled}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                />
              </div>
            )}
            <div className="space-y-0.5 xs:space-y-1 flex-1 min-w-0">
              <CardTitle className="text-sm xs:text-base sm:text-lg leading-tight break-words">{request.facultyName}</CardTitle>
              <CardDescription className="text-xs xs:text-sm truncate">Request ID: {request.id.slice(0, 8)}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isExpired ? (
              <Badge variant="destructive" className="text-[10px] xs:text-xs px-1.5 xs:px-2 py-0.5">Expired</Badge>
            ) : (
              <Badge variant={
                status === 'pending' ? 'secondary' :
                status === 'approved' ? 'default' :
                status === 'rejected' ? 'destructive' :
                'secondary'
              } className="text-[10px] xs:text-xs px-1.5 xs:px-2 py-0.5">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 xs:space-y-3 sm:space-y-4 px-3 xs:px-6 pb-3 xs:pb-6">
        {hasConflict && status === 'pending' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 xs:p-3 flex items-start gap-1.5 xs:gap-2">
            <AlertTriangle className="h-4 w-4 xs:h-5 xs:w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs xs:text-sm font-semibold text-red-900 leading-tight">Scheduling Conflict</p>
              <p className="text-[10px] xs:text-xs text-red-700 mt-0.5 xs:mt-1 leading-tight">
                This time slot conflicts with an existing reservation.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2 xs:space-y-2.5 sm:space-y-3">
          <div className="flex items-center gap-2 xs:gap-3 text-xs xs:text-sm">
            <Calendar className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-gray-500 flex-shrink-0" />
            <span className="font-medium text-gray-900 leading-tight break-words">
              {new Date(request.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>

          <div className="flex items-center gap-2 xs:gap-3 text-xs xs:text-sm">
            <Clock className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-gray-500 flex-shrink-0" />
            <span className="text-gray-700 leading-tight">
              {formatTimeRange(convertTo12Hour(request.startTime), convertTo12Hour(request.endTime))}
            </span>
          </div>

          <div className="flex items-center gap-2 xs:gap-3 text-xs xs:text-sm">
            <MapPin className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-gray-500 flex-shrink-0" />
            <span className="text-gray-700 leading-tight break-words">{request.classroomName}</span>
          </div>

          <div className="flex items-start gap-2 xs:gap-3 text-xs xs:text-sm">
            <User className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-gray-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 leading-tight">Purpose:</p>
              <p className="text-gray-700 mt-0.5 xs:mt-1 leading-tight break-words">{request.purpose}</p>
            </div>
          </div>
        </div>

        {request.adminFeedback && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 xs:p-3">
            <p className="text-[10px] xs:text-xs font-semibold text-gray-900 mb-0.5 xs:mb-1 leading-tight">Admin Feedback:</p>
            <p className="text-xs xs:text-sm text-gray-700 leading-tight break-words">{request.adminFeedback}</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 xs:pt-3 border-t">
            {!isExpired ? (
              // If there's a conflict, show a tooltip explaining why Approve is disabled
              hasConflict ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-1">
                        <Button
                          onClick={() => {
                            try { announce('Approve is disabled due to a scheduling conflict.', 'polite'); } catch (e) {}
                            onApprove?.();
                          }}
                          disabled={true || !!disabled}
                          aria-disabled={true}
                          aria-label="Approve (disabled due to scheduling conflict)"
                          className="w-full text-[11px] xs:text-xs sm:text-sm h-8 xs:h-9 sm:h-10"
                        >
                          <CheckCircle className="h-3.5 w-3.5 xs:h-4 xs:w-4 mr-1.5 xs:mr-2" />
                          Approve
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">There is a scheduling conflict with this time slot; approve is disabled until the conflict is resolved.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  onClick={() => {
                    try { announce('Approving request', 'polite'); } catch (e) {}
                    onApprove?.();
                  }}
                  disabled={!!disabled}
                  className="flex-1 w-full text-[11px] xs:text-xs sm:text-sm h-8 xs:h-9 sm:h-10"
                  aria-label="Approve request"
                >
                  <CheckCircle className="h-3.5 w-3.5 xs:h-4 xs:w-4 mr-1.5 xs:mr-2" />
                  Approve
                </Button>
              )
            ) : (
              // When expired: remove actionable buttons entirely and provide accessible status info
              <div className="flex-1">
                <p className="text-xs xs:text-sm text-muted-foreground leading-tight">Expired — cannot be approved or rejected.</p>
                <span className="sr-only" role="status" aria-live="polite">This request has expired and cannot be approved or rejected.</span>
              </div>
            )}

            {!isExpired ? (
              <Button
                onClick={() => {
                  try { announce('Rejecting request', 'polite'); } catch (e) {}
                  onReject?.();
                }}
                variant="destructive"
                className="flex-1 w-full text-[11px] xs:text-xs sm:text-sm h-8 xs:h-9 sm:h-10"
                aria-label="Reject request"
                disabled={!!disabled}
              >
                <XCircle className="h-3.5 w-3.5 xs:h-4 xs:w-4 mr-1.5 xs:mr-2" />
                Reject
              </Button>
            ) : (
              // nothing (no Reject button for expired items)
              <div />
            )}
          </div>
        )}

        {status === 'approved' && onCancelApproved && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 xs:pt-3 border-t">
            {/* If booking has already started or is expired, disable cancel in UI to match backend behavior */}
            {!isLapsedBooking ? (
              <AlertDialog open={isDialogOpen} onOpenChange={(v) => { if (isCancelling) return; setIsDialogOpen(v); }}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full text-[11px] xs:text-xs sm:text-sm h-8 xs:h-9 sm:h-10"
                    disabled={!!disabled}
                  >
                    <XCircle className="h-3.5 w-3.5 xs:h-4 xs:w-4 mr-1.5 xs:mr-2" />
                    Cancel Reservation
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="cancel-reservation-dialog max-h-[80vh] overflow-y-auto p-2 sm:p-6 w-[calc(100vw-8px)] max-w-[calc(100vw-8px)] sm:w-[425px] sm:max-w-[425px] gap-2 sm:gap-4 m-1 sm:mx-auto box-border" style={{ width: 'calc(100vw - 8px)', maxWidth: 'calc(100vw - 8px)' }}>
                  <ProcessingFieldset isProcessing={isCancelling}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this approved reservation? This action cannot be undone.
                      The faculty member will need to submit a new request if they need this classroom again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="mt-4 w-full">
                    <Label className="block">Reason (required)</Label>
                    <div className="mt-2">
                      <Textarea
                        id={`cancel-reason-${request.id}`}
                        aria-label="Cancellation reason"
                        value={cancelReason}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.length <= 500) {
                            setCancelReason(val);
                            setCancelError(null);
                          } else {
                            setCancelError('Reason must be 500 characters or less.');
                          }
                        }}
                        placeholder="Explain why this reservation is being cancelled (this will be sent to the faculty member)"
                        maxLength={500}
                        rows={4}
                        className="w-full mt-0"
                        disabled={isCancelling}
                      />
                    </div>
                    <div className="flex items-center justify-end mt-1">
                      <p className="text-xs text-gray-500">{cancelReason.length}/500</p>
                    </div>
                    {cancelError && <p role="alert" className="text-sm text-destructive mt-1">{cancelError}</p>}
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isCancelling} onClick={() => { if (isCancelling) return; setIsDialogOpen(false); setCancelReason(''); setCancelError(null); }}>Keep Reservation</AlertDialogCancel>
                    <Button
                      disabled={isCancelling || cancelReason.trim().length === 0}
                      onClick={async () => {
                        const reason = cancelReason.trim();
                        if (!reason) {
                          try { announce('Please provide a reason for the cancellation.', 'assertive'); } catch (e) { }
                          setCancelError('Please provide a reason for the cancellation.');
                          return;
                        }
                        if (reason.length > 500) {
                          setCancelError('Reason must be 500 characters or less.');
                          return;
                        }

                        try {
                          setIsCancelling(true);
                          // await parent handler; parent is responsible for showing success toasts where appropriate
                          await Promise.resolve(onCancelApproved(request.id, reason));
                          setIsDialogOpen(false);
                          setCancelReason('');
                          setCancelError(null);
                          try { announce('Reservation cancelled', 'polite'); } catch (e) { }
                        } catch (err: any) {
                          logger.error('Failed to cancel reservation', err);
                          const msg = err?.message || 'Failed to cancel reservation. Please try again.';
                          setCancelError(msg);
                          toast.error(msg);
                        } finally {
                          setIsCancelling(false);
                        }
                      }}
                      variant="destructive"
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          CancellingΓÇª
                        </>
                      ) : 'Cancel Reservation'}
                    </Button>
                  </AlertDialogFooter>
                </ProcessingFieldset>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              // Hide the Cancel button entirely for lapsed bookings to match backend enforcement.
              // Keep an sr-only message for screen reader users so the state remains accessible.
              <div className="flex-1">
                <p className="sr-only" aria-hidden={false}>This reservation has already started or passed and cannot be cancelled.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
