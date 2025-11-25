# Offline Booking Queue Feature

## Overview

The offline booking queue feature enables users to create classroom booking requests even when they're offline. Requests are queued locally using IndexedDB and automatically synced when the connection is restored.

## Key Components

### 1. Offline Queue Service (`lib/offlineQueueService.ts`)

**Core Functionality:**
- IndexedDB storage for persistent offline queue
- Automatic sync when connection is restored
- Conflict detection (both local and server-side)
- Retry logic with exponential backoff
- Queue status tracking

**Queue Statuses:**
- `pending-validation` - Waiting to validate for conflicts when online
- `pending-sync` - Validated, waiting to sync to server
- `syncing` - Currently attempting to sync
- `conflict` - Conflict detected after validation
- `failed` - Sync failed (will retry)
- `synced` - Successfully synced to server

**Key Methods:**
- `queueBooking()` - Add a booking to the offline queue
- `getQueuedRequests()` - Get all queued requests
- `syncQueue()` - Sync all pending requests when online
- `checkLocalConflicts()` - Check for conflicts within the local queue
- `clearSynced()` - Remove successfully synced requests

**Configuration:**
- Max retries: 5 attempts
- Initial retry delay: 2 seconds
- Max retry delay: 5 minutes
- Exponential backoff for failed syncs

### 2. Network Status Indicator (`components/NetworkStatusIndicator.tsx`)

**Enhanced Features:**
- Shows offline status with queue count
- Displays sync progress when connection is restored
- Shows sync completion notification
- Real-time queue count updates

**Visual States:**
- Offline: Red badge with queue count
- Syncing: Blue badge with spinner
- Sync Complete: Green badge with checkmark
- Online: Green badge (brief notification)

### 3. Room Booking Component (`components/RoomBooking.tsx`)

**Offline Mode Changes:**
- Detects offline status automatically
- Queues requests when offline instead of submitting
- Shows offline mode warning with conflict detection limitations
- Local conflict detection within offline queue
- Different submit button text/icon when offline
- Disabled submit button if local conflicts exist

**User Experience:**
- Form validation still works offline
- Local queue conflict checking prevents duplicate submissions
- Clear messaging about offline behavior
- Success toast when booking is queued
- Form reset after successful queue

### 4. Offline Queue Viewer (`components/OfflineQueueViewer.tsx`)

**Display Features:**
- Shows all pending queued bookings
- Status badges for each queue item
- Ability to remove queued items
- Conflict and error messages
- Attempt count display
- Real-time updates via service subscription

**Integration:**
- Displayed in Faculty Dashboard overview tab
- Only visible when queue has items
- Auto-updates when queue changes

### 5. App Integration (`App.tsx`)

**Sync Handler:**
- Listens for 'offline-queue-sync-needed' event
- Triggered by NetworkStatusIndicator when online
- Processes all pending requests
- Shows aggregate sync results
- Handles conflicts and failures appropriately

## Edge Cases Handled

### 1. Conflict Detection When Offline

**Problem:** Cannot validate conflicts against server data when offline.

**Solution:**
- Requests queued as `pending-validation`
- Local conflict checking within offline queue
- Server-side validation during sync
- User notification if conflicts discovered during sync

### 2. Multiple Offline Requests for Same Slot

**Problem:** User might queue multiple requests for overlapping times.

**Solution:**
- `checkLocalConflicts()` validates against queued requests
- Prevents queueing if local conflict exists
- Shows clear warning message
- Submit button disabled when local conflict detected

### 3. Network Failures During Sync

**Problem:** Sync might fail due to network issues.

**Solution:**
- Retry logic with exponential backoff
- Max 5 retry attempts
- Next retry timestamp stored
- Failed requests marked with error message
- Automatic retry when conditions improve

### 4. App Closure with Pending Queue

**Problem:** User closes browser with queued requests.

**Solution:**
- IndexedDB persists across sessions
- Queue loads on next app launch
- Sync triggers on next online event
- No data loss

### 5. Conflicts Discovered After Coming Online

**Problem:** Time slot might be taken while user was offline.

**Solution:**
- Server-side conflict check during sync
- Request marked as `conflict` status
- Conflict details stored with message
- User can see conflict in queue viewer
- User can remove conflicted request

### 6. Session Expiry with Queued Requests

**Problem:** User's session might expire while offline.

**Solution:**
- Queue persists in IndexedDB regardless of session
- Sync handler checks for current user
- User must re-authenticate to sync
- Queue remains until synced or manually cleared

## User Flow

### Offline Booking Creation

