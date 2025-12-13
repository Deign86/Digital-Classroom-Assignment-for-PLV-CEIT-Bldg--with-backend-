# Software Requirements Specification (SRS)

**System:** Digital Classroom Reservation System (Firebase Edition v3)
**Date:** 2025-12-12
**Scope:** Web-based classroom reservation and management platform for PLV CEIT with admin and faculty roles, backed by Firebase (Auth, Firestore, Cloud Functions, FCM).

## 1. Purpose and Objectives
- Define the functional and non-functional requirements for the end-to-end reservation system.
- Align stakeholders (admin, faculty, IT/Ops) on behaviors, constraints, and quality goals.
- Serve as the baseline for implementation, testing, and acceptance.

## 2. System Overview
- Role-based web app built with React, TypeScript, Vite, Tailwind, Shadcn/UI.
- Firebase backend: Auth, Firestore, Cloud Functions (Gen 2), Cloud Messaging, Hosting.
- Core capabilities: classroom inventory, booking requests with conflict detection, approvals, schedules, notifications (in-app + push), offline queueing, reporting, brute-force protection, session timeout, caching, dark mode.
- Operating window: 07:00–20:00, 30-minute slots.

## 3. Stakeholders and User Classes
- **Admin:** Manages classrooms, approves/rejects bookings and signups, locks/unlocks accounts, views reports, sends notifications, oversees schedules.
- **Faculty:** Requests bookings, views availability and schedules, receives notifications, manages profile and notification preferences.
- **IT/Ops:** Deploys Firebase services and hosting, maintains env vars and security rules, monitors reliability.

## 4. References
- Project README (features, setup, workflows, data model).
- Firestore security rules and Cloud Functions (role enforcement, protected operations).
- Firebase deployment and environment guides; brute-force protection doc; Firebase troubleshooting guide.

## 5. Assumptions and Dependencies
- Modern browser support: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+; PWA-compatible.
- Stable internet for real-time sync; offline queue covers transient loss.
- Required env vars: VITE_FIREBASE_* keys, VITE_FIREBASE_ADMIN_EMAILS, VITE_FIREBASE_VAPID_KEY.
- Firebase services enabled: Auth (email/password), Firestore, Cloud Functions, FCM, Hosting.
- Service worker enabled for push; IndexedDB available for offline queue.
- Timezone: local device; storage uses ISO/24h, display uses 12h when applicable.

## 6. User Roles and Permissions (High-Level)
- **Admin:** Full CRUD on classrooms, schedules, booking decisions; approve/reject signups; manage accounts (lock/unlock/delete); send/manage notifications; access reports and audit trails.
- **Faculty:** Submit booking requests; view own schedules/requests; search classrooms; acknowledge notifications; manage profile, password, push toggle.
- **Public (unauthenticated):** View classroom availability (read-only where permitted), submit signup requests.

## 7. Functional Requirements

### 7.1 Authentication & Session
- FR-A1: Users authenticate via Firebase email/password.
- FR-A2: Brute-force protection: after 5 failed attempts, account locks for 30 minutes; manual admin lock/unlock supported.
- FR-A3: Session idle timeout: warn at 25 minutes, auto-logout at 30 minutes of inactivity.
- FR-A4: Password reset via email; password sanitization removes hidden chars/line breaks.

### 7.2 User Management
- FR-U1: Admin can approve/reject faculty signup requests with optional feedback; decisions logged in signupHistory.
- FR-U2: Admin can lock/unlock accounts and delete users with cleanup (bookings, schedules, notifications, tokens).
- FR-U3: Admin emails validated against configured admin list for privileged access.
- FR-U4: Faculty can update profile info and notification preferences (pushEnabled flag).

### 7.3 Classroom Inventory
- FR-C1: Admin can create, update, disable/enable classrooms with capacity (1–200) and equipment list.
- FR-C2: System stores building, floor, availability flag, and timestamps.
- FR-C3: When disabling a classroom, system warns about affected active/upcoming bookings/schedules and notifies impacted faculty.

