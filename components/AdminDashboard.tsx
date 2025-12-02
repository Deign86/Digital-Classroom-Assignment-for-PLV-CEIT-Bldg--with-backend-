import React, { useState, useEffect, Suspense } from 'react';
import { abbreviateDepartments , convertTo12Hour, formatTimeRange, isPastBookingTime } from '../utils/timeUtils';
// Tab persistence removed: default to overview on login
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/enhanced-tabs';
import { 
  Settings, 
  Users, 
  Calendar, 
  BarChart3, 
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  FileText,
  UserPlus,
  UserCog,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';


// Lazy-load heavier admin panels to reduce initial bundle size
const ClassroomManagement = React.lazy(() => import('./ClassroomManagement'));
const RequestApproval = React.lazy(() => import('./RequestApproval'));
const SignupApproval = React.lazy(() => import('./SignupApproval'));
const ScheduleViewer = React.lazy(() => import('./ScheduleViewer'));
const AdminReports = React.lazy(() => import('./AdminReports'));
const ProfileSettings = React.lazy(() => import('./ProfileSettings'));
import NotificationBell from './NotificationBell';
import NotificationCenter from './NotificationCenter';
import { OfflineNotice } from './OfflineNotice';
import ErrorBoundary from './ErrorBoundary';
import type { Notification } from '../lib/notificationService';
import { useAnnouncer } from './Announcer';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
const AdminUserManagement = React.lazy(() => import('./AdminUserManagement'));
/* spinner removed by request; fallbacks reverted to text */
import { userService, adminDeleteUser } from '../lib/firebaseService';
import { notificationService } from '../lib/notificationService';
import type { User, Classroom, BookingRequest, SignupRequest, SignupHistory, Schedule } from '../App';

interface AdminDashboardProps {
  user: User;
  classrooms: Classroom[];
  bookingRequests: BookingRequest[];
  signupRequests: SignupRequest[];
  signupHistory: SignupHistory[];
  schedules: Schedule[];
  users?: User[];
  onLogout: () => void;
  onClassroomUpdate: (classrooms: Classroom[]) => void;
  onRequestApproval: (requestId: string, approved: boolean, feedback?: string) => Promise<void>;
  onSignupApproval: (requestId: string, approved: boolean, feedback?: string) => Promise<void>;
  onCancelSchedule: (scheduleId: string, reason: string) => void;
  onCancelApprovedBooking?: (requestId: string, reason: string) => void;
  onUnlockAccount?: (userId: string) => Promise<void>;
  checkConflicts: (classroomId: string, date: string, startTime: string, endTime: string, checkPastTime?: boolean) => boolean | Promise<boolean>;
}

export default function AdminDashboard({
  user,
  classrooms,
  bookingRequests,
  signupRequests,
  signupHistory,
  schedules,
  users = [],
  onLogout,
  onClassroomUpdate,
  onRequestApproval,
  onSignupApproval,
  onCancelSchedule,
  onCancelApprovedBooking,
  onUnlockAccount,
  checkConflicts
}: AdminDashboardProps) {
  const { announce } = useAnnouncer();
  const allowedTabs = ['overview','classrooms','requests','signups','schedule','reports','settings','user-management'] as const;
  
  // Read initial tab from URL path or default to overview
  const getInitialTab = (): string => {
    const path = window.location.pathname.split('/').filter(Boolean);
    const lastSegment = path[path.length - 1];
    return allowedTabs.includes(lastSegment as any) ? lastSegment : 'overview';
  };
  
  const [activeTab, setActiveTab] = useState<string>(getInitialTab());
  const [showNotifications, setShowNotifications] = useState(false);
  // Use the same notification render strategy as FacultyDashboard: fixed top-right panel
  const [forceBellUnread, setForceBellUnread] = useState<number | null>(null);
  // Track initial tab for RequestApproval when navigating from notifications
  const [requestsInitialTab, setRequestsInitialTab] = useState<'pending' | 'approved' | 'rejected' | 'expired' | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  // Per-request processing id to prevent double-approve/reject clicks
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  // Track requests being hidden during minimum loader display time
  const [hiddenRequestIds, setHiddenRequestIds] = useState<Set<string>>(new Set());
  
  // Sync URL with active tab
  const updateURL = (tab: string) => {
    const newPath = `/admin/${tab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  };

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab();
      setActiveTab(newTab);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Validate URL matches role - redirect if user manually navigated to wrong role URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/faculty')) {
      // Admin user trying to access faculty URL - redirect to admin overview
      window.history.replaceState(null, '', '/admin/overview');
      setActiveTab('overview');
    }
  }, []);

  // Update URL when tab changes
  useEffect(() => {
    updateURL(activeTab);
  }, [activeTab]);
  

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Trigger page refresh when switching to settings tab (fixes push notification service worker init)
  useEffect(() => {
    const hasRefreshedForSettings = sessionStorage.getItem('settingsTabRefreshed');
    
    if (activeTab === 'settings' && !hasRefreshedForSettings) {
      if (navigator.onLine) {
        console.log('[AdminDashboard] First time opening settings tab, refreshing page for service worker init...');
        sessionStorage.setItem('settingsTabRefreshed', 'true');
        sessionStorage.setItem('returnToTab', 'settings');
        window.location.reload();
      } else {
        console.log('[AdminDashboard] Settings tab opened offline, skipping refresh (will refresh on next online visit)');
      }
    }
  }, [activeTab]);

  // Restore tab after refresh
  useEffect(() => {
    const returnToTab = sessionStorage.getItem('returnToTab');
    if (returnToTab && allowedTabs.includes(returnToTab as any)) {
      setActiveTab(returnToTab);
      sessionStorage.removeItem('returnToTab');
    }
  }, []);

  // (Hash-based deep-linking removed — navigation now uses react-router)

  // Handle notification navigation for admin
  const handleNotificationNavigate = (notification: Notification) => {
    setShowNotifications(false); // Close notification panel
    
    // Map notification type to appropriate admin tab
    if (notification.type === 'signup') {
      setActiveTab('signups');
    } else if (notification.type === 'faculty_cancelled') {
      // Faculty cancelled bookings - show in schedule or requests
      setActiveTab('schedule');
    } else if (notification.type === 'approved' || notification.type === 'rejected' || notification.type === 'cancelled') {
      // Admin viewing faculty booking status changes - show in requests or schedule
      setActiveTab('schedule');
    } else if (notification.type === 'classroom_disabled') {
      setActiveTab('classrooms');
    } else if (notification.type === 'info') {
      // Check if this is an expired booking notification
      const isExpiredNotification = notification.message?.toLowerCase().includes('expired');
      if (isExpiredNotification && notification.bookingRequestId) {
        setRequestsInitialTab('expired');
        setActiveTab('requests');
      } else if (notification.bookingRequestId) {
        setActiveTab('requests');
      } else {
        setActiveTab('overview');
      }
    } else {
      // Fallback for any other notification types - show overview
      setActiveTab('overview');
    }
  };

  // Unlock handler for locked accounts card — disables the single row while processing
  const handleUnlockLockedUser = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      if (onUnlockAccount) {
        // App.tsx handles the success toast, don't show duplicate
        await onUnlockAccount(userId);
      } else {
        // Fallback to direct service call
        await userService.unlockAccount(userId);
        toast.success('Account unlocked');
      }
    } catch (err: any) {
      console.error('Unlock account error', err);
      toast.error(err?.message || 'Failed to unlock account');
    } finally {
      setProcessingUserId(null);
    }
  };

  // Statistics
  const totalClassrooms = classrooms.length;
  const availableClassrooms = classrooms.filter(c => c.isAvailable).length;
  // Consider a request pending only if its status is 'pending' and its booking time is not already past
  const pendingRequests = bookingRequests.filter(r => r.status === 'pending' && !isPastBookingTime(r.date, convertTo12Hour(r.startTime))).length;
  const pendingSignups = signupRequests.filter(r => r.status === 'pending').length;
  const todaySchedules = schedules.filter(s => {
    const today = new Date().toISOString().split('T')[0];
    return s.date === today && s.status === 'confirmed';
  }).length;

  const recentRequests = bookingRequests
    .filter(r => !hiddenRequestIds.has(r.id)) // Filter out hidden requests
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
    .slice(0, 5);

  // Announce newly arrived pending booking requests for admins
  React.useEffect(() => {
    // Track previous ids in a ref to compare across updates
    const prevRef = (AdminDashboard as any)._prevBookingIds || { current: new Set<string>() };
    (AdminDashboard as any)._prevBookingIds = prevRef;

    const prevIds = prevRef.current;
    const currentIds = new Set<string>(bookingRequests.map(r => r.id));

    // Find newly added requests
    const newIds: string[] = [];
    for (const r of bookingRequests) {
      if (!prevIds.has(r.id) && r.status === 'pending') newIds.push(r.id);
    }

    if (newIds.length > 0) {
      // Announce up to 3 new requests to avoid flooding
      const toAnnounce = newIds.slice(0, 3).map(id => bookingRequests.find(r => r.id === id)).filter(Boolean) as typeof bookingRequests;
      try {
        toAnnounce.forEach((req) => {
          const msg = `New reservation request from ${req.facultyName} for ${req.classroomName} on ${new Date(req.date).toLocaleDateString()} at ${req.startTime}`;
          try { announce(msg, 'polite'); } catch (e) {}
        });
      } catch (e) {}
    }

    // Update prevIds for next comparison
    prevRef.current = currentIds;
  }, [bookingRequests, announce]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0 flex-1">
              {/* Admin Icon */}
              <Building2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
              
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 truncate">PLV CEIT Admin Dashboard</h1>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 hidden sm:block truncate">Classroom Reservation Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 lg:space-x-4 flex-shrink-0">
              <div className="hidden md:block text-right">
                <p className="text-xs sm:text-sm md:text-base font-medium text-gray-900 whitespace-nowrap">{user.name}</p>
                <p className="text-xs text-gray-500 whitespace-nowrap">
                  {user.departments && user.departments.length >= 2 
                    ? `${abbreviateDepartments(user.departments)} • ${user.email}`
                    : user.department 
                      ? `${user.department} • ${user.email}`
                      : user.email
                  }
                </p>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <NotificationBell userId={user.id} onOpen={() => setShowNotifications(true)} forceUnread={forceBellUnread} />
                <div className="transition-transform hover:scale-105 active:scale-95">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLogoutConfirm(true)}
                    // ARIA: provide accessible name for icon-only and responsive logout control
                    aria-label="Logout"
                    className="transition-all duration-200 text-xs sm:text-sm"
                  >
                    <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5 md:mr-2" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
                {showNotifications && (
                  <>
                    {/* Fixed top-right panel (same as FacultyDashboard) */}
                    <div className="fixed right-2 sm:right-4 top-16 sm:top-20 z-50">
                      <NotificationCenter
                        userId={user.id}
                        onClose={() => setShowNotifications(false)}
                        onAcknowledgeAll={(newCount: number | null) => {
                          setForceBellUnread(typeof newCount === 'number' ? newCount : 0);
                          setTimeout(() => setForceBellUnread(null), 1500);
                          setShowNotifications(false);
                        }}
                        onNavigate={handleNotificationNavigate}
                      />
                    </div>
                  </>
                )}
              </div>
              
            </div>
          </div>
        </div>
      </header>

      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Desktop Tab Layout */}
          <TabsList className="hidden lg:grid w-full grid-cols-8 mx-auto max-w-full gap-0.5 md:gap-1 p-0.5 md:p-1">
            <TabsTrigger value="overview" className="flex items-center justify-center space-x-1 text-xs md:text-sm px-1 md:px-2 py-1.5 md:py-2">
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden xl:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="classrooms" className="flex items-center justify-center space-x-1 text-xs md:text-sm px-1 md:px-2 py-1.5 md:py-2">
              <Settings className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden xl:inline">Classrooms</span>
            </TabsTrigger>
                <TabsTrigger value="requests" className="flex items-center justify-center space-x-1 text-xs md:text-sm px-1 md:px-2 py-1.5 md:py-2 relative">
              <Users className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden xl:inline">Classroom Requests</span>
              {pendingRequests > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 text-[9px] md:text-[10px] px-0.5 md:px-1 py-0 h-3.5 md:h-4 min-w-[14px] md:min-w-[16px] rounded-full">
                  {pendingRequests}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="signups" className="flex items-center justify-center space-x-1 text-xs md:text-sm px-1 md:px-2 py-1.5 md:py-2 relative">
              <UserPlus className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden xl:inline">Signups</span>
              {pendingSignups > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 text-[9px] md:text-[10px] px-0.5 md:px-1 py-0 h-3.5 md:h-4 min-w-[14px] md:min-w-[16px] rounded-full">
                  {pendingSignups}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center justify-center space-x-1 text-xs md:text-sm px-1 md:px-2 py-1.5 md:py-2">
              <Calendar className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden xl:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center justify-center space-x-1 text-xs md:text-sm px-1 md:px-2 py-1.5 md:py-2">
              <FileText className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden xl:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="user-management" className="flex items-center justify-center space-x-1 text-xs md:text-sm px-1 md:px-2 py-1.5 md:py-2">
              <Users className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden xl:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center justify-center space-x-1 text-xs md:text-sm px-1 md:px-2 py-1.5 md:py-2">
              <UserCog className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden xl:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Mobile & Tablet Horizontal Scrollable Tabs */}
          <div className="lg:hidden mobile-tab-container">
            <TabsList className="mobile-tab-scroll bg-background/80 backdrop-blur-lg border rounded-lg">
              <TabsTrigger value="overview" className="mobile-tab-item flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 flex-shrink-0" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="classrooms" className="mobile-tab-item flex items-center space-x-2">
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span>Rooms</span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="mobile-tab-item flex items-center space-x-2 relative">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>Requests</span>
                {pendingRequests > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 h-5 min-w-[18px] rounded-full ml-1">
                    {pendingRequests}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="signups" className="mobile-tab-item flex items-center space-x-2 relative">
                <UserPlus className="h-4 w-4 flex-shrink-0" />
                <span>Signups</span>
                {pendingSignups > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 h-5 min-w-[18px] rounded-full ml-1">
                    {pendingSignups}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="schedule" className="mobile-tab-item flex items-center space-x-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="mobile-tab-item flex items-center space-x-2">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span>Reports</span>
              </TabsTrigger>
              <TabsTrigger value="user-management" className="mobile-tab-item flex items-center space-x-2">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>Users</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="mobile-tab-item flex items-center space-x-2">
                <UserCog className="h-4 w-4 flex-shrink-0" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
            <div className="tab-scroll-indicator"></div>
          </div>

          <TabsContent value="overview" className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6 animate-in">
              <div className="transition-all duration-300 hover:-translate-y-1">
                <Card 
                  className="h-full stat-card-clickable cursor-pointer" 
                  onClick={() => setActiveTab('classrooms')}
                  title="Click to view classroom management"
                >
                  <CardContent className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">Total Classrooms</p>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{totalClassrooms}</p>
                      </div>
                      <div className="transition-transform hover:rotate-12">
                        <Building2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              

              <div className="transition-all duration-300 hover:-translate-y-1">
                <Card 
                  className="h-full stat-card-clickable cursor-pointer" 
                  onClick={() => setActiveTab('classrooms')}
                  title="Click to view classroom management"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Available Rooms</p>
                        <p className="text-3xl font-bold text-green-600">{availableClassrooms}</p>
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
                  onClick={() => setActiveTab('requests')}
                  title="Click to view pending reservation requests"
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
                  onClick={() => setActiveTab('signups')}
                  title="Click to view pending faculty signups"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending Signups</p>
                        <p className="text-3xl font-bold text-purple-600">{pendingSignups}</p>
                      </div>
                      <div className={`transition-transform hover:scale-110 ${pendingSignups > 0 ? 'animate-bounce' : ''}`}>
                        <Users className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="transition-all duration-300 hover:-translate-y-1">
                <Card 
                  className="h-full stat-card-clickable cursor-pointer" 
                  onClick={() => setActiveTab('schedule')}
                  title="Click to view today's schedule"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Today's Classes</p>
                        <p className="text-3xl font-bold text-blue-600">{todaySchedules}</p>
                      </div>
                      <div className="transition-transform hover:scale-110">
                        <Calendar className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Requests */}
            <div className="animate-in" style={{ animationDelay: '0.3s' }}>
              <Card className="transition-shadow duration-200 hover:shadow-lg">
                  <CardHeader>
                  <CardTitle>Recent Requests</CardTitle>
                  <CardDescription>Latest classroom reservation requests from faculty</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentRequests.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No recent requests
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {recentRequests.map((request, index) => {
                        const isExpired = request.status === 'expired' || (request.status === 'pending' && isPastBookingTime(request.date, convertTo12Hour(request.startTime)));
                        return (
                          <div 
                            key={request.id} 
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg transition-all duration-200 hover:shadow-md hover:bg-gray-50 space-y-3 sm:space-y-0 animate-in"
                            style={{ animationDelay: `${0.1 * index}s` }}
                          >
                            <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                        <p className="font-medium">{request.facultyName}</p>
                                          {isExpired ? (
                                            <Badge variant="destructive" className="flex-shrink-0">Expired</Badge>
                                          ) : (
                                            <Badge 
                                              variant={
                                                request.status === 'pending' ? 'secondary' :
                                                request.status === 'approved' ? 'default' : 'destructive'
                                              }
                                              className="flex-shrink-0"
                                            >
                                              {request.status}
                                            </Badge>
                                          )}
                                      </div>
                              <p className="text-sm text-gray-600 break-words">{request.classroomName} • {request.date} • {formatTimeRange(convertTo12Hour(request.startTime), convertTo12Hour(request.endTime))}</p>
                              <p className="text-sm text-gray-500 break-words">{request.purpose}</p>
                            </div>
                            {request.status === 'pending' && (
                              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0 items-center">
                                {!isExpired ? (
                                  <>
                                    <div className="transition-transform hover:scale-105 active:scale-95 w-full sm:w-auto">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={async () => {
                                          try {
                                            setProcessingRequestId(request.id);
                                            // Hide the request immediately to prevent it from moving/updating
                                            setHiddenRequestIds(prev => new Set(prev).add(request.id));
                                            
                                            // Start both the approval and minimum loader time in parallel
                                            await Promise.all([
                                              onRequestApproval(request.id, true),
                                              new Promise(resolve => setTimeout(resolve, 1200))
                                            ]);
                                          } catch (err) {
                                            console.error('Approve request failed', err);
                                            // Remove from hidden on error
                                            setHiddenRequestIds(prev => {
                                              const next = new Set(prev);
                                              next.delete(request.id);
                                              return next;
                                            });
                                          } finally {
                                            setProcessingRequestId(null);
                                            // Keep it hidden - the real-time listener will update the list
                                          }
                                        }}
                                        className={`transition-colors duration-200 w-full sm:w-auto text-xs sm:text-sm`}
                                        aria-label={`Approve request ${request.id}`}
                                        disabled={processingRequestId === request.id}
                                      >
                                        {processingRequestId === request.id ? (
                                          <span className="inline-flex items-center">
                                            <Loader2 className="animate-spin mr-1 h-3 w-3" />
                                            <span className="sr-only">Approving request {request.id}</span>
                                          </span>
                                        ) : (
                                          <><CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />Approve</>
                                        )}
                                      </Button>
                                    </div>
                                    <div className="transition-transform hover:scale-105 active:scale-95 w-full sm:w-auto">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={async () => {
                                          try {
                                            setProcessingRequestId(request.id);
                                            // Hide the request immediately to prevent it from moving/updating
                                            setHiddenRequestIds(prev => new Set(prev).add(request.id));
                                            
                                            // Start both the rejection and minimum loader time in parallel
                                            await Promise.all([
                                              onRequestApproval(request.id, false),
                                              new Promise(resolve => setTimeout(resolve, 1200))
                                            ]);
                                          } catch (err) {
                                            console.error('Reject request failed', err);
                                            // Remove from hidden on error
                                            setHiddenRequestIds(prev => {
                                              const next = new Set(prev);
                                              next.delete(request.id);
                                              return next;
                                            });
                                          } finally {
                                            setProcessingRequestId(null);
                                            // Keep it hidden - the real-time listener will update the list
                                          }
                                        }}
                                        className={`transition-colors duration-200 w-full sm:w-auto text-xs sm:text-sm`}
                                        aria-label={`Reject request ${request.id}`}
                                        disabled={processingRequestId === request.id}
                                      >
                                        {processingRequestId === request.id ? (
                                          <span className="inline-flex items-center">
                                            <Loader2 className="animate-spin mr-1 h-3 w-3" />
                                            <span className="sr-only">Rejecting request {request.id}</span>
                                          </span>
                                        ) : (
                                          <><XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />Reject</>
                                        )}
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full sm:w-auto">
                                    <p className="text-sm text-muted-foreground">Expired — cannot be approved or rejected.</p>
                                    <span className="sr-only" role="status" aria-live="polite">This request has expired and cannot be approved or rejected.</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Locked Accounts Warning */}
            {users && users.filter(u => u.accountLocked).length > 0 && (
              <div className="animate-in" style={{ animationDelay: '0.4s' }}>
                <Card className="border-red-200 bg-red-50 transition-shadow duration-200 hover:shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center text-red-800">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            Locked Accounts
                          </CardTitle>
                          {/* Show contextual description depending on whether any locks were admin-triggered */}
                          <CardDescription className="text-red-700">
                            {users.filter(u => u.accountLocked && u.lockedByAdmin).length > 0
                              ? 'These accounts were disabled by an administrator and will remain locked until an admin unlocks them.'
                              : 'These accounts are locked due to failed login attempts'}
                          </CardDescription>
                        </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {users.filter(u => u.accountLocked).map((lockedUser, index) => {
                        const lockedUntil = lockedUser.lockedUntil ? new Date(lockedUser.lockedUntil) : null;
                        const now = new Date();
                        const isStillLocked = lockedUntil && lockedUntil > now;
                        const minutesRemaining = lockedUntil ? Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000) : 0;
                        const isAdminLocked = !!lockedUser.lockedByAdmin;
                        
                        return (
                          <div 
                            key={lockedUser.id} 
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-red-200 rounded-lg animate-in"
                            style={{ animationDelay: `${0.1 * index}s` }}
                          >
                            <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="font-medium text-gray-900">{lockedUser.name}</p>
                                <Badge variant="destructive" className="flex-shrink-0">
                                  Locked
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{lockedUser.email}</p>
                              <p className="text-sm text-gray-600">{lockedUser.department || 'N/A'}</p>
                              {isAdminLocked ? (
                                <p className="text-xs text-orange-600 mt-1">
                                  Disabled by administrator — will remain locked until an administrator unlocks this account.
                                </p>
                              ) : isStillLocked ? (
                                <p className="text-xs text-red-600 mt-1">
                                  Auto-unlock in {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''}
                                </p>
                              ) : (
                                <p className="text-xs text-orange-600 mt-1">
                                  Lockout period expired - will unlock on next login attempt
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Failed attempts: {lockedUser.failedLoginAttempts || 0}
                              </p>
                            </div>
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleUnlockLockedUser(lockedUser.id)}
                                      className="transition-transform hover:scale-105 active:scale-95 w-full sm:w-auto"
                                      disabled={processingUserId === lockedUser.id}
                                    >
                                      {processingUserId === lockedUser.id ? (
                                        <span className="inline-flex items-center">
                                          <Loader2 className="animate-spin mr-1 h-4 w-4" />
                                          <span className="sr-only">Unlocking {lockedUser.name}</span>
                                        </span>
                                      ) : (
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                      )}
                                      Unlock Account
                                    </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="classrooms">
            <div className="animate-in">
              <OfflineNotice showCachedMessage />
              <ErrorBoundary fallback={<div className="p-4 text-center text-red-500">Error loading classrooms. Please refresh the page.</div>}>
                <Suspense fallback={<div className="p-4">Loading classrooms…</div>}>
                  <ClassroomManagement
                    classrooms={classrooms}
                    onClassroomUpdate={onClassroomUpdate}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="animate-in">
              <OfflineNotice showCachedMessage />
              <ErrorBoundary fallback={<div className="p-4 text-center text-red-500">Error loading requests. Please refresh the page.</div>}>
                <Suspense fallback={<div className="p-4">Loading requests…</div>}>
                  <RequestApproval
                    requests={bookingRequests}
                    onRequestApproval={onRequestApproval}
                    onCancelApproved={onCancelApprovedBooking}
                    checkConflicts={checkConflicts}
                    userId={user?.id}
                    initialTab={requestsInitialTab ?? undefined}
                    onInitialTabConsumed={() => setRequestsInitialTab(null)}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="signups">
            <div className="animate-in">
              <OfflineNotice showCachedMessage />
              <ErrorBoundary fallback={<div className="p-4 text-center text-red-500">Error loading signups. Please refresh the page.</div>}>
                <Suspense fallback={<div className="p-4">Loading signups…</div>}>
                  <SignupApproval
                    signupRequests={signupRequests}
                    signupHistory={signupHistory}
                    onSignupApproval={onSignupApproval}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="animate-in">
              <OfflineNotice showCachedMessage />
              <ErrorBoundary fallback={<div className="p-4 text-center text-red-500">Error loading schedule. Please refresh the page.</div>}>
                <Suspense fallback={<div className="p-4">Loading schedule…</div>}>
                  <ScheduleViewer
                    schedules={schedules}
                    classrooms={classrooms}
                    onCancelSchedule={onCancelSchedule}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="animate-in">
              <OfflineNotice showCachedMessage />
              <ErrorBoundary fallback={<div className="p-4 text-center text-red-500">Error loading reports. Please refresh the page.</div>}>
                <Suspense fallback={<div className="p-4">Loading reports…</div>}>
                  <AdminReports
                    classrooms={classrooms}
                    bookingRequests={bookingRequests}
                    schedules={schedules}
                    signupRequests={signupRequests}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          </TabsContent>

          {/* Settings tab rendered once above; duplicate block removed to avoid rendering ProfileSettings twice */}

          <TabsContent value="user-management">
            <div className="animate-in">
              <OfflineNotice showCachedMessage />
              <ErrorBoundary fallback={<div className="p-4 text-center text-red-500">Error loading user management. Please refresh the page.</div>}>
                <Suspense fallback={<div className="p-4">Loading user management…</div>}>
                <AdminUserManagement users={users} processingUserId={processingUserId}
                onDisableUser={async (id: string, lockReason: string) => {
                  // Use admin-specific lock so the account is marked as admin-disabled
                  // and does not auto-unlock.
                  setProcessingUserId(id);
                  try {
                    const res: any = await userService.lockAccountByAdmin(id, lockReason);
                    const out = res || { success: true, message: 'Account locked by admin' };
                    if (out?.message) toast.success(out.message);
                    return out;
                  } catch (err: any) {
                    console.error('Lock account (admin) error', err);
                    const msg = err?.message || 'Failed to lock account';
                    toast.error(msg);
                    return { success: false, message: msg };
                  } finally {
                    setProcessingUserId(null);
                  }
                }}
                onEnableUser={async (id: string) => {
                  setProcessingUserId(id);
                  try {
                    const res: any = await userService.unlockAccount(id);
                    const out = res || { success: true, message: 'Account enabled' };
                    if (out?.message) toast.success(out.message);
                    return out;
                  } catch (err: any) {
                    console.error('Enable account error', err);
                    const msg = err?.message || 'Failed to enable account';
                    toast.error(msg);
                    return { success: false, message: msg };
                  } finally {
                    setProcessingUserId(null);
                  }
                }}
                onDeleteUser={async (id: string, hard?: boolean) => {
                  setProcessingUserId(id);
                  try {
                    const res = await adminDeleteUser(id, !!hard);
                    const out = res as any;
                    // Build a single consolidated success message to avoid duplicate toasts
                    const baseMsg = out?.message ?? 'User deleted';
                    if (typeof out?.deletedSignupRequests === 'number' && out.deletedSignupRequests > 0) {
                      const n = out.deletedSignupRequests;
                      const combined = `${baseMsg} — ${n} pending signup request${n > 1 ? 's' : ''} removed`;
                      toast.success(combined);
                    } else if (baseMsg) {
                      toast.success(baseMsg);
                    }
                    return out;
                  } catch (err: any) {
                    console.error('Delete user error', err);
                    const msg = err?.message || 'Failed to delete user';
                    toast.error(msg);
                    return { success: false, message: msg };
                  } finally {
                    setProcessingUserId(null);
                  }
                }}
                onChangeRole={async (id: string, role: 'admin' | 'faculty' | undefined) => {
                  if (!role) {
                    toast.error('Invalid role');
                    return { success: false, message: 'Invalid role' };
                  }
                  
                  setProcessingUserId(id);
                  try {
                    // Import the custom claims service
                    const { customClaimsService } = await import('../lib/customClaimsService');
                    
                    // Use the new changeUserRole function which automatically updates custom claims
                    const result = await customClaimsService.changeUserRole(id, role);
                    
                    // Only show success toast, not error (error is shown in catch block)
                    if (result.success) {
                      toast.success(result.message);
                    } else {
                      // If the function returns success: false, show the error message
                      toast.error(result.message);
                    }

                    // Infer whether the target user has a recent sign-in (active session).
                    // If their lastSignInAt is within the last 60 minutes, flag them as likely logged in.
                    let notifyCurrentlyLoggedIn = false;
                    try {
                      // Fetch user data to check last sign in
                      const userData = await userService.getById(id);
                      const last = userData?.lastSignInAt;
                      if (last) {
                        const lastDate = new Date(last);
                        if (!isNaN(lastDate.getTime())) {
                          const mins = (Date.now() - lastDate.getTime()) / 60000;
                          if (mins < 60) notifyCurrentlyLoggedIn = true;
                        }
                      }
                    } catch (e) {
                      // swallow
                    }

                    return { ...result, notifyCurrentlyLoggedIn };
                  } catch (err: any) {
                    console.error('Change role error', err);
                    const msg = err?.message || 'Failed to change role';
                    // Show error toast only once
                    toast.error(msg);
                    return { success: false, message: msg };
                  } finally {
                    setProcessingUserId(null);
                  }
                }}
                onNotifyUser={async (targetUserId: string, payload: any) => {
                  // Use notificationService to create an in-app notification (server-side)
                  // Do not show a toast here — AdminUserManagement will surface the success message.
                  try {
                    const message = payload?.body || payload?.title || 'Your account role was changed by an administrator. Please sign out and sign in again to apply the new changes.';
                    await notificationService.createNotification(targetUserId, 'info', message, { actorId: user.id });
                  } catch (err) {
                    console.error('onNotifyUser failed', err);
                    // Re-throw so the caller can show an error toast
                    throw err;
                  }
                }}
                onUnlockAccount={async (id: string) => {
                  setProcessingUserId(id);
                  try {
                    const res: any = await userService.unlockAccount(id);
                    const out = res || { success: true, message: 'Account unlocked' };
                    if (out?.message) toast.success(out.message);
                    return out;
                  } catch (err: any) {
                    console.error('Unlock user error', err);
                    const msg = err?.message || 'Failed to unlock account';
                    toast.error(msg);
                    return { success: false, message: msg };
                  } finally {
                    setProcessingUserId(null);
                  }
                }}
                />
              </Suspense>
            </ErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="animate-in">
              <ErrorBoundary fallback={<div className="p-4 text-center text-red-500">Error loading settings. Please refresh the page.</div>}>
                <Suspense fallback={<div className="p-4">Loading settings…</div>}>
                  <ProfileSettings user={user} />
                </Suspense>
              </ErrorBoundary>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
      />
    </div>
  );
}