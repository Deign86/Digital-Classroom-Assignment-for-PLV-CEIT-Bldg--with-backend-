import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './ui/utils';

/**
 * NetworkStatusIndicator - Shows a visual indicator when the user is offline.
 * 
 * Displays a floating badge in the top-right corner when network connection is lost.
 * Automatically hides when connection is restored.
 */
export function NetworkStatusIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setWasOffline(isOffline);
      setIsOffline(false);
      
      // Clear the "was offline" state after animation
      setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    // Check initial status
    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOffline]);

  return (
    <AnimatePresence mode="wait">
      {isOffline && (
        <motion.div
          key="offline"
          initial={{ opacity: 0, y: -20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">No Internet Connection</span>
        </motion.div>
      )}
      
      {!isOffline && wasOffline && (
        <motion.div
          key="online"
          initial={{ opacity: 0, y: -20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg"
          role="alert"
          aria-live="polite"
        >
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Connection Restored</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline network status badge for use in forms and buttons
 */
export function InlineNetworkStatus({ className }: { className?: string }) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-600 text-xs rounded-md border border-red-200",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-3 w-3" />
      <span>Offline</span>
    </motion.div>
  );
}

export default NetworkStatusIndicator;
