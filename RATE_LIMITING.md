# Rate Limiting Implementation

This document describes the rate limiting implementation in the PLV Classroom Reservation System.

## Overview

Rate limiting has been implemented across multiple layers to prevent abuse and ensure fair resource usage:

1. **Client-side rate limiting** - Prevents excessive API calls from the browser
2. **Authentication rate limiting** - Protects against brute force attacks
3. **Firestore security rules** - Server-side validation (future enhancement)

## Client-Side Rate Limiting

### Implementation: `lib/rateLimiter.ts`

Provides configurable rate limiting for all client-side operations:

```typescript
import { checkRateLimit, RATE_LIMITS } from './rateLimiter';

// Check rate limit before operation
const rateLimitCheck = checkRateLimit(key, RATE_LIMITS.BOOKING_CREATE);
if (!rateLimitCheck.allowed) {
  throw new Error(rateLimitCheck.message);
}
```

### Rate Limit Configurations

| Operation | Max Attempts | Window | Description |
|-----------|--------------|--------|-------------|
| **BOOKING_CREATE** | 5 | 60s | Creating booking requests |
| **BOOKING_UPDATE** | 10 | 60s | Updating booking requests |
| **SCHEDULE_CREATE** | 5 | 60s | Creating schedules |
| **NOTIFICATION_ACK** | 20 | 60s | Acknowledging notifications |
| **PUSH_TOKEN_REGISTER** | 3 | 5min | Push notification registration |
| **SEARCH_QUERY** | 30 | 60s | Search operations |
| **PROFILE_UPDATE** | 3 | 5min | Profile updates |

### Protected Operations

#### Booking Requests
- **Create**: Limited to 5 per minute per faculty member
- **Update**: Limited to 10 per minute per user
- Rate limits reset on successful operations

#### Schedules
- **Create**: Limited to 5 per minute per faculty member
- Prevents spam during bulk schedule creation

#### Notifications
- **Acknowledge**: Limited to 20 per minute per user
- Applies to both single and batch acknowledgments

#### Push Notifications
- **Token Registration**: Limited to 3 attempts per 5 minutes
- Prevents token refresh spam

## Authentication Rate Limiting (Brute Force Protection)

### Implementation: Cloud Functions

Located in `plv-classroom-assignment-functions/src/index.ts`:

```typescript
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
```

### How It Works

1. **Failed Login Tracking**: Each failed login increments a counter
2. **Account Lockout**: After 5 failures, account locks for 30 minutes
3. **Admin Immunity**: Admin accounts cannot be locked
4. **Auto-Unlock**: Locks automatically expire after 30 minutes

### Protected Routes

- `trackFailedLogin` - Tracks failed authentication attempts
- `resetFailedLogins` - Resets counter on successful login

## Utility Functions

### Debounce
Delays execution until after a specified time has passed:

```typescript
import { debounce } from './rateLimiter';

const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 500); // Wait 500ms after last call
```

### Throttle
Ensures minimum time between executions:

```typescript
import { throttle } from './rateLimiter';

const throttledSave = throttle((data) => {
  saveData(data);
}, 2000); // Max once per 2 seconds
```

## Error Handling

When rate limits are exceeded, users receive:

1. **Error Message**: Clear explanation of the limit
2. **Retry Information**: How long to wait before trying again
3. **User-Friendly UI**: Toast notifications with guidance

Example error:
```
"Too many booking requests. Please wait a moment before trying again."
```

## Best Practices

### For Developers

1. **Always check rate limits** before expensive operations
2. **Reset rate limits** after successful operations
3. **Use debounce** for user input handlers
4. **Use throttle** for scroll/resize events

### Adding New Rate Limits

1. Add configuration to `RATE_LIMITS` in `rateLimiter.ts`:
```typescript
export const RATE_LIMITS = {
  MY_NEW_OPERATION: {
    maxAttempts: 10,
    windowMs: 60 * 1000,
    message: 'Custom error message',
  },
} as const;
```

2. Apply in your service function:
```typescript
const rateLimitCheck = checkRateLimit(
  `my-operation-${userId}`,
  RATE_LIMITS.MY_NEW_OPERATION
);
if (!rateLimitCheck.allowed) {
  throw new Error(rateLimitCheck.message);
}
```

## Monitoring

### Client-Side
- Rate limit records stored in memory (Map)
- Automatic cleanup every 30 minutes
- No persistent storage required

### Server-Side
- Failed login attempts stored in Firestore
- Account lock status persisted in user documents
- Cloud Function logs track all auth events

## Future Enhancements

### Planned
1. **Firestore Security Rules Rate Limiting** - Validate on server
2. **IP-Based Rate Limiting** - Prevent distributed attacks
3. **Firebase App Check** - Verify requests from legitimate app
4. **Dynamic Rate Limits** - Adjust based on user behavior

### Considerations
1. **Redis Integration** - For distributed rate limiting
2. **Analytics** - Track rate limit violations
3. **Admin Dashboard** - Monitor and adjust limits

## Testing Rate Limits

### Manual Testing
1. Rapidly submit booking requests (should fail after 5)
2. Acknowledge notifications quickly (should fail after 20)
3. Try registering push tokens repeatedly (should fail after 3)

### Automated Testing
```typescript
// Example test
for (let i = 0; i < 10; i++) {
  try {
    await bookingRequestService.create(request);
  } catch (err) {
    if (i >= 5) {
      expect(err.message).toContain('Too many booking requests');
    }
  }
}
```

## Troubleshooting

### "Too many requests" errors appearing incorrectly
- Check if rate limit key is properly scoped
- Verify windowMs is appropriate for operation
- Consider increasing maxAttempts if legitimate use

### Rate limits not working
- Ensure `checkRateLimit` is called before operation
- Verify imports are correct
- Check browser console for errors

### Users locked out unnecessarily
- Review failed login tracking logic
- Check if lockedUntil timestamp is accurate
- Verify admin accounts are immune

## Security Considerations

1. **Client-side rate limiting is advisory** - Can be bypassed by determined attackers
2. **Always validate server-side** - Use Cloud Functions and Firestore Rules
3. **Monitor for abuse** - Set up alerts for repeated violations
4. **Keep limits reasonable** - Balance security with user experience

## References

- [lib/rateLimiter.ts](lib/rateLimiter.ts) - Rate limiting implementation
- [lib/firebaseService.ts](lib/firebaseService.ts) - Service layer integration
- [plv-classroom-assignment-functions/src/index.ts](plv-classroom-assignment-functions/src/index.ts) - Cloud Functions auth protection
- [firestore.rules](firestore.rules) - Firestore security rules
