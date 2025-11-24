/**
 * Universal input validation and sanitization utilities.
 * 
 * Provides comprehensive input validation to prevent XSS attacks,
 * SQL injection, and ensure data quality throughout the application.
 */

/**
 * Maximum length constraints for different input fields.
 * Based on RFC standards and practical application limits.
 */
export const INPUT_LIMITS = {
  /** Maximum email length per RFC 5321 */
  EMAIL: 320,
  /** Maximum user name length */
  NAME: 100,
  /** Maximum department name length */
  DEPARTMENT: 100,
  /** Maximum purpose/description length */
  PURPOSE: 500,
  /** Maximum feedback text length */
  FEEDBACK: 500,
  /** Maximum classroom name length */
  CLASSROOM_NAME: 50,
  /** Maximum reason text length */
  REASON: 500,
} as const;

/**
 * Sanitizes text input by trimming, removing excessive whitespace, and limiting length.
 * 
 * Security features:
 * - Removes zero-width and invisible characters
 * - Strips control characters
 * - Collapses multiple spaces
 * - Enforces length limits
 * 
 * @param text - The text to sanitize
 * @param maxLength - Maximum allowed length (default: 500)
 * @param options - Optional sanitization behavior
 * @param options.allowNewlines - Whether to preserve line breaks
 * @param options.allowMultipleSpaces - Whether to preserve multiple spaces
 * @returns Sanitized text string
 * 
 * @example
 * ```typescript
 * sanitizeText("  Hello   World  ", 50)
 * // Returns "Hello World"
 * 
 * sanitizeText("Line 1\nLine 2", 100, { allowNewlines: true })
 * // Returns "Line 1\nLine 2"
 * ```
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
 * Validates email format using RFC 5322 simplified regex.
 * 
 * Also sanitizes the email and enforces length limits.
 * 
 * @param email - The email address to validate
 * @returns true if email format is valid
 * 
 * @example
 * ```typescript
 * isValidEmail("user@example.com")     // true
 * isValidEmail("invalid.email")        // false
 * isValidEmail("user@example")         // false
 * ```
 */
export function isValidEmail(email: string): boolean {
  const sanitized = sanitizeText(email, INPUT_LIMITS.EMAIL);
  // RFC 5322 simplified regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized);
}

/**
 * Validates if an email is from the PLV domain or is an allowed test account.
 * 
 * Accepts:
 * - Email addresses ending with @plv.edu.ph
 * - Email addresses listed in VITE_TEST_EMAILS environment variable (comma-separated)
 * 
 * This allows the system to maintain strict PLV email requirements in production
 * while enabling test accounts for documentation and testing purposes.
 * 
 * @param email - The email address to validate
 * @returns Object with isValid flag and optional error message
 * 
 * @example
 * ```typescript
 * // In .env: VITE_TEST_EMAILS=testfaculty21@gmail.com,test@example.com
 * 
 * validatePLVEmail("faculty@plv.edu.ph")
 * // Returns { isValid: true }
 * 
 * validatePLVEmail("testfaculty21@gmail.com")
 * // Returns { isValid: true }
 * 
 * validatePLVEmail("random@gmail.com")
 * // Returns { isValid: false, error: "Email must be from @plv.edu.ph domain" }
 * ```
 */
export function validatePLVEmail(email: string): { isValid: boolean; error?: string } {
  const sanitizedEmail = email.trim().toLowerCase();
  
  // Check if email is from PLV domain
  if (sanitizedEmail.endsWith('@plv.edu.ph')) {
    return { isValid: true };
  }
  
  // Check if email is in the allowed test emails list
  const testEmails = import.meta.env.VITE_TEST_EMAILS as string | undefined;
  if (testEmails) {
    const allowedTestEmails = testEmails
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);
    
    if (allowedTestEmails.includes(sanitizedEmail)) {
      return { isValid: true };
    }
  }
  
  return { 
    isValid: false, 
    error: 'Email must be from @plv.edu.ph domain' 
  };
}

/**
 * Validates name format (letters, spaces, hyphens, and apostrophes only).
 * 
 * Ensures names contain only alphabetic characters and common name punctuation.
 * Requires minimum length of 2 characters.
 * 
 * @param name - The name to validate
 * @returns true if name format is valid
 * 
 * @example
 * ```typescript
 * isValidName("John Doe")           // true
 * isValidName("Mary-Jane O'Brien")  // true
 * isValidName("User123")            // false (contains numbers)
 * isValidName("A")                  // false (too short)
 * ```
 */
export function isValidName(name: string): boolean {
  const sanitized = sanitizeText(name, INPUT_LIMITS.NAME);
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return nameRegex.test(sanitized) && sanitized.length >= 2;
}

/**
 * Checks for potential XSS/injection patterns in text.
 * 
 * Detects common attack vectors including:
 * - Script tags
 * - JavaScript protocols
 * - Event handlers (onclick, onerror, onload)
 * - Iframes
 * - eval() and expression() calls
 * 
 * @param text - The text to check for suspicious content
 * @returns true if suspicious patterns are detected
 * 
 * @example
 * ```typescript
 * containsSuspiciousContent("<script>alert('xss')</script>")  // true
 * containsSuspiciousContent("javascript:void(0)")             // true
 * containsSuspiciousContent("Hello World")                    // false
 * ```
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
 * Performs comprehensive validation on text input.
 * 
 * Combines multiple validation checks:
 * - Presence validation (non-empty)
 * - Length validation
 * - XSS/injection detection
 * - Automatic sanitization
 * 
 * @param text - The text to validate
 * @param field - Field name for error messages
 * @param maxLength - Maximum allowed length
 * @returns Validation result with sanitized text
 * 
 * @example
 * ```typescript
 * const result = validateTextInput(userInput, "Description", 500);
 * if (result.isValid) {
 *   saveData(result.sanitized);
 * } else {
 *   showError(result.error);
 * }
 * ```
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
