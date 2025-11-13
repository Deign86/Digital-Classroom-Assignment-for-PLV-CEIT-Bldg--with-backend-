# Discrepancy Report (initial)

This report cross-references the documented features (from project guidelines and copilot instructions) against the actual implementation found in the repository.

Legend
- ✅ Fully Implemented
- ⚠️ Partially Implemented / Missing details
- ❌ Not Implemented
- 📝 Extra (in code but not in docs)

## Authentication & RBAC
- Firebase Authentication — ✅ Present via `lib/firebaseService.ts` and Firebase SDK usage throughout UI.
- authService.ts — ❌ No dedicated `authService.ts` file; auth helpers appear in `firebaseService.ts` and related modules.
- RBAC / custom claims — ✅ `lib/customClaimsService.ts` exists (server-side Cloud Functions may complement this).

## Brute Force Protection
- Brute force tracking server-side Cloud Functions (documentation references) — ⚠️ Implementation likely in `plv-classroom-assignment-functions/` (not fully audited here). UI has account lockout modal components which suggests integration.

## Session Management
- `useIdleTimeout.ts` hook — ✅ Present in `hooks/` and referenced by `App.tsx` according to documentation (to be verified in code). UI contains `SessionTimeoutWarning.tsx`.

## Classroom Management CRUD
- UI `ClassroomManagement.tsx` — ✅ UI exists.
- `classroomService` — ❌ No dedicated `classroomService.ts` in `lib/` (CRUD helpers may be in `firebaseService.ts` or elsewhere). Marked PARTIAL.

## Real-time Notifications
- `NotificationBell.tsx` and `NotificationCenter.tsx` — ✅ Present.
- `NotificationContext.tsx` — ✅ Present. `lib/notificationService.ts` — ✅ Present.

## Push Notifications
- `lib/pushService.ts` and `public/firebase-messaging-sw.js` — ✅ Present.

## Forms & Validation
- Validation util `utils/inputValidation.ts` — ✅ Present.
- Form components and patterns (react-hook-form + UI wrappers) — ✅ Present in components (LoginForm, RoomBooking, etc.).

## Time & Booking Rules
- Time utilities `utils/timeUtils.ts` and schedule components `ScheduleViewer.tsx` — ✅ Present. Business rules enforcement likely in both client and server; server function `expirePastPendingBookings` exists in functions folder (not fully audited here).

## CI / Testing
- Existing tests — 📝 Many tests exist under `src/test/` (using Vitest + Testing Library). The repo already has Playwright devDependencies, but the user requested NO Playwright for the rebuilt suite.
- Coverage thresholds — ❌ Not found explicitly in repo; will add Vitest config with thresholds as part of rebuild.

## Accessibility / shadcn
- `components/ui` exists and many Radix packages are included as dependencies. Accessibility wrappers appear to exist (Announcer component, Aria-friendly UI), but a focused audit of ARIA attributes is required — currently ⚠️ partial.

## Extras found in code
- `@playwright/test` and `playwright` devDependencies exist — 📝 present but user requested no Playwright tests; we will keep deps but not use Playwright in CI.
- Many existing tests under `src/test/` — 📝 will be removed / replaced per task.

---
Notes & next steps:
- I will create a new branch `feature/test-suite-rebuild`, remove the existing `src/test/` test folder, add a Vitest configuration, a testing setup file, basic MSW mocks/handlers, a small base set of unit tests for verified core services/hooks/components, and a GitHub Actions workflow to run `npm ci` and `npm run test:run` with coverage enforcement.