### 7.4 Booking Requests & Scheduling
- FR-B1: Faculty can search classrooms by date, time range, capacity, building/floor, and equipment filters.
- FR-B2: Faculty can submit booking requests (date, start/end time, purpose, classroom) within 07:00–20:00 in 30-minute increments.
- FR-B3: Client- and server-side conflict detection must prevent overlaps with existing bookings/schedules.
- FR-B4: Admin reviews pending requests, approves/rejects with optional feedback; approval creates schedule entry; rejection preserves audit.
- FR-B5: Pending bookings auto-expire via scheduled Cloud Function once start time passes.
- FR-B6: Faculty can track request statuses and view history; statuses include pending, approved, rejected, expired.

### 7.5 Schedules
- FR-S1: Approved bookings become schedules (confirmed) linked to classroom and faculty.
- FR-S2: Admin can cancel schedules; status updates propagate to notifications.
- FR-S3: Faculty can view personal schedule and global schedule views.

### 7.6 Notifications & Push
- FR-N1: In-app notifications created server-side only; clients cannot create self-notifications.
- FR-N2: Users can acknowledge single or all notifications; acknowledgment updates unread counts and cleans up per retention policy (72h after acknowledgment via scheduled cleanup).
- FR-N3: Push notifications use FCM; tokens registered/unregistered via Cloud Functions; push respects user pushEnabled flag.
- FR-N4: Test push function available to validate delivery.

### 7.7 Offline & Caching
- FR-O1: Offline booking queue stores requests in IndexedDB when offline; auto-syncs with exponential backoff (2s–5min, max 5 attempts) when online.
- FR-O2: Local conflict detection runs before queueing to avoid obvious clashes.
- FR-O3: Firestore read caching with TTL (5 min classrooms, 10 min users) and real-time invalidation.
- FR-O4: Offline indicators and queue viewer show sync status; users can remove queued items.

### 7.8 Reporting & Analytics
- FR-R1: Admin reports include utilization, reservation history, and usage statistics.
- FR-R2: Exports supported for reports (format per UI design).
- FR-R3: Dashboard shows real-time activity metrics.

### 7.9 Error Handling & Feedback
- FR-E1: User-facing errors are friendly and actionable; sensitive details are not exposed.
- FR-E2: Retry with exponential backoff for network/Firestore failures (default 3 attempts).
- FR-E3: Error boundaries prevent full-app crashes; recovery options shown where possible.

### 7.10 Accessibility & UI Behavior
- FR-UI1: WCAG-compliant contrast; keyboard navigation and ARIA labels on interactive components.
- FR-UI2: Smart dark mode (system detection + manual toggle) persisted per user preference.
- FR-UI3: Responsive layouts with mobile tabs and breakpoint-specific behavior.

## 8. Data and Storage Requirements (Firestore)
- **users:** email (unique), role, department, status, failedLoginAttempts, accountLocked, lockedUntil, lockedByAdmin, pushEnabled, timestamps.
- **classrooms:** name, capacity, equipment[], building, floor, isAvailable, createdAt/updatedAt.
- **bookingRequests:** facultyId/name, classroomId/name, date, startTime, endTime, purpose, status, requestDate, adminFeedback, resolvedAt, expiredAt, updatedBy, timestamps.
- **schedules:** classroomId/name, facultyId/name, date, startTime, endTime, purpose, status, timestamps.
- **signupRequests:** email, name, department, status, adminFeedback, requestDate, resolvedAt, timestamps.
- **signupHistory:** email, name, department, status, adminFeedback, processedBy, processedAt, originalRequestId.
- **notifications:** userId, type, message, bookingRequestId?, adminFeedback?, acknowledgedBy?, acknowledgedAt?, createdAt/updatedAt.
- **pushTokens:** id (token), userId, createdAt.
- **deletionLogs / deletionNotifications / tokenRevocations:** audit and cleanup records with timestamps and reasons.
- Composite indexes configured per collection for frequent queries (status/date, role/status, classroom/date/time, user/type, etc.).
- Security rules enforce role-based access, field validation, and forbid client-set fields (e.g., status=expired, notification creation).

## 9. External Interface Requirements
- **User Interface:** Responsive web UI (desktop/mobile), PWA-capable, dark/light themes, accessibility support.
- **APIs/Services:** Firebase Auth, Firestore (real-time listeners), Cloud Functions (callables + scheduled), FCM for push, IndexedDB for offline queue, Service Worker for push and caching.
- **Hardware:** Standard client device capable of modern browser; network connectivity for real-time features.
- **Communications:** HTTPS; WebSocket-based Firestore listeners; FCM for push messaging.

