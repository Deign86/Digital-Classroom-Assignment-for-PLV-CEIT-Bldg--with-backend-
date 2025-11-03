# Copilot Instructions for Digital Classroom Assignment System (PLV CEIT)

## Project Overview
- **Purpose:** Modern classroom reservation and management for PLV CEIT, with role-based dashboards (Admin/Faculty), real-time conflict detection, comprehensive reporting, and security features.
- **Stack:** React (TypeScript), Vite, Tailwind CSS, Firebase (Auth, Firestore, Cloud Functions, FCM), Shadcn/ui, Framer Motion, Vercel/Firebase Hosting.

## Architecture & Key Patterns
- **Entry Points:**
  - `main.tsx`: React 18 root, StrictMode.
  - `App.tsx`: App shell, routing, Firebase context, session timeout management.

## Service Boundaries & Real-time Data

- **Service boundary:** All reads/writes and real-time listeners go through `lib/firebaseService.ts` (e.g., `bookingRequestService`, `scheduleService`, `authService`, `realtimeService`, `userService`). Prefer using these exported methods instead of calling Firestore directly.

- **Real-time & roles:** `realtimeService.subscribeToData(user, callbacks)` sets up role-filtered listeners. Admin receives all collections; faculty receives filtered booking/schedule streams. Listeners auto-unsubscribe on user change.

- **Notification system:** Real-time notifications via `lib/notificationService.ts`. Creates notifications through Cloud Functions to avoid self-notifications. Use `notificationService.createNotification()` and pass `actorId` to skip notification for the actor. Notifications are acknowledged via callable functions.

## Security & Authentication

- **Brute force protection:** Implemented via Cloud Functions (`trackFailedLogin`, `resetFailedLogins`). After 5 failed attempts, account locks for 30 minutes. Lock status tracked in Firestore (`accountLocked`, `lockedUntil`, `lockedByAdmin`). Admin can manually lock/unlock accounts (`lockedByAdmin` flag prevents auto-unlock).

- **Session timeout:** Implemented via `hooks/useIdleTimeout.ts`. Default 30-minute idle timeout with 5-minute warning. Shows `SessionTimeoutWarning` component before auto-logout. User activity (mouse, keyboard, scroll) resets timer.

- **Auth & env:** `lib/firebaseConfig.ts` throws on missing VITE_* env vars. Auth persistence is set to `browserLocalPersistence`. Required env vars: `VITE_FIREBASE_*` keys, `VITE_FIREBASE_VAPID_KEY` for push notifications.

- **Security rules:** `firestore.rules` enforces role-based access. Clients cannot set `status: 'expired'` on bookingRequests (server-only). Notifications cannot be created client-side (Cloud Function only). Users can only acknowledge their own notifications.

## Cloud Functions & Callables

- **Auth functions:** `trackFailedLogin`, `resetFailedLogins` - manage brute force protection
- **Account functions:** `deleteUserAccount`, `bulkCleanupRejectedAccounts` - cleanup operations
- **Notification functions:** `createNotification`, `acknowledgeNotification`, `acknowledgeNotifications` - server-side notification management
- **Push functions:** `registerPushToken`, `unregisterPushToken`, `setPushEnabled`, `sendTestPush` - FCM token management
- **Scheduled functions:** `expirePastPendingBookings` - runs hourly to expire old pending bookings

When adding infra-affecting changes, update client usage in `lib/firebaseService.ts`.

## Push Notifications

- **Implementation:** Firebase Cloud Messaging (FCM) via `lib/pushService.ts`. Service worker in `public/firebase-messaging-sw.js`.
- **Token management:** Users enable/disable in ProfileSettings. Tokens stored in Firestore `users` collection (`pushEnabled` flag).
- **Browser support:** Check `pushService.isPushSupported()` before showing UI. iOS requires Safari 16.4+ with Web Push enabled in system settings.
- **Service worker ready:** `waitForServiceWorkerReady()` ensures SW is active before token retrieval (prevents "no active Service Worker" errors).

## Forms, Validation & Input Sanitization

- **Form pattern:** Uses Radix + `react-hook-form` (see `components/ui/form.tsx`). Components implement inline validation and conflict checks. Pattern: FormProvider + Controllers + `FormItem`/`FormLabel`/`FormMessage`.

