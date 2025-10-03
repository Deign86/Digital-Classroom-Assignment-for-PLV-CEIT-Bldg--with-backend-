// Enhanced Error Messaging System
// Provides specific, user-friendly error messages instead of generic failures

export interface DetailedError extends Error {
  code?: string;
  field?: string;
  context?: Record<string, any>;
  userMessage?: string;
  suggestions?: string[];
}

export class ErrorMessageHandler {
  /**
   * Convert technical errors to user-friendly messages
   */
  static getUserFriendlyMessage(error: any): {
    title: string;
    message: string;
    suggestions: string[];
    severity: 'error' | 'warning' | 'info';
  } {
    // Handle validation errors
    if (this.isValidationError(error)) {
      return this.handleValidationError(error);
    }

    // Handle authentication errors
    if (this.isAuthError(error)) {
      return this.handleAuthError(error);
    }

    // Handle permission errors
    if (this.isPermissionError(error)) {
      return this.handlePermissionError(error);
    }

    // Handle network/connectivity errors
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error);
    }

    // Handle database/Firebase errors
    if (this.isFirebaseError(error)) {
      return this.handleFirebaseError(error);
    }

    // Handle conflict errors
    if (this.isConflictError(error)) {
      return this.handleConflictError(error);
    }

    // Handle rate limiting errors
    if (this.isRateLimitError(error)) {
      return this.handleRateLimitError(error);
    }

    // Default fallback for unknown errors
    return this.handleUnknownError(error);
  }

  /**
   * Check if error is a validation error
   */
  private static isValidationError(error: any): boolean {
    return error?.type === 'validation' || 
           error?.code?.includes('invalid') ||
           error?.message?.toLowerCase().includes('validation') ||
           error?.message?.toLowerCase().includes('required') ||
           error?.message?.toLowerCase().includes('invalid format');
  }

  /**
   * Handle validation errors
   */
  private static handleValidationError(error: any): {
    title: string;
    message: string;
    suggestions: string[];
    severity: 'error' | 'warning' | 'info';
  } {
    const field = error?.field || 'field';
    let message = 'Please check your input and try again.';
    const suggestions: string[] = [];

    if (error?.message) {
      if (error.message.includes('email')) {
        message = 'Please enter a valid email address.';
        suggestions.push('Use your PLV institutional email (e.g., name@plv.edu.ph)');
        suggestions.push('Make sure there are no spaces or special characters');
      } else if (error.message.includes('password')) {
        message = 'Password does not meet requirements.';
        suggestions.push('Use at least 8 characters');
        suggestions.push('Include uppercase and lowercase letters');
        suggestions.push('Add numbers and special characters');
      } else if (error.message.includes('name')) {
        message = 'Please enter a valid name.';
        suggestions.push('Use only letters, spaces, hyphens, and apostrophes');
        suggestions.push('Name must be at least 2 characters long');
      } else if (error.message.includes('department')) {
        message = 'Please select a valid department.';
        suggestions.push('Choose from the available department options');
      } else if (error.message.includes('time')) {
        message = 'Please enter a valid time.';
        suggestions.push('Use HH:MM format (e.g., 09:30)');
        suggestions.push('Make sure end time is after start time');
      } else if (error.message.includes('date')) {
        message = 'Please enter a valid date.';
        suggestions.push('Date cannot be in the past');
        suggestions.push('Use a date within the next year');
      } else if (error.message.includes('purpose')) {
        message = 'Please provide a valid purpose.';
        suggestions.push('Purpose must be at least 5 characters');
        suggestions.push('Describe what the classroom will be used for');
      } else if (error.message.includes('capacity')) {
        message = 'Please enter a valid capacity.';
        suggestions.push('Capacity must be a positive number');
        suggestions.push('Maximum capacity is 1000');
      } else {
        message = error.message;
      }
    }

    return {
      title: 'Input Error',
      message,
      suggestions,
      severity: 'error'
    };
  }

  /**
   * Check if error is an authentication error
   */
  private static isAuthError(error: any): boolean {
    return error?.code?.includes('auth/') ||
           error?.message?.toLowerCase().includes('authentication') ||
           error?.message?.toLowerCase().includes('login') ||
           error?.message?.toLowerCase().includes('unauthorized');
  }

  /**
   * Handle authentication errors
   */
  private static handleAuthError(error: any): {
    title: string;
    message: string;
    suggestions: string[];
    severity: 'error' | 'warning' | 'info';
  } {
    let message = 'Authentication failed.';
    const suggestions: string[] = [];

    if (error?.code) {
      switch (error.code) {
        case 'auth/invalid-email':
          message = 'Invalid email address format.';
          suggestions.push('Check your email spelling');
          suggestions.push('Use your PLV email address');
          break;
        case 'auth/user-not-found':
          message = 'No account found with this email.';
          suggestions.push('Check your email spelling');
          suggestions.push('Register for a new account if needed');
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password.';
          suggestions.push('Check your password');
          suggestions.push('Use the "Forgot Password" option if needed');
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed login attempts.';
          suggestions.push('Wait a few minutes before trying again');
          suggestions.push('Reset your password if you keep forgetting it');
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled.';
          suggestions.push('Contact the administrator for assistance');
          break;
        case 'auth/email-already-in-use':
          message = 'This email is already registered.';
          suggestions.push('Try signing in instead');
          suggestions.push('Use the "Forgot Password" option if needed');
          break;
        case 'auth/weak-password':
          message = 'Password is too weak.';
          suggestions.push('Use at least 8 characters');
          suggestions.push('Include uppercase, lowercase, numbers, and symbols');
          break;
        default:
          message = 'Authentication error occurred.';
          suggestions.push('Try again in a few moments');
          suggestions.push('Contact support if the problem persists');
      }
    }

    return {
      title: 'Authentication Error',
      message,
      suggestions,
      severity: 'error'
    };
  }

  /**
   * Check if error is a permission error
   */
  private static isPermissionError(error: any): boolean {
    return error?.code?.includes('permission') ||
           error?.message?.toLowerCase().includes('permission') ||
           error?.message?.toLowerCase().includes('access denied') ||
           error?.code === 'insufficient-permissions';
  }

  /**
   * Handle permission errors
   */
  private static handlePermissionError(error: any): {
    title: string;
    message: string;
    suggestions: string[];
    severity: 'error' | 'warning' | 'info';
  } {
    return {
      title: 'Access Denied',
      message: 'You do not have permission to perform this action.',
      suggestions: [
        'Contact your administrator if you need access',
        'Make sure your account is approved',
        'Check if you are signed in with the correct account'
      ],
      severity: 'error'
    };
  }

  /**
   * Check if error is a network error
   */
  private static isNetworkError(error: any): boolean {
    return error?.code?.includes('network') ||
           error?.message?.toLowerCase().includes('network') ||
           error?.message?.toLowerCase().includes('connection') ||
           error?.name === 'NetworkError' ||
           !navigator.onLine;
  }

  /**
   * Handle network errors
   */
  private static handleNetworkError(error: any): {
    title: string;
    message: string;
    suggestions: string[];
    severity: 'error' | 'warning' | 'info';
  } {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the server.',
      suggestions: [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again'
      ],
      severity: 'error'
    };
  }

  /**
   * Check if error is a Firebase error
   */
  private static isFirebaseError(error: any): boolean {
    return error?.code?.includes('firestore/') ||
           error?.code?.includes('firebase/') ||
           error?.message?.includes('Firebase');
  }

  /**
   * Handle Firebase errors
   */
  private static handleFirebaseError(error: any): {
    title: string;
    message: string;
    suggestions: string[];
    severity: 'error' | 'warning' | 'info';
  } {
    let message = 'Database operation failed.';
    const suggestions: string[] = [];

    if (error?.code) {
      switch (error.code) {
        case 'firestore/permission-denied':
          message = 'Permission denied to access database.';
          suggestions.push('Make sure you are signed in');
          suggestions.push('Contact administrator if the problem persists');
          break;
        case 'firestore/unavailable':
          message = 'Database is temporarily unavailable.';
          suggestions.push('Try again in a few moments');
          suggestions.push('Check your internet connection');
          break;
        case 'firestore/deadline-exceeded':
          message = 'Request timed out.';
          suggestions.push('Check your internet connection');
          suggestions.push('Try again with a smaller operation');
          break;
        default:
          message = 'Database error occurred.';
          suggestions.push('Try again in a few moments');
          suggestions.push('Contact support if the problem persists');
      }
    }

    return {
      title: 'Database Error',
      message,
      suggestions,
      severity: 'error'
    };
  }

  /**
   * Check if error is a conflict error
   */
  private static isConflictError(error: any): boolean {
    return error?.message?.toLowerCase().includes('conflict') ||
           error?.message?.toLowerCase().includes('duplicate') ||
           error?.message?.toLowerCase().includes('already exists') ||
           error?.code === 'already-exists';
  }

  /**
   * Handle conflict errors
   */
  private static handleConflictError(error: any): {
    title: string;
    message: string;
    suggestions: string[];
    severity: 'error' | 'warning' | 'info';
  } {
    return {
      title: 'Conflict Detected',
      message: 'This time slot is no longer available.',
      suggestions: [
        'Choose a different time slot',
        'Check the schedule for available times',
        'Try booking for a different day'
      ],
      severity: 'warning'
    };
  }

  /**
   * Check if error is a rate limit error
   */
  private static isRateLimitError(error: any): boolean {
    return error?.code?.includes('rate-limit') ||
           error?.code?.includes('too-many-requests') ||
           error?.message?.toLowerCase().includes('rate limit') ||
           error?.message?.toLowerCase().includes('too many');
  }

  /**
   * Handle rate limit errors
   */
  private static handleRateLimitError(error: any): {
    title: string;
    message: string;
    suggestions: string[];
    severity: 'error' | 'warning' | 'info';
  } {
    return {
      title: 'Too Many Attempts',
      message: 'You are making requests too quickly.',
      suggestions: [
        'Wait a few minutes before trying again',
        'Avoid repeatedly clicking buttons',
        'Contact support if you need immediate assistance'
      ],
      severity: 'warning'
    };
  }

  /**
   * Handle unknown errors
   */
  private static handleUnknownError(error: any): {
    title: string;
    message: string;
    suggestions: string[];
    severity: 'error' | 'warning' | 'info';
  } {
    let message = 'An unexpected error occurred.';
    
    // Try to extract useful information from the error
    if (error?.message && typeof error.message === 'string') {
      // Make technical messages more user-friendly
      if (error.message.includes('fetch')) {
        message = 'Unable to connect to the server.';
      } else if (error.message.includes('timeout')) {
        message = 'The operation took too long to complete.';
      } else if (error.message.includes('not found')) {
        message = 'The requested item was not found.';
      } else if (error.message.length < 100) {
        // Use the original message if it's short and potentially useful
        message = error.message;
      }
    }

    return {
      title: 'Unexpected Error',
      message,
      suggestions: [
        'Try refreshing the page',
        'Wait a moment and try again',
        'Contact support if the problem persists'
      ],
      severity: 'error'
    };
  }

  /**
   * Format error for toast notification
   */
  static formatForToast(error: any): {
    title: string;
    description: string;
    duration: number;
  } {
    const formatted = this.getUserFriendlyMessage(error);
    
    let description = formatted.message;
    if (formatted.suggestions.length > 0) {
      description += ' ' + formatted.suggestions[0];
    }

    const duration = formatted.severity === 'error' ? 8000 : 
                    formatted.severity === 'warning' ? 6000 : 4000;

    return {
      title: formatted.title,
      description,
      duration
    };
  }

  /**
   * Format error for detailed display
   */
  static formatForDisplay(error: any): {
    title: string;
    message: string;
    suggestions: string[];
    severity: 'error' | 'warning' | 'info';
    timestamp: string;
  } {
    const formatted = this.getUserFriendlyMessage(error);
    
    return {
      ...formatted,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Enhanced error boundary component data
 */
export const ErrorDisplayUtils = {
  /**
   * Get appropriate icon for error severity
   */
  getErrorIcon(severity: 'error' | 'warning' | 'info'): string {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❓';
    }
  },

  /**
   * Get appropriate color class for error severity
   */
  getErrorColorClass(severity: 'error' | 'warning' | 'info'): string {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }
};