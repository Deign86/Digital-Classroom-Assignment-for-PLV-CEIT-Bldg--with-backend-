# Notification Auto-Cleanup Feature

## Overview
Automatically removes acknowledged notifications after 72 hours (3 days) to reduce database clutter and improve performance while maintaining a reasonable window for users to review their notification history.

## Implementation Details

### Scheduled Function
- **Function Name**: `cleanupAcknowledgedNotifications`
- **Schedule**: Daily at 2 AM UTC
- **Cron Expression**: `0 2 * * *`
- **Location**: `plv-classroom-assignment-functions/src/index.ts`

### How It Works
1. Runs automatically every day at 2 AM UTC (minimal impact during peak usage)
2. Queries all notifications where `acknowledgedAt` field is not null and is older than 72 hours
3. Deletes matching notifications in batches of 500 (Firestore batch limit)
4. Logs progress and completion details

### Backwards Compatibility
✅ **Fully backwards compatible** with existing system:
- Works with all notifications acknowledged before this feature was deployed
- No migration required
- Existing acknowledged notifications will be cleaned up naturally over time
- Any notification with `acknowledgedAt` timestamp older than 72 hours will be deleted, regardless of when it was created

### Timeline
```
Notification Created → Acknowledged → [72 hours] → Auto-Deleted
```

Example:
- Notification acknowledged on Monday at 3 PM
- Auto-cleanup runs Wednesday at 2 AM (before 72 hours)
- Notification NOT deleted (too recent)
- Auto-cleanup runs Thursday at 2 AM (after 72 hours)
- Notification DELETED ✓

## Security
- Uses Firebase Admin SDK (bypasses security rules)
- Only deletes acknowledged notifications (preserves unread notifications indefinitely)
- Admins can still manually delete notifications via Firestore rules

## Monitoring

### Check Function Logs
```bash
cd plv-classroom-assignment-functions
npm run logs
```

Or in Firebase Console:
1. Go to **Functions** → **Logs**
2. Filter by function: `cleanupAcknowledgedNotifications`
3. Look for log entries like:
   - "Cleanup acknowledged notifications job starting..."
   - "Successfully cleaned up X acknowledged notification(s) older than 72 hours"
   - "No old acknowledged notifications found for cleanup"

### Expected Log Output
```
Cleanup acknowledged notifications job starting...
Deleted batch of 342 notifications (342/342 total)
Successfully cleaned up 342 acknowledged notification(s) older than 72 hours
```

## Performance Considerations
- Batched deletions (500 per batch) ensure efficient processing
- Runs during low-traffic hours (2 AM UTC)
- Indexed queries ensure fast execution
- No impact on user-facing performance

## Benefits
1. **Reduced Database Size**: Fewer documents to maintain and query
2. **Improved Performance**: Faster notification queries for active users
3. **Cost Optimization**: Lower Firestore read/write costs
4. **Better UX**: Users see cleaner, more relevant notification history
5. **Privacy**: Old acknowledged notifications are automatically removed

## Configuration
To modify the cleanup window, edit the cutoff time in `plv-classroom-assignment-functions/src/index.ts`:

```typescript
// Current: 72 hours (3 days)
const cutoffTime = admin.firestore.Timestamp.fromMillis(
  now.toMillis() - (72 * 60 * 60 * 1000)
);

// Example: 24 hours (1 day)
const cutoffTime = admin.firestore.Timestamp.fromMillis(
  now.toMillis() - (24 * 60 * 60 * 1000)
);

// Example: 7 days (1 week)
const cutoffTime = admin.firestore.Timestamp.fromMillis(
  now.toMillis() - (7 * 24 * 60 * 60 * 1000)
);
```

After changes, redeploy:
```bash
cd plv-classroom-assignment-functions
npm run build
npm run deploy
```

## Deployment
The function is automatically deployed with other Cloud Functions:

```bash
cd plv-classroom-assignment-functions
npm run build
npm run deploy
```

Or from root:
```bash
firebase deploy --only functions
```

## Troubleshooting

### Function Not Running
1. Check Firebase Console → Functions → ensure function is deployed
2. Verify schedule in function configuration
3. Check logs for errors

### Notifications Not Being Deleted
1. Verify `acknowledgedAt` timestamps are older than 72 hours
2. Check function logs for errors
3. Ensure Firebase Blaze plan is active (scheduled functions require paid plan)

### Too Many Notifications Deleted
1. Check logs to see how many were deleted
2. Verify `acknowledgedAt` field structure in Firestore
3. Adjust cutoff time if 72 hours is too aggressive

## Related Documentation
- `plv-classroom-assignment-functions/DEPLOYMENT_GUIDE.md` - Full deployment instructions
- `.github/copilot-instructions.md` - Project architecture overview
- `firestore.rules` - Security rules for notifications collection
