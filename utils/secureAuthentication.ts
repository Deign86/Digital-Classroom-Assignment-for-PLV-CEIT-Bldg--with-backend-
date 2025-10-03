// Enhanced Authentication Integration with Rate Limiting and Security
// Integrates rate limiting, password validation, and security measures

import React, { useState, useCallback, useEffect } from 'react';
import { RateLimiter, RATE_LIMITS } from '../utils/rateLimiter';
import { PasswordValidator, usePasswordValidation } from '../utils/passwordValidator';
import { FacultyXSSProtection } from '../utils/facultyXSSProtection';
import { ErrorHandler, ErrorType, SecureError } from '../utils/errorHandling';
import { toast } from 'sonner';

// Enhanced login component with rate limiting
export function useSecureAuthentication(userInfo?: { name?: string; email?: string }) {
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remainingTime: number; attemptsRemaining: number } | null>(null);
  
  const {
    validatePassword,
    validateConfirmation,
    generatePassword,
    getStrengthIndicator
  } = usePasswordValidation(userInfo);

  // Check rate limits for login attempts
  const checkLoginRateLimit = useCallback((): boolean => {
    try {
      const rateLimitResult = RateLimiter.checkRateLimit('LOGIN_ATTEMPTS');
      
      if (!rateLimitResult.allowed) {
        setIsRateLimited(true);
        setRateLimitInfo({
          remainingTime: rateLimitResult.resetTime! - Date.now(),
          attemptsRemaining: 0
        });
        
        toast.error('Too many login attempts', {
          description: `Please try again in ${Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000 / 60)} minutes`,
          duration: 10000
        });
        
        return false;
      }

      setIsRateLimited(false);
      setRateLimitInfo({
        remainingTime: 0,
        attemptsRemaining: rateLimitResult.remainingAttempts || 0
      });

      return true;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow on error to prevent blocking legitimate users
    }
  }, []);

  // Check rate limits for password reset
  const checkPasswordResetRateLimit = useCallback((): boolean => {
    try {
      const rateLimitResult = RateLimiter.checkRateLimit('PASSWORD_RESET');
      
      if (!rateLimitResult.allowed) {
        toast.error('Too many password reset attempts', {
          description: `Please try again in ${Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000 / 60)} minutes`,
          duration: 10000
        });
        
        return false;
      }

      return true;
    } catch (error) {
      console.error('Password reset rate limit check failed:', error);
      return true;
    }
  }, []);

  // Enhanced login function with rate limiting and validation
  const performSecureLogin = useCallback(async (
    email: string,
    password: string,
    originalLoginFunction: (email: string, password: string) => Promise<boolean>
  ): Promise<boolean> => {
    try {
      // Check rate limits first
      if (!checkLoginRateLimit()) {
        return false;
      }

      // Sanitize inputs
      const sanitizedEmail = FacultyXSSProtection.sanitizeFacultyInput('email', email, 'api');
      const sanitizedPassword = password.trim(); // Don't sanitize password content

      // Basic validation
      if (!sanitizedEmail || !sanitizedPassword) {
        toast.error('Please enter both email and password');
        return false;
      }

      // Email format validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        toast.error('Please enter a valid email address');
        return false;
      }

      // Record the attempt before trying login
      RateLimiter.recordAttempt('LOGIN_ATTEMPTS');
      setLoginAttempts(prev => prev + 1);

      // Attempt login
      const success = await originalLoginFunction(sanitizedEmail, sanitizedPassword);

      if (success) {
        // Reset counters on successful login
        setLoginAttempts(0);
        setIsRateLimited(false);
        setRateLimitInfo(null);
      } else {
        // Update rate limit info after failed attempt
        const updatedRateLimit = RateLimiter.checkRateLimit('LOGIN_ATTEMPTS');
        if (!updatedRateLimit.allowed) {
          setIsRateLimited(true);
          setRateLimitInfo({
            remainingTime: updatedRateLimit.resetTime! - Date.now(),
            attemptsRemaining: 0
          });
        } else {
          setRateLimitInfo({
            remainingTime: 0,
            attemptsRemaining: updatedRateLimit.remainingAttempts || 0
          });
        }
      }

      return success;
    } catch (error) {
      console.error('Secure login failed:', error);
      toast.error('Login failed', {
        description: 'An unexpected error occurred. Please try again.',
        duration: 5000
      });
      return false;
    }
  }, [checkLoginRateLimit]);

  // Enhanced password reset with rate limiting
  const performSecurePasswordReset = useCallback(async (
    email: string,
    originalResetFunction: (email: string) => Promise<{ success: boolean; message?: string }>
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      // Check rate limits first
      if (!checkPasswordResetRateLimit()) {
        return {
          success: false,
          message: 'Too many password reset attempts. Please try again later.'
        };
      }

      // Sanitize email
      const sanitizedEmail = FacultyXSSProtection.sanitizeFacultyInput('email', email, 'api');

      // Validate email
      if (!sanitizedEmail) {
        return {
          success: false,
          message: 'Please enter a valid email address'
        };
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        return {
          success: false,
          message: 'Please enter a valid email format'
        };
      }

      // Record the attempt
      RateLimiter.recordAttempt('PASSWORD_RESET');

      // Perform reset
      const result = await originalResetFunction(sanitizedEmail);

      return result;
    } catch (error) {
      console.error('Secure password reset failed:', error);
      return {
        success: false,
        message: 'Password reset failed. Please try again.'
      };
    }
  }, [checkPasswordResetRateLimit]);

  // Enhanced signup with password validation
  const performSecureSignup = useCallback(async (
    email: string,
    name: string,
    department: string,
    password: string,
    confirmPassword: string,
    originalSignupFunction: (email: string, name: string, department: string, password: string) => Promise<boolean>
  ): Promise<boolean> => {
    try {
      // Sanitize all inputs
      const sanitizedEmail = FacultyXSSProtection.sanitizeFacultyInput('email', email, 'api');
      const sanitizedName = FacultyXSSProtection.sanitizeFacultyInput('firstName', name, 'api');
      const sanitizedDepartment = FacultyXSSProtection.sanitizeFacultyInput('department', department, 'api');

      // Basic validation
      if (!sanitizedEmail || !sanitizedName || !sanitizedDepartment || !password) {
        toast.error('All fields are required');
        return false;
      }

      // Validate password confirmation
      const confirmationResult = validateConfirmation(password, confirmPassword);
      if (!confirmationResult.isValid) {
        toast.error(confirmationResult.error || 'Passwords do not match');
        return false;
      }

      // Validate password strength
      const passwordResult = validatePassword(password);
      if (!passwordResult.isValid) {
        toast.error('Password does not meet security requirements', {
          description: passwordResult.errors.join(', '),
          duration: 8000
        });
        return false;
      }

      // Enforce minimum password strength
      if (passwordResult.strength < 2) { // At least FAIR strength
        toast.error('Password is too weak', {
          description: 'Please create a stronger password with more character variety',
          duration: 8000
        });
        return false;
      }

      // Check signup rate limiting (prevent spam signups)
      const signupRateLimit = RateLimiter.checkRateLimit('SIGNUP_ATTEMPTS');
      if (!signupRateLimit.allowed) {
        toast.error('Too many signup attempts', {
          description: 'Please try again later',
          duration: 5000
        });
        return false;
      }

      // Record signup attempt
      RateLimiter.recordAttempt('SIGNUP_ATTEMPTS');

      // Attempt signup
      const success = await originalSignupFunction(sanitizedEmail, sanitizedName, sanitizedDepartment, password);

      if (success) {
        toast.success('Account request submitted', {
          description: 'Your account will be activated after administrator approval',
          duration: 8000
        });
      }

      return success;
    } catch (error) {
      console.error('Secure signup failed:', error);
      toast.error('Signup failed', {
        description: 'An unexpected error occurred. Please try again.',
        duration: 5000
      });
      return false;
    }
  }, [validatePassword, validateConfirmation]);

  // Check password strength in real-time
  const checkPasswordStrength = useCallback((password: string) => {
    if (!password) {
      return {
        strength: 0,
        strengthText: '',
        strengthColor: '#6b7280',
        feedback: [],
        errors: []
      };
    }

    const result = validatePassword(password);
    const indicator = getStrengthIndicator(result.strength);

    return {
      strength: result.strength,
      strengthText: result.strengthText,
      strengthColor: result.strengthColor,
      strengthPercentage: result.strengthPercentage,
      feedback: result.feedback,
      errors: result.errors,
      bars: indicator.bars,
      estimatedCrackTime: result.estimatedCrackTime
    };
  }, [validatePassword, getStrengthIndicator]);

  // Generate secure password suggestion
  const suggestSecurePassword = useCallback((length: number = 16) => {
    return generatePassword(length);
  }, [generatePassword]);

  // Check if user should be forced to change password
  const shouldChangePassword = useCallback((lastChanged: Date) => {
    return PasswordValidator.shouldChangePassword(lastChanged, 6); // 6 months
  }, []);

  // Clear rate limit counters (for testing or admin override)
  const clearRateLimits = useCallback(() => {
    setLoginAttempts(0);
    setIsRateLimited(false);
    setRateLimitInfo(null);
    // Note: This only clears local state, not the actual rate limiter storage
  }, []);

  return {
    // Enhanced authentication functions
    performSecureLogin,
    performSecurePasswordReset,
    performSecureSignup,
    
    // Password utilities
    checkPasswordStrength,
    suggestSecurePassword,
    shouldChangePassword,
    
    // Rate limiting info
    isRateLimited,
    rateLimitInfo,
    loginAttempts,
    clearRateLimits,
    
    // Rate limit checkers
    checkLoginRateLimit,
    checkPasswordResetRateLimit,
  };
}

