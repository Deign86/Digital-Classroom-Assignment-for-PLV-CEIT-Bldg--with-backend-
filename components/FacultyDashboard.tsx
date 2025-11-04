import React, { useState, useEffect, Suspense } from 'react';
import { logger } from '../lib/logger';
/* spinner removed by request; fallbacks reverted to text */
// Tab persistence removed: default to overview on login
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/enhanced-tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { 
  Calendar, 
  Search, 
  Clock, 
  LogOut, 
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  GraduationCap,
  X,
  BookOpen,
  Settings
} from 'lucide-react';
import { convertTo12Hour, convertTo24Hour, formatTimeRange, isPastBookingTime, isReasonableBookingDuration, addDaysToDateString } from '../utils/timeUtils';
import { toast } from 'sonner';
// Lazy-load heavier, non-critical components to reduce initial bundle size.
const RoomBooking = React.lazy(() => import('./RoomBooking'));
const RoomSearch = React.lazy(() => import('./RoomSearch'));
const FacultySchedule = React.lazy(() => import('./FacultySchedule'));
const ProfileSettings = React.lazy(() => import('./ProfileSettings'));
import NotificationBell from './NotificationBell';
import NotificationCenter from './NotificationCenter';
import type { User, Classroom, BookingRequest, Schedule } from '../App';

interface FacultyDashboardProps {
  user: User;
  classrooms: Classroom[];
  schedules: Schedule[];
  allSchedules: Schedule[];
  bookingRequests: BookingRequest[];
  allBookingRequests: BookingRequest[];
  onLogout: () => void;
  onBookingRequest: (request: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>, suppressToast?: boolean) => void;
  checkConflicts: (classroomId: string, date: string, startTime: string, endTime: string, checkPastTime?: boolean) => boolean | Promise<boolean>;
  // Optional external prefill data (e.g., when user undoes a recent booking)
  externalInitialData?: {
    classroomId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    purpose?: string;
  } | null;
  onExternalInitialDataConsumed?: () => void;
}

