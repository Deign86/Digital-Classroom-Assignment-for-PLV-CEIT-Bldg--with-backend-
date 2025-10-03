// Password validation utilities with strength checking and real-time feedback
// Implements comprehensive password security requirements

import { sanitizeInput } from './validation';

// Password strength levels
export enum PasswordStrength {
  VERY_WEAK = 0,
  WEAK = 1,
  FAIR = 2,
  GOOD = 3,
  STRONG = 4,
  VERY_STRONG = 5,
}

// Password requirements configuration
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minSpecialChars: 1,
  maxRepeatingChars: 3,
  preventCommonPasswords: true,
  preventUserInfo: true,
} as const;

// Common weak passwords to block
const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'master', 'hello',
  'freedom', 'whatever', 'qazwsx', 'trustno1', 'jordan23', 'harley',
  'robert', 'matthew', 'jordan', 'michelle', 'loveme', 'sunshine',
  'andrew', 'joshua', 'daniel', 'ashley', 'amanda', 'justin', 'jessica',
  'john', 'password1', 'pass', '1234', '12345', '123', 'test', 'guest',
  'user', 'default', 'change', 'changeme', 'temp', 'temporary'
];

// Password validation result interface
export interface PasswordValidationResult {
  isValid: boolean;
  strength: PasswordStrength;
  score: number;
  feedback: string[];
  errors: string[];
  strengthText: string;
  strengthColor: string;
  strengthPercentage: number;
  estimatedCrackTime: string;
}

// User information interface for password validation
export interface UserInfo {
  name?: string;
  email?: string;
  username?: string;
  department?: string;
}

