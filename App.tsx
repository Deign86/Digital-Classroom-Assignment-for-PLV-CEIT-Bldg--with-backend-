import './styles/globals.css';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import FacultyDashboard from './components/FacultyDashboard';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import useIdleTimeout from './hooks/useIdleTimeout';
import { isPastBookingTime, convertTo12Hour } from './utils/timeUtils';
import {
  authService,
  userService,
  classroomService,
  signupRequestService,
  signupHistoryService,
  bookingRequestService,
  scheduleService,
  realtimeService
} from './lib/firebaseService';

// Expose services to window for debugging in development
if (import.meta.env.DEV) {
  (window as any).authService = authService;
  (window as any).realtimeService = realtimeService;
  (window as any).classroomService = classroomService;
  console.log('🛠️ Services exposed to window for debugging');
}

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

export interface SignupHistory {
  id: string;
  userId: string;
  email: string;
  name: string;
  department: string;
  requestDate: string;
  status: 'approved' | 'rejected';
  adminFeedback: string;
  resolvedAt: string;
  processedBy: string; // Admin user ID who processed the request
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
  const [signupHistory, setSignupHistory] = useState<SignupHistory[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);

  // All hooks must be at the top level - move memoized data here
  const facultySchedules = useMemo(() => {
    if (!currentUser) return [];
    return schedules.filter(s => s.facultyId === currentUser.id);
  }, [schedules, currentUser]);
  
  const facultyBookingRequests = useMemo(() => {
    if (!currentUser) return [];
    return bookingRequests.filter(r => r.facultyId === currentUser.id);
  }, [bookingRequests, currentUser]);

