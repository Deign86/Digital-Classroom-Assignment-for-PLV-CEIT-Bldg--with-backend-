import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface OfflineNoticeProps {
  /** Show cached data message instead of generic offline message */
  showCachedMessage?: boolean;
}

export function OfflineNotice({ showCachedMessage = false }: OfflineNoticeProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <Alert className="mb-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
      <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        {showCachedMessage 
          ? "You're offline. Viewing cached data from your last session."
          : "You're offline. Some features may be unavailable."}
      </AlertDescription>
    </Alert>
  );
}
