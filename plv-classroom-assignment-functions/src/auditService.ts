import * as admin from 'firebase-admin';

// Lightweight audit logging helper for Cloud Functions and server runtimes.
// Writes a single document to the top-level `auditLogs` collection and sets
// `createdAt` + `expireAt` (7 days) so Firestore TTL can remove old entries.

export type AuditEvent = {
  actionType: string;
  userId?: string | null;
  actorId?: string | null;
  status?: string;
  ip?: string | null;
  requestId?: string;
  metadata?: Record<string, any>;
  source?: string;
};

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const now = admin.firestore.Timestamp.now();
    const expireAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    // Lightweight deterministic-ish request id if caller doesn't provide one
    const requestId = event.requestId || `${now.toMillis()}-${Math.random().toString(36).slice(2,10)}`;

    const doc = {
      actionType: event.actionType,
      userId: event.userId ?? null,
      actorId: event.actorId ?? null,
      status: event.status ?? 'unknown',
      ip: event.ip ?? null,
      requestId,
      metadata: event.metadata ?? {},
      source: event.source ?? 'cloud-function',
      createdAt: now,
      expireAt,
      _v: 1,
    } as const;

    // Single lightweight write. Keep payload small to control cost/latency.
    await admin.firestore().collection('auditLogs').add(doc as any);
  } catch (err) {
    // Non-fatal: surface to logs but do not throw so business logic is not blocked.
    // Cloud Functions has structured logger available in many files; use console here
    // to avoid a hard dependency on logger import.
    console.error('logAuditEvent failed', err, event);
  }
}
