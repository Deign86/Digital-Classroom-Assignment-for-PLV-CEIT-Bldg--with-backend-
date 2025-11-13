import React, { createContext, useContext, ReactNode } from 'react';
import type { Notification } from '../lib/notificationService';

export type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  isNotificationCenterOpen: boolean;
  // Public-facing loading flag (preferred name)
  isLoading: boolean;
  // Backwards-compatible alias for older consumers
  isNotifLoading?: boolean;
  error?: string | null;
  onAcknowledge: (id: string) => Promise<void>;
  onAcknowledgeAll: () => Promise<number | null>;
  onToggleCenter: () => void;
  onMarkAllAsRead: () => Promise<void>;
  onDismiss?: (id: string) => void;
};

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationContext.Provider');
  return ctx;
};

export const NotificationProvider = ({ value, children }: { value: NotificationContextType; children: ReactNode }) => (
  <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
);
