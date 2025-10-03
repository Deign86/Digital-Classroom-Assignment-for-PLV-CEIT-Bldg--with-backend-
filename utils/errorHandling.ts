// Error handling utilities for security and user experience
// Prevents information disclosure and provides user-friendly error messages

import { sanitizeError } from './validation';

// Error types for better categorization
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

// Security-aware error class
export class SecureError extends Error {
  public readonly type: ErrorType;
  public readonly userMessage: string;
  public readonly originalError?: Error;
  public readonly statusCode: number;

  constructor(
    type: ErrorType,
    userMessage: string,
    originalError?: Error,
    statusCode: number = 500
  ) {
    super(userMessage);
    this.type = type;
    this.userMessage = sanitizeError(userMessage);
    this.originalError = originalError;
    this.statusCode = statusCode;
    this.name = 'SecureError';
  }
}

// User-friendly error messages that don't expose system details
export const USER_ERROR_MESSAGES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  ACCOUNT_DISABLED: 'Your account has been disabled. Please contact an administrator.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address before signing in.',
  
  // Authorization errors
  ACCESS_DENIED: 'You do not have permission to perform this action.',
  ADMIN_REQUIRED: 'Administrative privileges required for this action.',
  ACCOUNT_PENDING: 'Your account is pending approval. Please wait for administrator approval.',
  ACCOUNT_REJECTED: 'Your account request has been rejected. Please contact support.',
  
  // Validation errors
  INVALID_INPUT: 'Please check your input and try again.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_FORMAT: 'Invalid format. Please check your input.',
  
  // Resource errors
  NOT_FOUND: 'The requested resource could not be found.',
  CLASSROOM_NOT_FOUND: 'Classroom not found.',
  USER_NOT_FOUND: 'User not found.',
  REQUEST_NOT_FOUND: 'Request not found.',
  
  // Conflict errors
  EMAIL_EXISTS: 'An account with this email already exists.',
  CLASSROOM_EXISTS: 'A classroom with this name already exists.',
  TIME_CONFLICT: 'The selected time conflicts with existing bookings.',
  
  // Rate limiting
  TOO_MANY_REQUESTS: 'Too many requests. Please try again later.',
  
  // Generic errors
  OPERATION_FAILED: 'The operation could not be completed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SERVER_ERROR: 'A server error occurred. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Error handler that sanitizes errors and provides appropriate user messages
