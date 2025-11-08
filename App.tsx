import './styles/globals.css';
import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { logger } from './lib/logger';
import LoginForm from './components/LoginForm';
// Lazy-load heavy dashboard components to reduce initial bundle size
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const FacultyDashboard = React.lazy(() => import('./components/FacultyDashboard'));

// Use a single inline loader (the PLV loader below) as the Suspense fallback.
import Footer from './components/Footer';
import AnnouncerProvider, { useAnnouncer } from './components/Announcer';
import ErrorBoundary from './components/ErrorBoundary';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import NetworkStatusIndicator from './components/NetworkStatusIndicator';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './components/ui/alert-dialog';
import { buttonVariants } from './components/ui/button';
import { cn } from './components/ui/utils';
import useIdleTimeout from './hooks/useIdleTimeout';
import { isPastBookingTime, convertTo12Hour } from './utils/timeUtils';
import { executeWithNetworkHandling } from './lib/networkErrorHandler';
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
import { getFirebaseDb } from './lib/firebaseConfig';
import { doc as fsDoc, onSnapshot as fsOnSnapshot } from 'firebase/firestore';

// Expose services to window for debugging in development
if (import.meta.env.DEV) {
  (window as any).authService = authService;
  (window as any).realtimeService = realtimeService;
  (window as any).classroomService = classroomService;
  // Expose pushService for test push sending from the console
    try {
    // Dynamically import to avoid circular import issues
    import('./lib/pushService').then((mod) => {
      (window as any).pushService = mod.pushService;
      logger.log('🛠️ pushService exposed to window for debugging');
    }).catch((e) => logger.warn('Could not expose pushService to window', e));
  } catch (err) {
    logger.warn('Could not dynamically load pushService for dev exposure', err);
  }
}

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'faculty';
  department?: string; // Deprecated: kept for backward compatibility
  departments?: string[]; // New: array of departments for faculty teaching in multiple departments
  status: 'pending' | 'approved' | 'rejected';
  failedLoginAttempts?: number;
  accountLocked?: boolean;
  lockedUntil?: string;
  // If true, the account was manually disabled by an admin and should remain locked until an admin unlocks it.
  lockedByAdmin?: boolean;
  // Whether the user has enabled browser/service-worker push notifications
  pushEnabled?: boolean;
  // ISO timestamp of the user's last sign-in. Used to infer recent activity sessions.
  lastSignInAt?: string;
}

export interface SignupRequest {
  id: string;
  userId: string;
  email: string;
  name: string;
  department: string; // Primary department (for backward compatibility)
  departments?: string[]; // New: array of departments
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
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
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
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  // Overlay manager for a single top-level loader shared across init & Suspense
  const overlayCountRef = React.useRef(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);

  const showOverlay = React.useCallback((msg?: string) => {
    overlayCountRef.current = overlayCountRef.current + 1;
    setOverlayMessage(msg ?? 'Loading...');
    setOverlayVisible(true);
  }, []);

  const hideOverlay = React.useCallback(() => {
    overlayCountRef.current = Math.max(0, overlayCountRef.current - 1);
    if (overlayCountRef.current === 0) {
      setOverlayVisible(false);
      setOverlayMessage(null);
    }
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [showAccountLockedDialog, setShowAccountLockedDialog] = useState(false);
  const [accountLockedMessage, setAccountLockedMessage] = useState<string | null>(null);
  const [accountLockReason, setAccountLockReason] = useState<'failed_attempts' | 'admin_lock' | 'realtime_lock' | null>(null);
  const [accountLockedUntil, setAccountLockedUntil] = useState<string | null>(null); // ISO timestamp
  const [lockTimeRemaining, setLockTimeRemaining] = useState<string | null>(null); // Formatted countdown
  // Use Vite's import.meta.env in the browser. Fall back to a sensible default.
  const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL ?? import.meta.env.REACT_APP_SUPPORT_EMAIL ?? 'it-support@plv.edu.ph') as string;
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);
  // Pending destructive reject action (replaces window.confirm)
  // Include the signup request's userId so we can reliably remove the correct user record
  const [pendingRejectAction, setPendingRejectAction] = useState<{
    requestId: string;
    userId: string;
    feedback: string;
    requestName: string;
  } | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  // State to support undoing a recently submitted booking
  const [recentlySubmittedBooking, setRecentlySubmittedBooking] = useState<{
    id: string;
    draft: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>;
  } | null>(null);
  const undoTimerRef = React.useRef<number | null>(null);
  // External prefill passed to FacultyDashboard to open the booking tab and prefill the form
  const [externalBookingPrefill, setExternalBookingPrefill] = useState<{
    classroomId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    purpose?: string;
  } | null>(null);

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
    // Track which user we've already logged setup for to avoid noisy duplicate logs
    const lastLoggedRealtimeUserIdRef = (setupRealtimeListeners as any)._lastLoggedRealtimeUserIdRef as React.MutableRefObject<string | null> | undefined;
    if (!lastLoggedRealtimeUserIdRef) {
      (setupRealtimeListeners as any)._lastLoggedRealtimeUserIdRef = { current: null } as React.MutableRefObject<string | null>;
    }
    const lastLoggedRef = (setupRealtimeListeners as any)._lastLoggedRealtimeUserIdRef as React.MutableRefObject<string | null>;
    const shouldLogSetup = Boolean(user && lastLoggedRef.current !== user.id);
    if (shouldLogSetup) logger.log('🔄 Setting up real-time data listeners...');
    
    if (!user) {
      // Clear data when no user
      setUsers([]);
      setClassrooms([]);
      setSignupRequests([]);
      setBookingRequests([]);
      setSchedules([]);
      realtimeService.cleanup();
      try { ((setupRealtimeListeners as any)._lastLoggedRealtimeUserIdRef as React.MutableRefObject<string | null>).current = null; } catch (_) {}
      return;
    }

