import React, { useEffect, useState } from 'react';
import { logger } from '../lib/logger';
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
        logger.error('NotificationBell error:', err);
      }
    };

    setup();

    return () => {
      unsub?.();
    };
  }, [userId]);

  const displayCount = forceUnread !== null && forceUnread !== undefined ? forceUnread : count;

  return (
    <button aria-label={`Notifications (${displayCount} unread)`} onClick={onOpen} className="relative p-2">
      <Bell size={20} weight="regular" aria-hidden className="text-current" />
      {displayCount > 0 && (
        <span 
          aria-hidden 
          className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full text-[10px] sm:text-xs min-w-[16px] sm:min-w-[18px] h-4 sm:h-[18px] flex items-center justify-center px-1 font-medium leading-none"
        >
          {displayCount > 99 ? '99+' : displayCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