  // Setup real-time data listeners based on user role and permissions
  const setupRealtimeListeners = useCallback((user: User | null) => {
    console.log('🔄 Setting up real-time data listeners...');
    
    if (!user) {
      // Clear data when no user
      setUsers([]);
      setClassrooms([]);
      setSignupRequests([]);
      setBookingRequests([]);
      setSchedules([]);
      realtimeService.cleanup();
      return;
    }

    try {
      setIsLoading(true);
      
      realtimeService.subscribeToData(user, {
        onClassroomsUpdate: (classrooms) => {
          console.log('📍 Real-time update: Classrooms', classrooms.length);
          setClassrooms(classrooms);
        },
        
        onBookingRequestsUpdate: (requests) => {
          console.log('📋 Real-time update: Booking Requests', requests.length);
          setBookingRequests(requests);
        },
        
        onSchedulesUpdate: (schedules) => {
          console.log('📅 Real-time update: Schedules', schedules.length);
          setSchedules(schedules);
        },
        
        onSignupRequestsUpdate: user.role === 'admin' ? (requests) => {
          console.log('👥 Real-time update: Signup Requests', requests.length);
          setSignupRequests(requests);
        } : undefined,
        
        onUsersUpdate: user.role === 'admin' ? (users) => {
          console.log('👤 Real-time update: Users', users.length);
          setUsers(users);
        } : undefined,
        
        onError: (error) => {
          console.error('❌ Real-time listener error:', error);
          toast.error('Real-time sync error. Some data may be outdated.');
        }
      });

      // For faculty users, set their own user data
      if (user.role === 'faculty') {
        setUsers([user]);
        setSignupRequests([]);
        setSignupHistory([]);
      } else if (user.role === 'admin') {
        // Load signup history for admins
        signupHistoryService.getAll()
          .then((history) => {
            console.log('📜 Loaded signup history:', history.length);
            setSignupHistory(history);
          })
          .catch((err) => {
            console.error('❌ Failed to load signup history:', err);
            // Non-critical error - don't block the app
          });
      }
      
      console.log('✅ Real-time listeners setup complete');
    } catch (err) {
      console.error('❌ Failed to setup real-time listeners:', err);
      toast.error('Failed to setup real-time data sync');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      const user = await authService.signIn(email, password);
      if (user) {
        setCurrentUser(user);
        
        // Show welcome message immediately based on user role
        const greeting = user.role === 'admin' ? 'Welcome back, Administrator' : 'Welcome back';
        toast.success(`${greeting}, ${user.name}!`, {
          description: `You're logged in as ${user.role === 'admin' ? 'Administrator' : 'Faculty'}`,
          duration: 4000,
        });
        
        // Setup real-time listeners after successful login
        setupRealtimeListeners(user);
        
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
  }, [setupRealtimeListeners]);

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

        let request: SignupRequest;
        
        try {
          const result = await authService.registerFaculty(email, password, name, department);
          request = result.request;
        } catch (registerError: any) {
          // Handle the case where email already exists but user was previously rejected
          if (registerError?.code === 'auth/email-already-in-use') {
            console.log('Auth account exists, checking if user was previously rejected...');
            
            // Check if there's an existing user record
            try {
              const existingUser = await userService.getByEmail(email);
              if (existingUser) {
                toast.error('Account already exists', {
                  description: 'Please sign in or reset your password if you forgot it.',
                });
                return false;
              }
            } catch (userCheckError) {
              console.log('No existing user record found, attempting reactivation...');
            }
            
            // No user record exists, try to reactivate the account
            try {
              const result = await authService.handleRejectedUserReactivation(email, password, name, department);
              request = result.request;
              
              toast.success('Account reactivated!', {
                description: 'Your signup request has been resubmitted for administrator review.',
                duration: 6000,
              });
            } catch (reactivationError: any) {
              console.error('Reactivation failed:', reactivationError);
              if (reactivationError?.code === 'auth/invalid-login-credentials') {
                toast.error('Cannot reuse this email', {
                  description: 'This email was previously used. Please use a different email or contact support.',
                  duration: 8000,
                });
              } else {
                toast.error('Reactivation failed', {
                  description: 'Unable to reactivate account. Please contact support.',
                });
              }
              return false;
            }
          } else {
            throw registerError; // Re-throw other registration errors
          }
        }

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

        // Show default success message for new registrations
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
      
      // Cleanup real-time listeners
      realtimeService.cleanup();
      
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
      
      // Cleanup real-time listeners
      realtimeService.cleanup();
      
      setClassrooms([]);
      setBookingRequests([]);
      setSignupRequests([]);
      setSchedules([]);
      setUsers([]);
      toast.error('Logged out (with errors). Please refresh if needed.');
    }
  }, [currentUser]);

  // Idle timeout handlers
  const handleIdleTimeout = useCallback(async () => {
    console.log('🕒 Session expired due to inactivity');
    toast.warning('Session expired due to inactivity', {
      description: 'You have been logged out for security reasons',
      duration: 5000
    });
    
    try {
      await authService.signOutDueToIdleTimeout();
      setCurrentUser(null);
      setClassrooms([]);
      setBookingRequests([]);
      setSignupRequests([]);
      setSchedules([]);
      setUsers([]);
      setShowSessionWarning(false);
    } catch (err) {
      console.error('❌ Idle timeout logout error:', err);
      // Force logout even if service fails
      setCurrentUser(null);
      setShowSessionWarning(false);
    }
  }, []);

  const handleSessionWarning = useCallback((timeRemaining: number) => {
    console.log(`⚠️ Session warning - ${Math.ceil(timeRemaining / 1000)}s remaining`);
    setSessionTimeRemaining(timeRemaining);
    setShowSessionWarning(true);
    
    toast.warning('Session Expiring Soon', {
      description: `Your session will expire in ${Math.ceil(timeRemaining / 60000)} minutes due to inactivity`,
      duration: 8000
    });
  }, []);

  const handleExtendSession = useCallback(() => {
    console.log('🔄 Session extended by user');
    setShowSessionWarning(false);
    toast.success('Session extended successfully');
  }, []);

  // Initialize idle timeout hook (30 minutes = 30 * 60 * 1000 ms)
  const { extendSession } = useIdleTimeout({
    timeout: 30 * 60 * 1000, // 30 minutes
    warningTime: 5 * 60 * 1000, // 5 minutes warning
    onIdle: handleIdleTimeout,
    onWarning: handleSessionWarning,
    disabled: !currentUser, // Only track when user is logged in
  });

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

          if (!currentUser) {
            toast.error('Admin user information not available');
            return;
          }

          // Use the new rejection method that properly cleans up everything
          await signupRequestService.rejectAndCleanup(requestId, currentUser.id, feedback);

          // Remove the request from the UI
          setSignupRequests((prev) => prev.filter((entry) => entry.id !== requestId));

          // Remove the user from the users list since they've been deleted
          setUsers((prev) => prev.filter((user) => user.id !== request.userId));

          toast.success(`Signup request rejected for ${request.name}.`, {
            description: 'The account has been completely removed. They can submit a new signup request.',
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
      await scheduleService.cancelApprovedBooking(scheduleId);
      
      setSchedules(prev =>
        prev.map(schedule => 
          schedule.id === scheduleId 
            ? { ...schedule, status: 'cancelled' as const }
            : schedule
        )
      );
      
      toast.success('Booking cancelled!');
    } catch (err) {
      console.error('Cancel schedule error:', err);
      toast.error('Failed to cancel booking');
    }
  }, []);

  const handleCancelApprovedBooking = useCallback(async (requestId: string) => {
    try {
      // Find the corresponding schedule for this booking request
      const correspondingSchedule = schedules.find(schedule => 
        schedule.facultyId === bookingRequests.find(req => req.id === requestId)?.facultyId &&
        schedule.date === bookingRequests.find(req => req.id === requestId)?.date &&
        schedule.startTime === bookingRequests.find(req => req.id === requestId)?.startTime &&
        schedule.endTime === bookingRequests.find(req => req.id === requestId)?.endTime &&
        schedule.classroomId === bookingRequests.find(req => req.id === requestId)?.classroomId
      );

      if (correspondingSchedule) {
        await scheduleService.cancelApprovedBooking(correspondingSchedule.id);
        
        setSchedules(prev =>
          prev.map(schedule => 
            schedule.id === correspondingSchedule.id 
              ? { ...schedule, status: 'cancelled' as const }
              : schedule
          )
        );
      }

      // Update the booking request status to rejected
      await bookingRequestService.update(requestId, { status: 'rejected', adminFeedback: 'Booking cancelled by administrator' });
      
      setBookingRequests(prev =>
        prev.map(request => 
          request.id === requestId 
            ? { ...request, status: 'rejected' as const, adminFeedback: 'Booking cancelled by administrator' }
            : request
        )
      );
      
      toast.success('Approved booking cancelled!');
    } catch (err) {
      console.error('Cancel approved booking error:', err);
      toast.error('Failed to cancel approved booking');
    }
  }, [schedules, bookingRequests]);

  // Create dashboard props objects to prevent prop drilling and improve performance
  const adminDashboardProps = useMemo(() => ({
    user: currentUser!,
    classrooms,
    bookingRequests,
    signupRequests,
    signupHistory,
    schedules,
    onLogout: handleLogout,
    onClassroomUpdate: handleClassroomUpdate,
    onRequestApproval: handleRequestApproval,
    onSignupApproval: handleSignupApproval,
    onCancelSchedule: handleCancelSchedule,
    onCancelApprovedBooking: handleCancelApprovedBooking,
    checkConflicts
  }), [currentUser, classrooms, bookingRequests, signupRequests, signupHistory, schedules, handleLogout, handleClassroomUpdate, handleRequestApproval, handleSignupApproval, handleCancelSchedule, handleCancelApprovedBooking, checkConflicts]);

  const facultyDashboardProps = useMemo(() => ({
    user: currentUser!,
    classrooms,
    schedules: facultySchedules,
    allSchedules: schedules,
    bookingRequests: facultyBookingRequests,
    allBookingRequests: bookingRequests,
    onLogout: handleLogout,
    onBookingRequest: handleBookingRequest,
    checkConflicts
  }), [currentUser, classrooms, facultySchedules, schedules, facultyBookingRequests, bookingRequests, handleLogout, handleBookingRequest, checkConflicts]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');

        const user = await authService.getCurrentUser();
        
        if (user) {
          console.log('✅ Valid user session found:', user.email);
          setCurrentUser(user);
          
          // Setup real-time listeners if user is authenticated
          console.log('📊 Setting up real-time listeners...');
          setupRealtimeListeners(user);
          console.log('✅ Real-time listeners setup');
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
  }, [setupRealtimeListeners]);

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
            console.log('📊 New user detected, setting up listeners...');
            try {
              setupRealtimeListeners(user);
            } catch (err) {
              console.error('Failed to setup listeners after auth change:', err);
            }
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

    // Cleanup subscription and listeners on unmount
    return () => {
      subscription.unsubscribe();
      realtimeService.cleanup();
    };
  }, []);

  // Expose services after app initialization (for debugging)
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).authService = authService;
      (window as any).realtimeService = realtimeService;
      (window as any).classroomService = classroomService;
      (window as any).userService = userService;
      (window as any).bookingRequestService = bookingRequestService;
      (window as any).scheduleService = scheduleService;
      (window as any).signupRequestService = signupRequestService;
      console.log('🛠️ All services exposed to window for debugging');
      
      // Also expose a quick test function
      (window as any).testRealtimeNow = () => {
        console.log('🧪 Real-time Service Test:');
        console.log('Listener count:', realtimeService.getListenerCount());
        console.log('Auth service:', !!authService);
        console.log('Current user available:', !!currentUser);
        console.log('Services working:', {
          auth: !!authService,
          realtime: !!realtimeService,
          classroom: !!classroomService
        });
      };
    }
  }, [currentUser]);

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
          <Analytics />
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
          <Analytics />
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
        <Analytics />
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
        <SessionTimeoutWarning
          isOpen={showSessionWarning}
          timeRemaining={sessionTimeRemaining}
          onExtendSession={() => {
            extendSession();
            handleExtendSession();
          }}
          onLogout={handleIdleTimeout}
        />
        <Toaster />
        <Analytics />
      </div>
    </ErrorBoundary>
  );
}
