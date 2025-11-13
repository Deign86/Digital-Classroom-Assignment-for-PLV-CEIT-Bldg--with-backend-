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
- Tests currently live under `src/test/` and `src/test/**` (many files exist).
- Existing test framework: Vitest + @testing-library/react + jest-dom listed in devDependencies.

## Cloud Functions / Backend
- `plv-classroom-assignment-functions/` contains Cloud Functions and node project; has server-side logic (not audited in detail here).

## Notable exported / implementation points to inspect manually
- `firebaseService.ts` likely contains most auth, booking, and Firestore helpers (used across components).
- There is no explicit `authService.ts` file — authentication functions live in `firebaseService.ts` and other helpers.
- `customClaimsService.ts` suggests RBAC support through custom claims.

---
Next steps: produce a detailed per-file export and prop signature list for high-priority files (auth/notification services, useIdleTimeout, NotificationContext, NotificationBell, NotificationCenter, firebaseService). This is a partial, automated inventory; I will expand specific file entries on request or while building tests.
