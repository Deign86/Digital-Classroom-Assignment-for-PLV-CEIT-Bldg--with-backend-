import React, { useState, useEffect } from 'react';
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
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  FileText,
  UserPlus,
  UserCog
} from 'lucide-react';
import { convertTo12Hour, formatTimeRange, isPastBookingTime } from '../utils/timeUtils';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import ClassroomManagement from './ClassroomManagement';
import RequestApproval from './RequestApproval';
import SignupApproval from './SignupApproval';
import ScheduleViewer from './ScheduleViewer';
import AdminReports from './AdminReports';
import ProfileSettings from './ProfileSettings';
import NotificationBell from './NotificationBell';
import NotificationCenter from './NotificationCenter';
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
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [forceBellUnread, setForceBellUnread] = useState<number | null>(null);
  

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // (Hash-based deep-linking removed — navigation now uses react-router)

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
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div className="transition-transform hover:rotate-12 hover:scale-110 flex-shrink-0">
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">PLV CEIT Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Classroom Assignment Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{user.name}</p>
                <p className="text-xs text-gray-500 whitespace-nowrap">{user.email}</p>
              </div>
              <div className="transition-transform hover:scale-105 active:scale-95">
                <Button variant="outline" size="sm" onClick={onLogout} className="transition-all duration-200">
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
              <div className="ml-3">
                <NotificationBell userId={user.id} onOpen={() => setShowNotifications(true)} forceUnread={forceBellUnread} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Desktop Tab Layout */}
          <TabsList className="hidden lg:grid w-full grid-cols-7 mx-auto max-w-full gap-1 p-1">
            <TabsTrigger value="overview" className="flex items-center justify-center space-x-1 text-sm px-2 py-2">
              <BarChart3 className="h-4 w-4 flex-shrink-0" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="classrooms" className="flex items-center justify-center space-x-1 text-sm px-2 py-2">
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>Classrooms</span>
            </TabsTrigger>
                <TabsTrigger value="requests" className="flex items-center justify-center space-x-1 text-sm px-2 py-2 relative">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span>Classroom Requests</span>
              {pendingRequests > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 text-[10px] px-1 py-0 h-4 min-w-[16px] rounded-full">
                  {pendingRequests}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="signups" className="flex items-center justify-center space-x-1 text-sm px-2 py-2 relative">
              <UserPlus className="h-4 w-4 flex-shrink-0" />
              <span>Signups</span>
              {pendingSignups > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 text-[10px] px-1 py-0 h-4 min-w-[16px] rounded-full">
                  {pendingSignups}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center justify-center space-x-1 text-sm px-2 py-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center justify-center space-x-1 text-sm px-2 py-2">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span>Reports</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center justify-center space-x-1 text-sm px-2 py-2">
              <UserCog className="h-4 w-4 flex-shrink-0" />
              <span>Settings</span>
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
                <span>Classroom Requests</span>
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
              <TabsTrigger value="settings" className="mobile-tab-item flex items-center space-x-2">
                <UserCog className="h-4 w-4 flex-shrink-0" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
            <div className="tab-scroll-indicator"></div>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 animate-in">
              <div className="transition-all duration-300 hover:-translate-y-1">
                <Card 
                  className="h-full stat-card-clickable cursor-pointer" 
                  onClick={() => setActiveTab('classrooms')}
                  title="Click to view classroom management"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Classrooms</p>
                        <p className="text-3xl font-bold text-gray-900">{totalClassrooms}</p>
                      </div>
                      <div className="transition-transform hover:rotate-12">
                        <Building2 className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {showNotifications && (
                <div className="fixed right-4 top-20 z-50">
                  <NotificationCenter
                    userId={user.id}
                    onClose={() => setShowNotifications(false)}
                    onAcknowledgeAll={(newCount) => {
                      setForceBellUnread(typeof newCount === 'number' ? newCount : 0);
                      setTimeout(() => setForceBellUnread(null), 1500);
                      setShowNotifications(false);
                    }}
                  />
                </div>
              )}

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
                                        onClick={() => onRequestApproval(request.id, true)}
                                        className={`transition-colors duration-200 w-full sm:w-auto text-xs sm:text-sm`}
                                        aria-label={`Approve request ${request.id}`}
                                      >
                                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                        Approve
                                      </Button>
                                    </div>
                                    <div className="transition-transform hover:scale-105 active:scale-95 w-full sm:w-auto">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => onRequestApproval(request.id, false)}
                                        className={`transition-colors duration-200 w-full sm:w-auto text-xs sm:text-sm`}
                                        aria-label={`Reject request ${request.id}`}
                                      >
                                        <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                        Reject
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
                    <CardDescription className="text-red-700">
                      These accounts are locked due to failed login attempts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {users.filter(u => u.accountLocked).map((lockedUser, index) => {
                        const lockedUntil = lockedUser.lockedUntil ? new Date(lockedUser.lockedUntil) : null;
                        const now = new Date();
                        const isStillLocked = lockedUntil && lockedUntil > now;
                        const minutesRemaining = lockedUntil ? Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000) : 0;
                        
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
                              {isStillLocked ? (
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
                              onClick={() => onUnlockAccount && onUnlockAccount(lockedUser.id)}
                              className="transition-transform hover:scale-105 active:scale-95 w-full sm:w-auto"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
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
              <ClassroomManagement
                classrooms={classrooms}
                onClassroomUpdate={onClassroomUpdate}
              />
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="animate-in">
              <RequestApproval
                requests={bookingRequests}
                onRequestApproval={onRequestApproval}
                onCancelApproved={onCancelApprovedBooking}
                checkConflicts={checkConflicts}
              />
            </div>
          </TabsContent>

          <TabsContent value="signups">
            <div className="animate-in">
              <SignupApproval
                signupRequests={signupRequests}
                signupHistory={signupHistory}
                onSignupApproval={onSignupApproval}
              />
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="animate-in">
              <ScheduleViewer
                schedules={schedules}
                classrooms={classrooms}
                onCancelSchedule={onCancelSchedule}
              />
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="animate-in">
              <AdminReports
                classrooms={classrooms}
                bookingRequests={bookingRequests}
                schedules={schedules}
                signupRequests={signupRequests}
              />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="animate-in">
              <ProfileSettings user={user} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}