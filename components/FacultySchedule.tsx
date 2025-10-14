import React, { useState } from 'react';
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
}

export default function FacultySchedule({ schedules, bookingRequests, initialTab = 'upcoming' }: FacultyScheduleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

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
                <p className="text-sm text-red-600 mt-1 italic">This booking has been cancelled</p>
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
          <CardDescription>View your confirmed classes and booking requests</CardDescription>
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
            approvedRequests
              .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
              .map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <X className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Rejected Requests</h3>
                <p className="text-gray-600">You have no rejected booking requests.</p>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Cancelled Bookings</h3>
                <p className="text-gray-600">You haven't cancelled any bookings yet.</p>
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