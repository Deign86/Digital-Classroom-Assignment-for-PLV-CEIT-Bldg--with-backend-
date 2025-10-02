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
  authService,
  userService,
  classroomService,
  signupRequestService,
  bookingRequestService,
  scheduleService
} from './lib/firebaseService';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'faculty';
  department?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface SignupRequest {
  id: string;
  userId: string;
  email: string;
  name: string;
  department: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  adminFeedback?: string;
  resolvedAt?: string;
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
  const [isAuthChecked, setIsAuthChecked] = useState(false);
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

  // Load all data from local storage
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
        // Load all data after successful login
        await loadAllData();
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
      
      // Check for specific status errors (pending/rejected accounts)
      if (err instanceof Error && 'status' in err) {
        const status = (err as { status: SignupRequest['status'] }).status;
        if (status === 'pending') {
          toast.info('Awaiting approval', {
            description: 'Your account is pending administrator approval. Watch your email for updates.',
            duration: 6000,
          });
          return false;
        } else if (status === 'rejected') {
          toast.error('Account rejected', {
            description: 'Please contact the administrator for assistance.',
            duration: 6000,
          });
          return false;
        }
      }
      
      // Handle Firebase auth errors
      let message = 'Please check your email and password and try again.';
      if (err && typeof err === 'object' && 'code' in err) {
        const code = (err as { code?: string }).code;
        switch (code) {
          case 'auth/invalid-email':
            message = 'Invalid email address format.';
            break;
          case 'auth/user-not-found':
            message = 'No account found with this email address.';
            break;
          case 'auth/wrong-password':
            message = 'Incorrect password. Please try again.';
            break;
          case 'auth/too-many-requests':
            message = 'Too many failed login attempts. Please try again later.';
            break;
          case 'auth/user-disabled':
            message = 'This account has been disabled.';
            break;
          case 'permission-denied':
            message = 'Permission denied. Please contact administrator.';
            break;
          default:
            // Show the actual Firebase error message if available
            if ('message' in err && typeof err.message === 'string') {
              message = err.message;
            } else {
              message = `Authentication error: ${code}`;
            }
        }
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      
      toast.error('Login failed', { description: message, duration: 6000 });
      return false;
    }
  }, [loadAllData]);

  const handleSignup = useCallback(
    async (email: string, name: string, department: string, password: string) => {
      try {
        // Check for duplicate requests (optional - don't fail signup if this fails)
        try {
          const pendingRequest = await signupRequestService.getByEmail(email);
          if (pendingRequest) {
            toast.error('Request already pending', {
              description: 'Please wait for an administrator to review your existing request.',
            });
            return false;
          }
        } catch (checkError) {
          console.warn('Could not check for existing requests:', checkError);
          // Continue with signup anyway
        }

        const { request } = await authService.registerFaculty(email, password, name, department);

        setSignupRequests((prev) => {
          const withoutDuplicate = prev.filter((existing) => existing.id !== request.id);
          return [request, ...withoutDuplicate];
        });

        // Try to load user data (optional - don't fail signup if this fails)
        try {
          const maybeUser = await userService.getByEmail(email);
          if (maybeUser) {
            setUsers((prev) => {
              const others = prev.filter((user) => user.id !== maybeUser.id);
              return [...others, maybeUser];
            });
          }
        } catch (userError) {
          console.warn('Could not load user data:', userError);
          // Continue anyway - the signup was successful
        }

        toast.success('Signup request submitted!', {
          description:
            'Your account has been created with pending status. An administrator will approve your access shortly.',
          duration: 6000,
        });
        return true;
      } catch (err) {
        console.error('Signup error:', err);
        let message = 'Unable to submit signup request.';
        
        if (err && typeof err === 'object') {
          // Check for Firebase error code first
          if ('code' in err) {
            const code = (err as { code?: string }).code;
            switch (code) {
              case 'auth/email-already-in-use':
                message = 'This email already has an account. Try signing in or resetting your password.';
                break;
              case 'auth/weak-password':
                message = 'Password should be at least 6 characters and hard to guess.';
                break;
              case 'auth/password-does-not-meet-requirements':
                message = 'Password must contain uppercase letter, lowercase letter, number, and special character.';
                break;
              case 'permission-denied':
                message = 'Permission denied. Please check Firebase security rules.';
                break;
              default:
                // If we have a message property, use it
                if ('message' in err && typeof err.message === 'string') {
                  message = err.message;
                } else {
                  message = `Firebase error: ${code}`;
                }
            }
          } else if ('message' in err && typeof err.message === 'string') {
            // Use the error message directly if available
            message = err.message;
          }
        } else if (err instanceof Error && err.message) {
          message = err.message;
        }

        toast.error('Signup failed', { description: message, duration: 8000 });
        return false;
      }
    },
    []
  );

  const handleLogout = useCallback(async () => {
    try {
      console.log('🔴 Logout clicked - user:', currentUser?.email);
      
      await authService.signOut();
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
      const newRequest = await bookingRequestService.create(request);
      
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
      const updateData: { status: 'approved' | 'rejected'; adminFeedback?: string } = {
        status: approved ? 'approved' : 'rejected'
      };
      
      // Only include adminFeedback if it's provided
      if (feedback && feedback.trim()) {
        updateData.adminFeedback = feedback.trim();
      }
      
      const updatedRequest = await bookingRequestService.update(requestId, updateData);

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

  const handleSignupApproval = useCallback(
    async (requestId: string, approved: boolean, feedback?: string) => {
      try {
        const request = signupRequests.find((r) => r.id === requestId);
        if (!request) {
          toast.error('Request not found');
          return;
        }

        if (request.status !== 'pending') {
          toast.error('Request has already been processed');
          return;
        }

        const resolvedAt = new Date().toISOString();

        if (approved) {
          const updatedRequest = await signupRequestService.update(requestId, {
            status: 'approved',
            adminFeedback: feedback || 'Account approved',
            resolvedAt,
          });

          const updatedUser = await userService.updateStatus(request.userId, 'approved', {
            name: request.name,
            department: request.department,
            role: 'faculty',
          });

          setSignupRequests((prev) =>
            prev.map((entry) => (entry.id === requestId ? updatedRequest : entry))
          );

          setUsers((prev) => {
            const existingIndex = prev.findIndex((user) => user.id === updatedUser.id);
            if (existingIndex === -1) {
              return [...prev, updatedUser];
            }
            const copy = [...prev];
            copy[existingIndex] = updatedUser;
            return copy;
          });

          toast.success(`Faculty account approved for ${request.name}!`, {
            description: 'They can now sign in with the password they created during signup.',
            duration: 8000,
          });
        } else {
          if (!feedback || !feedback.trim()) {
            toast.error('Feedback is required when rejecting a request');
            return;
          }

          const updatedRequest = await signupRequestService.update(requestId, {
            status: 'rejected',
            adminFeedback: feedback,
            resolvedAt,
          });

          const updatedUser = await userService.updateStatus(request.userId, 'rejected');

          setSignupRequests((prev) =>
            prev.map((entry) => (entry.id === requestId ? updatedRequest : entry))
          );

          setUsers((prev) => {
            const existingIndex = prev.findIndex((user) => user.id === updatedUser.id);
            if (existingIndex === -1) {
              return [...prev, updatedUser];
            }
            const copy = [...prev];
            copy[existingIndex] = updatedUser;
            return copy;
          });

          toast.success(`Signup request rejected for ${request.name}.`, {
            description: 'The applicant will not be able to sign in until a new request is approved.',
            duration: 6000,
          });
        }
      } catch (err) {
        console.error('Signup approval error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        toast.error('Failed to process signup request', {
          description: errorMessage,
          duration: 5000,
        });
      }
    },
    [signupRequests]
  );

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

        const user = await authService.getCurrentUser();
        
        if (user) {
          console.log('✅ Valid user session found:', user.email);
          setCurrentUser(user);
          
          // Only load data if user is authenticated
          console.log('📊 Loading data...');
          await loadAllData();
          console.log('✅ Data loaded');
        } else {
          console.log('ℹ️ No valid session found');
        }
        
        console.log('✅ App initialized successfully');
      } catch (err) {
        console.error('❌ Failed to initialize app:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load application data: ${errorMessage}. Please refresh the page.`);
      } finally {
        // Mark that auth has been checked and stop loading
        console.log('✅ Setting isLoading to false');
        setIsAuthChecked(true);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [loadAllData]);

  // Separate effect for auth state listener to ensure proper cleanup
  useEffect(() => {
    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = authService.onAuthStateChange(
      async (user) => {
        console.log('👤 Auth state changed, new user:', user?.email || 'none');
        
        // Only update if user actually changed to prevent loops
        setCurrentUser(prevUser => {
          if (prevUser?.id === user?.id) {
            console.log('ℹ️ Same user, skipping update');
            return prevUser;
          }
          
          // If a new user logged in and we have no data yet, load it
          if (user && !prevUser) {
            console.log('📊 New user detected, loading data...');
            loadAllData().catch(err => {
              console.error('Failed to load data after auth change:', err);
            });
          }
          
          return user;
        });
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

  // Show loading state during initialization - only show this if auth hasn't been checked yet
  // This prevents the flash of login page while checking auth state
  if (!isAuthChecked || isLoading) {
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

  // Only show login page after auth has been checked and confirmed there's no user
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

  const activeUser = currentUser!;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1">
          {activeUser.role === 'admin' ? (
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
