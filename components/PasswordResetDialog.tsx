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
import { authService } from '../lib/supabaseAuth';

interface PasswordResetDialogProps {
  children: React.ReactNode;
}

export default function PasswordResetDialog({ children }: PasswordResetDialogProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    setIsLoading(true);
    
    try {
      // First, check if the email exists in our system
      const { exists, error: checkError } = await authService.checkEmailExists(email);
      
      if (checkError) {
        toast.error('Unable to verify email', {
          description: 'Please check your connection and try again.'
        });
        setIsLoading(false);
        return;
      }

      if (!exists) {
        toast.error('Email not found', {
          description: 'This email is not registered in our system. Please check your email or contact admin.'
        });
        setIsLoading(false);
        return;
      }

      // Email exists, proceed with password reset
      const { error } = await authService.requestPasswordReset(email);
      
      if (error) {
        toast.error('Failed to send reset email', {
          description: error
        });
      } else {
        setEmailSent(true);
        toast.success('Password reset email sent!', {
          description: 'Check your inbox for instructions to reset your password.',
          duration: 6000
        });
      }
    } catch (err) {
      console.error('Password reset error:', err);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setEmail('');
      setEmailSent(false);
    }, 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
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
                  required
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500">
                You'll receive an email with a link to reset your password.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
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
              onClick={handleClose}
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