// Password strength validation utilities
export function getPasswordStrengthData(
  password: string, 
  userInfo?: { name?: string; email?: string; username?: string; department?: string }
) {
  if (!password) {
    return {
      strength: 0,
      strengthText: '',
      strengthColor: '#6b7280',
      strengthPercentage: 0,
      feedback: [],
      errors: [],
      bars: 0,
      estimatedCrackTime: ''
    };
  }

  const result = PasswordValidator.validatePassword(password, userInfo);
  const indicator = PasswordValidator.getStrengthIndicator(result.strength);

  return {
    strength: result.strength,
    strengthText: result.strengthText,
    strengthColor: result.strengthColor,
    strengthPercentage: result.strengthPercentage,
    feedback: result.feedback,
    errors: result.errors,
    bars: indicator.bars,
    estimatedCrackTime: result.estimatedCrackTime
  };
}

// Rate limit status utilities
export function getRateLimitStatus(rateLimitInfo: { remainingTime: number; attemptsRemaining: number } | null) {
  if (!rateLimitInfo) return null;

  const isLocked = rateLimitInfo.remainingTime > 0;
  const isWarning = !isLocked && rateLimitInfo.attemptsRemaining <= 2;

  if (isLocked) {
    const minutes = Math.floor(rateLimitInfo.remainingTime / 60000);
    const seconds = Math.floor((rateLimitInfo.remainingTime % 60000) / 1000);
    
    return {
      type: 'locked' as const,
      message: `Account temporarily locked. Try again in ${minutes}:${seconds.toString().padStart(2, '0')}`,
      level: 'error' as const
    };
  }

  if (isWarning) {
    return {
      type: 'warning' as const,
      message: `${rateLimitInfo.attemptsRemaining} attempts remaining before temporary lock`,
      level: 'warning' as const
    };
  }

  return null;
}