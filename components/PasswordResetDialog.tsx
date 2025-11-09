import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../lib/firebaseService';
import { logger } from '../lib/logger';
import ProcessingFieldset from './ui/ProcessingFieldset';

interface PasswordResetDialogProps {
  children: React.ReactNode;
}

export default function PasswordResetDialog({ children }: PasswordResetDialogProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [lastResetTime, setLastResetTime] = useState<number>(0);
  const RESET_COOLDOWN_MS = 60000; // 1 minute cooldown

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent the event from bubbling to parent forms
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check rate limiting cooldown
    const now = Date.now();
    const timeSinceLastReset = now - lastResetTime;
    
    if (timeSinceLastReset < RESET_COOLDOWN_MS) {
      const secondsRemaining = Math.ceil((RESET_COOLDOWN_MS - timeSinceLastReset) / 1000);
      toast.error(`Please wait ${secondsRemaining} second${secondsRemaining > 1 ? 's' : ''}`, {
        description: 'This prevents email spam. Try again shortly.',
        duration: 3000
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await authService.resetPassword(email);
      
      if (!result.success) {
        toast.error('Unable to send reset email', {
          description: result.message,
          duration: 5000
        });
      } else {
        setEmailSent(true);
        setLastResetTime(now); // Record successful reset time
        toast.success('Password reset email sent!', {
          description: 'Please check your inbox for the reset link.',
          duration: 5000
        });
      }
    } catch (err) {
      logger.error('Password reset error:', err);
      toast.error('An error occurred', {
        description: 'Please try again or contact your administrator.',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    
    if (open) {
      // Reset state when dialog opens to ensure fresh start
      setEmail('');
      setEmailSent(false);
      setIsLoading(false);
    } else {
      // Also reset when closing for good measure
      setEmail('');
      setEmailSent(false);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Reset Password</DialogTitle>
          <DialogDescription>
            {emailSent 
              ? 'Check your email for reset instructions'
              : 'Enter your email address and we\'ll send you a link to reset your password.'
            }
          </DialogDescription>
        </DialogHeader>

        {!emailSent ? (
          <form onSubmit={handleSubmit} className="space-y-6 pt-4" noValidate>
            <ProcessingFieldset isProcessing={isLoading} className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your.email@plv.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              <p className="text-xs text-gray-500">
                You'll receive an email with a link to reset your password.
              </p>
            </ProcessingFieldset>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 pt-4">
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Email sent successfully!</p>
                <p className="text-xs text-gray-600">
                  Check your inbox at <span className="font-medium">{email}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Don't see it? Check your spam folder.
                </p>
                <p className="text-xs text-amber-600 font-medium">
                  ⚠️ Link expires in 1 hour
                </p>
              </div>
            </div>

            <Button 
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