export class PasswordValidator {
  /**
   * Validate password strength and security
   */
  static validatePassword(
    password: string, 
    userInfo?: UserInfo,
    requirements = PASSWORD_REQUIREMENTS
  ): PasswordValidationResult {
    const errors: string[] = [];
    const feedback: string[] = [];
    let score = 0;

    // Sanitize password for safety (but don't modify it for validation)
    const cleanPassword = password || '';
    
    // Check basic requirements
    if (cleanPassword.length < requirements.minLength) {
      errors.push(`Password must be at least ${requirements.minLength} characters long`);
    } else if (cleanPassword.length >= requirements.minLength) {
      score += 1;
      feedback.push('✓ Meets minimum length requirement');
    }

    if (cleanPassword.length > requirements.maxLength) {
      errors.push(`Password cannot exceed ${requirements.maxLength} characters`);
    }

    // Check character requirements
    if (requirements.requireUppercase && !/[A-Z]/.test(cleanPassword)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (requirements.requireUppercase && /[A-Z]/.test(cleanPassword)) {
      score += 1;
      feedback.push('✓ Contains uppercase letters');
    }

    if (requirements.requireLowercase && !/[a-z]/.test(cleanPassword)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (requirements.requireLowercase && /[a-z]/.test(cleanPassword)) {
      score += 1;
      feedback.push('✓ Contains lowercase letters');
    }

    if (requirements.requireNumbers && !/\d/.test(cleanPassword)) {
      errors.push('Password must contain at least one number');
    } else if (requirements.requireNumbers && /\d/.test(cleanPassword)) {
      score += 1;
      feedback.push('✓ Contains numbers');
    }

    if (requirements.requireSpecialChars) {
      const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.exec(cleanPassword);
      const specialCharCount = (cleanPassword.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
      
      if (specialCharCount < requirements.minSpecialChars) {
        errors.push(`Password must contain at least ${requirements.minSpecialChars} special character(s)`);
      } else {
        score += 1;
        feedback.push('✓ Contains special characters');
      }
    }

    // Check for excessive repeating characters
    if (requirements.maxRepeatingChars > 0) {
      const repeatingPattern = new RegExp(`(.)\\1{${requirements.maxRepeatingChars},}`, 'i');
      if (repeatingPattern.test(cleanPassword)) {
        errors.push(`Password cannot have more than ${requirements.maxRepeatingChars} repeating characters`);
        score -= 1;
      } else {
        feedback.push('✓ No excessive character repetition');
      }
    }

    // Check against common passwords
    if (requirements.preventCommonPasswords) {
      const lowerPassword = cleanPassword.toLowerCase();
      if (COMMON_PASSWORDS.includes(lowerPassword)) {
        errors.push('Password is too common and easily guessable');
        score -= 2;
      } else if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
        errors.push('Password contains common words that make it easier to guess');
        score -= 1;
      } else {
        feedback.push('✓ Not a common password');
      }
    }

    // Check against user information
    if (requirements.preventUserInfo && userInfo) {
      const lowerPassword = cleanPassword.toLowerCase();
      const userFields = [
        userInfo.name?.toLowerCase(),
        userInfo.email?.toLowerCase().split('@')[0],
        userInfo.username?.toLowerCase(),
        userInfo.department?.toLowerCase()
      ].filter(Boolean);

      const containsUserInfo = userFields.some(field => 
        field && (lowerPassword.includes(field) || field.includes(lowerPassword))
      );

      if (containsUserInfo) {
        errors.push('Password cannot contain your personal information');
        score -= 1;
      } else {
        feedback.push('✓ Does not contain personal information');
      }
    }

    // Additional strength checks
    const hasVariedCharacters = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(cleanPassword);
    if (hasVariedCharacters && cleanPassword.length >= 12) {
      score += 1;
      feedback.push('✓ Good character variety and length');
    }

    // Check for keyboard patterns
    const keyboardPatterns = [
      'qwerty', 'asdf', 'zxcv', '1234', 'abcd', 'qwertyuiop',
      'asdfghjkl', 'zxcvbnm', '123456789', 'abcdefgh'
    ];
    const hasKeyboardPattern = keyboardPatterns.some(pattern => 
      cleanPassword.toLowerCase().includes(pattern)
    );
    if (hasKeyboardPattern) {
      errors.push('Password contains keyboard patterns that are easy to guess');
      score -= 1;
    }

    // Calculate final strength
    const maxScore = 7; // Maximum possible score
    const normalizedScore = Math.max(0, Math.min(maxScore, score));
    const strengthPercentage = (normalizedScore / maxScore) * 100;

    let strength: PasswordStrength;
    let strengthText: string;
    let strengthColor: string;
    let estimatedCrackTime: string;

    if (normalizedScore <= 1) {
      strength = PasswordStrength.VERY_WEAK;
      strengthText = 'Very Weak';
      strengthColor = '#dc2626'; // red-600
      estimatedCrackTime = 'Instantly';
    } else if (normalizedScore <= 2) {
      strength = PasswordStrength.WEAK;
      strengthText = 'Weak';
      strengthColor = '#ea580c'; // orange-600
      estimatedCrackTime = 'Minutes';
    } else if (normalizedScore <= 3) {
      strength = PasswordStrength.FAIR;
      strengthText = 'Fair';
      strengthColor = '#d97706'; // amber-600
      estimatedCrackTime = 'Hours';
    } else if (normalizedScore <= 4) {
      strength = PasswordStrength.GOOD;
      strengthText = 'Good';
      strengthColor = '#16a34a'; // green-600
      estimatedCrackTime = 'Days';
    } else if (normalizedScore <= 5) {
      strength = PasswordStrength.STRONG;
      strengthText = 'Strong';
      strengthColor = '#059669'; // emerald-600
      estimatedCrackTime = 'Years';
    } else {
      strength = PasswordStrength.VERY_STRONG;
      strengthText = 'Very Strong';
      strengthColor = '#0d9488'; // teal-600
      estimatedCrackTime = 'Centuries';
    }

    // Add additional feedback for improvement
    if (errors.length === 0 && strength < PasswordStrength.GOOD) {
      if (cleanPassword.length < 12) {
        feedback.push('💡 Consider using 12+ characters for better security');
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(cleanPassword)) {
        feedback.push('💡 Add special characters for stronger security');
      }
    }

    return {
      isValid: errors.length === 0 && strength >= PasswordStrength.FAIR,
      strength,
      score: normalizedScore,
      feedback,
      errors,
      strengthText,
      strengthColor,
      strengthPercentage,
      estimatedCrackTime,
    };
  }

  /**
   * Validate password confirmation match
   */
  static validatePasswordConfirmation(
    password: string,
    confirmPassword: string
  ): { isValid: boolean; error?: string } {
    if (!password || !confirmPassword) {
      return {
        isValid: false,
        error: 'Both password fields are required',
      };
    }

    if (password !== confirmPassword) {
      return {
        isValid: false,
        error: 'Passwords do not match',
      };
    }

    return { isValid: true };
  }

  /**
   * Generate a secure password suggestion
   */
  static generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + specials;
    
    let password = '';
    
    // Ensure at least one of each required type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specials[Math.floor(Math.random() * specials.length)];
    
    // Fill remaining length with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Check if password needs to be changed (age-based)
   */
  static shouldChangePassword(lastChanged: Date, maxAgeMonths: number = 6): boolean {
    const now = new Date();
    const monthsOld = (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsOld >= maxAgeMonths;
  }

  /**
   * Get password strength indicator for UI
   */
  static getStrengthIndicator(strength: PasswordStrength): {
    bars: number;
    color: string;
    text: string;
  } {
    switch (strength) {
      case PasswordStrength.VERY_WEAK:
        return { bars: 1, color: '#dc2626', text: 'Very Weak' };
      case PasswordStrength.WEAK:
        return { bars: 2, color: '#ea580c', text: 'Weak' };
      case PasswordStrength.FAIR:
        return { bars: 3, color: '#d97706', text: 'Fair' };
      case PasswordStrength.GOOD:
        return { bars: 4, color: '#16a34a', text: 'Good' };
      case PasswordStrength.STRONG:
        return { bars: 5, color: '#059669', text: 'Strong' };
      case PasswordStrength.VERY_STRONG:
        return { bars: 6, color: '#0d9488', text: 'Very Strong' };
      default:
        return { bars: 0, color: '#6b7280', text: 'Unknown' };
    }
  }
}

// React hook for password validation
export function usePasswordValidation(userInfo?: UserInfo) {
  const validatePassword = (password: string) => 
    PasswordValidator.validatePassword(password, userInfo);
  
  const validateConfirmation = (password: string, confirmPassword: string) =>
    PasswordValidator.validatePasswordConfirmation(password, confirmPassword);
  
  const generatePassword = (length?: number) =>
    PasswordValidator.generateSecurePassword(length);

  return {
    validatePassword,
    validateConfirmation,
    generatePassword,
    getStrengthIndicator: PasswordValidator.getStrengthIndicator,
  };
}