    try {
  setLoadingMessage('Loading...');
      setIsLoading(true);
      
      realtimeService.subscribeToData(user, {
        onClassroomsUpdate: (classrooms) => {
          logger.log('📍 Real-time update: Classrooms', classrooms.length);
          setClassrooms(classrooms);
          setLoadingMessage('Loading...');
        },
        
        onBookingRequestsUpdate: (requests) => {
          logger.log('📋 Real-time update: Booking Requests', requests.length);
          setBookingRequests(requests);
          setLoadingMessage('Loading...');
        },
        
        onSchedulesUpdate: (schedules) => {
          logger.log('📅 Real-time update: Schedules', schedules.length);
          setSchedules(schedules);
          setLoadingMessage('Loading...');
        },
        
        onSignupRequestsUpdate: user.role === 'admin' ? (requests) => {
          logger.log('👥 Real-time update: Signup Requests', requests.length);
          setSignupRequests(requests);
        } : undefined,
        onSignupHistoryUpdate: user.role === 'admin' ? (history) => {
          logger.log('📜 Real-time update: Signup History', history.length);
          setSignupHistory(history);
        } : undefined,
        
        onUsersUpdate: user.role === 'admin' ? (users) => {
          logger.log('👤 Real-time update: Users', users.length);
          setUsers(users);
        } : undefined,
        
        onError: (error) => {
          logger.error('❌ Real-time listener error:', error);
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
            logger.log('📜 Loaded signup history:', history.length);
            setSignupHistory(history);
          })
          .catch((err) => {
            // Log full error for debugging
            logger.error('❌ Failed to load signup history:', err);

            // Surface a user-facing toast so admins know history may be stale
            try {
              const message = err instanceof Error ? err.message : String(err);
              toast.error('Failed to load signup history', {
                description: message || 'Please refresh the page or try again later.',
                duration: 7000,
              });
            } catch (toastErr) {
              // If toasting fails for any reason, still keep the original error logged
              logger.warn('Could not show toast for signup history error:', toastErr);
            }
          });
      }
      
      if (shouldLogSetup) {
        logger.log('✅ Real-time listeners setup complete');
        try { ((setupRealtimeListeners as any)._lastLoggedRealtimeUserIdRef as React.MutableRefObject<string | null>).current = user?.id ?? null; } catch (_) {}
      }
      } catch (err) {
      logger.error('❌ Failed to setup real-time listeners:', err);
      toast.error('Failed to setup real-time data sync');
    } finally {
      setIsLoading(false);
      setLoadingMessage(null);
    }
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      const user = await authService.signIn(email, password);
      
      if (user) {
        setCurrentUser(user);
        const greeting = user.role === 'admin' ? 'Welcome back, Administrator' : 'Welcome back';
        toast.success(`${greeting}, ${user.name}!`, {
          duration: 4000,
        });
        return true;
      }
      
