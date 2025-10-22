import React, { useEffect, useState } from 'react';
import { notificationService, type Notification } from '../lib/notificationService';
import { Bell } from '@phosphor-icons/react';

type Props = {
  userId?: string | null;
  onOpen?: () => void;
  forceUnread?: number | null;
};

export const NotificationBell: React.FC<Props> = ({ userId, onOpen, forceUnread = null }) => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    const setup = async () => {
      try {
        if (!userId) {
          setCount(0);
          return;
        }

        const initial = await notificationService.getUnreadCount(userId);
        setCount(initial);

        unsub = notificationService.setupNotificationsListener((items: Notification[]) => {
          const unread = items.filter((i) => !i.acknowledgedAt).length;
          setCount(unread);
        }, undefined, userId);
      } catch (err) {
        console.error('NotificationBell error:', err);
      }
    };

    setup();

    return () => {
      unsub?.();
    };
  }, [userId]);

  const displayCount = forceUnread !== null && forceUnread !== undefined ? forceUnread : count;

  return (
    <button aria-label={`Notifications (${displayCount} unread)`} onClick={onOpen} className="relative">
      <Bell size={20} weight="regular" aria-hidden className="text-current" />
      {displayCount > 0 && (
        <span aria-hidden className="absolute -top-1 -right-1 bg-red-600 text-white rounded-ios text-xs px-1">
          {displayCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
