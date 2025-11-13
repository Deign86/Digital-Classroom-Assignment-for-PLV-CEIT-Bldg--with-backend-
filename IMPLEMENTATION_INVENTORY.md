# Implementation Inventory (auto-generated - initial)

This file summarizes the actual implemented files and features discovered in the repository root.

Generated: partial automated audit (components, hooks, lib, utils, contexts, tests)

## Test framework
- Vitest (see `package.json` devDependencies and scripts)

## Components (components/)
- `AdminDashboard.tsx` — component: Admin dashboard UI and tabs. (exists)
- `AdminReports.tsx` — admin reporting UI. (exists)
- `AdminUserManagement.tsx` — user management UI. (exists)
- `Announcer.tsx` — accessibility announcer component. (exists)
- `BulkProgressDialog.tsx` — dialog for bulk operations. (exists)
- `ClassroomManagement.tsx` — classroom CRUD UI. (exists)
- `ErrorBoundary.tsx` — error boundary component. (exists)
- `FacultyDashboard.tsx` — faculty dashboard UI. (exists)
- `FacultySchedule.tsx` — faculty schedule UI. (exists)
- `Footer.tsx` — footer site component. (exists)
- `LoginForm.tsx` — login form component. (exists)
- `NetworkStatusIndicator.tsx` — offline/online indicator. (exists)
- `NotificationBell.tsx` — displays unread count and opens notification center. (exists)
- `NotificationCenter.tsx` — lists notifications and actions. (exists)
- `PasswordResetDialog.tsx` — dialog for password reset. (exists)
- `PasswordResetPage.tsx` — full page for password resets. (exists)
- `ProfileSettings.tsx` — profile UI and push toggles. (exists)
- `RequestApproval.tsx` — request approval UI. (exists)
- `RequestCard.tsx` — request summary card component. (exists)
- `RoomBooking.tsx` — booking form UI. (exists)
- `RoomSearch.tsx` — room search UI. (exists)
- `ScheduleViewer.tsx` — schedule visualization component. (exists)
- `SessionTimeoutWarning.tsx` — session timeout UI. (exists)
- `SignupApproval.tsx` — signup approval UI. (exists)

Note: `components/ui/` exists (shadcn-like components) — inspect for Radix/Shadcn wrapper components.

## Hooks (hooks/)
- `useBulkRunner.ts` — helper/hook for running bulk operations. (exists)
- `useIdleTimeout.ts` — session idle timeout hook (exists)
- `useScrollTrigger.ts` — scroll-trigger helper/hook (exists)

## Services / Libraries (lib/)
- `firebaseService.ts` — central firebase helper (exists)
- `notificationService.ts` — notification creation/listener helpers (exists)
- `pushService.ts` / `pushServiceLazy.ts` — FCM / push helpers (exists)
- `withRetry.ts` — retry utility for network calls (exists)
- `errorLogger.ts` — centralized logging (exists)
- `networkErrorHandler.ts` — network error handling helpers (exists)
- `localStorageService.ts` — local storage helpers (exists)
- `customClaimsService.ts` — helpers around custom claims/RBAC (exists)
- `firebaseConfig.ts` — environment config checks for Firebase (exists)

## Utils (utils/)
- `timeUtils.ts` — time formatting and helpers (exists)
- `inputValidation.ts` — validators used by forms (exists)
- `bookingPrefill.ts` — booking prefill helpers (exists)
- `tabPersistence.ts` — remembers UI tab states (exists)
- `animation.ts` — small animation helpers (exists)

## Contexts (contexts/)
- `NotificationContext.tsx` — provider and hook for notifications (exists)

## Tests (existing)
- Tests currently live under `src/__tests__/` with comprehensive coverage:
  - **Service Tests**: 40+ tests covering bookingRequestService, userService, scheduleService, classroomService, customClaimsService, notificationService, withRetry
  - **Hook Tests**: 20+ tests covering useIdleTimeout, useAuth, useBulkRunner, useNotificationContext
  - **Component Tests**: 60+ tests covering NotificationCenter, NotificationBell, RequestCard, ScheduleViewer, ClassroomManagement, AdminDashboard, FacultyDashboard
  - **Integration Tests**: 12+ tests covering notification flow, auth flow, booking flow, classroom flow, accessibility
- Test framework: Vitest + @testing-library/react + @testing-library/user-event + jest-dom
- Coverage thresholds: 60% lines/functions/statements, 50% branches
- See `TESTING_GUIDE.md` for detailed testing documentation

## Cloud Functions / Backend
- `plv-classroom-assignment-functions/` contains Cloud Functions and node project; has server-side logic (not audited in detail here).

## Notable exported / implementation points to inspect manually

