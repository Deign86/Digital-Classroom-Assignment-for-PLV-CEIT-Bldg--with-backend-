import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Clock, RefreshCw } from 'lucide-react';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  timeRemaining: number; // in milliseconds
  onExtendSession: () => void;
  onLogout: () => void;
}

export default function SessionTimeoutWarning({ 
  isOpen, 
  timeRemaining, 
  onExtendSession, 
  onLogout 
}: SessionTimeoutWarningProps) {
  const [countdown, setCountdown] = useState(Math.ceil(timeRemaining / 1000));

  // Update initial countdown when dialog opens or timeRemaining changes
  useEffect(() => {
    if (isOpen) {
      setCountdown(Math.ceil(timeRemaining / 1000));
    }
  }, [isOpen, timeRemaining]);

  // Countdown timer that decrements every second
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          onLogout();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, countdown, onLogout]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400" />
            Session Timeout Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Your session will expire due to inactivity. You will be automatically 
              logged out in:
            </p>
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-amber-600 dark:text-amber-500">
                {formatTime(countdown)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                minutes:seconds
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Click "Stay Logged In" to extend your session, or you will be 
              redirected to the login page.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2">
          <Button
            variant="destructive"
            onClick={onLogout}
            className="flex-1"
          >
            Logout Now
          </Button>
          <Button 
            onClick={onExtendSession}
            className="flex-1"
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Stay Logged In
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}