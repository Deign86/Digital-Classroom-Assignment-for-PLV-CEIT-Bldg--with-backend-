// Client-Side Validation Utilities
// Prevents malicious input, blank fields, and ensures data integrity before submission

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  value?: string | number;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  sanitizedValues: Record<string, any>;
}

// SQL Injection and XSS Patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(;|\-\-|\/\*|\*\/|xp_|sp_)/i,
  /(\bOR\b.*=.*\bOR\b)/i,
  /(\bAND\b.*=.*\bAND\b)/i,
  /(1\s*=\s*1|'1'='1'|"1"="1")/i,
  /(DROP\s+TABLE|TRUNCATE\s+TABLE)/i,
  /(\bUNION\s+SELECT\b)/i
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi
];

// Character limits and patterns
const PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  name: /^[a-zA-Z\s'-]{2,50}$/,
  department: /^[a-zA-Z\s&-]{2,100}$/,
  classroomName: /^[a-zA-Z0-9\s-]{1,30}$/,
  building: /^[a-zA-Z0-9\s-]{1,30}$/,
  purpose: /^[a-zA-Z0-9\s.,;:!?\-'"()]{5,200}$/,
  time: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  phone: /^\+?[\d\s-()]{10,15}$/
};

/**
 * Check for dangerous patterns in input
 */
function hasDangerousPatterns(input: string): string[] {
  const errors: string[] = [];
  
  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      errors.push('Input contains potentially dangerous SQL patterns');
      break;
    }
  }
  
  // Check for XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      errors.push('Input contains potentially dangerous script content');
      break;
    }
  }
  
  return errors;
}

/**
 * Sanitize string input
 */
function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // Remove control characters
    .replace(/[<>'"&]/g, (match) => {
      switch (match) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#x27;';
        case '&': return '&amp;';
        default: return match;
      }
    });
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
    return { isValid: false, errors };
  }
  
  const trimmed = email.trim();
  
  if (trimmed.length === 0) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }
  
  if (trimmed.length > 254) {
    errors.push('Email is too long (maximum 254 characters)');
  }
  
  if (!PATTERNS.email.test(trimmed)) {
    errors.push('Please enter a valid email address');
  }
  
  const dangerousPatterns = hasDangerousPatterns(trimmed);
  errors.push(...dangerousPatterns);
  
  return {
    isValid: errors.length === 0,
    errors,
    value: sanitizeString(trimmed).toLowerCase()
  };
}

/**
 * Validate person name
 */
export function validateName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name || typeof name !== 'string') {
    errors.push('Name is required');
    return { isValid: false, errors };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    errors.push('Name is required');
    return { isValid: false, errors };
  }
  
  if (trimmed.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (trimmed.length > 50) {
    errors.push('Name is too long (maximum 50 characters)');
  }
  
  if (!PATTERNS.name.test(trimmed)) {
    errors.push('Name can only contain letters, spaces, hyphens, and apostrophes');
  }
  
  const dangerousPatterns = hasDangerousPatterns(trimmed);
  errors.push(...dangerousPatterns);
  
  return {
    isValid: errors.length === 0,
    errors,
    value: sanitizeString(trimmed)
  };
}

/**
 * Validate department name
 */
export function validateDepartment(department: string): ValidationResult {
  const errors: string[] = [];
  
  if (!department || typeof department !== 'string') {
    errors.push('Department is required');
    return { isValid: false, errors };
  }
  
  const trimmed = department.trim();
  
  if (trimmed.length === 0) {
    errors.push('Department is required');
    return { isValid: false, errors };
  }
  
  if (trimmed.length < 2) {
    errors.push('Department must be at least 2 characters long');
  }
  
  if (trimmed.length > 100) {
    errors.push('Department name is too long (maximum 100 characters)');
  }
  
  if (!PATTERNS.department.test(trimmed)) {
    errors.push('Department name contains invalid characters');
  }
  
  const dangerousPatterns = hasDangerousPatterns(trimmed);
  errors.push(...dangerousPatterns);
  
  return {
    isValid: errors.length === 0,
    errors,
    value: sanitizeString(trimmed)
  };
}

/**
 * Validate password with strength requirements
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length === 0) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password is too long (maximum 128 characters)');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const weakPasswords = [
    'password', '12345678', 'qwerty123', 'admin123', 'letmein',
    'welcome123', 'changeme', 'password123', 'admin', 'user123'
  ];
  
  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common and weak');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    value: password // Don't sanitize passwords
  };
}

/**
 * Validate classroom name
 */