Next steps: produce a detailed per-file export and prop signature list for high-priority files (auth/notification services, useIdleTimeout, NotificationContext, NotificationBell, NotificationCenter, firebaseService). This is a partial, automated inventory; I will expand specific file entries on request or while building tests.

## Per-file signatures — expanded (lib/ and contexts/ — initial pass)
### lib/notificationService.ts
- Exports:
	- createNotification(userId: string, type: NotificationType, message: string, options?: { bookingRequestId?: string; adminFeedback?: string; actorId?: string }): Promise<string | null>
	- acknowledgeNotification(id: string, acknowledgedBy: string): Promise<void>
	- getUnreadCount(userId: string): Promise<number>
	- default export: notificationService (object with above methods)

### lib/firebaseService.ts (summary)
- This is the central data+auth layer. Key exported objects/functions (signatures):
	- export const authService: { handleRejectedUserReactivation(email:string,password:string,name:string,department:string,recaptchaToken?:string): Promise<{request: SignupRequest}>; registerFaculty(...): Promise<{request: SignupRequest}>; signIn(email:string,password:string): Promise<User|null>; signOut(): Promise<void>; resetPassword(email:string): Promise<{success:boolean;message:string}>; confirmPasswordReset(actionCode:string,newPassword:string): Promise<{success:boolean;message:string}>; updatePassword(currentPassword:string,newPassword:string): Promise<{success:boolean;message:string;requiresSignOut?:boolean}>; getCurrentUser(): Promise<User|null>; isAuthenticated(): Promise<boolean>; onAuthStateChange(callback:(user:User|null)=>void): {data:{subscription:{unsubscribe: ()=>void}}}; signOutDueToIdleTimeout(): Promise<void> }
	- export const userService: { getAll(): Promise<User[]>; getByEmail(email:string): Promise<User|null>; getById(id:string): Promise<User|null>; update(id:string, updates: Partial<User> & { status?: 'pending'|'approved'|'rejected' }): Promise<User>; updateStatus(id:string,status, overrides?): Promise<User>; unlockAccount(id:string): Promise<User>; lockAccount(id:string, minutes?:number): Promise<User>; lockAccountByAdmin(id:string, lockReason?:string): Promise<User>; delete(id:string): Promise<void> }
	- export const classroomService: { getAll(): Promise<Classroom[]>; getById(id:string): Promise<Classroom|null>; create(classroom: Omit<Classroom,'id'>): Promise<Classroom>; update(id:string, updates:Partial<Classroom>): Promise<Classroom>; delete(id:string): Promise<void>; deleteCascade(id:string): Promise<{success:boolean;deletedRelated:number}>; bulkUpdate(updates:Array<{id:string;data:Partial<Classroom>}>) : Promise<void> }
	- export const bookingRequestService: { getAll(): Promise<BookingRequest[]>; getAllForFaculty(facultyId:string): Promise<BookingRequest[]>; getById(id:string): Promise<BookingRequest|null>; create(request: Omit<BookingRequest,'id'|'requestDate'|'status'>): Promise<BookingRequest>; update(id:string, updates:Partial<BookingRequest>): Promise<BookingRequest>; delete(id:string): Promise<void>; cancelWithCallable(id:string): Promise<void>; checkConflicts(classroomId:string,date:string,startTime:string,endTime:string,excludeRequestId?:string): Promise<boolean>; bulkUpdate(updates:Array<{id:string;data:Partial<BookingRequest>}>) : Promise<void> }
	- export const scheduleService: { getAll(): Promise<Schedule[]>; getAllForFaculty(facultyId:string): Promise<Schedule[]>; getById(id:string): Promise<Schedule|null>; create(schedule:Omit<Schedule,'id'>): Promise<Schedule>; update(id:string, updates:Partial<Schedule>): Promise<Schedule>; delete(id:string): Promise<void>; checkConflict(classroomId:string,date:string,startTime:string,endTime:string,excludeId?:string): Promise<boolean>; cancelApprovedBooking(scheduleId:string, adminFeedback:string): Promise<void> }
	- export const signupRequestService: { getAll(): Promise<SignupRequest[]>; getById(id:string): Promise<SignupRequest|null>; getByEmail(email:string): Promise<SignupRequest|null>; create(request: Omit<SignupRequest,'id'|'requestDate'|'status'>): Promise<SignupRequest>; update(id:string, updates:Partial<SignupRequest>): Promise<SignupRequest>; delete(id:string): Promise<void>; rejectAndCleanup(requestId:string, adminUserId:string, feedback:string): Promise<SignupHistory>; bulkCleanupRejectedAccounts(): Promise<any>; bulkUpdate(updates:Array<{id:string;data:Partial<SignupRequest>}>) : Promise<void> }
	- export const signupHistoryService: { getAll(): Promise<SignupHistory[]>; getById(id:string): Promise<SignupHistory|null>; getByEmail(email:string): Promise<SignupHistory[]>; create(history: Omit<SignupHistory,'id'>): Promise<SignupHistory>; delete(id:string): Promise<void> }
	- export const realtimeService: { cleanup(): void; subscribeToData(user: User | null, callbacks: any): void; getListenerCount(): number }
	- helper exports: bulkUpdateDocs(collectionName: string, updates: Array<{id:string;data:Record<string,unknown>}>) => Promise<void>

	Note: `firebaseService.ts` also re-exports a wrapped `notificationService` and contains many internal helpers and strong runtime behavior (auth listener, caching, listener management). Tests should mock Firebase SDK calls (Auth, Firestore, Functions) or prefer using a thin adapter to make unit testing easier.

