# Offline Queue Quick Reference

## Adding a Booking to Queue (Offline)

```typescript
import { offlineQueueService } from '../lib/offlineQueueService';

// Queue a booking when offline
const queued = await offlineQueueService.queueBooking({
  facultyId: user.id,
  facultyName: user.name,
  classroomId: 'classroom-id',
  classroomName: 'Room 101',
  date: '2025-11-26',
  startTime: '09:00',
  endTime: '10:30',
  purpose: 'Lecture',
});

console.log(queued.queueId); // Unique queue ID
console.log(queued.queueStatus); // 'pending-validation'
```

## Checking Local Conflicts

```typescript
// Check if booking conflicts with other queued requests
const hasConflict = await offlineQueueService.checkLocalConflicts({
  facultyId: user.id,
  facultyName: user.name,
  classroomId: 'classroom-id',
  classroomName: 'Room 101',
  date: '2025-11-26',
  startTime: '09:00',
  endTime: '10:30',
  purpose: 'Lecture',
});

if (hasConflict) {
  console.log('Conflicts with another queued booking!');
}
```

## Syncing Queue

```typescript
// Sync all pending requests (called automatically when online)
const results = await offlineQueueService.syncQueue(
  // Callback to create booking (returns booking ID)
  async (request) => {
    const booking = await bookingRequestService.create(request);
    return booking.id;
  },
  // Callback to check conflicts
  async (classroomId, date, startTime, endTime) => {
    return await checkConflicts(classroomId, date, startTime, endTime, true);
  }
);

// Process results
results.forEach(result => {
  if (result.success) {
    console.log(`✅ ${result.queueId} synced as ${result.bookingId}`);
  } else if (result.conflict) {
    console.log(`⚠️ ${result.queueId} has conflict`);
  } else {
    console.log(`❌ ${result.queueId} failed: ${result.error}`);
  }
});
```

## Getting Queue Status

```typescript
// Get all queued requests
const all = await offlineQueueService.getQueuedRequests();

// Get requests by status
const pending = await offlineQueueService.getQueuedRequests('pending-sync');
const conflicts = await offlineQueueService.getQueuedRequests('conflict');
const failed = await offlineQueueService.getQueuedRequests('failed');

// Get queue statistics
const stats = await offlineQueueService.getQueueStats();
console.log(stats);
// {
//   total: 5,
//   pendingValidation: 2,
//   pendingSync: 1,
//   syncing: 0,
//   conflict: 1,
//   failed: 1,
//   synced: 0
// }
```

## Managing Queue Items

```typescript
// Remove a queued request
await offlineQueueService.removeQueuedRequest('queue-id');

// Clear all synced requests
const count = await offlineQueueService.clearSynced();
console.log(`Cleared ${count} synced requests`);
```

## Subscribing to Queue Changes

```typescript
// Subscribe to queue changes
const unsubscribe = offlineQueueService.subscribe(() => {
  console.log('Queue changed!');
  // Refresh UI
});

// Later, unsubscribe
unsubscribe();
```

## Custom Events

```typescript
// Trigger sync (dispatched by NetworkStatusIndicator)
window.dispatchEvent(new CustomEvent('offline-queue-sync-needed'));

// Listen for sync completion
window.addEventListener('offline-queue-sync-complete', () => {
  console.log('Sync complete!');
});
```

## Detecting Offline Status

```typescript
// Check if browser is offline
const isOffline = !navigator.onLine;

// Listen for online/offline events
window.addEventListener('online', () => {
  console.log('Connection restored');
});

window.addEventListener('offline', () => {
  console.log('Connection lost');
});
```

## UI Integration Examples

### Show Queue Count in Badge

```tsx
const [queueCount, setQueueCount] = useState(0);

useEffect(() => {
  const updateCount = async () => {
    const stats = await offlineQueueService.getQueueStats();
    setQueueCount(stats.pendingValidation + stats.pendingSync + stats.failed);
  };

  const unsubscribe = offlineQueueService.subscribe(updateCount);
  updateCount();

  return unsubscribe;
}, []);

return <Badge>{queueCount} queued</Badge>;
```

### Offline Form Submission

```tsx
const handleSubmit = async () => {
  const isOffline = !navigator.onLine;

  if (isOffline) {
    // Queue for offline
    await offlineQueueService.queueBooking(bookingData);
    toast.success('Booking queued for offline sync');
  } else {
    // Submit normally
    await bookingRequestService.create(bookingData);
    toast.success('Booking submitted');
  }
};
```

### Conflict Warning Display

```tsx
const [hasLocalConflict, setHasLocalConflict] = useState(false);

useEffect(() => {
  const checkConflicts = async () => {
    if (formData.classroomId && formData.date && formData.startTime) {
      const conflict = await offlineQueueService.checkLocalConflicts(formData);
      setHasLocalConflict(conflict);
    }
  };

  checkConflicts();
}, [formData]);

return hasLocalConflict && (
  <Alert variant="warning">
    You already have a queued booking for this time slot.
  </Alert>
);
```

## Troubleshooting

### Queue Items Not Syncing

1. Check browser console for errors
2. Verify user is authenticated
3. Check network connectivity
4. Look for conflict or failed status in queue
5. Check retry timestamp (`nextRetry`)

### IndexedDB Errors

```typescript
// Clear and reinitialize IndexedDB
import { offlineQueueService } from '../lib/offlineQueueService';

// Delete database (careful - loses queue!)
indexedDB.deleteDatabase('plv-offline-queue');

// Reinitialize
await offlineQueueService.init();
```

### Debugging

```typescript
// Enable detailed logging
import { logger } from '../lib/logger';

// Service logs are prefixed with [OfflineQueue]
// Check console for:
// - Queue operations
// - Sync attempts
// - Conflict detection
// - Error details
```

## Best Practices

1. **Always check for conflicts** before queueing
2. **Clear synced requests** regularly to prevent queue growth
3. **Subscribe to queue changes** for real-time UI updates
4. **Show clear offline indicators** to users
5. **Handle conflicts gracefully** with user-friendly messages
6. **Test offline scenarios** thoroughly
7. **Validate forms** even when offline
8. **Provide manual queue management** for edge cases

## Common Patterns

### Queue Status Badge Component

```tsx
function QueueStatusBadge({ status }: { status: QueuedBookingRequest['queueStatus'] }) {
  const variants = {
    'pending-validation': { color: 'secondary', label: 'Pending Validation' },
    'pending-sync': { color: 'secondary', label: 'Waiting to Sync' },
    'syncing': { color: 'default', label: 'Syncing...' },
    'conflict': { color: 'destructive', label: 'Conflict' },
    'failed': { color: 'destructive', label: 'Failed' },
    'synced': { color: 'success', label: 'Synced' },
  };

  const variant = variants[status];
  return <Badge variant={variant.color}>{variant.label}</Badge>;
}
```

### Automatic Sync on Online

```tsx
useEffect(() => {
  const handleOnline = async () => {
    const stats = await offlineQueueService.getQueueStats();
    const hasPending = stats.pendingValidation + stats.pendingSync + stats.failed > 0;
    
    if (hasPending) {
      window.dispatchEvent(new CustomEvent('offline-queue-sync-needed'));
    }
  };

  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}, []);
```
