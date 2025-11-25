import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './ui/utils';
import { offlineQueueService } from '../lib/offlineQueueService';
import { logger } from '../lib/logger';

/**
 * NetworkStatusIndicator - Shows a visual indicator when the user is offline.
 * 
 * Displays a floating badge in the top-right corner when network connection is lost.
 * Automatically hides when connection is restored.
 * Now includes offline queue status and sync notifications.
 */
export function NetworkStatusIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  // Update queue count
  const updateQueueCount = async () => {
    try {
      const stats = await offlineQueueService.getQueueStats();
      const pending = stats.pendingValidation + stats.pendingSync + stats.failed;
      setQueueCount(pending);
    } catch (error) {
      logger.error('[NetworkStatus] Failed to get queue stats:', error);
    }
  };

  useEffect(() => {
    const handleOnline = async () => {
      setWasOffline(isOffline);
      setIsOffline(false);
      
      // Check if there are queued requests to sync
      const stats = await offlineQueueService.getQueueStats();
      const hasPending = stats.pendingValidation + stats.pendingSync + stats.failed > 0;
      
      if (hasPending) {
        setIsSyncing(true);
        // Trigger sync in the parent component via custom event
        window.dispatchEvent(new CustomEvent('offline-queue-sync-needed'));
      } else {
        // Clear the "was offline" state after animation
        setTimeout(() => setWasOffline(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setSyncComplete(false);
    };

    const handleSyncComplete = () => {
      setIsSyncing(false);
      setSyncComplete(true);
      
      // Clear states after animation
      setTimeout(() => {
        setWasOffline(false);
        setSyncComplete(false);
      }, 3000);
    };

    // Check initial status
    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-sync-complete', handleSyncComplete);

    // Subscribe to queue changes
    const unsubscribe = offlineQueueService.subscribe(updateQueueCount);
    
    // Initial queue count
    updateQueueCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-sync-complete', handleSyncComplete);
      unsubscribe();
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
          className="fixed top-4 right-4 z-50 flex flex-col gap-1 px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg min-w-[280px]"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">No Internet Connection</span>
          </div>
          {queueCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-red-100 mt-1">
              <Clock className="h-3 w-3" />
              <span>{queueCount} {queueCount === 1 ? 'booking' : 'bookings'} queued for sync</span>
            </div>
          )}
        </motion.div>
      )}
      
      {!isOffline && isSyncing && (
        <motion.div
          key="syncing"
          initial={{ opacity: 0, y: -20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg"
          role="alert"
          aria-live="polite"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Clock className="h-4 w-4" />
          </motion.div>
          <span className="text-sm font-medium">Syncing queued bookings...</span>
        </motion.div>
      )}
      
      {!isOffline && syncComplete && (
        <motion.div
          key="sync-complete"
          initial={{ opacity: 0, y: -20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg"
          role="alert"
          aria-live="polite"
        >
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Bookings synced successfully</span>
        </motion.div>
      )}
      
      {!isOffline && wasOffline && !isSyncing && !syncComplete && (
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
