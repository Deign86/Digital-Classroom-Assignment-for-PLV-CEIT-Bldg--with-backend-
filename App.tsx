import './styles/globals.css';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import FacultyDashboard from './components/FacultyDashboard';
import PasswordResetPage from './components/PasswordResetPage';
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
import { authService } from './lib/supabaseAuth';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'faculty';
  department?: string;
  // Password removed - now managed securely by Supabase Auth
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

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
      const user = await authService.signIn(email, password);
      if (user) {
        setCurrentUser(user);
        // Don't store in localStorage - Supabase handles session management
        toast.success(`Welcome back, ${user.name}!`);
        return true;
      }
      // Only show error if this is actually a login attempt with credentials
      if (email && password) {
        toast.error('Invalid credentials', {
          description: 'Please check your email and password and try again.'
        });
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Login failed');
      return false;
    }
  }, []);

  const handleSignup = useCallback(async (email: string, name: string, department: string) => {
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

      // No password needed - admin will set it upon approval
      const newRequest = await signupRequestService.create({
        email,
        name,
        department,
        password: '', // Empty - not used anymore, admin sets password on approval
        status: 'pending'
      });

      setSignupRequests(prev => [...prev, newRequest]);
      toast.success('Signup request submitted!', {
        description: 'Your request has been sent to the administrator for review. You will be contacted once your account is approved.',
        duration: 6000
      });
      return true;
    } catch (err) {
      console.error('Signup error:', err);
      toast.error('Signup failed');
      return false;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      console.log('🔴 Logout clicked - user:', currentUser?.email);
      
      // Sign out from Supabase Auth
      await authService.signOut();
      console.log('✅ Supabase signOut complete');
      
      // Manually clear user state (auth listener will also trigger, but this ensures immediate UI update)
      setCurrentUser(null);
      
      // Clear all cached data
      setClassrooms([]);
      setBookingRequests([]);
      setSignupRequests([]);
      setSchedules([]);
      setUsers([]);
      
      console.log('✅ User state cleared');
      toast.success('Logged out successfully');
    } catch (err) {
      console.error('❌ Logout error:', err);
      // Force logout even if auth service fails
      setCurrentUser(null);
      setClassrooms([]);
      setBookingRequests([]);
      setSignupRequests([]);
      setSchedules([]);
      setUsers([]);
      toast.error('Logged out (with errors). Please refresh if needed.');
    }
  }, [currentUser]);

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
    try {
      // Check if the booking time is in the past
      if (isPastBookingTime(request.date, convertTo12Hour(request.startTime))) {
        toast.error('Cannot request time slots that have already passed');
        return;
      }

      // Check for conflicts with confirmed schedules and approved/pending requests
      // Note: There's still a potential race condition here (time between check and create)
      // In a production system, implement database-level unique constraints or use transactions
      const hasConflict = await checkConflicts(
        request.classroomId,
        request.date,
        request.startTime,
        request.endTime,
        false
      );

      if (hasConflict) {
        toast.error('Classroom conflict detected - time slot already booked or has pending request');
        return;
      }

      // Submit the booking request
      const newRequest = await bookingRequestService.create({
        ...request,
        status: 'pending'
      });
      
      setBookingRequests(prev => [...prev, newRequest]);
      toast.success('Classroom request submitted!');
    } catch (err) {
      console.error('Booking request error:', err);
      // Check if it's a duplicate/conflict error from the database
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('conflict') || errorMessage.includes('duplicate')) {
        toast.error('Request failed: time slot was just booked by another user');
      } else {
        toast.error('Failed to submit booking request. Please try again.');
      }
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

      // If approving, verify there are no conflicts with already approved/confirmed bookings
      if (approved) {
        // Check if the booking time has already passed
        if (isPastBookingTime(request.date, convertTo12Hour(request.startTime))) {
          toast.error('Cannot approve: booking time has already passed');
          return;
        }

        // Check for conflicts with existing confirmed schedules and approved requests
        const hasConflict = await checkConflicts(
          request.classroomId,
          request.date,
          request.startTime,
          request.endTime,
          false, // Don't check past time again (already checked above)
          requestId // Exclude this request from conflict check
        );

        if (hasConflict) {
          toast.error('Cannot approve: conflicts with existing confirmed booking. Please reject this request.');
          return;
        }
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

  const handleSignupApproval = useCallback(async (requestId: string, approved: boolean, password?: string, feedback?: string) => {
    try {
      const request = signupRequests.find(r => r.id === requestId);
      if (!request) {
        toast.error('Request not found');
        return;
      }

      if (approved) {
        // Validate password is provided
        if (!password || password.length < 8) {
          toast.error('A valid password (min 8 characters) is required to approve the request');
          return;
        }

        // Create the user account with the admin-provided password
        const newUser = await userService.create({
          email: request.email,
          name: request.name,
          role: 'faculty',
          department: request.department,
          password: password // Admin-provided temporary password
        });
        
        // Update the signup request status
        const updatedRequest = await signupRequestService.update(requestId, {
          status: 'approved',
          adminFeedback: feedback || 'Account approved'
        });

        setSignupRequests(prev =>
          prev.map(req => req.id === requestId ? updatedRequest : req)
        );
        
        setUsers(prev => [...prev, newUser]);
        
        // Account created successfully
        toast.success(`Faculty account approved for ${request.name}!`, {
          description: `Account has been created and is ready to use. Please share the credentials below with the user.`,
          duration: 10000
        });
        
        // Show the temporary password for admin to share
        toast.info(`Login Credentials - Please Share These`, {
          description: `Email: ${request.email}\nTemporary Password: ${password}\n\nPlease share these credentials with the user via email, phone, or in person.`,
          duration: 20000
        });
      } else {
        // Rejection requires feedback
        if (!feedback || !feedback.trim()) {
          toast.error('Feedback is required when rejecting a request');
          return;
        }

        // Just update the status to rejected
        const updatedRequest = await signupRequestService.update(requestId, {
          status: 'rejected',
          adminFeedback: feedback
        });

        setSignupRequests(prev =>
          prev.map(req => req.id === requestId ? updatedRequest : req)
        );
        
        toast.success(`Signup request rejected for ${request.name}.`, {
          description: 'Rejection notification will be sent to the applicant.',
          duration: 5000
        });
      }
    } catch (err) {
      console.error('Signup approval error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error('Failed to process signup request', {
        description: errorMessage,
        duration: 5000
      });
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
        console.log('🚀 Initializing app...');
        
        // Check if Supabase environment variables are configured
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.error('❌ Missing Supabase environment variables');
          setError('Missing Supabase configuration. Please create a .env file with your Supabase credentials.');
          setIsLoading(false);
          return;
        }

        // Check for auth errors in URL hash (expired reset links, etc.)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorCode = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        // Check if this is a password recovery flow
        if (type === 'recovery' && accessToken) {
          console.log('🔑 Password recovery flow detected');
          setIsPasswordRecovery(true);
          setIsLoading(false);
          return; // Don't load data yet, show password reset page
        }
        
        if (errorCode) {
          console.error('⚠️ Auth error from URL:', errorCode, errorDescription);
          
          // Show user-friendly error message
          if (errorDescription?.includes('expired') || errorCode === 'access_denied') {
            toast.error('Link Expired', {
              description: 'This password reset link has expired. Please request a new one.',
              duration: 8000
            });
          } else {
            toast.error('Authentication Error', {
              description: errorDescription || 'An authentication error occurred. Please try again.',
              duration: 8000
            });
          }
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Load all data from Supabase
        console.log('📊 Loading data...');
        await loadAllData();
        console.log('✅ Data loaded');

        // Check for active Supabase Auth session
        console.log('🔐 Checking for active session...');
        const user = await authService.getCurrentUser();
        if (user) {
          console.log('✅ User session found:', user.email);
          setCurrentUser(user);
        } else {
          console.log('ℹ️ No active session');
        }
        
        console.log('✅ App initialized successfully');
      } catch (err) {
        console.error('❌ Failed to initialize app:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to connect to database: ${errorMessage}. Please check your Supabase configuration.`);
      } finally {
        // ALWAYS set loading to false, no matter what happens
        console.log('✅ Setting isLoading to false');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [loadAllData]);

  // Separate effect for auth state listener to ensure proper cleanup
  useEffect(() => {
    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = authService.onAuthStateChange(
      (user) => {
        setCurrentUser(user);
      },
      (error) => {
        // Handle auth errors (expired links, invalid tokens)
        console.error('Auth error:', error);
        toast.error('Authentication Error', {
          description: error,
          duration: 8000
        });
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  // Show password reset page if user is in recovery flow
  if (isPasswordRecovery) {
    return (
      <>
        <PasswordResetPage
          onSuccess={() => {
            setIsPasswordRecovery(false);
            toast.success('You can now log in with your new password');
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
          onCancel={() => {
            setIsPasswordRecovery(false);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
        />
        <Toaster />
      </>
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