- **Password sanitization:** All password inputs sanitize via `sanitizePassword()` function in `LoginForm.tsx`. Removes line breaks, zero-width characters, and trims whitespace. Critical for paste operations.

- **Password visibility toggles:** Login and signup forms include Eye/EyeOff icons to toggle password visibility. States: `showLoginPassword`, `showSignupPassword`, `showSignupConfirmPassword`.

- **Input validation:** All forms validate and trim user inputs. Required fields show inline errors. Email fields use `.trim().toLowerCase()` for case-insensitive matching.

## Time & Reservation Rules

- **Business logic:** Enforces 30-minute slots between 7:00–20:00, 24h storage/12h display format.
- **Conflict checks:** Implemented client-side in components (e.g., `RoomBooking.tsx`) and server-side via Firestore queries (`bookingRequestService.checkConflicts`, `scheduleService.checkConflict`). Always mirror these checks when modifying reservation flows.
- **Past booking expiration:** Cloud Function `expirePastPendingBookings` runs hourly to auto-expire pending bookings past their start time.

## Responsive Design & Mobile Support

- **Responsive tabs:** Mobile/tablet use horizontal scrollable tabs with auto-scroll to active tab (see `AdminDashboard.tsx`, `FacultyDashboard.tsx`, `RequestApproval.tsx`). CSS classes: `mobile-tab-container`, `mobile-tab-scroll`, `mobile-tab-item`.
- **Breakpoints:** Tailwind classes `sm:`, `md:`, `lg:` used throughout. Mobile-first approach with progressive enhancement.
- **Layout patterns:** 
  - Headers: `flex flex-col sm:flex-row` for stacked-to-horizontal layout
  - Grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for responsive columns
  - Hidden elements: `hidden sm:block` or `hidden md:block` for progressive disclosure

## Error Handling & Retry Logic

- **Network retries:** `lib/withRetry.ts` provides retry logic for network errors. Used in all Cloud Function calls and Firestore operations. Default 3 attempts with exponential backoff.
- **Error messages:** User-friendly error messages throughout, especially for auth and booking conflicts. Avoid exposing technical details.
- **Error logging:** `lib/errorLogger.ts` for centralized error tracking (if implemented).

## Code Style & Conventions

- **TypeScript:** Strict mode enabled. Use explicit types for props/services. Avoid `any`.
- **File organization:** 
  - Service logic: `lib/`
  - UI components: `components/`
  - Shared utilities: `utils/`
  - Custom hooks: `hooks/`
  - Type definitions: `types/` or inline in files
- **Naming:** camelCase for variables/functions, PascalCase for components/types.

## Dev Commands

From `package.json`:
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`

## Quick Reference Examples

- **Create booking request:** `bookingRequestService.create(...)`
- **Subscribe to real-time data:** `realtimeService.subscribeToData(user, { onClassroomsUpdate, onBookingRequestsUpdate, onSchedulesUpdate })`
- **Create notification:** `notificationService.createNotification(userId, type, message, { bookingRequestId, adminFeedback, actorId })`
- **Enable push notifications:** `pushService.enablePush()`
- **Track failed login:** Called automatically by `authService.signIn()` on auth failure
- **Form components:** `Form`, `FormItem`, `FormControl`, `FormMessage` from `components/ui/form.tsx`

## Important Notes

- **Security:** When editing features that touch security, roles, or data shape, update `firestore.rules` and `guidelines/FIREBASE_QUICK_REFERENCE.md`.
- **Cloud Functions:** Located in `plv-classroom-assignment-functions/`. See `DEPLOYMENT_GUIDE.md` for deployment instructions.
- **Brute Force:** Account lock implementation documented in `BRUTE_FORCE_PROTECTION_IMPLEMENTATION.md`.
- **Firebase Setup:** See `FIREBASE_DEPLOYMENT_GUIDE.md` and `FIREBASE_ENVIRONMENT_GUIDE.md` for environment setup.

If anything here is ambiguous or you want longer examples (cloud function signatures, env examples, or common UI patterns), tell me which section to expand and I'll iterate.
