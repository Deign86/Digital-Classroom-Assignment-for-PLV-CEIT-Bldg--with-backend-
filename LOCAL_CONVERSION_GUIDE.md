# Local Storage Reference

This document captures the current behaviour of the local-storage edition and serves as a quick reference if you plan to extend or replace it with a real backend.

## Seed Data

On the first load (or after clearing storage) the app automatically creates:

- **Users**
  - `admin@plv.edu.ph` · password `admin123456` · role `admin`
  - `faculty@plv.edu.ph` · password `faculty123` · role `faculty`
- **Classrooms** – Room 101, Room 102, Lab 201 with sample capacities/equipment
- **Requests & schedules** – start empty until you interact with the UI

Seed data is declared inside `initializeDefaultData()` in `lib/localStorageService.ts`.

## Storage Keys

| Key                          | Contents |
|------------------------------|----------|
| `classroom_users`            | Admin and faculty accounts |
| `classroom_classrooms`       | Classroom metadata |
| `classroom_booking_requests` | Pending and processed booking requests |
| `classroom_schedules`        | Confirmed schedules (created on approval) |
| `classroom_signup_requests`  | Faculty signup workflow state |
| `classroom_current_user`     | ID of the signed-in user for session restore |

All values are stored as JSON strings.

## Auth Flow (Local Variant)

- `authService.signIn(email, password)` validates credentials against the local user list and records the active user ID.
- `authService.onAuthStateChange` provides a lightweight pub/sub wrapper so the UI reacts to login/logout and password updates.
- Password changes immediately update the stored user object and trigger listeners; no hashing is performed in this demo.

## Conflict Detection

Conflict checks mirror the production rules:

1. **Booking requests** – `bookingRequestService.checkConflicts` blocks overlapping requests or schedules for the same room/date.
2. **Schedules** – Confirmed schedules are created only after an approval passes the same overlap validation.
3. **Past times** – `isPastBookingTime` prevents users from requesting or approving times that have already elapsed.

## Resetting Data

```ts
import { clearAllData } from './lib/localStorageService';
clearAllData();
```

Running the snippet above (e.g., from the browser console in dev mode) clears every `classroom_*` key and reseeds default data on the next reload.

## Swapping in a Real Backend

1. Create a service module that mirrors the exports of `lib/localStorageService.ts`.
2. Replace the import in `App.tsx` with your implementation.
3. Ensure each method returns the same shapes defined by the shared interfaces in `App.tsx` (`User`, `Classroom`, `BookingRequest`, `Schedule`, `SignupRequest`).
4. Implement conflict checks server-side to maintain parity with the existing UX.

This approach lets you iterate on the UI locally while the backend is under construction.

---

_Last updated: October 2025_
