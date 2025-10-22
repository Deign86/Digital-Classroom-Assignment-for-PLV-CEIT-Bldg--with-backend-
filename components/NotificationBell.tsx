import React, { useEffect, useState } from 'react';
import { notificationService, type Notification } from '../lib/notificationService';
import { Bell } from '@phosphor-icons/react';

type Props = {
  userId?: string | null; // if undefined, bell will listen for all notifications (admin view)
  onOpen?: () => void;
};

export const NotificationBell: React.FC<Props> = ({ userId, onOpen }) => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let listeningForAll = false;
    if (!userId) {
      // Admin: listen for all notifications
      listeningForAll = true;
    }

    let unsub: (() => void) | undefined;

    const setup = async () => {
      try {
        const normalizedUserId = userId ?? undefined;
        const initial = normalizedUserId ? await notificationService.getUnreadCount(normalizedUserId) : await notificationService.getUnreadCount();
        setCount(initial);

        unsub = notificationService.setupNotificationsListener((items: Notification[]) => {
          const unread = items.filter((i) => !i.acknowledgedAt).length;
          setCount(unread);
        }, undefined, normalizedUserId);
      } catch (err) {
        console.error('NotificationBell error:', err);
      }
    };

    setup();

    return () => {
      unsub?.();
    };
  }, [userId]);

  return (
    <button aria-label={`Notifications (${count} unread)`} onClick={onOpen} className="relative">
      <Bell size={20} weight="regular" aria-hidden className="text-current" />
      {count > 0 && (
        <span aria-hidden className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs px-1">
          {count}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
