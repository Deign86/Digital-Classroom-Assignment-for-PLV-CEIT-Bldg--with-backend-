import React, { useEffect, useState, useCallback, useRef } from 'react';
import { logger } from '../lib/logger';
import type { Notification } from '../lib/notificationService';
import { useNotificationContext } from '../contexts/NotificationContext';
import { Bell, CheckCircle, XCircle, UserPlus, Warning } from '@phosphor-icons/react';
import { Loader2 } from 'lucide-react';

type Props = {
  userId: string;
  onClose?: () => void;
  onAcknowledgeAll?: (newUnreadCount: number | null) => void; // optional callback to allow parent components to update bell immediately
  onNavigate?: (notification: Notification) => void; // optional callback to handle navigation when clicking on a notification
};

const NotificationItem: React.FC<{ n: Notification; onAcknowledge: (id: string) => void; acknowledging?: boolean; onNavigate?: (notification: Notification) => void }> = ({ n, onAcknowledge, acknowledging, onNavigate }) => {
  const isUnread = !n.acknowledgedAt;
  const isClickable = onNavigate && (n.type === 'approved' || n.type === 'rejected' || n.type === 'cancelled' || n.type === 'faculty_cancelled' || n.type === 'signup');
  return (
    <li 
      key={n.id} 
      className={`p-3 border rounded-lg shadow-sm bg-white ${isUnread ? 'ring-2 ring-primary/10' : 'opacity-70'} ${isClickable ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
      onClick={() => isClickable && onNavigate?.(n)}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {n.type === 'approved' ? (
              <CheckCircle size={20} className="text-green-600" />
            ) : n.type === 'rejected' ? (
              <XCircle size={20} className="text-red-600" />
            ) : n.type === 'cancelled' ? (
              <XCircle size={20} className="text-orange-600" />
            ) : n.type === 'faculty_cancelled' ? (
              <XCircle size={20} className="text-purple-600" />
            ) : n.type === 'classroom_disabled' ? (
              <Warning size={20} className="text-amber-600" />
            ) : n.type === 'signup' ? (
              <UserPlus size={20} className="text-blue-600" />
            ) : (
              <Bell size={20} className="text-gray-600" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {n.type === 'approved' ? 'Reservation approved' 
               : n.type === 'rejected' ? 'Reservation rejected' 
               : n.type === 'cancelled' ? 'Reservation cancelled' 
               : n.type === 'faculty_cancelled' ? 'Faculty cancelled reservation'
               : n.type === 'classroom_disabled' ? 'Classroom disabled' 
               : n.type === 'signup' ? 'New signup request' 
               : 'Info'}
            </div>
            <div className="text-xs text-gray-600 mt-1">{n.message}</div>
            {n.adminFeedback && <div className="mt-2 text-xs italic text-gray-700 rounded px-2 py-1 bg-slate-50">Admin Feedback: {n.adminFeedback}</div>}
            <div className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <div className="ml-auto flex flex-col items-end">
          {!n.acknowledgedAt ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAcknowledge(n.id); }}
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

export const NotificationCenter: React.FC<Props> = ({ userId, onClose, onAcknowledgeAll, onNavigate }) => {
  // This component is now a pure consumer of NotificationContext.
  // All real-time listeners and announcement logic are centralized in App.tsx.
  const ctx = useNotificationContext();
  const items = ctx.notifications ?? [];
  const [ackPending, setAckPending] = useState<Record<string, boolean>>({});
  const [globalAcking, setGlobalAcking] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // close on Escape, scroll, or click outside
  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    const handleScroll = () => onClose();
    const handleClickOutside = (ev: MouseEvent) => {
      // Close if click is outside the notification panel
      if (wrapperRef.current && !wrapperRef.current.contains(ev.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleAcknowledge = useCallback(async (id: string) => {
    // optimistic UI: mark pending locally and show global loader
    setAckPending((s) => ({ ...s, [id]: true }));
    setGlobalAcking(true);
    try {
      await ctx.onAcknowledge(id);
    } catch (err) {
      logger.error('Acknowledge error', err);
    } finally {
      setAckPending((s) => ({ ...s, [id]: false }));
      setGlobalAcking(false);
    }
  }, [ctx]);

  const isAnyAcking = globalAcking || Object.values(ackPending).some(Boolean);

  return (
  <div ref={wrapperRef} className="p-4 bg-white shadow-2xl rounded-lg w-full max-w-md sm:w-96 relative">
      {isAnyAcking && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin h-5 w-5 text-gray-700" />
            <span className="text-sm text-gray-700">Acknowledging...</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Notifications</h3>
          <span className="text-sm text-gray-500">{items.length} total</span>
        </div>
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              const unread = items.filter(i => !i.acknowledgedAt).map(i => i.id);
              if (!unread.length) {
                onClose?.();
                return;
              }
              setGlobalAcking(true);
              try {
                const newUnread = await ctx.onAcknowledgeAll();
                // notify parent about new unread count so the bell can update immediately
                onAcknowledgeAll?.(typeof newUnread === 'number' ? newUnread : null);
              } catch (err) {
                logger.error('Failed to acknowledge all notifications', err);
              } finally {
                setGlobalAcking(false);
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
          <NotificationItem key={n.id} n={n} acknowledging={!!ackPending[n.id]} onAcknowledge={handleAcknowledge} onNavigate={onNavigate} />
        ))}
      </ul>
    </div>
  );
};

export default NotificationCenter;