## 10. Non-Functional Requirements
- **Performance:** Typical UI actions respond within 1s under normal load; real-time updates within a few seconds of data change; caching reduces redundant reads by up to ~80%.
- **Availability:** Target 99%+ during operating hours; graceful degradation offline with queue and cached reads.
- **Reliability:** Scheduled jobs run hourly/daily as defined; retries for transient failures.
- **Scalability:** Firestore/Functions scale automatically; denormalized fields used to avoid expensive joins.
- **Security:** RBAC at rules and functions; brute-force protection; session timeout; token revocation; server-only notification creation; audit trails for signup and deletions.
- **Usability & Accessibility:** WCAG 2.1 AA contrast; clear validation messages; keyboard navigation; mobile-friendly layouts.
- **Maintainability:** TypeScript strict mode; service-layer boundary (`firebaseService.ts`); logging and error handling centralized; tests via Vitest/RTL.
- **Localization:** English-only in current scope.
- **Data Retention:** Acknowledged notifications auto-cleaned after 72 hours; expired bookings handled by scheduled cleanup.

## 11. Business Rules and Constraints
- Booking window 07:00–20:00; 30-minute increments.
- Capacity limits 1–200; required fields validated and trimmed.
- Status lifecycle: bookingRequests (pending → approved/rejected/expired); schedules (confirmed/cancelled).
- Clients cannot set booking status to expired; only Cloud Function may do so.
- Notifications must be created server-side to prevent self-notification.
- Admin emails must match configured allowlist for admin role assignment.

## 12. Operational Scenarios (Happy Paths)
- **Faculty booking:** Login → search with filters → fill request → local conflict check → submit → admin decision → notification → schedule creation on approval → faculty views schedule.
- **Admin approval:** View pending queue → inspect conflicts → approve/reject with feedback → notifications sent → schedules/booking statuses updated.
- **Faculty signup:** Submit signup → admin reviews → approve/reject → notification/email → first login.
- **Classroom disable:** Admin disables room → system surfaces impacted bookings/schedules → sends notifications to affected faculty → room marked unavailable.
- **Offline request:** Faculty offline → create booking stored in queue → auto-sync on reconnection with retries → success or conflict feedback.
- **Push enablement:** Faculty enables push → service worker ready → token registered via Cloud Function → pushEnabled stored → test push validates delivery.

## 13. Error Handling and Recovery
- Retry strategy with exponential backoff for network/Firestore errors.
- Offline queue retries up to 5 attempts; failures surfaced in queue viewer with options to remove.
- Error boundaries isolate component failures; app remains navigable.
- User-friendly messages avoid exposing stack traces or sensitive data.

## 14. Quality Assurance and Testing
- Unit/component tests via Vitest and React Testing Library (coverage for ClassroomManagement, RoomBooking, NotificationCenter, etc.).
- Manual regression for role flows (admin/faculty), offline queue, push notifications, and session timeout.
- Security validation: rules simulation, brute-force lockout, admin lock/unlock, notification creation constraints.

## 15. Deployment and Environment
- Dev server via Vite; production build via npm run build.
- Deploy options: Vercel (recommended) or Firebase Hosting.
- Cloud Functions built/deployed separately; must be deployed before hosting for full functionality.
- Environment variables managed per environment (local, Vercel, Firebase Hosting).

## 16. Open Issues / Out of Scope
- Localization beyond English not specified.
- Mobile-native app not covered; PWA only.
- Integrations with external calendar systems not defined.
- Advanced analytics/BI beyond provided reports not defined.

## 17. Acceptance Criteria (High-Level)
- All functional requirements (FR-A through FR-UI) demonstrably met for both roles.
- Security controls (RBAC, brute-force lockout, session timeout, notification creation guards) verified.
- Offline queue operates correctly with conflict prevention and auto-sync.
- Push notifications delivered when pushEnabled=true and supported browser; in-app notifications always generated server-side.
- Firestore rules and scheduled functions enforce status protection and cleanup behaviors.
- UI passes accessibility smoke checks (keyboard navigation, contrast) and responsive layout tests.
