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
import { convertTo12Hour, formatTimeRange } from '../utils/timeUtils';
import ClassroomManagement from './ClassroomManagement';
import RequestApproval from './RequestApproval';
import SignupApproval from './SignupApproval';
import ScheduleViewer from './ScheduleViewer';
import AdminReports from './AdminReports';
import ProfileSettings from './ProfileSettings';
import type { User, Classroom, BookingRequest, SignupRequest, Schedule } from '../App';

interface AdminDashboardProps {
  user: User;
  classrooms: Classroom[];
  bookingRequests: BookingRequest[];
  signupRequests: SignupRequest[];
  schedules: Schedule[];
  onLogout: () => void;
  onClassroomUpdate: (classrooms: Classroom[]) => void;
  onRequestApproval: (requestId: string, approved: boolean, feedback?: string) => void;
  onSignupApproval: (requestId: string, approved: boolean, password?: string, feedback?: string) => void;
  onCancelSchedule: (scheduleId: string) => void;
  checkConflicts: (classroomId: string, date: string, startTime: string, endTime: string, checkPastTime?: boolean) => boolean | Promise<boolean>;
}

export default function AdminDashboard({
  user,
  classrooms,
  bookingRequests,
  signupRequests,
  schedules,
  onLogout,
  onClassroomUpdate,
  onRequestApproval,
  onSignupApproval,
  onCancelSchedule,
  checkConflicts
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Statistics
  const totalClassrooms = classrooms.length;
  const availableClassrooms = classrooms.filter(c => c.isAvailable).length;
  const pendingRequests = bookingRequests.filter(r => r.status === 'pending').length;
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
                  title="Click to view pending booking requests"
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
                  <CardDescription>Latest classroom booking requests from faculty</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentRequests.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No recent requests
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {recentRequests.map((request, index) => (
                        <div 
                          key={request.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg transition-all duration-200 hover:shadow-md hover:bg-gray-50 space-y-3 sm:space-y-0 animate-in"
                          style={{ animationDelay: `${0.1 * index}s` }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1 flex-wrap">
                              <p className="font-medium">{request.facultyName}</p>
                              <Badge 
                                variant={
                                  request.status === 'pending' ? 'secondary' :
                                  request.status === 'approved' ? 'default' : 'destructive'
                                }
                                className="flex-shrink-0"
                              >
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 break-words">{request.classroomName} • {request.date} • {formatTimeRange(convertTo12Hour(request.startTime), convertTo12Hour(request.endTime))}</p>
                            <p className="text-sm text-gray-500 break-words">{request.purpose}</p>
                          </div>
                          {request.status === 'pending' && (
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0">
                              <div className="transition-transform hover:scale-105 active:scale-95 w-full sm:w-auto">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => onRequestApproval(request.id, true)}
                                  className="transition-colors duration-200 w-full sm:w-auto text-xs sm:text-sm"
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
                                  className="transition-colors duration-200 w-full sm:w-auto text-xs sm:text-sm"
                                >
                                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
                checkConflicts={checkConflicts}
              />
            </div>
          </TabsContent>

          <TabsContent value="signups">
            <div className="animate-in">
              <SignupApproval
                signupRequests={signupRequests}
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