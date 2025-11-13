import React from 'react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { Bell } from '@phosphor-icons/react';

type Props = {
  userId?: string | null;
  onOpen?: () => void;
  forceUnread?: number | null;
};

export const NotificationBell: React.FC<Props> = ({ userId, onOpen, forceUnread = null }) => {
  // Pure consumer: reads unreadCount and toggle handler from NotificationContext.
  // Real-time subscription is centralized in App.tsx.
  const ctx = useNotificationContext();
  const displayCount = forceUnread ?? ctx.unreadCount ?? 0;
  const handleOpen = onOpen ?? ctx.onToggleCenter;

  return (
    <button 
      aria-label={`Notifications (${displayCount} unread)`} 
      onClick={handleOpen} 
      className="relative inline-flex items-center justify-center p-2 shrink-0"
    >
      <Bell size={20} weight="regular" aria-hidden className="text-current" />
      {displayCount > 0 && (
        <span 
          aria-hidden 
          className="absolute -top-0.5 -right-0.5 bg-red-600 text-white rounded-full text-[10px] min-w-[16px] h-4 flex items-center justify-center px-1 font-medium leading-none"
        >
          {displayCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
