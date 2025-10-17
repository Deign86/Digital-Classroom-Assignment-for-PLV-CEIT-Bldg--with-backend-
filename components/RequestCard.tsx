import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { CheckCircle, XCircle, Clock, Calendar, MapPin, User, AlertTriangle } from 'lucide-react';
import { convertTo12Hour, formatTimeRange, isPastBookingTime } from '../utils/timeUtils';
import type { BookingRequest } from '../App';

export default function RequestCard({
  request,
  onApprove,
  onReject,
  onCancelApproved,
  checkConflicts,
  status
}: {
  request: BookingRequest;
  onApprove: () => void;
  onReject: () => void;
  onCancelApproved?: (requestId: string) => void;
  checkConflicts: (classroomId: string, date: string, startTime: string, endTime: string, checkPastTime?: boolean, excludeRequestId?: string) => boolean | Promise<boolean>;
  status: 'pending' | 'approved' | 'rejected';
}) {
  const [hasConflict, setHasConflict] = useState(false);

  useEffect(() => {
    const checkForConflicts = async () => {
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
        console.error('Error checking conflicts:', error);
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
          <div className="flex items-center gap-2">
            {status === 'pending' && isPastBookingTime(request.date, convertTo12Hour(request.startTime)) && (
              <Badge variant="destructive">Expired</Badge>
            )}
            <Badge variant={
              status === 'pending' ? 'secondary' :
              status === 'approved' ? 'default' :
              'destructive'
            }>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasConflict && status === 'pending' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Scheduling Conflict</p>
              <p className="text-xs text-red-700 mt-1">
                This time slot conflicts with an existing reservation.
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
            <span className="text-gray-700">{request.classroomName}</span>
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

        {status === 'pending' && (
          <div className="flex gap-3 pt-3 border-t">
            <Button
              onClick={onApprove}
              disabled={hasConflict || isPastBookingTime(request.date, convertTo12Hour(request.startTime))}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button onClick={onReject} variant="destructive" className="flex-1">
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        )}

        {status === 'approved' && onCancelApproved && (
            <div className="flex gap-3 pt-3 border-t">
              <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 text-gray-600 hover:text-red-600 border-gray-200 hover:border-red-200 hover:bg-gray-50 transition-all duration-200"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Reservation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Approved Reservation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this approved reservation? This action cannot be undone.
                    The faculty member will need to submit a new request if they need this classroom again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Reservation</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onCancelApproved(request.id)} className="bg-gray-900 hover:bg-red-600 transition-colors duration-200">
                    Cancel Reservation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
