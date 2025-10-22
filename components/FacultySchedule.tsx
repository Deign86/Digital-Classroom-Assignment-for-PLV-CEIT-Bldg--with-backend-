import React, { useState } from 'react';
import { toast } from 'sonner';
import { bookingRequestService, scheduleService } from '../lib/firebaseService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/enhanced-tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertTriangle, MessageSquare, X } from 'lucide-react';
import { convertTo12Hour, formatTimeRange } from '../utils/timeUtils';
import type { Schedule, BookingRequest } from '../App';

interface FacultyScheduleProps {
  schedules: Schedule[];
  bookingRequests: BookingRequest[];
  initialTab?: 'upcoming' | 'requests' | 'approved' | 'cancelled' | 'history' | 'rejected';
  onCancelSelected?: (scheduleId: string) => Promise<void> | void;
}

export default function FacultySchedule({ schedules, bookingRequests, initialTab = 'upcoming', onCancelSelected }: FacultyScheduleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [approvedSelectedIds, setApprovedSelectedIds] = useState<Record<string, boolean>>({});
  const [isCancelling, setIsCancelling] = useState(false);

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
  const pendingRequests = bookingRequests.filter(r => r.status === 'pending');
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
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      const ids = Object.keys(approvedSelectedIds).filter(k => approvedSelectedIds[k]);
                      if (!ids.length) return;

                      // If a parent handler is provided, prefer it (backwards compatibility).
                      if (typeof onCancelSelected === 'function') {
                        try {
                          setIsCancelling(true);
                          for (const id of ids) {
                            try {
                              await onCancelSelected(id);
                            } catch (err) {
                              console.error('onCancelSelected failed for', id, err);
                            }
                          }
                          toast.success(`Attempted to cancel ${ids.length} reservation(s).`);
                        } finally {
                          setIsCancelling(false);
                          setApprovedSelectedIds({});
                        }
                        return;
                      }

                      // Default bulk flow: cancel schedules (requires admin permission) and then atomically update booking requests.
                      setIsCancelling(true);
                      const successfulScheduleCancellations: string[] = [];
                      const failedScheduleCancellations: Array<{ id: string; error: unknown }> = [];

                      for (const requestId of ids) {
                        try {
                          // Find a corresponding schedule for this booking request
                          const correspondingSchedule = schedules.find(schedule =>
                            schedule.facultyId === bookingRequests.find(req => req.id === requestId)?.facultyId &&
                            schedule.date === bookingRequests.find(req => req.id === requestId)?.date &&
                            schedule.startTime === bookingRequests.find(req => req.id === requestId)?.startTime &&
                            schedule.endTime === bookingRequests.find(req => req.id === requestId)?.endTime &&
                            schedule.classroomId === bookingRequests.find(req => req.id === requestId)?.classroomId
                          );

                          if (correspondingSchedule) {
                            await scheduleService.cancelApprovedBooking(correspondingSchedule.id);
                            successfulScheduleCancellations.push(requestId);
                          } else {
                            // No schedule found — still include in booking updates
                            successfulScheduleCancellations.push(requestId);
                          }
                        } catch (err) {
                          console.error('Failed to cancel schedule for request', requestId, err);
                          failedScheduleCancellations.push({ id: requestId, error: err });
                        }
                      }

                      // Prepare booking request updates for all ids that we attempted (mark rejected and add adminFeedback)
                      const bookingUpdates = ids.map(id => ({ id, data: { status: 'rejected' as const, adminFeedback: 'Booking cancelled by administrator' } }));

                      try {
                        await bookingRequestService.bulkUpdate(bookingUpdates);
                      } catch (err) {
                        console.error('Bulk update of booking requests failed', err);
                        // If the batch update fails, fall back to per-item updates to maximize success
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

                      const successCount = ids.length - failedScheduleCancellations.length;
                      if (failedScheduleCancellations.length === 0) {
                        toast.success(`Successfully cancelled ${successCount} reservation(s).`);
                      } else {
                        toast.error(`Cancelled ${successCount} reservation(s). ${failedScheduleCancellations.length} failed.`);
                      }
                    }}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Cancelling...' : `Cancel Selected (${Object.values(approvedSelectedIds).filter(Boolean).length})`}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {approvedRequests
                  .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
                  .map((request) => (
                    <div key={request.id} className="flex items-start gap-3">
                      <input type="checkbox" checked={!!approvedSelectedIds[request.id]} onChange={(e) => setApprovedSelectedIds(prev => ({ ...prev, [request.id]: e.target.checked }))} className="h-4 w-4 text-indigo-600 rounded border-gray-300 mt-3" />
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
    </div>
  );
}