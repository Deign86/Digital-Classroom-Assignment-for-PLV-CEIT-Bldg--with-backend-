// Faculty-specific input validation and security utilities
// Enhanced validation for faculty dashboard forms with strict security controls

import { 
  VALIDATION_PATTERNS, 
  MALICIOUS_PATTERNS, 
  sanitizeInput as baseSanitizeInput,
  validateInput as baseValidateInput 
} from './validation';
import { SecureError, ErrorHandler, ErrorType } from './errorHandling';

// Faculty-specific validation patterns
export const FACULTY_VALIDATION_PATTERNS = {
  ...VALIDATION_PATTERNS,
  
  // Faculty-specific patterns
  FACULTY_ID: /^[a-zA-Z0-9]{6,20}$/,
  EMPLOYEE_ID: /^[a-zA-Z0-9\-]{5,15}$/,
  
  // Academic patterns
  COURSE_CODE: /^[a-zA-Z]{2,4}[0-9]{1,4}[a-zA-Z]?$/,
  SUBJECT_NAME: /^[a-zA-Z0-9\s\-&():.]+$/,
  ACADEMIC_YEAR: /^20[0-9]{2}-20[0-9]{2}$/,
  SEMESTER: /^(1st|2nd|Summer|Midyear)$/,
  
  // Schedule patterns
  TIME_RANGE: /^([01]?[0-9]|2[0-3]):[0-5][0-9]\s*-\s*([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  DAY_SCHEDULE: /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i,
  
  // Contact patterns
  PHONE_NUMBER: /^(\+63|63|0)?[0-9]{10}$/,
  EXTENSION: /^[0-9]{3,5}$/,
  
  // Department/College patterns
  COLLEGE_CODE: /^[A-Z]{2,6}$/,
  
  // Booking patterns
  BOOKING_PURPOSE: /^[a-zA-Z0-9\s\-_.,()&:;!?'"]{5,200}$/,
  DURATION_MINUTES: /^(30|45|60|90|120|150|180|240|300|360|420|480)$/,
  
  // Grade patterns (if needed for academic records)
  GRADE: /^(1\.00|1\.25|1\.50|1\.75|2\.00|2\.25|2\.50|2\.75|3\.00|4\.00|5\.00|INC|DRP|W)$/,
} as const;

// Faculty form field limits
export const FACULTY_FIELD_LIMITS = {
  firstName: { min: 2, max: 50 },
  lastName: { min: 2, max: 50 },
  middleName: { min: 1, max: 50 },
  email: { min: 5, max: 254 },
  employeeId: { min: 5, max: 15 },
  department: { min: 2, max: 100 },
  college: { min: 2, max: 100 },
  position: { min: 2, max: 100 },
  phoneNumber: { min: 10, max: 13 },
  extension: { min: 3, max: 5 },
  officeRoom: { min: 1, max: 20 },
  courseName: { min: 3, max: 200 },
  courseCode: { min: 4, max: 10 },
  bookingPurpose: { min: 5, max: 200 },
  comments: { min: 0, max: 500 },
  feedback: { min: 0, max: 1000 },
} as const;

// Required fields for different faculty forms
export const FACULTY_REQUIRED_FIELDS = {
  profile: ['firstName', 'lastName', 'email', 'employeeId', 'department'],
  schedule: ['courseCode', 'courseName', 'startTime', 'endTime', 'day'],
  booking: ['roomId', 'date', 'startTime', 'endTime', 'purpose'],
  course: ['courseCode', 'courseName', 'units', 'semester', 'academicYear'],
} as const;

// Faculty-specific sanitization
export const facultySanitizeInput = {
  ...baseSanitizeInput,

  /**
   * Sanitizes faculty profile fields
   */
  facultyName: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>'"`;|&$\\\/{}[\]]/g, '')
      .replace(/\s+/g, ' ')
      .substring(0, 50);
  },

  /**
   * Sanitizes employee ID
   */
  employeeId: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\-]/g, '')
      .substring(0, 15);
  },

  /**
   * Sanitizes course codes
   */
  courseCode: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10);
  },

  /**
   * Sanitizes academic schedules
   */
  schedule: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>'"`;|&$\\\/{}[\]]/g, '')
      .substring(0, 100);
  },

  /**
   * Sanitizes booking purposes
   */
  bookingPurpose: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>`;|&$\\\/{}[\]]/g, '')
      .replace(/\s+/g, ' ')
      .substring(0, 200);
  },

  /**
   * Sanitizes phone numbers
   */
  phoneNumber: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .replace(/[^\d+\-\s()]/g, '')
      .replace(/\s+/g, '')
      .substring(0, 15);
  },
};

// Faculty validation functions
export const facultyValidateInput = {
  ...baseValidateInput,

  /**
   * Validates faculty profile data
   */
  facultyProfile: (profileData: Record<string, any>): { 
    isValid: boolean; 
    errors: string[]; 
    sanitizedData: Record<string, any>;
  } => {
    const errors: string[] = [];
    const sanitizedData: Record<string, any> = {};

    try {
      // Check required fields
      const requiredFields = FACULTY_REQUIRED_FIELDS.profile;
      for (const field of requiredFields) {
        if (!profileData[field] || typeof profileData[field] !== 'string' || !profileData[field].trim()) {
          errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
          continue;
        }

        // Sanitize the field
        const value = profileData[field].toString().trim();
        
        if (!baseValidateInput.isSafe(value)) {
          errors.push(`${field} contains invalid characters`);
          continue;
        }

        // Validate specific fields
        switch (field) {
          case 'firstName':
          case 'lastName':
            if (!FACULTY_VALIDATION_PATTERNS.PERSON_NAME.test(value)) {
              errors.push(`${field} contains invalid characters`);
              continue;
            }
            if (value.length < FACULTY_FIELD_LIMITS.firstName.min || 
                value.length > FACULTY_FIELD_LIMITS.firstName.max) {
              errors.push(`${field} must be between ${FACULTY_FIELD_LIMITS.firstName.min}-${FACULTY_FIELD_LIMITS.firstName.max} characters`);
              continue;
            }
            sanitizedData[field] = facultySanitizeInput.facultyName(value);
            break;

          case 'email':
            if (!FACULTY_VALIDATION_PATTERNS.EMAIL.test(value)) {
              errors.push('Invalid email format');
              continue;
            }
            sanitizedData[field] = facultySanitizeInput.email(value);
            break;

          case 'employeeId':
            if (!FACULTY_VALIDATION_PATTERNS.EMPLOYEE_ID.test(value)) {
              errors.push('Invalid employee ID format');
              continue;
            }
            sanitizedData[field] = facultySanitizeInput.employeeId(value);
            break;

          case 'department':
            if (!FACULTY_VALIDATION_PATTERNS.DEPARTMENT_NAME.test(value)) {
              errors.push('Invalid department name');
              continue;
            }
            sanitizedData[field] = facultySanitizeInput.name(value);
            break;

          default:
            sanitizedData[field] = baseSanitizeInput.text(value);
        }
      }

      // Validate optional fields if present
      if (profileData.phoneNumber) {
        const phoneValue = profileData.phoneNumber.toString().trim();
        if (!FACULTY_VALIDATION_PATTERNS.PHONE_NUMBER.test(phoneValue)) {
          errors.push('Invalid phone number format');
        } else {
          sanitizedData.phoneNumber = facultySanitizeInput.phoneNumber(phoneValue);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData,
      };
    } catch (error) {
      console.error('Faculty profile validation failed', error);
      return {
        isValid: false,
        errors: ['Validation failed due to server error'],
        sanitizedData: {},
      };
    }
  },

  /**
   * Validates faculty schedule data
   */
  facultySchedule: (scheduleData: Record<string, any>): {
    isValid: boolean;
    errors: string[];
    sanitizedData: Record<string, any>;
  } => {
    const errors: string[] = [];
    const sanitizedData: Record<string, any> = {};

    try {
      // Check required fields
      const requiredFields = FACULTY_REQUIRED_FIELDS.schedule;
      for (const field of requiredFields) {
        if (!scheduleData[field] || !scheduleData[field].toString().trim()) {
          errors.push(`${field} is required`);
          continue;
        }

        const value = scheduleData[field].toString().trim();

        if (!baseValidateInput.isSafe(value)) {
          errors.push(`${field} contains invalid characters`);
          continue;
        }

        // Validate specific fields
        switch (field) {
          case 'courseCode':
            if (!FACULTY_VALIDATION_PATTERNS.COURSE_CODE.test(value)) {
              errors.push('Invalid course code format');
              continue;
            }
            sanitizedData[field] = facultySanitizeInput.courseCode(value);
            break;

          case 'courseName':
            if (!FACULTY_VALIDATION_PATTERNS.SUBJECT_NAME.test(value)) {
              errors.push('Invalid course name');
              continue;
            }
            sanitizedData[field] = facultySanitizeInput.schedule(value);
            break;

          case 'startTime':
          case 'endTime':
            if (!FACULTY_VALIDATION_PATTERNS.TIME_24H.test(value)) {
              errors.push(`Invalid time format for ${field}`);
              continue;
            }
            sanitizedData[field] = value;
            break;

          case 'day':
            if (!FACULTY_VALIDATION_PATTERNS.DAY_SCHEDULE.test(value)) {
              errors.push('Invalid day format');
              continue;
            }
            sanitizedData[field] = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
            break;

          default:
            sanitizedData[field] = baseSanitizeInput.text(value);
        }
      }

      // Validate time logic
      if (sanitizedData.startTime && sanitizedData.endTime) {
        const startTime = new Date(`2000-01-01T${sanitizedData.startTime}:00`);
        const endTime = new Date(`2000-01-01T${sanitizedData.endTime}:00`);
        
        if (startTime >= endTime) {
          errors.push('End time must be after start time');
        }

        const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        if (durationMinutes < 30) {
          errors.push('Class duration must be at least 30 minutes');
        }
        if (durationMinutes > 480) {
          errors.push('Class duration cannot exceed 8 hours');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData,
      };
    } catch (error) {
      console.error('Faculty schedule validation failed', error);
      return {
        isValid: false,
        errors: ['Schedule validation failed'],
        sanitizedData: {},
      };
    }
  },

  /**
   * Validates faculty booking data
   */
  facultyBooking: (bookingData: Record<string, any>): {
    isValid: boolean;
    errors: string[];
    sanitizedData: Record<string, any>;
  } => {
    const errors: string[] = [];
    const sanitizedData: Record<string, any> = {};

    try {
      // Check required fields
      const requiredFields = FACULTY_REQUIRED_FIELDS.booking;
      for (const field of requiredFields) {
        if (!bookingData[field] || !bookingData[field].toString().trim()) {
          errors.push(`${field} is required`);
          continue;
        }

        const value = bookingData[field].toString().trim();

        if (!baseValidateInput.isSafe(value)) {
          errors.push(`${field} contains invalid characters`);
          continue;
        }

        // Validate specific fields
        switch (field) {
          case 'roomId':
            if (!FACULTY_VALIDATION_PATTERNS.POSITIVE_INTEGER.test(value)) {
              errors.push('Invalid room selection');
              continue;
            }
            sanitizedData[field] = parseInt(value);
            break;

          case 'date':
            if (!FACULTY_VALIDATION_PATTERNS.DATE_ISO.test(value)) {
              errors.push('Invalid date format');
              continue;
            }
            
            const bookingDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (bookingDate < today) {
              errors.push('Cannot book rooms for past dates');
              continue;
            }
            
            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 6);
            if (bookingDate > maxDate) {
              errors.push('Cannot book rooms more than 6 months in advance');
              continue;
            }
            
            sanitizedData[field] = value;
            break;

          case 'startTime':
          case 'endTime':
            if (!FACULTY_VALIDATION_PATTERNS.TIME_24H.test(value)) {
              errors.push(`Invalid time format for ${field}`);
              continue;
            }
            sanitizedData[field] = value;
            break;

          case 'purpose':
            if (!FACULTY_VALIDATION_PATTERNS.BOOKING_PURPOSE.test(value)) {
              errors.push('Invalid booking purpose format');
              continue;
            }
            if (value.length < FACULTY_FIELD_LIMITS.bookingPurpose.min) {
              errors.push(`Purpose must be at least ${FACULTY_FIELD_LIMITS.bookingPurpose.min} characters`);
              continue;
            }
            sanitizedData[field] = facultySanitizeInput.bookingPurpose(value);
            break;

          default:
            sanitizedData[field] = baseSanitizeInput.text(value);
        }
      }

      // Validate time logic for booking
      if (sanitizedData.startTime && sanitizedData.endTime) {
        const startTime = new Date(`2000-01-01T${sanitizedData.startTime}:00`);
        const endTime = new Date(`2000-01-01T${sanitizedData.endTime}:00`);
        
        if (startTime >= endTime) {
          errors.push('End time must be after start time');
        }

        const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        if (durationMinutes < 30) {
          errors.push('Booking duration must be at least 30 minutes');
        }
        if (durationMinutes > 480) {
          errors.push('Booking duration cannot exceed 8 hours');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData,
      };
    } catch (error) {
      console.error('Faculty booking validation failed', error);
      return {
        isValid: false,
        errors: ['Booking validation failed'],
        sanitizedData: {},
      };
    }
  },

  /**
   * Validates bulk form data with common security checks
   */
  bulkValidation: (
    formData: Record<string, any>,
    formType: keyof typeof FACULTY_REQUIRED_FIELDS
  ): { isValid: boolean; errors: string[]; sanitizedData: Record<string, any> } => {
    // Check for common attack patterns first
    const allValues = Object.values(formData).join(' ');
    if (!baseValidateInput.isSafe(allValues)) {
      throw new SecureError(
        ErrorType.VALIDATION,
        'Form contains invalid data'
      );
    }

    // Check form size (prevent DoS)
    const formString = JSON.stringify(formData);
    if (formString.length > 50000) { // 50KB limit
      throw new SecureError(
        ErrorType.VALIDATION,
        'Form data exceeds size limit'
      );
    }

    // Delegate to specific validation based on form type
    switch (formType) {
      case 'profile':
        return facultyValidateInput.facultyProfile(formData);
      case 'schedule':
        return facultyValidateInput.facultySchedule(formData);
      case 'booking':
        return facultyValidateInput.facultyBooking(formData);
      default:
        return {
          isValid: false,
          errors: ['Unknown form type'],
          sanitizedData: {},
        };
    }
  },
};

// Faculty authorization checks
export const facultyAuthChecks = {
  /**
   * Check if faculty user can access specific resource
   */
  canAccessResource: (userRole: string, resource: string, resourceOwnerId?: string, currentUserId?: string): boolean => {
    // Admin can access everything
    if (userRole === 'admin') return true;
    
    // Faculty can only access their own resources
    if (userRole === 'faculty') {
      if (resourceOwnerId && currentUserId) {
        return resourceOwnerId === currentUserId;
      }
      return true; // If no ownership info, allow (will be checked server-side)
    }
    
    return false;
  },

  /**
   * Validate faculty session and permissions
   */
  validateFacultySession: (userSession: any): boolean => {
    if (!userSession || !userSession.uid || !userSession.email) {
      return false;
    }

    // Check session age (expire after 8 hours of inactivity)
    const lastActivity = userSession.lastActivity || userSession.loginTime;
    if (lastActivity) {
      const now = Date.now();
      const sessionAge = now - lastActivity;
      const eightHours = 8 * 60 * 60 * 1000;
      
      if (sessionAge > eightHours) {
        return false;
      }
    }

    return true;
  },
};

// Export comprehensive faculty validation utility
export const FacultyValidator = {
  patterns: FACULTY_VALIDATION_PATTERNS,
  limits: FACULTY_FIELD_LIMITS,
  requiredFields: FACULTY_REQUIRED_FIELDS,
  sanitize: facultySanitizeInput,
  validate: facultyValidateInput,
  authorize: facultyAuthChecks,
};