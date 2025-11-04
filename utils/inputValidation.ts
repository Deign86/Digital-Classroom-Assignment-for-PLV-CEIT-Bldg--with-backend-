/**
 * Universal input validation and sanitization utilities
 */

export const INPUT_LIMITS = {
  EMAIL: 320, // RFC 5321 max
  NAME: 100,
  DEPARTMENT: 100,
  PURPOSE: 500,
  FEEDBACK: 500,
  CLASSROOM_NAME: 50,
  REASON: 500,
} as const;

/**
 * Sanitize text input: trim, remove excessive whitespace, limit length
 */
export function sanitizeText(
  text: string, 
  maxLength: number = 500,
  options: { allowNewlines?: boolean; allowMultipleSpaces?: boolean } = {}
): string {
  if (!text) return '';
  
  let sanitized = text.trim();
  
  // Remove line breaks unless explicitly allowed
  if (!options.allowNewlines) {
    sanitized = sanitized.replace(/[\r\n\t]/g, ' ');
  }
  
  // Collapse multiple spaces unless explicitly allowed
  if (!options.allowMultipleSpaces) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }
  
  // Remove zero-width and invisible characters
  sanitized = sanitized.replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, '');
  
  // Remove control characters (except tab/newline if allowed)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Enforce length limit
  return sanitized.slice(0, maxLength);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const sanitized = sanitizeText(email, INPUT_LIMITS.EMAIL);
  // RFC 5322 simplified regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized);
}

/**
 * Validate name (no numbers or special chars except space, hyphen, apostrophe)
 */
export function isValidName(name: string): boolean {
  const sanitized = sanitizeText(name, INPUT_LIMITS.NAME);
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return nameRegex.test(sanitized) && sanitized.length >= 2;
}

/**
 * Check for potential XSS/injection patterns
 */
export function containsSuspiciousContent(text: string): boolean {
  const suspicious = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onclick=/i,
    /onload=/i,
    /<iframe/i,
    /eval\(/i,
    /expression\(/i,
  ];
  
  return suspicious.some(pattern => pattern.test(text));
}

/**
 * Comprehensive validation for text input
 */
export function validateTextInput(
  text: string,
  field: string,
  maxLength: number
): { isValid: boolean; error: string | null; sanitized: string } {
  if (!text || !text.trim()) {
    return {
      isValid: false,
      error: `${field} is required`,
      sanitized: ''
    };
  }
  
  const sanitized = sanitizeText(text, maxLength);
  
  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      error: `${field} must be ${maxLength} characters or less`,
      sanitized
    };
  }
  
  if (containsSuspiciousContent(sanitized)) {
    return {
      isValid: false,
      error: `${field} contains invalid characters`,
      sanitized
    };
  }
  
  return {
    isValid: true,
    error: null,
    sanitized
  };
}

/**
 * Sanitize password (used for paste operations)
 */
export function sanitizePassword(pwd: string): string {
  if (!pwd) return pwd;
  
  // Remove line breaks, tabs
  let cleaned = pwd.replace(/[\r\n\t]/g, '');
  
  // Remove zero-width characters
  cleaned = cleaned.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  const score = 5 - errors.length;
  
  if (score >= 5) strength = 'strong';
  else if (score >= 4) strength = 'good';
  else if (score >= 3) strength = 'fair';
  
  return {
    isValid: errors.length === 0,
    strength,
    errors
  };
}