      return false;
    } catch (err) {
      // If the sign-in failed due to an account lock (tracked server-side),
      // surface the blocking account-locked dialog immediately by setting
      // sessionStorage flags and local state. This covers the case where the
      // user attempted to sign in but the server-side lock prevented sign-in
      // (so the Firestore snapshot listener won't run because there's no
      // authenticated session yet).
      try {
        if (err instanceof Error) {
          const msg = err.message || '';
          if (msg.includes('Account locked') || msg.includes('locked') || msg.includes('attempts remaining') || msg.includes('disabled by an administrator')) {
            try { sessionStorage.setItem('accountLocked', 'true'); } catch (_) {}
            try { sessionStorage.setItem('accountLockedMessage', msg); } catch (_) {}
            
            // Determine lock reason from error message
            let lockReason: 'failed_attempts' | 'admin_lock' | 'realtime_lock' = 'admin_lock';
            if (msg.includes('disabled by an administrator')) {
              lockReason = 'admin_lock';
            } else if (msg.includes('failed login attempts') || msg.includes('attempts remaining') || msg.includes('too many failed attempts')) {
              lockReason = 'failed_attempts';
            }
            try { sessionStorage.setItem('accountLockReason', lockReason); } catch (_) {}
            
            setAccountLockedMessage(msg);
            setAccountLockReason(lockReason);
            
            // IMMEDIATELY show the modal - no delay to prevent race conditions
            setShowAccountLockedDialog(true);

            // Record a lightweight debug event and log timestamps (dev only)
            if (import.meta.env.DEV) {
              const ts = Date.now();
              try {
                logger.debug(`DEBUG[lock] Lock modal shown immediately at ${new Date(ts).toISOString()} for`, email, { msg, lockReason });
              } catch (_) {}
            }
          }
        }
      } catch (e) {
        logger.warn('Could not set accountLocked session flag:', e);
      }

      // Show error toast with the error message (only once)
      // BUT skip toast if it's an account lock error (modal will be shown instead)
      if (err instanceof Error) {
        const msg = err.message || '';
        const isLockError = msg.includes('Account locked') || msg.includes('locked') || msg.includes('attempts remaining') || msg.includes('disabled by an administrator');
        
        if (!isLockError) {
          toast.error(err.message, {
            duration: 4000,
          });
        }
      } else {
        toast.error('An unknown login error occurred.', {
          duration: 4000,
        });
      }

      return false;
    }
  }, [setupRealtimeListeners]);

  const oldHandleLogin = useCallback(async (email: string, password: string) => {
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
        
  // Real-time listeners will be set up by the auth state listener
  // to centralize lifecycle handling and avoid duplicates.
        
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
      logger.error('Login error:', err);
      
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
            message = 'Too many login attempts from this device. Access temporarily restricted by Firebase security. Please wait 15-30 minutes or try password reset.';
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
        // Check for account locked error
        if (err.message.includes('Account locked') || err.message.includes('Account is locked')) {
          message = err.message;
        } else if (err.message.includes('attempts remaining')) {
          message = err.message;
        } else {
          message = err.message;
        }
      }
      
      toast.error('Login failed', { description: message, duration: 6000 });
      return false;
    }
  }, [setupRealtimeListeners]); // Note: I'm keeping the old function here for reference, but the new one is active.

  const handleSignup = useCallback(
    async (email: string, name: string, departments: string[], password: string, recaptchaToken?: string) => {
      try {
        // For backward compatibility, use first department as primary department
        const primaryDepartment = departments[0] || '';
        
        // Check for duplicate requests (optional - don't fail signup if this fails)
        // Only attempt reads if we have an authenticated client session to avoid permission errors
        try {
          const currentAuth = await authService.getCurrentUser();
          if (currentAuth) {
            const pendingRequest = await signupRequestService.getByEmail(email);
            if (pendingRequest) {
              toast.error('Request already pending', {
                description: 'Please wait for an administrator to review your existing request.',
              });
              return false;
            }
          }
        } catch (checkError) {
          // Do not surface permission errors for unauthenticated users. Log only unexpected errors.
          logger.warn('Could not check for existing requests (possibly unauthenticated):', checkError instanceof Error ? checkError.message : checkError);
        }

        let request: SignupRequest;
        
        try {
          const result = await authService.registerFaculty(email, password, name, primaryDepartment, departments, recaptchaToken);
          request = result.request;
        } catch (registerError: any) {
          // If registration fails because the email is already in use,
          // it means an Auth account exists. We should not allow a new signup.
          // This covers both active users and users whose accounts might be in a limbo state
          // after a rejected signup. We will treat them all as "account exists".
          if (registerError?.code === 'auth/email-already-in-use') {
            logger.log('Signup failed: email already in use. Directing user to sign in.');
            toast.error('Account already exists', {
              description: 'This email is already associated with an account. Please sign in or use the password reset link if you forgot your password.',
              duration: 8000,
            });
            return false;
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
          const currentAuth = await authService.getCurrentUser();
          if (currentAuth) {
            const maybeUser = await userService.getByEmail(email);
            if (maybeUser) {
              setUsers((prev) => {
                const others = prev.filter((user) => user.id !== maybeUser.id);
                return [...others, maybeUser];
              });
            }
          }
        } catch (userError) {
          logger.warn('Could not load user data (possibly unauthenticated):', userError instanceof Error ? userError.message : userError);
          // Continue anyway - the signup was successful
        }

        // Only show success toast if a request was actually created.
        if (request) {
          toast.success('Signup request submitted!', {
            description:
              'Your account has been created with pending status. An administrator will approve your access shortly.',
            duration: 6000,
          });
        }
        return true;
      } catch (err) {
        logger.error('Signup error:', err);
        // Log full error details for debugging
        if (err && typeof err === 'object') {
          logger.error('Error details:', {
            code: 'code' in err ? err.code : undefined,
            message: 'message' in err ? err.message : undefined,
            name: 'name' in err ? err.name : undefined,
          });
        }
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
      logger.log('🔴 Logout clicked - user:', currentUser?.email);
      await authService.signOut();

      // Clear any account lock flags from previous sessions
      try { 
        sessionStorage.removeItem('accountLocked');
        sessionStorage.removeItem('accountLockedMessage');
        sessionStorage.removeItem('accountLockReason');
      } catch (_) {}

      // Set flag for login page to show success notification
      sessionStorage.setItem('logoutSuccess', 'true');

      // Clear user state and listeners
      setCurrentUser(null);

      // Cleanup real-time listeners
      realtimeService.cleanup();

      // Clear all cached data
      setClassrooms([]);
      setBookingRequests([]);
      setSignupRequests([]);
      setSchedules([]);
      setUsers([]);

      logger.log('✅ User state cleared');
    } catch (err) {
      logger.error('❌ Logout error:', err);
      // Force logout even if auth service fails
      setCurrentUser(null);

      // Set flag for logout with error
      sessionStorage.setItem('logoutError', 'true');

      // Cleanup real-time listeners
      realtimeService.cleanup();

      setClassrooms([]);
      setBookingRequests([]);
      setSignupRequests([]);
      setSchedules([]);
      setUsers([]);
    }
  }, [currentUser]);

  // Idle timeout handlers
  const handleIdleTimeout = useCallback(async () => {
    logger.log('🕒 Session expired due to inactivity');
    
    try {
      await authService.signOutDueToIdleTimeout();
      
      // Set flag for login page to show session timeout notification
      sessionStorage.setItem('sessionExpired', 'true');

      setCurrentUser(null);
      setClassrooms([]);
      setBookingRequests([]);
      setSignupRequests([]);
      setSchedules([]);
      setUsers([]);
      setShowSessionWarning(false);
    } catch (err) {
      logger.error('❌ Idle timeout logout error:', err);
      // Force logout even if service fails
      sessionStorage.setItem('sessionExpired', 'true');
      setCurrentUser(null);
      setShowSessionWarning(false);
    }
  }, []);

  const handleSessionWarning = useCallback((timeRemaining: number) => {
    logger.log(`⚠️ Session warning - ${Math.ceil(timeRemaining / 1000)}s remaining`);
    setSessionTimeRemaining(timeRemaining);
    setShowSessionWarning(true);
    
    toast.warning('Session Expiring Soon', {
      description: `Your session will expire in ${Math.ceil(timeRemaining / 60000)} minutes due to inactivity`,
      duration: 8000
    });
  }, []);

  const handleExtendSession = useCallback(() => {
    logger.log('🔄 Session extended by user');
    setShowSessionWarning(false);
    toast.success('Session extended successfully');
  }, []);

  function SuspenseFallback({ message, show, hide }: { message?: string | null; show: (msg?: string) => void; hide: () => void; }) {
    useEffect(() => {
      try { show(message ?? 'Loading...'); } catch (e) {}
      return () => { try { hide(); } catch (e) {} };
    }, [message, show, hide]);
    return null;
  }

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
      logger.error('Error checking conflicts:', err);
      toast.error('Failed to check for conflicts');
      return true; // Return true to be safe
    }
  }, []);

  const handleBookingRequest = useCallback(async (request: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>, suppressToast?: boolean) => {
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
      // Track recent submission so the user can undo for a short window
      try {
        setRecentlySubmittedBooking({ id: newRequest.id, draft: request });
        // Clear any existing timer
        if (undoTimerRef.current) {
          window.clearTimeout(undoTimerRef.current);
          undoTimerRef.current = null;
        }
        // 5s undo window
        undoTimerRef.current = window.setTimeout(() => {
          setRecentlySubmittedBooking(null);
          undoTimerRef.current = null;
        }, 5000);
      } catch (e) {
        logger.warn('Failed to set undo state for booking:', e);
      }
      if (!suppressToast) {
        // Provide an undo action in the toast that will delete the just-created request
        toast.success('Reservation request submitted!', {
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                // Delete the request we just created (captured in this closure)
                await bookingRequestService.delete(newRequest.id);
                setBookingRequests(prev => prev.filter(r => r.id !== newRequest.id));
                // Prefill the booking form with the original inputs
                setExternalBookingPrefill(request);
                // Clear undo state and timer if they exist
                setRecentlySubmittedBooking(null);
                if (undoTimerRef.current) {
                  window.clearTimeout(undoTimerRef.current);
                  undoTimerRef.current = null;
                }
                toast('Reservation undone — form pre-filled');
              } catch (err) {
                logger.error('Undo failed:', err);
                // If client-side delete is blocked by security rules, try server callable
                try {
                  await bookingRequestService.cancelWithCallable(newRequest.id);
                  setBookingRequests(prev => prev.filter(r => r.id !== newRequest.id));
                  setExternalBookingPrefill(request);
                  setRecentlySubmittedBooking(null);
                  if (undoTimerRef.current) {
                    window.clearTimeout(undoTimerRef.current);
                    undoTimerRef.current = null;
                  }
                  toast('Reservation undone — form pre-filled');
                } catch (err2) {
                  logger.error('Server-side undo failed:', err2);
                  toast.error('Could not undo reservation');
                }
              }
            }
          }
        });
      }
    } catch (err) {
      logger.error('Booking request error:', err);
      // Check if it's a duplicate/conflict error from the database
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('conflict') || errorMessage.includes('duplicate')) {
        toast.error('Request failed: time slot was just booked by another user');
      } else {
        toast.error('Failed to submit booking request. Please try again.');
      }
    }
  }, [checkConflicts]);

  const handleRequestApproval = useCallback(async (requestId: string, approved: boolean, feedback?: string, suppressToast?: boolean) => {
    const result = await executeWithNetworkHandling(
      async () => {
        // Find the request first
        const request = bookingRequests.find(req => req.id === requestId);
        if (!request) {
          throw new Error('Request not found');
        }

        // Check if already processed
        if (request.status !== 'pending') {
          throw new Error('Request has already been processed');
        }

        // If approving, verify there are no conflicts with already approved/confirmed bookings
        if (approved) {
          // Check if the booking time has already passed
          if (isPastBookingTime(request.date, convertTo12Hour(request.startTime))) {
            throw new Error('Cannot approve: booking time has already passed');
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
            throw new Error('Cannot approve: conflicts with existing confirmed booking. Please reject this request.');
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

        // Notification creation is handled by the bookingRequest service boundary
        // (it will create a server-side notification when status transitions). Avoid
        // duplicating the creation here which caused duplicate notifications.

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
        
        return { approved };
      },
      {
        operationName: approved ? 'approve reservation' : 'reject reservation',
        successMessage: undefined, // Let the original toast logic handle success messages
        maxAttempts: 3,
        showLoadingToast: true,
      }
    );

    if (result.success && !suppressToast) {
      toast.success(result.data?.approved ? 'Reservation approved!' : 'Reservation rejected.');
    } else if (!result.success) {
      // Error toast already shown by network handler, but log for debugging
      logger.error('Request approval failed:', result.error);
      if (!suppressToast && !result.isNetworkError) {
        // Only show additional error toast if it's not a network error (network handler already showed it)
        const errorMsg = result.error?.message || 'Failed to process request';
        if (!errorMsg.includes('network') && !errorMsg.includes('connection')) {
          toast.error(errorMsg);
        }
      }
    }
  }, [bookingRequests, checkConflicts]);

  const handleSignupApproval = useCallback(
    async (requestId: string, approved: boolean, feedback?: string, skipConfirm: boolean = false) => {
      const result = await executeWithNetworkHandling(
        async () => {
          const request = signupRequests.find((r) => r.id === requestId);
          if (!request) {
            throw new Error('Request not found');
          }

          if (request.status !== 'pending') {
            throw new Error('Request has already been processed');
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

            return { approved: true, requestName: request.name };
          } else {
            if (!feedback || !feedback.trim()) {
              throw new Error('Feedback is required when rejecting a request');
            }

            if (!currentUser) {
              throw new Error('Admin user information not available');
            }

            // If this is part of a bulk confirmed action, skip the per-item confirmation
            if (skipConfirm) {
              const historyRecord = await signupRequestService.rejectAndCleanup(requestId, currentUser.id, feedback.trim());

              // Remove the signup request from local list
              setSignupRequests((prev) => prev.filter((entry) => entry.id !== requestId));

              // Append the history record so processed items appear in Recent History
              setSignupHistory((prev) => [historyRecord, ...prev]);

              // Remove the corresponding user by the signup request's userId
              setUsers((prev) => prev.filter((user) => user.id !== request.userId));

              return { approved: false, requestName: request.name };
            }

            // Open the app-styled confirmation dialog instead of using window.confirm
            setPendingRejectAction({ requestId, userId: request.userId, feedback: feedback.trim(), requestName: request.name });
            // Actual rejection will be performed when admin confirms in the dialog
            return { approved: false, needsConfirmation: true };
          }
        },
        {
          operationName: approved ? 'approve signup request' : 'reject signup request',
          successMessage: undefined, // Let the original toast logic handle success messages
          maxAttempts: 3,
          showLoadingToast: true,
        }
      );

      if (result.success && result.data) {
        if (result.data.needsConfirmation) {
          // Dialog opened, no toast needed
          return;
        }
        
        if (result.data.approved) {
          toast.success(`Faculty account approved for ${result.data.requestName}!`, {
            description: 'They can now sign in with the password they created during signup.',
            duration: 8000,
          });
        } else {
          toast.success(`Signup request rejected for ${result.data.requestName}.`, {
            description: 'The account has been completely removed. They can submit a new signup request.',
            duration: 6000,
          });
        }
      } else if (!result.success && result.error) {
        // Error toast already shown by network handler for network errors
        logger.error('Signup approval error:', result.error);
        if (!result.isNetworkError) {
          const errorMessage = result.error.message || 'Unknown error occurred';
          if (!errorMessage.includes('network') && !errorMessage.includes('connection')) {
            toast.error(errorMessage.includes('Failed') ? errorMessage : 'Failed to process signup request', {
              description: errorMessage.includes('Failed') ? undefined : errorMessage,
              duration: 5000,
            });
          }
        }
      }
    },
    [signupRequests, currentUser]
  );

  const handleCancelSchedule = useCallback(async (scheduleId: string, reason: string) => {
    const result = await executeWithNetworkHandling(
      async () => {
        const feedback = typeof reason === 'string' ? reason.trim() : '';
        if (!feedback) {
          throw new Error('Cancellation reason is required');
        }

        await scheduleService.cancelApprovedBooking(scheduleId, feedback);

        setSchedules(prev =>
          prev.map(schedule => 
            schedule.id === scheduleId 
              ? { ...schedule, status: 'cancelled' as const, adminFeedback: feedback }
              : schedule
          )
        );

        return true;
      },
      {
        operationName: 'cancel reservation',
        successMessage: undefined, // Let the original toast logic handle success
        maxAttempts: 3,
        showLoadingToast: true,
      }
    );

    if (result.success) {
      toast.success('Reservation cancelled!');
    } else if (!result.success && result.error) {
      logger.error('Cancel schedule error:', result.error);
      if (!result.isNetworkError) {
        const errorMsg = result.error.message || 'Failed to cancel booking';
        if (!errorMsg.includes('network') && !errorMsg.includes('connection')) {
          toast.error(errorMsg);
        }
      }
    }
  }, []);

  const handleCancelApprovedBooking = useCallback(async (requestId: string, reason: string) => {
    const result = await executeWithNetworkHandling(
      async () => {
        const feedback = typeof reason === 'string' ? reason.trim() : '';
        if (!feedback) {
          throw new Error('Cancellation reason is required');
        }

        // Find the corresponding schedule for this booking request
        const correspondingSchedule = schedules.find(schedule => 
          schedule.facultyId === bookingRequests.find(req => req.id === requestId)?.facultyId &&
          schedule.date === bookingRequests.find(req => req.id === requestId)?.date &&
          schedule.startTime === bookingRequests.find(req => req.id === requestId)?.startTime &&
          schedule.endTime === bookingRequests.find(req => req.id === requestId)?.endTime &&
          schedule.classroomId === bookingRequests.find(req => req.id === requestId)?.classroomId
        );

        if (correspondingSchedule) {
          // Use server-side callable to cancel the approved booking (server will
          // update schedules and related bookingRequests and create the faculty
          // notification). Avoid calling bookingRequestService.update here to
          // prevent duplicate notifications.
          await scheduleService.cancelApprovedBooking(correspondingSchedule.id, feedback);

          setSchedules(prev =>
            prev.map(schedule => 
              schedule.id === correspondingSchedule.id 
                ? { ...schedule, status: 'cancelled' as const, ...(feedback ? { adminFeedback: feedback } : {}) }
                : schedule
            )
          );

          // Optimistically update bookingRequests in the UI — the server will
          // also update Firestore; this local update prevents a visual race.
          setBookingRequests(prev =>
            prev.map(request => 
              request.id === requestId 
                ? { ...request, status: 'cancelled' as const, adminFeedback: feedback }
                : request
            )
          );
        } else {
          // No corresponding schedule found: perform a direct booking request update
          // (this path should create the appropriate notification server-side).
          await bookingRequestService.update(requestId, { status: 'cancelled', adminFeedback: feedback });

          setBookingRequests(prev =>
            prev.map(request => 
              request.id === requestId 
                ? { ...request, status: 'cancelled' as const, adminFeedback: feedback }
                : request
            )
          );
        }

        return true;
      },
      {
        operationName: 'cancel approved reservation',
        successMessage: undefined, // Let the original toast logic handle success
        maxAttempts: 3,
        showLoadingToast: true,
      }
    );

    if (result.success) {
      toast.success('Approved reservation cancelled!');
    } else if (!result.success && result.error) {
      logger.error('Cancel approved booking error:', result.error);
      if (!result.isNetworkError) {
        const errorMsg = result.error.message || 'Failed to cancel approved booking';
        if (!errorMsg.includes('network') && !errorMsg.includes('connection')) {
          toast.error(errorMsg);
        }
      }
    }
  }, [schedules, bookingRequests]);

  const handleUnlockAccount = useCallback(async (userId: string) => {
    try {
      const unlockedUser = await userService.unlockAccount(userId);
      
      // Update the user in the users list
      setUsers(prev =>
        prev.map(user => 
          user.id === userId ? unlockedUser : user
        )
      );
      
      toast.success('Account unlocked successfully!', {
        description: `${unlockedUser.name}'s account has been unlocked and can now login.`,
        duration: 5000,
      });
    } catch (err) {
      logger.error('Unlock account error:', err);
      toast.error('Failed to unlock account', {
        description: 'Please try again or contact support.',
        duration: 5000,
      });
    }
  }, []);

  // Handlers for the app-styled confirmation dialog for rejecting signup requests
  const confirmPendingReject = useCallback(async () => {
    if (!pendingRejectAction || !currentUser) return;
    const { requestId, userId, feedback, requestName } = pendingRejectAction;
    setIsRejecting(true);
    try {
      const historyRecord = await signupRequestService.rejectAndCleanup(requestId, currentUser.id, feedback);

      // Remove the signup request entry
      setSignupRequests((prev) => prev.filter((entry) => entry.id !== requestId));

      // Append to signup history so it appears in Recent Processed Requests
      setSignupHistory((prev) => [historyRecord, ...prev]);

      // Remove the corresponding user by userId provided in the pending action
      setUsers((prev) => prev.filter((user) => user.id !== userId));

      toast.success(`Signup request rejected for ${requestName}.`, {
        description: 'The account has been completely removed. They can submit a new signup request.',
        duration: 6000,
      });
    } catch (err) {
      logger.error('Failed to reject signup request:', err);
      toast.error('Failed to reject signup request');
    } finally {
      setIsRejecting(false);
      // Close dialog after processing completes
      setPendingRejectAction(null);
    }
  }, [pendingRejectAction, currentUser]);

  const cancelPendingReject = useCallback(() => {
    setPendingRejectAction(null);
    toast.info('Rejection cancelled');
  }, []);

  // Create dashboard props objects to prevent prop drilling and improve performance
  const adminDashboardProps = useMemo(() => ({
    user: currentUser!,
    classrooms,
    bookingRequests,
    signupRequests,
    signupHistory,
    schedules,
    users,
    onLogout: handleLogout,
    onClassroomUpdate: handleClassroomUpdate,
    onRequestApproval: handleRequestApproval,
    onSignupApproval: handleSignupApproval,
    onCancelSchedule: handleCancelSchedule,
    onCancelApprovedBooking: handleCancelApprovedBooking,
    onUnlockAccount: handleUnlockAccount,
    checkConflicts
  }), [currentUser, classrooms, bookingRequests, signupRequests, signupHistory, schedules, users, handleLogout, handleClassroomUpdate, handleRequestApproval, handleSignupApproval, handleCancelSchedule, handleCancelApprovedBooking, handleUnlockAccount, checkConflicts]);

  const facultyDashboardProps = useMemo(() => ({
    user: currentUser!,
    classrooms,
    schedules: facultySchedules,
    allSchedules: schedules,
    bookingRequests: facultyBookingRequests,
    allBookingRequests: bookingRequests,
    onLogout: handleLogout,
    onBookingRequest: handleBookingRequest,
    checkConflicts,
    // External prefill support: FacultyDashboard will consume this and then call back
    externalInitialData: externalBookingPrefill,
    onExternalInitialDataConsumed: () => setExternalBookingPrefill(null),
  }), [currentUser, classrooms, facultySchedules, schedules, facultyBookingRequests, bookingRequests, handleLogout, handleBookingRequest, checkConflicts, externalBookingPrefill]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.log('🚀 Initializing app...');
  setLoadingMessage('Loading...');
  // show the shared overlay while initializing
  showOverlay('Loading...');

        const user = await authService.getCurrentUser();
        
        if (user) {
          logger.log('✅ Valid user session found:', user.email);
          setCurrentUser(user);

          // Do NOT set up real-time listeners here. The auth state listener
          // centralizes real-time lifecycle management and will perform setup
          // so we avoid duplicate registrations from multiple code paths.
          logger.log('📊 Authenticated session found; deferring real-time listener setup to auth state handler');
        } else {
          logger.log('ℹ️ No valid session found');
        }
        
        logger.log('✅ App initialized successfully');
      } catch (err) {
        logger.error('❌ Failed to initialize app:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load application data: ${errorMessage}. Please refresh the page.`);
      } finally {
        // Mark that auth has been checked and stop loading
        logger.log('✅ Setting isLoading to false');
        setIsAuthChecked(true);
        setIsLoading(false);
        setLoadingMessage(null);
        hideOverlay();
      }
    };

    initializeApp();
  }, [setupRealtimeListeners]);

  // Hide reCAPTCHA badge when user is authenticated
  useEffect(() => {
    if (currentUser) {
      document.body.classList.add('authenticated');
    } else {
      document.body.classList.remove('authenticated');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('authenticated');
    };
  }, [currentUser]);

  // Separate effect for auth state listener to ensure proper cleanup
  useEffect(() => {
    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = authService.onAuthStateChange(
      async (user) => {
        logger.log('👤 Auth state changed, new user:', user?.email || 'none');
        
        // Only update if user actually changed to prevent loops
        setCurrentUser(prevUser => {
          if (prevUser?.id === user?.id) {
            logger.log('ℹ️ Same user, skipping update');
            return prevUser;
          }
          
          // If a new user logged in and we have no data yet, load it
          if (user && !prevUser) {
            logger.log('📊 New user detected, setting up listeners...');
            try {
              setupRealtimeListeners(user);
            } catch (err) {
              logger.error('Failed to setup listeners after auth change:', err);
            }
          }
          
          return user;
        });
      },
      (error) => {
        // Handle auth errors (expired links, invalid tokens)
        logger.error('Auth error:', error);
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

  // Check for logout notifications when user state changes to show them on login page
  useEffect(() => {
    if (!currentUser) {
      // Check for logout success notification
      if (sessionStorage.getItem('logoutSuccess') === 'true') {
        sessionStorage.removeItem('logoutSuccess');
        toast.success('Logged out successfully', {
          description: 'You have been signed out',
          duration: 4000
        });
      }
      
      // Check for logout error notification
      if (sessionStorage.getItem('logoutError') === 'true') {
        sessionStorage.removeItem('logoutError');
        toast.error('Logged out with errors', {
          description: 'Please refresh if you experience any issues',
          duration: 5000
        });
      }
      
      // Check for session expired notification
      if (sessionStorage.getItem('sessionExpired') === 'true') {
        sessionStorage.removeItem('sessionExpired');
        toast.warning('Session expired', {
          description: 'You have been logged out due to inactivity',
          duration: 5000
        });
      }

      // Check for account locked notification (set when server/admin forced a lock)
      if (sessionStorage.getItem('accountLocked') === 'true') {
        // Keep the flag in sessionStorage until the user dismisses the dialog so
        // it can be shown persistently on the login page. We'll show a blocking
        // AlertDialog to make the lock state explicit and actionable.
        setShowAccountLockedDialog(true);
        try {
          const msg = sessionStorage.getItem('accountLockedMessage');
          if (msg) setAccountLockedMessage(msg);
          
          const reason = sessionStorage.getItem('accountLockReason') as 'failed_attempts' | 'admin_lock' | 'realtime_lock' | null;
          if (reason) setAccountLockReason(reason);
        } catch (_) {
          // ignore
        }
      }
    }
  }, [currentUser]);

  // Poll sessionStorage for account lock status to catch locks that happen during failed login
  // This ensures the modal shows immediately even if the lock happens async
  useEffect(() => {
    if (currentUser) return; // Only check when logged out

    const checkAccountLockStatus = () => {
      if (sessionStorage.getItem('accountLocked') === 'true') {
        const msg = sessionStorage.getItem('accountLockedMessage');
        
        // Only show modal if we have a real lock message (not the temporary "Checking..." placeholder)
        // This prevents showing the modal during the brief async trackFailedLogin call
        if (msg && msg !== 'Checking account status...') {
          // Always update the message and reason, even if modal is already showing
          // This ensures subsequent login attempts show the correct details
          let reason = sessionStorage.getItem('accountLockReason') as 'failed_attempts' | 'admin_lock' | 'realtime_lock' | null;
          
          // If no reason in storage, infer it from the message
          if (!reason) {
            if (msg.includes('disabled by an administrator')) {
              reason = 'admin_lock';
            } else if (msg.includes('failed login attempts') || msg.includes('attempts remaining') || msg.includes('too many failed attempts')) {
              reason = 'failed_attempts';
            } else if (msg.includes('locked')) {
              reason = 'realtime_lock';
            }
            // Store the inferred reason for consistency
            if (reason) {
              try { sessionStorage.setItem('accountLockReason', reason); } catch (_) {}
            }
          }
          
          setAccountLockedMessage(msg);
          setAccountLockReason(reason);
          
          // Restore lockedUntil timestamp if available
          const lockedUntil = sessionStorage.getItem('accountLockedUntil');
          if (lockedUntil) {
            setAccountLockedUntil(lockedUntil);
          }
          
          if (!showAccountLockedDialog) {
            logger.log('🔒 Detected account lock flag in sessionStorage, showing modal');
            setShowAccountLockedDialog(true);
          }
        }
      }
    };

    // Check immediately
    checkAccountLockStatus();

    // Then poll every 500ms to catch async locks and keep message/reason updated
    const pollInterval = setInterval(checkAccountLockStatus, 500);

    return () => clearInterval(pollInterval);
  }, [currentUser, showAccountLockedDialog]);

  // Countdown timer for account lock expiration
  useEffect(() => {
    if (!accountLockedUntil || accountLockReason !== 'failed_attempts') {
      setLockTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const lockExpiry = new Date(accountLockedUntil);
      const diffMs = lockExpiry.getTime() - now.getTime();

      if (diffMs <= 0) {
        setLockTimeRemaining('Lock expired - you can try logging in again');
        return;
      }

      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);

      if (minutes > 0) {
        setLockTimeRemaining(`${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`);
      } else {
        setLockTimeRemaining(`${seconds} second${seconds !== 1 ? 's' : ''}`);
      }
    };

    // Update immediately
    updateCountdown();

    // Then update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [accountLockedUntil, accountLockReason]);

  // Subscribe to the current user's Firestore document so we can react to admin actions
  // (e.g., accountLocked). When an admin locks the account we immediately sign the user out
  // and set a sessionStorage flag so the login page can show an explanatory message.
  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    let unsub: (() => void) | null = null;
    try {
      const db = getFirebaseDb();
      const userRef = fsDoc(db, 'users', currentUser.id);
      unsub = fsOnSnapshot(userRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data() as any;

        // If accountLocked is true on the server, force local sign-out immediately.
        // IMPORTANT: Never lock out admin accounts - only faculty users can be locked.
        if (data?.accountLocked && data?.role !== 'admin') {
          logger.log('🔒 Detected account lock for current user. Signing out.');
          // Attempt to sign out via auth service, but proceed to clear state regardless.
          authService.signOut().catch(() => undefined).finally(() => {
            // Determine lock reason: admin lock, failed attempts (brute force), or other realtime lock
            let reason: 'failed_attempts' | 'admin_lock' | 'realtime_lock' = 'realtime_lock';
            let msg = 'Your account has been locked for security reasons.';
            
            if (data?.lockedByAdmin) {
              reason = 'admin_lock';
              msg = 'Your account has been disabled by an administrator.';
            } else if (data?.lockedUntil) {
              // If there's a lockedUntil timestamp, it's a brute force protection lock
              reason = 'failed_attempts';
              const lockedUntil = data.lockedUntil?.toDate ? data.lockedUntil.toDate() : new Date(data.lockedUntil);
              const lockedUntilISO = lockedUntil.toISOString();
              const now = new Date();
              const minutesRemaining = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
              
              if (minutesRemaining > 0) {
                msg = `Account locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`;
              } else {
                msg = 'Account locked due to too many failed login attempts. Please try again.';
              }
              
              // Store the lockedUntil timestamp for countdown
              try { sessionStorage.setItem('accountLockedUntil', lockedUntilISO); } catch (_) {}
              setAccountLockedUntil(lockedUntilISO);
            }
            
            // Mark the login page to show the lock notification
            try { sessionStorage.setItem('accountLocked', 'true'); } catch (_) {}
            try { sessionStorage.setItem('accountLockedMessage', msg); } catch (_) {}
            try { sessionStorage.setItem('accountLockReason', reason); } catch (_) {}
            
            // IMMEDIATELY show the modal dialog
            setAccountLockedMessage(msg);
            setAccountLockReason(reason);
            setShowAccountLockedDialog(true);
            
            // Clear local user state and real-time listeners
            setCurrentUser(null);
            realtimeService.cleanup();
            setClassrooms([]);
            setBookingRequests([]);
            setSignupRequests([]);
            setSchedules([]);
            setUsers([]);
          });
        }
      }, (error) => {
        logger.error('Error listening to user doc for lock status:', error);
      });
    } catch (err) {
      logger.error('Could not create user doc listener for lock status:', err);
    }

    return () => {
      try {
        if (unsub) unsub();
      } catch (e) {
        /* ignore */
      }
    };
  }, [currentUser?.id]);

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
      logger.log('🛠️ All services exposed to window for debugging');
      
      // Also expose a quick test function
      (window as any).testRealtimeNow = () => {
        logger.log('🧪 Real-time Service Test:');
        logger.log('Listener count:', realtimeService.getListenerCount());
        logger.log('Auth service:', !!authService);
        logger.log('Current user available:', !!currentUser);
        logger.log('Services working:', {
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
          <p className="text-gray-600">{loadingMessage ?? 'Loading...'}</p>
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
                Efficient classroom reservation management for PLV CEIT.
              </p>
            </div>
            
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
                <LoginForm onLogin={handleLogin} onSignup={handleSignup} users={users} isLocked={showAccountLockedDialog} accountLockedMessage={accountLockedMessage} />
              </div>
          </div>
        </div>
  <Footer />

        {/* Account locked AlertDialog — blocking modal shown on login when sessionStorage.accountLocked is set */}
        <AlertDialog open={showAccountLockedDialog} onOpenChange={(open) => {
          // Only update the controlled open state here. Don't clear sessionStorage
          // automatically on open-change events — the Dismiss button should be
          // the explicit user action that clears the stored flag. This avoids
          // library-internal focus/open lifecycle events from removing the flag
          // prematurely (which caused the dialog to flash and close on some devices).
          setShowAccountLockedDialog(open);
        }}>
          <AlertDialogContent className="sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {accountLockReason === 'failed_attempts' && '🔒 Account Locked: Too Many Failed Login Attempts'}
                {accountLockReason === 'admin_lock' && '🔒 Account Locked by Administrator'}
                {accountLockReason === 'realtime_lock' && '🔒 Account Locked'}
                {!accountLockReason && '🔒 Your account has been locked'}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              {accountLockReason === 'failed_attempts' ? (
                <div className="space-y-3">
                  <p className="font-medium text-foreground">
                    Your account has been temporarily locked due to multiple failed login attempts.
                  </p>
                  {lockTimeRemaining && (
                    <div className="text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 p-3 rounded-md border border-orange-200 dark:border-orange-800">
                      <p className="font-semibold mb-1">⏱️ Time remaining: {lockTimeRemaining}</p>
                      {accountLockedMessage && (
                        <p className="text-xs mt-2 opacity-80">{accountLockedMessage}</p>
                      )}
                    </div>
                  )}
                  {!lockTimeRemaining && accountLockedMessage && (
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 p-3 rounded-md border border-orange-200 dark:border-orange-800">
                      {accountLockedMessage}
                    </p>
                  )}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>This is a security measure to protect your account from unauthorized access.</p>
                    <p className="font-medium">What you can do:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Wait for the lockout period to expire</li>
                      <li>Make sure you're using the correct password</li>
                      <li>Use the "Forgot password?" option if needed</li>
                      <li>Contact your administrator if you need immediate access</li>
                    </ul>
                  </div>
                </div>
              ) : accountLockReason === 'admin_lock' ? (
                <div className="space-y-3">
                  <p className="font-medium text-foreground">
                    Your account has been disabled by an administrator.
                  </p>
                  <div className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-md border border-red-200 dark:border-red-800">
                    <p>⚠️ This lock was manually applied by an administrator and will not automatically expire.</p>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>You will not be able to sign in until an administrator explicitly unlocks your account.</p>
                    <p className="font-medium">What you should do:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Contact your administrator to understand why your account was locked</li>
                      <li>Request that your account be unlocked if this was done in error</li>
                      <li>Follow any instructions provided by your administrator</li>
                    </ul>
                  </div>
                </div>
              ) : accountLockReason === 'realtime_lock' ? (
                <div className="space-y-3">
                  <p className="font-medium text-foreground">
                    Your account has been locked and you were signed out for security reasons.
                  </p>
                  {accountLockedMessage && (
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                      {accountLockedMessage}
                    </p>
                  )}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>This may be due to:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Security policy changes</li>
                      <li>Suspicious activity detected</li>
                      <li>Administrative action</li>
                    </ul>
                    <p className="mt-2">Please contact your administrator for assistance and to regain access to your account.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {accountLockedMessage ? (
                    <>
                      <p className="font-medium">{accountLockedMessage}</p>
                      <p className="text-sm text-muted-foreground">You were signed out. If you believe this is an error, contact your administrator for assistance. You will not be able to sign in while the account is locked.</p>
                    </>
                  ) : (
                    <p>Your account was locked by an administrator and you were signed out. If you believe this is an error, contact your administrator for assistance. You will not be able to sign in while the account is locked.</p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
            <div className="mt-4 flex gap-2 justify-end">
              <button 
                type="button"
                className={buttonVariants({ variant: 'outline' })}
                onClick={() => {
                  try {
                    // Use window.location for better cross-browser/platform compatibility
                    window.location.href = `mailto:${supportEmail}`;
                  } catch (err) {
                    // Fallback: try to open in new window (some Mac browsers block mailto:)
                    try {
                      window.open(`mailto:${supportEmail}`, '_blank');
                    } catch (e) {
                      // Last resort: copy email to clipboard and notify user
                      navigator.clipboard?.writeText(supportEmail).then(() => {
                        toast.info(`Email copied: ${supportEmail}`, { duration: 5000 });
                      }).catch(() => {
                        toast.error(`Please contact: ${supportEmail}`, { duration: 5000 });
                      });
                    }
                  }
                }}
              >
                Contact Administrator
              </button>
              <AlertDialogAction asChild>
                <button className={buttonVariants({ variant: 'destructive' })} onClick={() => {
                  // ensure removal of all flags when dismissed
                  try { sessionStorage.removeItem('accountLocked'); } catch (_) {}
                  try { sessionStorage.removeItem('accountLockedMessage'); } catch (_) {}
                  try { sessionStorage.removeItem('accountLockReason'); } catch (_) {}
                  setShowAccountLockedDialog(false);
                  setAccountLockedMessage(null);
                  setAccountLockReason(null);
                }}>
                  Dismiss
                </button>
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <Analytics />
      </div>
    );
  }

  const activeUser = currentUser!;

  // Simple toggle component to enable/disable screen reader announcements
  function ToggleAnnouncer() {
    const { enabled, setEnabled, announce, useTTS, setUseTTS } = useAnnouncer();

    // Track mount so we don't announce the initial state when the component first renders
    const mountedRef = React.useRef(false);

    React.useEffect(() => { mountedRef.current = true; }, []);

    const onToggleEnabled = () => {
      // Toggle state first (so the persisted value is updated)
      setEnabled(!enabled);
      // Only announce when action is user-initiated after mount
      if (mountedRef.current) {
        try {
          announce(!enabled ? 'Screen reader enabled' : 'Screen reader disabled', 'polite');
        } catch (e) {}
      }
    };

    const onToggleTTS = () => {
      setUseTTS(!useTTS);
      if (mountedRef.current) {
        try {
          announce(!useTTS ? 'Browser text to speech enabled' : 'Browser text to speech disabled', 'polite');
        } catch (e) {}
      }
    };

    return (
      // Move to bottom-left as a small, unobtrusive control so it doesn't block header elements
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2">
        <button
          onClick={onToggleEnabled}
          className="bg-white text-xs px-2 py-1 rounded-full border border-gray-200 shadow-sm"
          aria-pressed={!enabled ? 'false' : 'true'}
          aria-label={enabled ? 'Disable screen reader announcements' : 'Enable screen reader announcements'}
          title={enabled ? 'Disable screen reader announcements' : 'Enable screen reader announcements'}
        >
          {enabled ? 'SR: On' : 'SR: Off'}
        </button>

        {/* TTS toggle - optional built-in speech for users without a screen reader */}
        <button
          onClick={onToggleTTS}
          className="bg-white text-xs px-2 py-1 rounded-full border border-gray-200 shadow-sm"
          aria-pressed={!useTTS ? 'false' : 'true'}
          aria-label={useTTS ? 'Disable browser text to speech' : 'Enable browser text to speech'}
          title={useTTS ? 'Disable browser text to speech' : 'Enable browser text to speech'}
        >
          {useTTS ? 'TTS: On' : 'TTS: Off'}
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AnnouncerProvider>
          {/* Network status indicator */}
          <NetworkStatusIndicator />
          
          {/* Skip link for keyboard users */}
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white text-blue-700 px-3 py-2 rounded shadow">Skip to main</a>
          <div className="min-h-screen bg-background flex flex-col">
            <ToggleAnnouncer />
          <div className="flex-1">
            {/* Top-level shared loader overlay */}
            {overlayVisible ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95">
                <div className="text-center">
                  <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg mx-auto mb-4">
                    <div className="text-white text-lg font-bold">PLV</div>
                  </div>
                  <p className="text-gray-600">{overlayMessage ?? 'Loading...'}</p>
                </div>
              </div>
            ) : null}

            <ErrorBoundary>
              <Suspense fallback={<SuspenseFallback message={loadingMessage ?? 'Loading...'} show={showOverlay} hide={hideOverlay} />}>
                {/* Render the appropriate dashboard directly (react-router removed). */}
                {activeUser.role === 'admin' ? (
                  <AdminDashboard {...adminDashboardProps} />
                ) : (
                  <FacultyDashboard {...facultyDashboardProps} />
                )}
              </Suspense>
            </ErrorBoundary>
            {/* Using the single inline PLV loader for Suspense fallback; no portal loader mounted */}
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
          {/* Global Toaster moved to main.tsx */}

          {/* App-styled confirm dialog for destructive signup rejection */}
          <AlertDialog open={!!pendingRejectAction}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject and Delete Account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the account and associated data for{' '}
                  <strong>{pendingRejectAction?.requestName}</strong>. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={cancelPendingReject} disabled={isRejecting}>Cancel</AlertDialogCancel>
                {/* Use a plain button here to avoid Radix auto-closing the dialog before our handler runs.
                    Apply the same visual style as the AlertDialogCancel by using the shared buttonVariants
                    with the 'outline' variant so both buttons match visually (pill-shaped, same size).
                */}
                <button
                  type="button"
                  onClick={confirmPendingReject}
                  className={cn(buttonVariants({ variant: 'outline' }), 'ml-2')}
                  disabled={isRejecting}
                >
                  {isRejecting ? 'Processing...' : 'Confirm Delete'}
                </button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Analytics />
          </div>
      </AnnouncerProvider>
    </ErrorBoundary>
  );
}