export default function FacultyDashboard({
  user,
  classrooms,
  schedules,
  allSchedules,
  bookingRequests,
  allBookingRequests,
  onLogout,
  onBookingRequest,
  checkConflicts,
  externalInitialData,
  onExternalInitialDataConsumed
}: FacultyDashboardProps) {
  const allowedTabs = ['overview','booking','search','schedule','settings'] as const;
  type FacultyTab = typeof allowedTabs[number];

  // Default to overview; don't persist last-active tab across logout/login.
  const [activeTab, setActiveTab] = useState<FacultyTab>('overview');

  const [scheduleInitialTab, setScheduleInitialTab] = useState<'upcoming' | 'requests' | 'approved' | 'cancelled' | 'history' | 'rejected'>('upcoming');

  // When user clicks "Book Similar", we store initial data and switch to booking tab
  const [bookingInitialData, setBookingInitialData] = useState<{
    classroomId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    purpose?: string;
  } | null>(null);

  // If App provides external prefill data (e.g., undo action), consume it and open booking tab
  useEffect(() => {
    if (externalInitialData) {
      setBookingInitialData(externalInitialData);
      setActiveTab('booking');
      // Let parent know we've consumed it so it can clear the payload
      try {
        onExternalInitialDataConsumed?.();
      } catch (e) {
        logger.warn('Error calling onExternalInitialDataConsumed:', e);
      }
    }
  }, [externalInitialData, onExternalInitialDataConsumed]);

  // Quick rebook: attempt to submit immediately, otherwise fall back to opening the booking form with prefill
  const handleQuickRebook = async (initial: { classroomId: string; date: string; startTime: string; endTime: string; purpose?: string }) => {
    if (!initial || !initial.classroomId || !initial.date || !initial.startTime || !initial.endTime) {
      toast.error('Missing booking information for quick rebook.');
      setBookingInitialData(initial);
      toast('Form pre-filled with available information. Please review and submit.');
      setActiveTab('booking');
      return;
    }

    // For quick rebook, shift the booking to the same weekday next week to avoid immediate conflicts
    const targetDate = addDaysToDateString(initial.date, 7);

    // Basic validations (use the shifted date)
    if (isPastBookingTime(targetDate, initial.startTime)) {
      toast.error('Cannot quick-rebook a past time. Opening the booking form for adjustments.');
      setBookingInitialData({ ...initial, date: targetDate });
      toast('Form pre-filled with the previous booking — please review and submit.');
      setActiveTab('booking');
      return;
    }

    if (!isReasonableBookingDuration(initial.startTime, initial.endTime)) {
      toast.error('Requested duration is invalid (min 30 minutes, max 8 hours). Opening form to adjust.');
      setBookingInitialData(initial);
      toast('Form pre-filled with the previous booking — please review and submit.');
      setActiveTab('booking');
      return;
    }

  const start24 = convertTo24Hour(initial.startTime);
  const end24 = convertTo24Hour(initial.endTime);

    try {
      const conflict = await Promise.resolve(checkConflicts(initial.classroomId, targetDate, start24, end24, true));
      if (conflict) {
        toast.error('Time slot is no longer available. Opening booking form so you can choose another time.');
        setBookingInitialData({ ...initial, date: targetDate });
        toast('Form pre-filled with the previous booking — please review and submit.');
        setActiveTab('booking');
        return;
      }

      // Build request payload
      const request = {
        facultyId: user.id,
        facultyName: user.name,
        classroomId: initial.classroomId,
        classroomName: (classrooms.find(c => c.id === initial.classroomId)?.name) || '',
        date: targetDate,
        startTime: start24,
        endTime: end24,
        purpose: initial.purpose || ''
      } as Omit<BookingRequest, 'id' | 'requestDate' | 'status'>;

    // Suppress the default booking toast and show a specialized quick-rebook toast
    await Promise.resolve(onBookingRequest(request, true));
    toast.success('Reservation request submitted (Quick Rebook).');
    } catch (err) {
      console.error('Quick rebook failed', err);
      toast.error('Failed to submit quick rebook. Opening booking form for manual retry.');
      setBookingInitialData(initial);
      toast('Form pre-filled with the previous booking — please review and submit.');
      setActiveTab('booking');
    }
  };

  // Tab persistence removed: no storage side-effects for active tab

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Trigger page refresh when switching to settings tab (fixes push notification service worker init)
  useEffect(() => {
    const hasRefreshedForSettings = sessionStorage.getItem('settingsTabRefreshed');
    
    if (activeTab === 'settings' && !hasRefreshedForSettings) {
      console.log('[FacultyDashboard] First time opening settings tab, refreshing page for service worker init...');
      sessionStorage.setItem('settingsTabRefreshed', 'true');
      sessionStorage.setItem('returnToTab', 'settings');
      window.location.reload();
    }
  }, [activeTab]);

  // Restore tab after refresh
  useEffect(() => {
    const returnToTab = sessionStorage.getItem('returnToTab');
    if (returnToTab && allowedTabs.includes(returnToTab as any)) {
      setActiveTab(returnToTab as FacultyTab);
      sessionStorage.removeItem('returnToTab');
    }
  }, []);

  // Statistics
  const upcomingClasses = schedules.filter(s => {
    const scheduleDate = new Date(s.date);
    const today = new Date();
    return scheduleDate >= today && s.status === 'confirmed';
  }).length;

  const pendingRequests = bookingRequests.filter(r => r.status === 'pending' && !isPastBookingTime(r.date, convertTo12Hour(r.startTime))).length;
  const approvedRequests = bookingRequests.filter(r => r.status === 'approved').length;
  const rejectedRequests = bookingRequests.filter(r => r.status === 'rejected').length;
  const totalRequests = bookingRequests.length;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

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

  const [showNotifications, setShowNotifications] = useState(false);
  const [forceBellUnread, setForceBellUnread] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-shrink">
              <div className="transition-transform hover:rotate-12 hover:scale-110 flex-shrink-0">
                <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Faculty Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block truncate">PLV CEIT Classroom Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0">
              <div className="hidden md:block text-right min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[280px]">{user.name}</p>
                <p className="text-xs text-gray-500 truncate max-w-[280px]">{user.department} • {user.email}</p>
              </div>
              <div className="flex items-center space-x-2">
                <NotificationBell userId={user.id} onOpen={() => setShowNotifications(true)} forceUnread={forceBellUnread} />
                <div className="transition-transform hover:scale-105 active:scale-95">
                  <Button variant="outline" size="sm" onClick={onLogout} className="transition-all duration-200">
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              </div>
              {showNotifications && (
                <div className="fixed right-4 top-20 z-50">
                  <NotificationCenter
                    userId={user.id}
                    onClose={() => setShowNotifications(false)}
                    onAcknowledgeAll={(newCount) => {
                      // Immediately show the new unread count on the bell. If null, force to 0.
                      setForceBellUnread(typeof newCount === 'number' ? newCount : 0);
                      // Clear the forced value after 1.5s so the real-time listener resumes control
                      setTimeout(() => setForceBellUnread(null), 1500);
                      setShowNotifications(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FacultyTab)} className="space-y-4 sm:space-y-6">
          {/* Desktop Tab Layout */}
          <TabsList className="hidden sm:flex w-full h-12">
            <TabsTrigger value="overview" className="flex-1 px-4 py-2">
              <BookOpen className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="booking" className="flex-1 px-4 py-2">
              <Plus className="h-4 w-4 mr-2" />
              Reserve a Classroom
            </TabsTrigger>
            <TabsTrigger value="search" className="flex-1 px-4 py-2">
              <Search className="h-4 w-4 mr-2" />
              Search
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex-1 px-4 py-2">
              <Calendar className="h-4 w-4 mr-2" />
              My Schedule
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 px-4 py-2">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>
          
          {/* Mobile Horizontal Scrollable Tabs */}
          <div className="sm:hidden mobile-tab-container">
            <TabsList className="mobile-tab-scroll bg-background/80 backdrop-blur-lg border rounded-lg h-12 p-1">
              <TabsTrigger value="overview" className="mobile-tab-item flex items-center space-x-2 px-4 py-2">
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="booking" className="mobile-tab-item flex items-center space-x-2 px-4 py-2">
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span>Reserve a Classroom</span>
              </TabsTrigger>
              <TabsTrigger value="search" className="mobile-tab-item flex items-center space-x-2 px-4 py-2">
                <Search className="h-4 w-4 flex-shrink-0" />
                <span>Search</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="mobile-tab-item flex items-center space-x-2 px-4 py-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>My Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="mobile-tab-item flex items-center space-x-2 px-4 py-2">
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
            <div className="tab-scroll-indicator"></div>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 animate-in">
              <div className="transition-all duration-300 hover:-translate-y-1">
                <Card 
                  className="h-full stat-card-clickable cursor-pointer" 
                  onClick={() => setActiveTab('schedule')}
                  title="Click to view your schedule"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Upcoming Classes</p>
                        <p className="text-3xl font-bold text-blue-600">{upcomingClasses}</p>
                      </div>
                      <div className="transition-transform hover:scale-110">
                        <Calendar className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="transition-all duration-300 hover:-translate-y-1">
                <Card
                  className="h-full stat-card-clickable cursor-pointer"
                  role="button"
                  tabIndex={0}
                  title="Click to view your pending requests"
                  onClick={() => {
                    setScheduleInitialTab('requests');
                    setActiveTab('schedule');
                  }}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setScheduleInitialTab('requests');
                      setActiveTab('schedule');
                    }
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                        <p className="text-3xl font-bold text-orange-600">{pendingRequests}</p>
                      </div>
                      <div className={`transition-transform ${pendingRequests > 0 ? 'animate-pulse' : ''}`}>
                        <Clock className="h-8 w-8 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

            <div className="transition-all duration-300 hover:-translate-y-1">
              <Card
                className="h-full stat-card-clickable cursor-pointer"
                role="button"
                tabIndex={0}
                title="Click to view your rejected requests"
                onClick={() => {
                  setScheduleInitialTab('rejected');
                  setActiveTab('schedule');
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setScheduleInitialTab('rejected');
                    setActiveTab('schedule');
                  }
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Rejected Requests</p>
                      <p className="text-3xl font-bold text-red-600">{rejectedRequests}</p>
                    </div>
                    <div className="transition-transform hover:scale-110">
                      <X className="h-8 w-8 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

              <div className="transition-all duration-300 hover:-translate-y-1">
                <Card
                  className="h-full stat-card-clickable cursor-pointer"
                  role="button"
                  tabIndex={0}
                  title="Click to view your approved requests"
                  onClick={() => {
                    setScheduleInitialTab('approved');
                    setActiveTab('schedule');
                  }}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setScheduleInitialTab('approved');
                      setActiveTab('schedule');
                    }
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Approved Requests</p>
                        <p className="text-3xl font-bold text-green-600">{approvedRequests}</p>
                      </div>
                      <div className="transition-transform hover:scale-110">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="transition-all duration-300 hover:-translate-y-1">
                <Card
                  className="h-full stat-card-clickable cursor-pointer"
                  role="button"
                  tabIndex={0}
                  title="Click to view request history"
                  onClick={() => {
                    setScheduleInitialTab('history');
                    setActiveTab('schedule');
                  }}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setScheduleInitialTab('history');
                      setActiveTab('schedule');
                    }
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Requests</p>
                        <p className="text-3xl font-bold text-gray-900">{totalRequests}</p>
                      </div>
                      <div className="transition-transform hover:scale-110">
                        <BookOpen className="h-8 w-8 text-gray-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Requests and Upcoming Schedule */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Reservation Requests */}
              <div className="animate-in" style={{ animationDelay: '0.2s' }}>
                <Card
                  className="h-full transition-shadow duration-200 hover:shadow-lg stat-card-clickable cursor-pointer"
                  role="button"
                  tabIndex={0}
                  title="Click to view your requests"
                  onClick={() => {
                    setScheduleInitialTab('requests');
                    setActiveTab('schedule');
                  }}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setScheduleInitialTab('requests');
                      setActiveTab('schedule');
                    }
                  }}
                >
                    <CardHeader>
                    <CardTitle>Recent Requests</CardTitle>
                    <CardDescription>Your latest classroom reservation requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bookingRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No reservation requests yet</p>
                        <Button 
                          onClick={() => setActiveTab('booking')} 
                          className="mt-4 transition-transform hover:scale-105"
                        >
                          Reserve Your First Room
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-80 overflow-y-auto">
                        {bookingRequests
                          .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
                          .slice(0, 5)
                          .map((request, index) => (
                            <div 
                              key={request.id} 
                              className="p-4 border rounded-lg transition-all duration-200 hover:shadow-md hover:bg-gray-50 animate-in"
                              style={{ animationDelay: `${0.1 * index}s` }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{request.classroomName}</p>
                                  <p className="text-sm text-gray-600">{formatDate(request.date)} • {formatTimeRange(convertTo12Hour(request.startTime), convertTo12Hour(request.endTime))}</p>
                                </div>
                                <Badge variant={getStatusBadgeVariant(request.status)} className="flex-shrink-0 ml-2">
                                  {request.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500 break-words">{request.purpose}</p>
                              {request.adminFeedback && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                  <p className="font-medium text-gray-700">Admin Feedback:</p>
                                  <p className="text-gray-600">{request.adminFeedback}</p>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Upcoming Schedule */}
              <div className="animate-in" style={{ animationDelay: '0.4s' }}>
                <Card
                  className="h-full transition-shadow duration-200 hover:shadow-lg stat-card-clickable cursor-pointer"
                  role="button"
                  tabIndex={0}
                  title="Click to view upcoming classes"
                  onClick={() => {
                    setScheduleInitialTab('upcoming');
                    setActiveTab('schedule');
                  }}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setScheduleInitialTab('upcoming');
                      setActiveTab('schedule');
                    }
                  }}
                >
                    <CardHeader>
                    <CardTitle>Upcoming Classes</CardTitle>
                    <CardDescription>Your confirmed classroom reservations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {schedules.filter(s => {
                      const scheduleDate = new Date(s.date);
                      const today = new Date();
                      return scheduleDate >= today && s.status === 'confirmed';
                    }).length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No upcoming classes</p>
                        <Button 
                          onClick={() => setActiveTab('booking')} 
                          className="mt-4 transition-transform hover:scale-105"
                        >
                          Reserve a Room
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-80 overflow-y-auto">
                        {schedules
                          .filter(s => {
                            const scheduleDate = new Date(s.date);
                            const today = new Date();
                            return scheduleDate >= today && s.status === 'confirmed';
                          })
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .slice(0, 5)
                          .map((schedule, index) => (
                            <div 
                              key={schedule.id} 
                              className="p-4 border rounded-lg transition-all duration-200 hover:shadow-md hover:bg-green-50 animate-in"
                              style={{ animationDelay: `${0.1 * index}s` }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{schedule.classroomName}</p>
                                  <p className="text-sm text-gray-600">{formatDate(schedule.date)} • {formatTimeRange(convertTo12Hour(schedule.startTime), convertTo12Hour(schedule.endTime))}</p>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    Confirmed
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-sm text-gray-500 break-words">{schedule.purpose}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="booking">
            <div className="animate-in">
              <Suspense fallback={<div className="p-4">Loading booking form…</div>}>
                <RoomBooking
                  classrooms={classrooms}
                  schedules={allSchedules}
                  bookingRequests={allBookingRequests}
                  onBookingRequest={onBookingRequest}
                  initialData={bookingInitialData ?? undefined}
                  user={user}
                  checkConflicts={checkConflicts}
                />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="search">
            <div className="animate-in">
              <Suspense fallback={<div className="p-4">Loading search…</div>}>
                <RoomSearch
                  classrooms={classrooms}
                  schedules={allSchedules}
                  bookingRequests={allBookingRequests}
                />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="animate-in">
              <Suspense fallback={<div className="p-4">Loading schedule…</div>}>
                <FacultySchedule
                  schedules={schedules}
                  bookingRequests={bookingRequests}
                  initialTab={scheduleInitialTab}
                  userId={user?.id}
                  onQuickRebook={(initial: { classroomId: string; date: string; startTime: string; endTime: string; purpose?: string }) => {
                    void handleQuickRebook(initial);
                  }}
                />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="animate-in">
              <Suspense fallback={<div className="p-4">Loading settings…</div>}>
                <ProfileSettings user={user} />
              </Suspense>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}