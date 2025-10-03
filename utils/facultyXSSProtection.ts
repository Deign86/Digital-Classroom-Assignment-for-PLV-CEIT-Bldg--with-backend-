// Faculty Dashboard XSS Protection and Input Sanitization
// Comprehensive security for faculty dashboard forms and data display

import DOMPurify from 'isomorphic-dompurify';
import { sanitizeInput } from './validation';
import { FacultyValidator } from './facultyValidation';
import { ErrorType, SecureError } from './errorHandling';

// XSS protection configuration for different contexts
export const XSS_PROTECTION_CONFIG = {
  // Strict - only plain text, no HTML allowed
  STRICT: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    FORBID_CONTENTS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  },
  
  // Basic - allows minimal formatting
  BASIC: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    FORBID_CONTENTS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  },
  
  // Display - for read-only content with safe formatting
  DISPLAY: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['class'],
    FORBID_CONTENTS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  },
} as const;

// Faculty dashboard field types and their sanitization requirements
export const FACULTY_FIELD_SANITIZATION = {
  // Profile fields
  firstName: { type: 'STRICT', maxLength: 50 },
  lastName: { type: 'STRICT', maxLength: 50 },
  middleName: { type: 'STRICT', maxLength: 50 },
  email: { type: 'STRICT', maxLength: 254 },
  employeeId: { type: 'STRICT', maxLength: 15 },
  department: { type: 'STRICT', maxLength: 100 },
  college: { type: 'STRICT', maxLength: 100 },
  position: { type: 'STRICT', maxLength: 100 },
  phoneNumber: { type: 'STRICT', maxLength: 15 },
  extension: { type: 'STRICT', maxLength: 5 },
  officeRoom: { type: 'STRICT', maxLength: 20 },
  
  // Schedule fields
  courseCode: { type: 'STRICT', maxLength: 10 },
  courseName: { type: 'BASIC', maxLength: 200 },
  section: { type: 'STRICT', maxLength: 20 },
  semester: { type: 'STRICT', maxLength: 20 },
  academicYear: { type: 'STRICT', maxLength: 20 },
  startTime: { type: 'STRICT', maxLength: 8 },
  endTime: { type: 'STRICT', maxLength: 8 },
  day: { type: 'STRICT', maxLength: 20 },
  
  // Booking fields
  roomId: { type: 'STRICT', maxLength: 20 },
  bookingDate: { type: 'STRICT', maxLength: 12 },
  purpose: { type: 'BASIC', maxLength: 200 },
  equipment: { type: 'BASIC', maxLength: 300 },
  notes: { type: 'BASIC', maxLength: 500 },
  
  // Comments and feedback
  comments: { type: 'BASIC', maxLength: 500 },
  feedback: { type: 'BASIC', maxLength: 1000 },
  adminFeedback: { type: 'DISPLAY', maxLength: 1000 },
  
  // Search and filter fields
  searchQuery: { type: 'STRICT', maxLength: 100 },
  filterValue: { type: 'STRICT', maxLength: 50 },
} as const;

