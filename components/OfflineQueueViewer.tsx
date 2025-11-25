/**
 * OfflineQueueViewer - Shows pending offline booking requests
 * 
 * Displays queued bookings that are waiting to be synced,
 * allows users to cancel queued requests, and shows sync status.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CloudOff, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Trash2,
  MapPin,
  Calendar as CalendarIcon,
  RefreshCw
} from 'lucide-react';
import { offlineQueueService, type QueuedBookingRequest } from '../lib/offlineQueueService';
import { toast } from 'sonner';
import { convertTo12Hour } from '../utils/timeUtils';
import type { Classroom } from '../App';

interface OfflineQueueViewerProps {
  classrooms: Classroom[];
  onRetryBooking?: (bookingData: {
    classroomId: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose: string;
  }) => void;
}

export function OfflineQueueViewer({ classrooms, onRetryBooking }: OfflineQueueViewerProps) {
  const [queuedRequests, setQueuedRequests] = useState<QueuedBookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      setError(null);
      const requests = await offlineQueueService.getQueuedRequests();
      // Filter out synced requests
      const pending = requests.filter(r => r.queueStatus !== 'synced');
      setQueuedRequests(pending);
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      setError('Failed to load offline queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();

    // Subscribe to queue changes
    const unsubscribe = offlineQueueService.subscribe(() => {
      loadQueue().catch(err => {
        console.error('Failed to reload queue on change:', err);
      });
    });

    return unsubscribe;
  }, []);

  const handleRemove = async (queueId: string) => {
    try {
      await offlineQueueService.removeQueuedRequest(queueId);
      toast.success('Queued booking removed');
    } catch (error) {
      toast.error('Failed to remove queued booking');
      console.error('Remove error:', error);
    }
  };

  const handleRetryConflict = async (queued: QueuedBookingRequest) => {
    if (!onRetryBooking) return;

    // Remove from queue first
    try {
      await offlineQueueService.removeQueuedRequest(queued.queueId);
      
      // Call the callback to switch to booking tab with pre-filled data
      onRetryBooking({
        classroomId: queued.bookingData.classroomId,
        date: queued.bookingData.date,
        startTime: queued.bookingData.startTime,
        endTime: queued.bookingData.endTime,
        purpose: queued.bookingData.purpose
      });
      
      toast.info('Booking form opened with your previous data. Please adjust and resubmit.');
    } catch (error) {
      console.error('Error retrying booking:', error);
      toast.error('Failed to retry booking');
    }
  };

  const getStatusBadge = (status: QueuedBookingRequest['queueStatus']) => {
    switch (status) {
      case 'pending-validation':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Validation</Badge>;
      case 'pending-sync':
        return <Badge variant="secondary"><CloudOff className="h-3 w-3 mr-1" />Waiting to Sync</Badge>;
      case 'syncing':
        return <Badge variant="default"><RefreshCw className="h-3 w-3 mr-1" />Syncing...</Badge>;
      case 'conflict':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Conflict</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="h-5 w-5" />
            Offline Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading queue...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Offline Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadQueue}
            className="mt-2"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (queuedRequests.length === 0) {
    return null; // Don't show the card if queue is empty
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudOff className="h-5 w-5" />
          Offline Queue
          <Badge variant="secondary">{queuedRequests.length}</Badge>
        </CardTitle>
        <CardDescription>
          Bookings queued for sync when connection is restored
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {queuedRequests.map((queued) => (
              <motion.div
                key={queued.queueId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{queued.bookingData.classroomName}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{queued.bookingData.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {convertTo12Hour(queued.bookingData.startTime)} - {convertTo12Hour(queued.bookingData.endTime)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {queued.bookingData.purpose}
                    </p>
                  </div>
                  
                  <div className="flex gap-1">
                    {queued.queueStatus === 'conflict' && onRetryBooking && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetryConflict(queued)}
                        className="ml-2"
                      >
                        Retry Booking
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(queued.queueId)}
                      disabled={queued.queueStatus === 'syncing'}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  {getStatusBadge(queued.queueStatus)}
                  
                  {queued.queueStatus === 'conflict' && queued.conflictDetails && (
                    <p className="text-xs text-red-600">{queued.conflictDetails.message}</p>
                  )}
                  
                  {queued.queueStatus === 'failed' && queued.error && (
                    <p className="text-xs text-red-600">{queued.error}</p>
                  )}
                  
                  {queued.attempts > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {queued.attempts} {queued.attempts === 1 ? 'attempt' : 'attempts'}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
