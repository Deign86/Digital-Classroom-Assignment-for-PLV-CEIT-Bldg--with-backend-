import React, { useEffect, useState, useCallback } from 'react';
import { notificationService, type Notification } from '../lib/notificationService';
import { Bell, BellSimpleSlash, CheckCircle, XCircle, UserCircle, UserPlus } from '@phosphor-icons/react';
import { Loader2 } from 'lucide-react';

type Props = {
  userId: string;
  onClose?: () => void;
  onAcknowledgeAll?: (newUnreadCount: number | null) => void; // optional callback to allow parent components to update bell immediately
};

const NotificationItem: React.FC<{ n: Notification; onAcknowledge: (id: string) => void; acknowledging?: boolean }> = ({ n, onAcknowledge, acknowledging }) => {
  const isUnread = !n.acknowledgedAt;
  return (
    <li key={n.id} className={`p-3 border rounded-lg shadow-sm bg-white ${isUnread ? 'ring-2 ring-primary/10' : 'opacity-70'}`}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {n.type === 'approved' ? (
              <CheckCircle size={20} className="text-green-600" />
            ) : n.type === 'rejected' ? (
              <XCircle size={20} className="text-red-600" />
            ) : n.type === 'cancelled' ? (
              <XCircle size={20} className="text-orange-600" />
            ) : n.type === 'signup' ? (
              <UserPlus size={20} className="text-blue-600" />
            ) : (
              <Bell size={20} className="text-gray-600" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {n.type === 'approved' ? 'Reservation approved' : n.type === 'rejected' ? 'Reservation rejected' : n.type === 'cancelled' ? 'Reservation cancelled' : n.type === 'signup' ? 'New signup request' : 'Info'}
            </div>
            <div className="text-xs text-gray-600 mt-1">{n.message}</div>
            {n.adminFeedback && <div className="mt-2 text-xs italic text-gray-700 rounded px-2 py-1 bg-slate-50">Admin Feedback: {n.adminFeedback}</div>}
            <div className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <div className="ml-auto flex flex-col items-end">
          {!n.acknowledgedAt ? (
            <button
              onClick={() => onAcknowledge(n.id)}
              className="text-sm text-white bg-primary px-3 py-1 rounded hover:opacity-95 disabled:opacity-60"
              disabled={acknowledging}
            >
              {acknowledging ? (
                <span className="inline-flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Acknowledging...
                </span>
              ) : (
                'Acknowledge'
              )}
            </button>
          ) : (
            <div className="text-xs text-gray-500">Acknowledged</div>
          )}
        </div>
      </div>
    </li>
  );
};

export const NotificationCenter: React.FC<Props> = ({ userId, onClose, onAcknowledgeAll }) => {
  const [items, setItems] = useState<Notification[]>([]);
  const [ackPending, setAckPending] = useState<Record<string, boolean>>({});

  // Auto-hide notifications on mobile when the user scrolls down.
  // This prevents the notifications panel from remaining "sticky" on small screens.
  useEffect(() => {
    if (!onClose) return;
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;

    const isMobile = window.matchMedia('(max-width: 639px)').matches; // tailwind `sm` breakpoint
    if (!isMobile) return;

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      // if user scrolled down more than a small threshold, close the panel
      if (y > lastY + 10) {
        onClose();
      }
      lastY = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onClose]);

  useEffect(() => {
    if (!userId) return;
    const unsub = notificationService.setupNotificationsListener((list) => {
      // The service normalizes timestamps; ensure we filter and sort reliably
      const filtered = list
        .filter((i) => i.userId === userId)
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      setItems(filtered);
    }, (err) => console.error('NotificationCenter listener error', err), userId);

    return () => unsub?.();
  }, [userId]);

  const handleAcknowledge = useCallback(async (id: string) => {
    // optimistic UI: mark pending locally
    setAckPending((s) => ({ ...s, [id]: true }));
    try {
      // Make server call; server will emit updated doc via listener
      await notificationService.acknowledgeNotification(id, userId);
    } catch (err) {
      console.error('Acknowledge error', err);
    } finally {
      setAckPending((s) => ({ ...s, [id]: false }));
    }
  }, [userId]);

  return (
  <div className="p-4 bg-white shadow-2xl rounded-lg w-full max-w-md sm:w-96">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Notifications</h3>
          <span className="text-sm text-gray-500">{items.length} total</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              // acknowledge all unread notifications optimistically
                    const unread = items.filter(i => !i.acknowledgedAt).map(i => i.id);
              if (!unread.length) {
                onClose?.();
                return;
              }
              // optimistically mark as acknowledging
              const prev = items;
              setItems(prev.map(it => unread.includes(it.id) ? { ...it, acknowledgedAt: new Date().toISOString() } : it));
              try {
                      // prefer batch acknowledge if supported by service
                      if (typeof notificationService.acknowledgeNotifications === 'function') {
                        const newUnread = await notificationService.acknowledgeNotifications(unread, userId);
                        // notify parent about new unread count so the bell can update immediately
                        onAcknowledgeAll?.(typeof newUnread === 'number' ? newUnread : null);
                      } else {
                        await Promise.all(unread.map(id => notificationService.acknowledgeNotification(id, userId)));
                        // parent can refresh via listener; we don't know the final unread count here
                        onAcknowledgeAll?.(0);
                      }
              } catch (err) {
                console.error('Failed to acknowledge all notifications', err);
                // revert the optimistic update by re-triggering listener (listener will correct state)
              }
              onClose?.();
            }}
            aria-label="Acknowledge all notifications"
            className="text-sm text-gray-600 hover:underline"
          >
            Acknowledge all
          </button>
          <button onClick={onClose} aria-label="Close notifications" className="text-sm text-gray-600 hover:underline">Close</button>
        </div>
      </div>
      {items.length === 0 && <p className="text-sm text-muted-foreground">No notifications</p>}
      <ul className="space-y-3 max-h-72 overflow-auto">
        {items.map((n) => (
          <NotificationItem key={n.id} n={n} acknowledging={!!ackPending[n.id]} onAcknowledge={handleAcknowledge} />
        ))}
      </ul>
    </div>
  );
};

export default NotificationCenter;