1. User loses internet connection
2. Network indicator shows offline status
3. User fills out booking form
4. Offline mode warning displayed
5. Local conflict check performed
6. If no conflicts, submit button shows "Queue Reservation (Offline)"
7. User submits form
8. Request added to IndexedDB queue
9. Success toast: "Booking queued for when you're back online"
10. Form resets

### Automatic Sync

1. Connection is restored
2. Network indicator detects online status
3. If queue has pending items, shows "Syncing queued bookings..."
4. App triggers sync via custom event
5. Sync handler processes each queued request:
   - Validates for conflicts
   - Submits to server if no conflicts
   - Marks as conflict if conflicts found
   - Retries failed requests with backoff
6. Shows aggregate results:
   - Success: "X bookings synced successfully"
   - Conflicts: "X bookings had conflicts - Check your offline queue"
   - Failures: "X bookings failed to sync - Will retry automatically"
7. Synced requests removed from queue
8. Conflict/failed requests remain in queue viewer

### Manual Queue Management

1. User opens Faculty Dashboard
2. If queue has items, "Offline Queue" card is visible
3. User can see all pending requests with status
4. User can remove individual requests
5. Conflicts and errors shown with details

## TypeScript Types

### QueuedBookingRequest

```typescript
interface QueuedBookingRequest {
  queueId: string;
  bookingData: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>;
  queuedAt: string;
  queueStatus: 'pending-validation' | 'pending-sync' | 'syncing' | 'conflict' | 'failed' | 'synced';
  attempts: number;
  lastAttempt?: string;
  error?: string;
  conflictDetails?: {
    message: string;
    conflictingBookings?: string[];
  };
  nextRetry?: string;
}
```

### SyncResult

```typescript
interface SyncResult {
  queueId: string;
  success: boolean;
  bookingId?: string;
  error?: string;
  conflict?: boolean;
  conflictDetails?: QueuedBookingRequest['conflictDetails'];
}
```

## Dependencies Added

- `idb@^8.0.2` - IndexedDB wrapper for easier database operations

## Testing Recommendations

### Manual Testing

1. **Offline Queue:**
   - Go offline (Dev Tools > Network > Offline)
   - Create multiple booking requests
   - Verify they appear in queue viewer
   - Try to create conflicting offline bookings (should be blocked)

2. **Sync Process:**
   - Create offline bookings
   - Go back online
   - Verify sync indicator shows
   - Verify bookings appear in system
   - Verify synced items removed from queue

3. **Conflict Detection:**
   - Create booking online (e.g., Admin creates schedule)
   - Go offline
   - Create overlapping offline booking
   - Go online
   - Verify conflict detected and shown

4. **Retry Logic:**
   - Create offline booking
   - Block network after coming online (during sync)
   - Verify request marked as failed
   - Wait for retry
   - Verify successful sync on retry

5. **Persistence:**
   - Create offline bookings
   - Close and reopen browser
   - Verify queue persists
   - Go online
   - Verify sync works

### Edge Case Testing

1. Multiple rapid offline bookings
2. Offline booking for past time slots
3. Offline booking with form validation errors
4. Queue management while syncing
5. Logout/login with pending queue
6. Browser refresh during sync

## Performance Considerations

- IndexedDB operations are asynchronous and non-blocking
- Queue subscriber pattern prevents unnecessary re-renders
- Synced requests automatically cleared to prevent queue growth
- Conflict detection uses indexed queries for efficiency

## Security Considerations

- Queue stored locally in IndexedDB (client-side only)
- Server-side validation still enforced during sync
- No bypass of authentication or authorization
- Firestore security rules still apply

## Future Enhancements

1. **Manual Sync Trigger:** Allow users to manually trigger sync
2. **Conflict Resolution UI:** Let users modify conflicting requests
3. **Queue Priority:** Allow users to prioritize certain requests
4. **Sync Progress:** Show individual request sync progress
5. **Queue Analytics:** Track offline usage patterns
6. **Offline Viewing:** Allow viewing existing bookings/schedules offline

## Files Modified

- `lib/offlineQueueService.ts` (new)
- `components/OfflineQueueViewer.tsx` (new)
- `components/NetworkStatusIndicator.tsx` (enhanced)
- `components/RoomBooking.tsx` (offline support)
- `components/FacultyDashboard.tsx` (queue viewer integration)
- `App.tsx` (sync handler)
- `package.json` (idb dependency)

## Migration Notes

- No database migrations required
- IndexedDB created automatically on first use
- Backwards compatible with existing system
- No impact on existing functionality when online