### lib/pushService.ts
- Exports:
	- pushService: {
		isPushSupported(): boolean;
		enablePush(): Promise<{ success: boolean; token?: string; message?: string }>;
		disablePush(token?: string): Promise<{ success: boolean; message?: string }>;
		setPushEnabledOnServer(enabled: boolean): Promise<{ success: boolean; enabled?: boolean; message?: string }>;
		sendTestNotification(token:string, title?:string, body?:string): Promise<any>;
		getCurrentToken(): Promise<string | null>;
		onMessage(handler: (payload:any)=>void): () => void;
	}
	- default export: pushService

### lib/pushServiceLazy.ts
- Exports a lazy wrapper `pushServiceLazy` with same method names but each method defers to dynamic import of `pushService`.
	- pushServiceLazy.preload(): void

### lib/withRetry.ts
- Exports:
	- function withRetry<T>(fn: () => Promise<T>, opts?: WithRetryOptions): Promise<T>
	- function isNetworkError(err: unknown): boolean
	- WithRetryOptions type (attempts?: number; initialDelayMs?: number; factor?: number; shouldRetry?: (err)=>boolean)

### lib/customClaimsService.ts
- Exports:
	- forceTokenRefresh(): Promise<void>
	- getCurrentUserClaims(): Promise<{ admin?: boolean; role?: string } | null>
	- isCurrentUserAdmin(): Promise<boolean>
	- refreshMyCustomClaims(): Promise<void>
	- setUserCustomClaims(userId:string): Promise<void>
	- changeUserRole(userId:string, newRole:'admin'|'faculty'): Promise<{success:boolean;message:string}>
	- checkClaimsSyncStatus(firestoreRole:'admin'|'faculty'): Promise<{ inSync:boolean; tokenRole?:string; tokenAdmin?:boolean; firestoreRole:string }>
	- default export: customClaimsService

### lib/firebaseConfig.ts
- Exports:
	- getFirebaseApp(): FirebaseApp
	- getFirebaseDb(): Firestore
	- getFirebaseAuth(): Promise<Auth>
	- Behavior: throws if required VITE_* env vars are missing. Sets auth persistence to browserLocalPersistence.

### lib/errorLogger.ts
- Exports:
	- function logClientError(payload: Omit<ClientErrorRecord,'createdAt'>): Promise<string | null>
	- default export { logClientError }

### lib/localStorageService.ts
- Re-exports firebaseService for backward compatibility: `export * from './firebaseService'`

### lib/networkErrorHandler.ts
- Exports:
	- executeWithNetworkHandling<T>(operation: ()=>Promise<T>, options: NetworkAwareOptions): Promise<NetworkAwareResult<T>>
	- createNetworkAwareOperation(serviceMethod, options): wrapped function
	- checkIsOffline(): boolean
	- default export object with above helpers

### contexts/NotificationContext.tsx
- Exports:
	- type NotificationContextType = { notifications: Notification[]; unreadCount: number; isNotificationCenterOpen: boolean; isLoading: boolean; isNotifLoading?: boolean; error?: string | null; onAcknowledge(id:string): Promise<void>; onAcknowledgeAll(): Promise<number | null>; onToggleCenter(): void; onMarkAllAsRead(): Promise<void>; onDismiss?: (id:string)=>void }
	- NotificationContext: React.Context<NotificationContextType | undefined>
	- useNotificationContext(): NotificationContextType (throws if used outside provider)
	- NotificationProvider({ value, children }: { value: NotificationContextType; children: ReactNode })

---
This inventory expansion covered the read files in `lib/` and `contexts/` (initial pass). Next actions: append signature details for `components/` and `hooks/` files (start with `useIdleTimeout.ts`, `NotificationBell.tsx`, `NotificationCenter.tsx`), and then create unit tests for services in `lib/` using the existing MSW + Firebase-mock strategy.
