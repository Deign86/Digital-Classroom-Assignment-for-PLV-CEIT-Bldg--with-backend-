# Audit Logging System

This document describes the server-side audit logging layer for security-sensitive actions.

## Overview

Audit logs capture critical actions for security monitoring, debugging, and compliance. Logs auto-expire after **7 days** via Firestore TTL.

## Collection: `auditLogs`

### Schema

| Field       | Type                  | Description                                        |
|-------------|-----------------------|----------------------------------------------------|
| `actionType`| string                | e.g. `login.success`, `login.locked`, `booking.cancel`, `admin.roleChange`, `push.register`, `classroom.delete` |
| `userId`    | string \| null        | Subject user UID (the user affected)               |
| `actorId`   | string \| null        | Actor UID (who performed the action, e.g., admin)  |
| `status`    | string                | `success`, `failure`, `throttled`, etc.            |
| `ip`        | string \| null        | Client IP (best-effort, from headers)              |
| `requestId` | string                | Unique request identifier                          |
| `metadata`  | map                   | Small structured details (IDs, reasons). Keep < 1KB |
| `source`    | string                | `cloud-function`, `nextjs-api`, etc.               |
| `createdAt` | Firestore Timestamp   | Server timestamp of event                          |
| `expireAt`  | Firestore Timestamp   | `createdAt + 7 days` (for TTL auto-delete)         |
| `_v`        | number                | Schema version (currently `1`)                     |

### Action Types

| Action Type          | Description                                |
|----------------------|--------------------------------------------|
| `login.success`      | Successful login (failed attempts reset)   |
| `login.locked`       | Account locked after too many attempts     |
| `booking.cancel`     | Booking request cancelled                  |
| `classroom.delete`   | Classroom and related data deleted         |
| `admin.deleteUser`   | Admin deleted a user account               |
| `admin.roleChange`   | Admin changed a user's role                |
| `push.register`      | Push notification token registered         |

## Firestore TTL Setup (7-day auto-cleanup)

### Step-by-step (Firebase Console)

1. Open **Firebase Console** → **Firestore Database** → **Indexes & TTL** tab.
2. Click **"Enable TTL"** if not already enabled.
3. Click **"Add TTL policy"**:
   - **Collection**: `auditLogs`
   - **TTL field**: `expireAt`
4. Save.

### Behavior

- Documents with `expireAt <= now` become eligible for deletion.
- Actual deletion is asynchronous (typically within 24 hours).
- No manual cron or cleanup required.

### gcloud alternative

```bash
# View existing TTL policies
gcloud firestore indexes ttl list --project=plv-classroom-assigment

# Create TTL policy (if supported by SDK version)
gcloud firestore indexes ttl create \
  --project=plv-classroom-assigment \
  --collection-group=auditLogs \
  --field=expireAt
```

## Security Rules

The `auditLogs` collection is protected:
- **Reads**: Only admins (`request.auth.token.admin == true`)
- **Writes**: Denied to client SDKs; only Admin SDK (Cloud Functions) can write

```javascript
match /auditLogs/{logId} {
  allow read: if request.auth != null && request.auth.token.admin == true;
  allow create, update, delete: if false;
}
```

## Usage in Cloud Functions

```typescript
import { logAuditEvent } from './auditService';

// Fire-and-forget (non-blocking)
logAuditEvent({
  actionType: 'admin.roleChange',
  actorId: adminUid,
  userId: targetUserId,
  status: 'success',
  metadata: { newRole: 'admin' },
  source: 'cloud-function',
}).catch((e) => logger.error('logAuditEvent failed', e));
```

## Querying Audit Logs

### Recent activity for a user
```javascript
db.collection('auditLogs')
  .where('userId', '==', uid)
  .orderBy('createdAt', 'desc')
  .limit(50)
  .get();
```

### Recent admin actions
```javascript
db.collection('auditLogs')
  .where('actionType', 'in', ['admin.deleteUser', 'admin.roleChange'])
  .orderBy('createdAt', 'desc')
  .limit(100)
  .get();
```

### Failed logins in last hour
```javascript
const oneHourAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600000));
db.collection('auditLogs')
  .where('actionType', '==', 'login.locked')
  .where('createdAt', '>=', oneHourAgo)
  .get();
```

## Future Enhancements (Separate Branch)

- **BigQuery export**: Stream audit events to BigQuery for long-term analytics and dashboards.
- **Metrics counters**: Add Cloud Monitoring custom metrics for real-time alerting.
- **Pub/Sub integration**: Publish audit events for downstream processors.
