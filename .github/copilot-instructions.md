# Copilot Instructions for Digital Classroom Assignment System (PLV CEIT)

## Project Overview
- **Purpose:** Modern classroom reservation and management for PLV CEIT, with role-based dashboards (Admin/Faculty), real-time conflict detection, and comprehensive reporting.
- **Stack:** React (TypeScript), Vite, Tailwind CSS, Firebase (Auth, Firestore), Shadcn/ui, Framer Motion, Vercel/Firebase Hosting.

## Architecture & Key Patterns
- **Entry Points:**
  - `main.tsx`: React 18 root, StrictMode.
  - `App.tsx`: App shell, routing, Firebase context.
## Copilot instructions — Digital Classroom Assignment (PLV CEIT)

Short, actionable guide for AI coding agents to be productive in this repo.

- Big picture: React + TypeScript frontend (Vite) with Firebase backend. UI uses Shadcn/ui + Radix primitives and Framer Motion. Data + auth logic live in `lib/firebaseService.ts` and `lib/firebaseConfig.ts`.

- Service boundary: All reads/writes and real-time listeners go through `lib/firebaseService.ts` (e.g., `bookingRequestService`, `scheduleService`, `authService`, `realtimeService`). Prefer using these exported methods instead of calling Firestore directly.

- Real-time & roles: `realtimeService.subscribeToData(user, callbacks)` sets up role-filtered listeners. Admin receives all collections; faculty receives filtered booking/schedule streams.
 - Real-time & roles: `realtimeService.subscribeToData(user, callbacks)` sets up role-filtered listeners. Admin receives all collections; faculty receives filtered reservation/schedule streams.

- Real-time & roles: `realtimeService.subscribeToData(user, callbacks)` sets up role-filtered listeners. Admin receives all collections; faculty receives filtered reservation/schedule streams.

- Cloud functions & security hooks: UI relies on callable functions for login-protection and account cleanup — common names: `trackFailedLogin`, `resetFailedLogins`, `deleteUserAccount`, `bulkCleanupRejectedAccounts`. When adding infra-affecting changes, update client usage in `lib/firebaseService.ts`.

- Auth & env: `lib/firebaseConfig.ts` throws on missing VITE_* env vars. Auth persistence is set to `browserLocalPersistence`. When running locally, ensure `.env` contains required `VITE_FIREBASE_*` keys and `VITE_FIREBASE_ADMIN_EMAILS` if used.

- Forms & validation: Project uses Radix + `react-hook-form` patterns (see `components/ui/form.tsx`) and many form components in `components/*` (e.g., `RoomBooking.tsx`) that implement inline validation and conflict checks. Follow same pattern: FormProvider + Controllers + `FormItem`/`FormLabel`/`FormMessage`.

- Time & reservation rules: Business logic enforces 30-minute slots between 7:00–20:00, 24h storage/12h display. Conflict checks are implemented client-side in components (e.g., `RoomBooking.tsx`) and server-side via Firestore queries (`bookingRequestService.checkConflicts`, `scheduleService.checkConflict`). Mirror these checks when modifying reservation flows.

- Code style & conventions: TypeScript strict mode is enabled. Use explicit types for props/services. Keep service logic in `lib/`, UI in `components/`, shared utils in `utils/`.

- Dev commands (from `package.json`):
  - Install: `npm install`
  - Dev: `npm run dev`
  - Build: `npm run build`
  - Preview: `npm run preview`

- Quick examples to reference:
 - Quick examples to reference:
  - Use `bookingRequestService.create(...)` for creating reservation requests (see `lib/firebaseService.ts`).
  - Subscribe to real-time data: `realtimeService.subscribeToData(user, { onClassroomsUpdate, onBookingRequestsUpdate, onSchedulesUpdate })`.
  - Use `Form`, `FormItem`, `FormControl`, `FormMessage` from `components/ui/form.tsx` for new forms.

- When editing or adding features that touch security, roles, or data shape, update `firestore.rules` and `guidelines/FIREBASE_QUICK_REFERENCE.md`.

If anything here is ambiguous or you want longer examples (cloud function signatures, env examples, or common UI patterns), tell me which section to expand and I'll iterate.
- **Error handling:** User-friendly error messages, especially for auth and booking conflicts.
 - **Error handling:** User-friendly error messages, especially for auth and reservation conflicts.