// Dangerous content patterns specific to faculty dashboard
const FACULTY_DANGEROUS_PATTERNS = [
  // JavaScript execution attempts
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:/gi,
  /on\w+\s*=/gi,
  
  // HTML injection attempts
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
  /<form[^>]*>.*?<\/form>/gi,
  /<input[^>]*>/gi,
  /<textarea[^>]*>.*?<\/textarea>/gi,
  
  // CSS injection attempts
  /expression\s*\(/gi,
  /behavior\s*:/gi,
  /-moz-binding/gi,
  /javascript\s*:/gi,
  
  // SQL injection attempts (additional to base validation)
  /\bunion\s+select\b/gi,
  /\bselect\s+\*\s+from\b/gi,
  /\bdrop\s+table\b/gi,
  /\bexec\s*\(/gi,
  
  // Faculty-specific attack patterns
  /faculty[_\s]*password/gi,
  /admin[_\s]*credentials/gi,
  /database[_\s]*dump/gi,
  /system[_\s]*info/gi,
  
  // File inclusion attempts
  /\.\.[\/\\]/g,
  /\/etc\/passwd/gi,
  /\/proc\//gi,
  /c:\\windows/gi,
  
  // Command injection
  /\$\([^)]*\)/g,
  /`[^`]*`/g,
  /\|\s*[a-zA-Z]/g,
  /;\s*[a-zA-Z]/g,
] as const;

export class FacultyXSSProtection {
  /**
   * Sanitize faculty dashboard input based on field type
   */
  static sanitizeFacultyInput(
    fieldName: string, 
    value: string, 
    context: 'input' | 'display' | 'api' = 'input'
  ): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    try {
      // Get sanitization config for this field
      const fieldConfig = FACULTY_FIELD_SANITIZATION[fieldName as keyof typeof FACULTY_FIELD_SANITIZATION];
      if (!fieldConfig) {
        // Default to strict sanitization for unknown fields
        return this.sanitizeWithConfig(value, 'STRICT', 100, context);
      }

      // Apply field-specific sanitization
      return this.sanitizeWithConfig(
        value, 
        fieldConfig.type as keyof typeof XSS_PROTECTION_CONFIG, 
        fieldConfig.maxLength, 
        context
      );
    } catch (error) {
      console.error('Faculty input sanitization failed:', error);
      // Return empty string if sanitization fails
      return '';
    }
  }

  /**
   * Sanitize with specific configuration
   */
  private static sanitizeWithConfig(
    value: string, 
    configType: keyof typeof XSS_PROTECTION_CONFIG,
    maxLength: number,
    context: 'input' | 'display' | 'api'
  ): string {
    // First check for dangerous patterns
    if (this.containsDangerousPatterns(value)) {
      throw new SecureError(
        ErrorType.VALIDATION,
        'Input contains potentially dangerous content'
      );
    }

    // Trim and limit length
    const trimmed = value.trim().substring(0, maxLength);
    
    // Get sanitization config
    const config = XSS_PROTECTION_CONFIG[configType];
    
    // Apply DOMPurify sanitization
    const sanitized = DOMPurify.sanitize(trimmed, {
      ALLOWED_TAGS: [...config.ALLOWED_TAGS],
      ALLOWED_ATTR: [...config.ALLOWED_ATTR],
      FORBID_CONTENTS: [...config.FORBID_CONTENTS],
      FORBID_ATTR: [...config.FORBID_ATTR],
      USE_PROFILES: { html: false },
    });

    // Additional context-specific sanitization
    switch (context) {
      case 'input':
        return this.sanitizeForInput(sanitized);
      case 'display':
        return this.sanitizeForDisplay(sanitized);
      case 'api':
        return this.sanitizeForAPI(sanitized);
      default:
        return sanitized;
    }
  }

  /**
   * Check if value contains dangerous patterns
   */
  private static containsDangerousPatterns(value: string): boolean {
    const lowerValue = value.toLowerCase();
    return FACULTY_DANGEROUS_PATTERNS.some(pattern => pattern.test(lowerValue));
  }

  /**
   * Sanitize for form input (most restrictive)
   */
  private static sanitizeForInput(value: string): string {
    return value
      .replace(/[<>]/g, '') // Remove angle brackets completely
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[`]/g, '') // Remove backticks
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Sanitize for display (allows some safe HTML)
   */
  private static sanitizeForDisplay(value: string): string {
    // Additional encoding for display
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitize for API (strict text only)
   */
  private static sanitizeForAPI(value: string): string {
    return value
      .replace(/[<>'"`;|&$\\\/]/g, '') // Remove dangerous characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Sanitize entire faculty form data
   */
  static sanitizeFacultyForm(
    formData: Record<string, any>,
    formType: 'profile' | 'schedule' | 'booking' | 'search' = 'profile'
  ): { sanitized: Record<string, any>; errors: string[] } {
    const sanitized: Record<string, any> = {};
    const errors: string[] = [];

    try {
      // Define allowed fields for each form type
      const allowedFields = this.getAllowedFields(formType);

      for (const [key, value] of Object.entries(formData)) {
        // Skip fields not allowed for this form type
        if (!allowedFields.includes(key)) {
          errors.push(`Field '${key}' is not allowed for ${formType} forms`);
          continue;
        }

        if (typeof value === 'string') {
          try {
            sanitized[key] = this.sanitizeFacultyInput(key, value, 'input');
          } catch (error) {
            errors.push(`Invalid content in field '${key}'`);
          }
        } else if (typeof value === 'number') {
          // Validate and sanitize numbers
          if (isFinite(value) && value >= 0) {
            sanitized[key] = Math.floor(Math.abs(value));
          } else {
            errors.push(`Invalid number in field '${key}'`);
          }
        } else if (typeof value === 'boolean') {
          sanitized[key] = Boolean(value);
        } else if (Array.isArray(value)) {
          // Sanitize array values (for equipment lists, etc.)
          const sanitizedArray = value
            .filter(item => typeof item === 'string')
            .map(item => this.sanitizeFacultyInput(key, item, 'input'))
            .filter(item => item.length > 0);
          
          if (sanitizedArray.length <= 20) { // Limit array size
            sanitized[key] = sanitizedArray;
          } else {
            errors.push(`Too many items in field '${key}'`);
          }
        } else {
          errors.push(`Unsupported data type for field '${key}'`);
        }
      }

      return { sanitized, errors };
    } catch (error) {
      console.error('Form sanitization failed:', error);
      return {
        sanitized: {},
        errors: ['Form sanitization failed due to server error']
      };
    }
  }

  /**
   * Get allowed fields for form type
   */
  private static getAllowedFields(formType: string): string[] {
    const fieldSets = {
      profile: [
        'firstName', 'lastName', 'middleName', 'email', 'employeeId', 
        'department', 'college', 'position', 'phoneNumber', 'extension', 'officeRoom'
      ],
      schedule: [
        'courseCode', 'courseName', 'section', 'semester', 'academicYear',
        'startTime', 'endTime', 'day', 'roomId'
      ],
      booking: [
        'roomId', 'bookingDate', 'startTime', 'endTime', 'purpose',
        'equipment', 'notes', 'expectedAttendees'
      ],
      search: [
        'searchQuery', 'filterValue', 'department', 'date', 'roomId'
      ]
    };

    return fieldSets[formType as keyof typeof fieldSets] || [];
  }

  /**
   * Create safe display text for faculty dashboard
   */
  static createSafeDisplayText(
    text: string,
    fieldType: string,
    maxLength: number = 100
  ): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    try {
      // Sanitize for display
      const sanitized = this.sanitizeFacultyInput(fieldType, text, 'display');
      
      // Truncate if too long
      if (sanitized.length > maxLength) {
        return sanitized.substring(0, maxLength - 3) + '...';
      }

      return sanitized;
    } catch (error) {
      console.error('Safe display text creation failed:', error);
      return '[Content unavailable]';
    }
  }

  /**
   * Sanitize search parameters to prevent injection
   */
  static sanitizeSearchParams(searchParams: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    try {
      for (const [key, value] of Object.entries(searchParams)) {
        if (typeof value === 'string') {
          const sanitizedValue = this.sanitizeFacultyInput('searchQuery', value, 'api');
          if (sanitizedValue.length > 0) {
            sanitized[key] = sanitizedValue;
          }
        } else if (typeof value === 'number' && isFinite(value)) {
          sanitized[key] = Math.abs(value);
        } else if (typeof value === 'boolean') {
          sanitized[key] = Boolean(value);
        }
      }

      return sanitized;
    } catch (error) {
      console.error('Search parameter sanitization failed:', error);
      return {};
    }
  }

  /**
   * Validate and sanitize file upload names (if faculty uploads are allowed)
   */
  static sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') {
      return '';
    }

    try {
      // Remove path traversal attempts
      const baseName = fileName.replace(/[\/\\]/g, '');
      
      // Remove dangerous characters
      const sanitized = baseName
        .replace(/[<>:"|?*]/g, '')
        .replace(/\.\./g, '')
        .replace(/\s+/g, '_')
        .substring(0, 100);

      // Ensure it has a safe extension
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png', '.jpeg'];
      const hasAllowedExtension = allowedExtensions.some(ext => 
        sanitized.toLowerCase().endsWith(ext)
      );

      if (!hasAllowedExtension) {
        throw new SecureError(
          ErrorType.VALIDATION,
          'File type not allowed'
        );
      }

      return sanitized;
    } catch (error) {
      console.error('File name sanitization failed:', error);
      return '';
    }
  }

  /**
   * Create Content Security Policy headers for faculty dashboard
   */
  static getCSPHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval'", // Note: unsafe-eval needed for some React features
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://firebase.googleapis.com https://firestore.googleapis.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }
}

// React hook for faculty XSS protection
export function useFacultyXSSProtection() {
  const sanitizeInput = (fieldName: string, value: string, context: 'input' | 'display' | 'api' = 'input') =>
    FacultyXSSProtection.sanitizeFacultyInput(fieldName, value, context);

  const sanitizeForm = (formData: Record<string, any>, formType: 'profile' | 'schedule' | 'booking' | 'search' = 'profile') =>
    FacultyXSSProtection.sanitizeFacultyForm(formData, formType);

  const createSafeDisplay = (text: string, fieldType: string, maxLength?: number) =>
    FacultyXSSProtection.createSafeDisplayText(text, fieldType, maxLength);

  const sanitizeSearch = (searchParams: Record<string, any>) =>
    FacultyXSSProtection.sanitizeSearchParams(searchParams);

  const sanitizeFileName = (fileName: string) =>
    FacultyXSSProtection.sanitizeFileName(fileName);

  return {
    sanitizeInput,
    sanitizeForm,
    createSafeDisplay,
    sanitizeSearch,
    sanitizeFileName,
    getCSPHeaders: FacultyXSSProtection.getCSPHeaders,
  };
}