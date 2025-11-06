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

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const remaining = Math.ceil(timeRemaining / 1000);
      setCountdown(remaining);
      
      if (remaining <= 0) {
        onLogout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timeRemaining, onLogout]);

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
            <Clock className="h-5 w-5 text-amber-500" />
            Session Timeout Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Your session will expire due to inactivity. You will be automatically 
              logged out in:
            </p>
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-amber-600">
                {formatTime(countdown)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                minutes:seconds
              </div>
            </div>
            <p className="text-sm text-gray-600">
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