import './styles/globals.css';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import FacultyDashboard from './components/FacultyDashboard';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { isPastBookingTime, convertTo12Hour } from './utils/timeUtils';
import {
  userService,
  classroomService,
  signupRequestService,
  bookingRequestService,
  scheduleService
} from './lib/supabaseService';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'faculty';
  department?: string;
  password: string;
}

export interface SignupRequest {
  id: string;
  email: string;
  name: string;
  department: string;
  password: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  adminFeedback?: string;
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  equipment: string[];
  building: string;
  floor: number;
  isAvailable: boolean;
}

export interface BookingRequest {
  id: string;
  facultyId: string;
  facultyName: string;
  classroomId: string;
  classroomName: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  adminFeedback?: string;
}

export interface Schedule {
  id: string;
  classroomId: string;
  classroomName: string;
  facultyId: string;
  facultyName: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: 'confirmed' | 'cancelled';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // All hooks must be at the top level - move memoized data here
  const facultySchedules = useMemo(() => {
    if (!currentUser) return [];
    return schedules.filter(s => s.facultyId === currentUser.id);
  }, [schedules, currentUser]);
  
  const facultyBookingRequests = useMemo(() => {
    if (!currentUser) return [];
    return bookingRequests.filter(r => r.facultyId === currentUser.id);
  }, [bookingRequests, currentUser]);

  // Load all data from Supabase
  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [
        usersData,
        classroomsData,
        signupRequestsData,
        bookingRequestsData,
        schedulesData
      ] = await Promise.all([
        userService.getAll(),
        classroomService.getAll(),
        signupRequestService.getAll(),
        bookingRequestService.getAll(),
        scheduleService.getAll()
      ]);

