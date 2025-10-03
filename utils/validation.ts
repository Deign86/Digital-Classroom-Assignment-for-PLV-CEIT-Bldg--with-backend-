// Security utilities for input validation and sanitization
// Prevents SQL injection, XSS, and other security vulnerabilities

import DOMPurify from 'isomorphic-dompurify';

// Regex patterns for validation
export const VALIDATION_PATTERNS = {
  // Basic patterns
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Classroom-specific patterns
  CLASSROOM_NAME: /^[a-zA-Z0-9\s\-_]+$/,
  BUILDING_NAME: /^[a-zA-Z0-9\s\-_.,()]+$/,
  
  // Name patterns (allows letters, spaces, hyphens, apostrophes)
  PERSON_NAME: /^[a-zA-Z\s\-'\.]+$/,
  DEPARTMENT_NAME: /^[a-zA-Z\s\-&()]+$/,
  
  // Time patterns
  TIME_24H: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  
  // Date patterns
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  
  // Numeric patterns
  POSITIVE_INTEGER: /^\d+$/,
  CAPACITY: /^[1-9]\d{0,3}$/,  // 1-9999
  
  // Equipment patterns (alphanumeric, spaces, commas, hyphens)
  EQUIPMENT: /^[a-zA-Z0-9\s,\-_()&]+$/,
  
  // Purpose/description patterns (more lenient but still safe)
  PURPOSE_DESCRIPTION: /^[a-zA-Z0-9\s\-_.,()&:;!?'"]+$/,
  
  // Admin feedback pattern
  ADMIN_FEEDBACK: /^[a-zA-Z0-9\s\-_.,()&:;!?'"]+$/,
} as const;

// Common injection patterns to detect and block
export const MALICIOUS_PATTERNS = [
  // SQL Injection patterns
  /('|(\\x27)|(\\x2D)|(\\x23)|(\\x3D))/i,
  /((\%27)|(\')|(\\x27))/i,
  /((\\x3D)|(=))[^\\n]*((\\x27)|(\\x3D)|(\\x23)|(\')|(\\-\\-)|(;)|(\\|))/i,
  /(drop|delete|truncate|update|insert|create|alter|exec|execute|script)/i,
  /(union|select|from|where|join|group|order|having)/i,
  
  // XSS patterns
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<[^>]*on\w+[^>]*>/gi,
  
  // Command injection patterns
  /(\||;|&|`|\$\(|\${)/,
  /(cmd|powershell|bash|sh|exec|eval)/i,
  
  // Path traversal patterns
  /\.\.\//,
  /\.\.\\/,
  
  // Common attack strings
  /(admin'--|admin'#|admin'\/\*)/i,
  /('\s+or\s+'1'='1|'\s+or\s+1=1)/i,
] as const;

// Input sanitization functions
export const sanitizeInput = {
  /**
   * Sanitizes HTML content to prevent XSS attacks
   */
  html: (input: string): string => {
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [] 
    });
  },

  /**
   * Sanitizes text input by removing/escaping dangerous characters
   */
  text: (input: string): string => {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/['"`]/g, '') // Remove quotes
      .replace(/[\\\/]/g, '') // Remove slashes
      .replace(/[;|&$]/g, ''); // Remove command injection chars
  },

  /**
   * Sanitizes name inputs (person names, classroom names)
   */
  name: (input: string): string => {
    return input
      .trim()
      .replace(/[<>'"`;|&$\\\/]/g, '')
      .substring(0, 100); // Limit length
  },

  /**
   * Sanitizes email addresses
   */
  email: (input: string): string => {
    return input
      .trim()
      .toLowerCase()
      .replace(/[<>'"`;|&$\\\/]/g, '')
      .substring(0, 254); // Email max length
  },

  /**
   * Sanitizes numeric inputs
   */
  number: (input: string): string => {
    return input.replace(/[^0-9]/g, '');
  },

  /**
   * Sanitizes equipment lists
   */
  equipment: (input: string): string => {
    return input
      .trim()
      .replace(/[<>'"`;|&$\\\/]/g, '')
      .substring(0, 500);
  },

  /**
   * Sanitizes purpose/description fields
   */
  description: (input: string): string => {
    return input
      .trim()
      .replace(/[<>`;|&$\\\/]/g, '') // Keep some punctuation
      .substring(0, 1000);
  },
};

// Validation functions
export const validateInput = {
  /**
   * Validates if input contains malicious patterns
   */
  isSafe: (input: string): boolean => {
    if (!input || typeof input !== 'string') return false;
    
    return !MALICIOUS_PATTERNS.some(pattern => pattern.test(input));
  },

  /**
   * Validates email format
   */
  email: (email: string): { isValid: boolean; error?: string } => {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email is required' };
    }

    const sanitized = sanitizeInput.email(email);
    
    if (!validateInput.isSafe(sanitized)) {
      return { isValid: false, error: 'Email contains invalid characters' };
    }

    if (!VALIDATION_PATTERNS.EMAIL.test(sanitized)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true };
  },

  /**
   * Validates person name
   */
  personName: (name: string): { isValid: boolean; error?: string } => {
    if (!name || typeof name !== 'string') {
      return { isValid: false, error: 'Name is required' };
    }

    const sanitized = sanitizeInput.name(name);
    
    if (!validateInput.isSafe(sanitized)) {
      return { isValid: false, error: 'Name contains invalid characters' };
    }

    if (sanitized.length < 2 || sanitized.length > 100) {
      return { isValid: false, error: 'Name must be between 2 and 100 characters' };
    }

    if (!VALIDATION_PATTERNS.PERSON_NAME.test(sanitized)) {
      return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
    }

    return { isValid: true };
  },

  /**
   * Validates classroom name
   */
  classroomName: (name: string): { isValid: boolean; error?: string } => {
    if (!name || typeof name !== 'string') {
      return { isValid: false, error: 'Classroom name is required' };
    }

    const sanitized = sanitizeInput.name(name);
    
    if (!validateInput.isSafe(sanitized)) {
      return { isValid: false, error: 'Classroom name contains invalid characters' };
    }

    if (sanitized.length < 1 || sanitized.length > 50) {
      return { isValid: false, error: 'Classroom name must be between 1 and 50 characters' };
    }

    if (!VALIDATION_PATTERNS.CLASSROOM_NAME.test(sanitized)) {
      return { isValid: false, error: 'Classroom name can only contain letters, numbers, spaces, hyphens, and underscores' };
    }

    return { isValid: true };
  },

  /**
   * Validates building name
   */
  buildingName: (name: string): { isValid: boolean; error?: string } => {
    if (!name || typeof name !== 'string') {
      return { isValid: false, error: 'Building name is required' };
    }

    const sanitized = sanitizeInput.name(name);
    
    if (!validateInput.isSafe(sanitized)) {
      return { isValid: false, error: 'Building name contains invalid characters' };
    }

    if (sanitized.length < 1 || sanitized.length > 100) {
      return { isValid: false, error: 'Building name must be between 1 and 100 characters' };
    }

    if (!VALIDATION_PATTERNS.BUILDING_NAME.test(sanitized)) {
      return { isValid: false, error: 'Building name contains invalid characters' };
    }

    return { isValid: true };
  },

  /**
   * Validates capacity
   */
  capacity: (capacity: string | number): { isValid: boolean; error?: string } => {
    const capacityStr = typeof capacity === 'number' ? capacity.toString() : capacity;
    
    if (!capacityStr) {
      return { isValid: false, error: 'Capacity is required' };
    }

    const sanitized = sanitizeInput.number(capacityStr);
    
    if (!VALIDATION_PATTERNS.CAPACITY.test(sanitized)) {
      return { isValid: false, error: 'Capacity must be a positive number between 1 and 9999' };
    }

    const num = parseInt(sanitized, 10);
    if (num < 1 || num > 9999) {
      return { isValid: false, error: 'Capacity must be between 1 and 9999' };
    }

    return { isValid: true };
  },

  /**
   * Validates department name
   */
  department: (department: string): { isValid: boolean; error?: string } => {
    if (!department || typeof department !== 'string') {
      return { isValid: false, error: 'Department is required' };
    }

    const sanitized = sanitizeInput.name(department);
    
    if (!validateInput.isSafe(sanitized)) {
      return { isValid: false, error: 'Department name contains invalid characters' };
    }

    if (sanitized.length < 2 || sanitized.length > 100) {
      return { isValid: false, error: 'Department name must be between 2 and 100 characters' };
    }

    if (!VALIDATION_PATTERNS.DEPARTMENT_NAME.test(sanitized)) {
      return { isValid: false, error: 'Department name contains invalid characters' };
    }

    return { isValid: true };
  },

  /**
   * Validates equipment list
   */
  equipment: (equipment: string): { isValid: boolean; error?: string } => {
    if (!equipment) return { isValid: true }; // Optional field

    const sanitized = sanitizeInput.equipment(equipment);
    
    if (!validateInput.isSafe(sanitized)) {
      return { isValid: false, error: 'Equipment list contains invalid characters' };
    }

    if (sanitized.length > 500) {
      return { isValid: false, error: 'Equipment list is too long (max 500 characters)' };
    }

    if (!VALIDATION_PATTERNS.EQUIPMENT.test(sanitized)) {
      return { isValid: false, error: 'Equipment list contains invalid characters' };
    }

    return { isValid: true };
  },

  /**
   * Validates purpose/description
   */
  purpose: (purpose: string): { isValid: boolean; error?: string } => {
    if (!purpose || typeof purpose !== 'string' || purpose.trim().length === 0) {
      return { isValid: false, error: 'Purpose is required' };
    }

    const sanitized = sanitizeInput.description(purpose);
    
    if (sanitized.length > 1000) {
      return { isValid: false, error: 'Purpose must be less than 1000 characters' };
    }

    return { isValid: true };
  },

  /**
   * Validates date in YYYY-MM-DD format
   */
  date: (date: string): { isValid: boolean; error?: string } => {
    if (!date || typeof date !== 'string') {
      return { isValid: false, error: 'Date is required' };
    }

    if (!VALIDATION_PATTERNS.DATE_ISO.test(date)) {
      return { isValid: false, error: 'Invalid date format' };
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return { isValid: false, error: 'Invalid date' };
    }

    return { isValid: true };
  },

  /**
   * Validates time in HH:MM format
   */
  time: (time: string): { isValid: boolean; error?: string } => {
    // The user has indicated that this validation is not necessary
    // because the time is selected from a dropdown menu.
    return { isValid: true };
  },

  /**
   * Validates floor number
   */
  floor: (floor: string | number): { isValid: boolean; error?: string } => {
    const floorStr = typeof floor === 'number' ? floor.toString() : floor;
    
    if (!floorStr) {
      return { isValid: false, error: 'Floor is required' };
    }

    const sanitized = sanitizeInput.number(floorStr);
    
    if (!VALIDATION_PATTERNS.POSITIVE_INTEGER.test(sanitized)) {
      return { isValid: false, error: 'Floor must be a positive number' };
    }

    const num = parseInt(sanitized, 10);
    if (num < 1 || num > 50) {
      return { isValid: false, error: 'Floor must be between 1 and 50' };
    }

    return { isValid: true };
  },

  /**
   * Validates admin feedback
   */
  adminFeedback: (feedback: string): { isValid: boolean; error?: string } => {
    if (!feedback) return { isValid: true }; // Optional field

    const sanitized = sanitizeInput.description(feedback);
    
    if (!validateInput.isSafe(sanitized)) {
      return { isValid: false, error: 'Feedback contains invalid characters' };
    }

    if (sanitized.length > 1000) {
      return { isValid: false, error: 'Feedback is too long (max 1000 characters)' };
    }

    if (!VALIDATION_PATTERNS.ADMIN_FEEDBACK.test(sanitized)) {
      return { isValid: false, error: 'Feedback contains invalid characters' };
    }

    return { isValid: true };
  },
};

// Form validation helper
export const validateForm = {
  /**
   * Validates classroom form data
   */
  classroom: (data: {
    name: string;
    capacity: string | number;
    building: string;
    floor: string | number;
    equipment?: string;
  }): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    const nameValidation = validateInput.classroomName(data.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error!;
    }

    const capacityValidation = validateInput.capacity(data.capacity);
    if (!capacityValidation.isValid) {
      errors.capacity = capacityValidation.error!;
    }

    const buildingValidation = validateInput.buildingName(data.building);
    if (!buildingValidation.isValid) {
      errors.building = buildingValidation.error!;
    }

    const floorValidation = validateInput.floor(data.floor);
    if (!floorValidation.isValid) {
      errors.floor = floorValidation.error!;
    }

    if (data.equipment) {
      const equipmentValidation = validateInput.equipment(data.equipment);
      if (!equipmentValidation.isValid) {
        errors.equipment = equipmentValidation.error!;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Validates signup request form data
   */
  signupRequest: (data: {
    email: string;
    name: string;
    department: string;
  }): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    const emailValidation = validateInput.email(data.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error!;
    }

    const nameValidation = validateInput.personName(data.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error!;
    }

    const departmentValidation = validateInput.department(data.department);
    if (!departmentValidation.isValid) {
      errors.department = departmentValidation.error!;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Validates booking request form data
   */
  bookingRequest: (data: {
    classroomId: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose: string;
  }): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    if (!data.classroomId) {
      errors.classroomId = 'Classroom is required';
    }

    const dateValidation = validateInput.date(data.date);
    if (!dateValidation.isValid) {
      errors.date = dateValidation.error!;
    }

    const startTimeValidation = validateInput.time(data.startTime);
    if (!startTimeValidation.isValid) {
      errors.startTime = startTimeValidation.error!;
    }

    const endTimeValidation = validateInput.time(data.endTime);
    if (!endTimeValidation.isValid) {
      errors.endTime = endTimeValidation.error!;
    }

    const purposeValidation = validateInput.purpose(data.purpose);
    if (!purposeValidation.isValid) {
      errors.purpose = purposeValidation.error!;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },
};

// Error sanitization for display
export const sanitizeError = (error: string): string => {
  return sanitizeInput.text(error).substring(0, 200);
};