export class ErrorHandler {
  /**
   * Handles Firebase authentication errors
   */
  static handleAuthError(error: any): SecureError {
    console.error('Authentication error:', error);

    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return new SecureError(
          ErrorType.AUTHENTICATION,
          USER_ERROR_MESSAGES.INVALID_CREDENTIALS,
          error,
          401
        );
      
      case 'auth/user-disabled':
        return new SecureError(
          ErrorType.AUTHENTICATION,
          USER_ERROR_MESSAGES.ACCOUNT_DISABLED,
          error,
          403
        );
      
      case 'auth/email-not-verified':
        return new SecureError(
          ErrorType.AUTHENTICATION,
          USER_ERROR_MESSAGES.EMAIL_NOT_VERIFIED,
          error,
          401
        );
      
      case 'auth/too-many-requests':
        return new SecureError(
          ErrorType.RATE_LIMIT,
          USER_ERROR_MESSAGES.TOO_MANY_REQUESTS,
          error,
          429
        );
      
      case 'auth/network-request-failed':
        return new SecureError(
          ErrorType.NETWORK_ERROR,
          USER_ERROR_MESSAGES.NETWORK_ERROR,
          error,
          503
        );
      
      default:
        return new SecureError(
          ErrorType.AUTHENTICATION,
          USER_ERROR_MESSAGES.OPERATION_FAILED,
          error,
          500
        );
    }
  }

  /**
   * Handles Firestore database errors
   */
  static handleDatabaseError(error: any, operation: string = 'operation'): SecureError {
    console.error(`Database error during ${operation}:`, error);

    switch (error.code) {
      case 'firestore/not-found':
        return new SecureError(
          ErrorType.NOT_FOUND,
          USER_ERROR_MESSAGES.NOT_FOUND,
          error,
          404
        );
      
      case 'firestore/permission-denied':
        return new SecureError(
          ErrorType.AUTHORIZATION,
          USER_ERROR_MESSAGES.ACCESS_DENIED,
          error,
          403
        );
      
      case 'firestore/unavailable':
      case 'firestore/deadline-exceeded':
        return new SecureError(
          ErrorType.NETWORK_ERROR,
          USER_ERROR_MESSAGES.NETWORK_ERROR,
          error,
          503
        );
      
      case 'firestore/resource-exhausted':
        return new SecureError(
          ErrorType.RATE_LIMIT,
          USER_ERROR_MESSAGES.TOO_MANY_REQUESTS,
          error,
          429
        );
      
      default:
        return new SecureError(
          ErrorType.SERVER_ERROR,
          USER_ERROR_MESSAGES.SERVER_ERROR,
          error,
          500
        );
    }
  }

  /**
   * Handles validation errors
   */
  static handleValidationError(field: string, message: string): SecureError {
    const sanitizedMessage = sanitizeError(message);
    return new SecureError(
      ErrorType.VALIDATION,
      `${field}: ${sanitizedMessage}`,
      undefined,
      400
    );
  }

  /**
   * Handles authorization errors based on user status
   */
  static handleAuthorizationError(userStatus?: string): SecureError {
    switch (userStatus) {
      case 'pending':
        return new SecureError(
          ErrorType.AUTHORIZATION,
          USER_ERROR_MESSAGES.ACCOUNT_PENDING,
          undefined,
          403
        );
      
      case 'rejected':
        return new SecureError(
          ErrorType.AUTHORIZATION,
          USER_ERROR_MESSAGES.ACCOUNT_REJECTED,
          undefined,
          403
        );
      
      default:
        return new SecureError(
          ErrorType.AUTHORIZATION,
          USER_ERROR_MESSAGES.ACCESS_DENIED,
          undefined,
          403
        );
    }
  }

  /**
   * Handles generic errors with fallback messages
   */
  static handleGenericError(error: any, operation: string = 'operation'): SecureError {
    console.error(`Error during ${operation}:`, error);

    // Don't expose sensitive error details
    if (error instanceof SecureError) {
      return error;
    }

    // Handle network errors
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return new SecureError(
        ErrorType.NETWORK_ERROR,
        USER_ERROR_MESSAGES.NETWORK_ERROR,
        error,
        503
      );
    }

    // Generic fallback
    return new SecureError(
      ErrorType.SERVER_ERROR,
      USER_ERROR_MESSAGES.UNKNOWN_ERROR,
      error,
      500
    );
  }

  /**
   * Handles 404 errors securely without exposing system structure
   */
  static handle404Error(resource?: string): SecureError {
    const message = resource 
      ? `${resource} not found`
      : USER_ERROR_MESSAGES.NOT_FOUND;
    
    return new SecureError(
      ErrorType.NOT_FOUND,
      message,
      undefined,
      404
    );
  }

  /**
   * Handles conflict errors (duplicate entries, time conflicts)
   */
  static handleConflictError(message: string): SecureError {
    return new SecureError(
      ErrorType.CONFLICT,
      sanitizeError(message),
      undefined,
      409
    );
  }
}

// Utility functions for error logging and reporting
export const ErrorLogger = {
  /**
   * Logs error details for debugging while protecting sensitive info
   */
  logError: (error: Error | SecureError, context?: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = context 
      ? `[${timestamp}] ${context}: ${error.message}`
      : `[${timestamp}] ${error.message}`;
    
    console.error(logMessage);
    
    // In production, you might want to send to external logging service
    // while ensuring no sensitive data is included
  },

  /**
   * Sanitizes error for client-side display
   */
  getDisplayMessage: (error: Error | SecureError): string => {
    if (error instanceof SecureError) {
      return error.userMessage;
    }
    
    // For non-SecureError instances, provide generic message
    return USER_ERROR_MESSAGES.UNKNOWN_ERROR;
  },

  /**
   * Gets HTTP status code from error
   */
  getStatusCode: (error: Error | SecureError): number => {
    if (error instanceof SecureError) {
      return error.statusCode;
    }
    return 500;
  },
};

// React error boundary helper
export const getErrorBoundaryProps = (error: Error, errorInfo: any) => {
  // Log error details for debugging
  ErrorLogger.logError(error, 'React Error Boundary');
  
  // Return safe error message for display
  return {
    hasError: true,
    userMessage: ErrorLogger.getDisplayMessage(error),
  };
};

// Form error helpers
export const FormErrorHandler = {
  /**
   * Handles form validation errors and returns formatted error object
   */
  handleFormErrors: (errors: Record<string, string>): Record<string, string> => {
    const sanitizedErrors: Record<string, string> = {};
    
    Object.entries(errors).forEach(([field, message]) => {
      sanitizedErrors[field] = sanitizeError(message);
    });
    
    return sanitizedErrors;
  },

  /**
   * Gets first error from validation results
   */
  getFirstError: (errors: Record<string, string>): string | null => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return null;
    
    return sanitizeError(errors[errorKeys[0]]);
  },
};