      setUsers(usersData);
      setClassrooms(classroomsData);
      setSignupRequests(signupRequestsData);
      setBookingRequests(bookingRequestsData);
      setSchedules(schedulesData);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Failed to load data from database');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      const user = await userService.login(email, password);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('plv_classroom_user', JSON.stringify(user));
        toast.success(`Welcome back, ${user.name}!`);
        return true;
      }
      toast.error('Invalid credentials');
      return false;
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Login failed');
      return false;
    }
  }, []);

  const handleSignup = useCallback(async (email: string, name: string, department: string, password: string) => {
    try {
      const existingUser = await userService.getByEmail(email);
      const existingRequest = await signupRequestService.getByEmail(email);
      
      if (existingUser) {
        toast.error('Email already registered');
        return false;
      }
      
      if (existingRequest) {
        toast.error('Request already pending');
        return false;
      }

      const newRequest = await signupRequestService.create({
        email,
        name,
        department,
        password,
        status: 'pending'
      });

      setSignupRequests(prev => [...prev, newRequest]);
      toast.success('Signup request submitted!');
      return true;
    } catch (err) {
      console.error('Signup error:', err);
      toast.error('Signup failed');
      return false;
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('plv_classroom_user');
    toast.success('Logged out successfully');
  }, []);

  const handleClassroomUpdate = useCallback(async (updatedClassrooms: Classroom[]) => {
    setClassrooms(updatedClassrooms);
    // Note: Individual classroom updates are handled through the service layer
  }, []);

  const checkConflicts = useCallback(async (
    classroomId: string,
    date: string,
    startTime: string,
    endTime: string,
    checkPastTime: boolean = false,
    excludeRequestId?: string
  ): Promise<boolean> => {
    // Check if booking time is in the past (only if checkPastTime is true)
    if (checkPastTime && isPastBookingTime(date, convertTo12Hour(startTime))) {
      return true;
    }

    try {
      return await bookingRequestService.checkConflicts(
        classroomId,
        date,
        startTime,
        endTime,
        excludeRequestId
      );
    } catch (err) {
      console.error('Error checking conflicts:', err);
      toast.error('Failed to check for conflicts');
      return true; // Return true to be safe
    }
  }, []);

  const handleBookingRequest = useCallback(async (request: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>) => {
    // Check if the booking time is in the past
    if (isPastBookingTime(request.date, convertTo12Hour(request.startTime))) {
      toast.error('Cannot request time slots that have already passed');
      return;
    }

    // Check for conflicts without past time validation (we already checked above)
    const hasConflict = await checkConflicts(
      request.classroomId,
      request.date,
      request.startTime,
      request.endTime,
      false
    );

    if (hasConflict) {
      toast.error('Classroom conflict detected - time slot already booked');
      return;
    }

    try {
      const newRequest = await bookingRequestService.create({
        ...request,
        status: 'pending'
      });
      
      setBookingRequests(prev => [...prev, newRequest]);
      toast.success('Classroom request submitted!');
    } catch (err) {
      console.error('Booking request error:', err);
      toast.error('Failed to submit booking request');
    }
  }, [checkConflicts]);

  const handleRequestApproval = useCallback(async (requestId: string, approved: boolean, feedback?: string) => {
    try {
      // Find the request first
      const request = bookingRequests.find(req => req.id === requestId);
      if (!request) {
        toast.error('Request not found');
        return;
      }

      // Check if already processed
      if (request.status !== 'pending') {
        toast.error('Request has already been processed');
        return;
      }

      // Update the booking request status
      const updatedRequest = await bookingRequestService.update(requestId, {
        status: approved ? 'approved' : 'rejected',
        adminFeedback: feedback
      });

      setBookingRequests(prev =>
        prev.map(req => req.id === requestId ? updatedRequest : req)
      );
      
      // Create schedule only if approved
      if (approved) {
        const newSchedule = await scheduleService.create({
          classroomId: request.classroomId,
          classroomName: request.classroomName,
          facultyId: request.facultyId,
          facultyName: request.facultyName,
          date: request.date,
          startTime: request.startTime,
          endTime: request.endTime,
          purpose: request.purpose,
          status: 'confirmed'
        });
        
        setSchedules(prev => [...prev, newSchedule]);
      }
      
      toast.success(approved ? 'Request approved!' : 'Request rejected.');
    } catch (err) {
      console.error('Approval error:', err);
      toast.error('Failed to process request');
    }
  }, [bookingRequests]);

  const handleSignupApproval = useCallback(async (requestId: string, approved: boolean, feedback?: string) => {
    try {
      const request = signupRequests.find(r => r.id === requestId);
      if (!request) {
        toast.error('Request not found');
        return;
      }

      const updatedRequest = await signupRequestService.update(requestId, {
        status: approved ? 'approved' : 'rejected',
        adminFeedback: feedback
      });

      setSignupRequests(prev =>
        prev.map(req => req.id === requestId ? updatedRequest : req)
      );

      if (approved) {
        const newUser = await userService.create({
          email: request.email,
          name: request.name,
          role: 'faculty',
          department: request.department,
          password: request.password
        });
        
        setUsers(prev => [...prev, newUser]);
        toast.success(`Faculty account approved for ${request.name}!`);
      } else {
        toast.success(`Signup request rejected for ${request.name}.`);
      }
    } catch (err) {
      console.error('Signup approval error:', err);
      toast.error('Failed to process signup request');
    }
  }, [signupRequests]);

  const handleCancelSchedule = useCallback(async (scheduleId: string) => {
    try {
      const updatedSchedule = await scheduleService.update(scheduleId, {
        status: 'cancelled'
      });
      
      setSchedules(prev =>
        prev.map(schedule => schedule.id === scheduleId ? updatedSchedule : schedule)
      );
      
      toast.success('Booking cancelled!');
    } catch (err) {
      console.error('Cancel schedule error:', err);
      toast.error('Failed to cancel booking');
    }
  }, []);

  // Create dashboard props objects to prevent prop drilling and improve performance
  const adminDashboardProps = useMemo(() => ({
    user: currentUser!,
    classrooms,
    bookingRequests,
    signupRequests,
    schedules,
    onLogout: handleLogout,
    onClassroomUpdate: handleClassroomUpdate,
    onRequestApproval: handleRequestApproval,
    onSignupApproval: handleSignupApproval,
    onCancelSchedule: handleCancelSchedule,
    checkConflicts
  }), [currentUser, classrooms, bookingRequests, signupRequests, schedules, handleLogout, handleClassroomUpdate, handleRequestApproval, handleSignupApproval, handleCancelSchedule, checkConflicts]);

  const facultyDashboardProps = useMemo(() => ({
    user: currentUser!,
    classrooms,
    schedules: facultySchedules,
    allSchedules: schedules,
    bookingRequests: facultyBookingRequests,
    allBookingRequests: bookingRequests,
    onLogout: handleLogout,
    onBookingRequest: handleBookingRequest,
    onCancelSchedule: handleCancelSchedule,
    checkConflicts
  }), [currentUser, classrooms, facultySchedules, schedules, facultyBookingRequests, bookingRequests, handleLogout, handleBookingRequest, handleCancelSchedule, checkConflicts]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load all data from Supabase
        await loadAllData();

        // Check for stored user session
        const storedUser = localStorage.getItem('plv_classroom_user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            // Verify user still exists in database
            const dbUser = await userService.getById(parsedUser.id);
            if (dbUser) {
              setCurrentUser(dbUser);
            } else {
              localStorage.removeItem('plv_classroom_user');
            }
          } catch (parseError) {
            console.warn('Failed to parse stored user data:', parseError);
            localStorage.removeItem('plv_classroom_user');
          }
        }
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError('Failed to connect to database. Please check your Supabase configuration.');
      }
    };

    initializeApp();
  }, [loadAllData]);

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="h-16 w-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg mx-auto mb-4">
            <div className="text-white text-lg font-bold">!</div>
          </div>
          <h1 className="text-2xl font-bold text-red-800 mb-4">Application Error</h1>
          <p className="text-red-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Show loading state during initialization with timeout fallback
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg mx-auto mb-4 animate-pulse">
            <div className="text-white text-lg font-bold">PLV</div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-8 w-full max-w-md">
            <div>
              <div className="flex justify-center mb-6">
                <div className="h-24 w-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <div className="text-white text-2xl font-bold">PLV</div>
                </div>
              </div>
              <p className="text-blue-600 mb-2">PLV CEIT</p>
              <h1 className="mb-6">Digital Classroom</h1>
              <p className="text-gray-600 mb-8">
                Streamlined classroom assignment and booking system for PLV CEIT.
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
              <LoginForm onLogin={handleLogin} onSignup={handleSignup} users={users} />
            </div>
          </div>
        </div>
        <Footer />
        <Toaster />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1">
          {currentUser.role === 'admin' ? (
            <AdminDashboard {...adminDashboardProps} />
          ) : (
            <FacultyDashboard {...facultyDashboardProps} />
          )}
        </div>
        <Footer />
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}