export function validateClassroomName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name || typeof name !== 'string') {
    errors.push('Classroom name is required');
    return { isValid: false, errors };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    errors.push('Classroom name is required');
    return { isValid: false, errors };
  }
  
  if (trimmed.length > 30) {
    errors.push('Classroom name is too long (maximum 30 characters)');
  }
  
  if (!PATTERNS.classroomName.test(trimmed)) {
    errors.push('Classroom name can only contain letters, numbers, spaces, and hyphens');
  }
  
  const dangerousPatterns = hasDangerousPatterns(trimmed);
  errors.push(...dangerousPatterns);
  
  return {
    isValid: errors.length === 0,
    errors,
    value: sanitizeString(trimmed)
  };
}

/**
 * Validate capacity number
 */
export function validateCapacity(capacity: string | number): ValidationResult {
  const errors: string[] = [];
  
  if (capacity === undefined || capacity === null || capacity === '') {
    errors.push('Capacity is required');
    return { isValid: false, errors };
  }
  
  const num = typeof capacity === 'string' ? parseInt(capacity.trim(), 10) : capacity;
  
  if (isNaN(num)) {
    errors.push('Capacity must be a valid number');
    return { isValid: false, errors };
  }
  
  if (num < 1) {
    errors.push('Capacity must be at least 1');
  }
  
  if (num > 1000) {
    errors.push('Capacity cannot exceed 1000');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    value: num
  };
}

/**
 * Validate purpose/description text
 */
export function validatePurpose(purpose: string): ValidationResult {
  const errors: string[] = [];
  
  if (!purpose || typeof purpose !== 'string') {
    errors.push('Purpose is required');
    return { isValid: false, errors };
  }
  
  const trimmed = purpose.trim();
  
  if (trimmed.length === 0) {
    errors.push('Purpose is required');
    return { isValid: false, errors };
  }
  
  if (trimmed.length < 5) {
    errors.push('Purpose must be at least 5 characters long');
  }
  
  if (trimmed.length > 200) {
    errors.push('Purpose is too long (maximum 200 characters)');
  }
  
  if (!PATTERNS.purpose.test(trimmed)) {
    errors.push('Purpose contains invalid characters');
  }
  
  const dangerousPatterns = hasDangerousPatterns(trimmed);
  errors.push(...dangerousPatterns);
  
  return {
    isValid: errors.length === 0,
    errors,
    value: sanitizeString(trimmed)
  };
}

/**
 * Validate time format (HH:MM)
 */
export function validateTime(time: string): ValidationResult {
  const errors: string[] = [];
  
  if (!time || typeof time !== 'string') {
    errors.push('Time is required');
    return { isValid: false, errors };
  }
  
  const trimmed = time.trim();
  
  if (trimmed.length === 0) {
    errors.push('Time is required');
    return { isValid: false, errors };
  }
  
  if (!PATTERNS.time.test(trimmed)) {
    errors.push('Please enter a valid time in HH:MM format');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    value: trimmed
  };
}

/**
 * Validate date is not in the past
 */
export function validateDate(date: string): ValidationResult {
  const errors: string[] = [];
  
  if (!date || typeof date !== 'string') {
    errors.push('Date is required');
    return { isValid: false, errors };
  }
  
  const trimmed = date.trim();
  
  if (trimmed.length === 0) {
    errors.push('Date is required');
    return { isValid: false, errors };
  }
  
  const selectedDate = new Date(trimmed);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isNaN(selectedDate.getTime())) {
    errors.push('Please enter a valid date');
    return { isValid: false, errors };
  }
  
  if (selectedDate < today) {
    errors.push('Date cannot be in the past');
  }
  
  // Don't allow dates more than 1 year in the future
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  
  if (selectedDate > maxDate) {
    errors.push('Date cannot be more than 1 year in the future');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    value: trimmed
  };
}

/**
 * Comprehensive form validation
 */
export function validateForm(formData: Record<string, any>, validationRules: Record<string, (value: any) => ValidationResult>): FormValidationResult {
  const errors: Record<string, string[]> = {};
  const sanitizedValues: Record<string, any> = {};
  
  for (const [field, validator] of Object.entries(validationRules)) {
    const result = validator(formData[field]);
    
    if (!result.isValid) {
      errors[field] = result.errors;
    } else {
      sanitizedValues[field] = result.value;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedValues
  };
}

/**
 * Real-time input validation for immediate feedback
 */
export function validateInput(value: string, validator: (value: string) => ValidationResult): {
  isValid: boolean;
  error?: string;
  value?: string;
} {
  const result = validator(value);
  
  return {
    isValid: result.isValid,
    error: result.errors[0], // Show first error for real-time feedback
    value: result.value as string
  };
}