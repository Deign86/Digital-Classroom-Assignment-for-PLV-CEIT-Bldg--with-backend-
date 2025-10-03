// Form Validation Hook with Real-time Feedback
import { useState, useCallback, useEffect } from 'react';
import { ValidationResult, validateInput } from '../utils/clientValidation';

export interface FieldValidation {
  validator: (value: string) => ValidationResult;
  required?: boolean;
  validateOnChange?: boolean;
}

export interface ValidationState {
  [key: string]: {
    error?: string;
    isValid: boolean;
    touched: boolean;
  };
}

export interface UseFormValidationResult {
  validationState: ValidationState;
  validateField: (name: string, value: string) => boolean;
  validateAllFields: (formData: Record<string, string>) => boolean;
  clearErrors: () => void;
  markFieldTouched: (name: string) => void;
  isFormValid: boolean;
  getFieldProps: (name: string) => {
    onBlur: () => void;
    onChange: (value: string) => void;
    error?: string;
    isInvalid: boolean;
  };
}

export function useFormValidation(
  validationRules: Record<string, FieldValidation>
): UseFormValidationResult {
  const [validationState, setValidationState] = useState<ValidationState>(() => {
    const initialState: ValidationState = {};
    for (const fieldName of Object.keys(validationRules)) {
      initialState[fieldName] = {
        isValid: !validationRules[fieldName].required,
        touched: false
      };
    }
    return initialState;
  });

  const validateField = useCallback((name: string, value: string): boolean => {
    const rule = validationRules[name];
    if (!rule) return true;

    const result = validateInput(value, rule.validator);
    
    setValidationState(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        error: result.error,
        isValid: result.isValid
      }
    }));

    return result.isValid;
  }, [validationRules]);

  const validateAllFields = useCallback((formData: Record<string, string>): boolean => {
    let isFormValid = true;
    const newValidationState = { ...validationState };

    for (const [fieldName, rule] of Object.entries(validationRules)) {
      const value = formData[fieldName] || '';
      const result = validateInput(value, rule.validator);
      
      newValidationState[fieldName] = {
        ...newValidationState[fieldName],
        error: result.error,
        isValid: result.isValid,
        touched: true
      };

      if (!result.isValid) {
        isFormValid = false;
      }
    }

    setValidationState(newValidationState);
    return isFormValid;
  }, [validationRules, validationState]);

  const clearErrors = useCallback(() => {
    setValidationState(prev => {
      const cleared: ValidationState = {};
      for (const [fieldName, rule] of Object.entries(validationRules)) {
        cleared[fieldName] = {
          isValid: !rule.required,
          touched: false
        };
      }
      return cleared;
    });
  }, [validationRules]);

  const markFieldTouched = useCallback((name: string) => {
    setValidationState(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        touched: true
      }
    }));
  }, []);

  const getFieldProps = useCallback((name: string) => ({
    onBlur: () => markFieldTouched(name),
    onChange: (value: string) => {
      const rule = validationRules[name];
      if (rule?.validateOnChange) {
        validateField(name, value);
      }
    },
    error: validationState[name]?.touched ? validationState[name]?.error : undefined,
    isInvalid: validationState[name]?.touched && !validationState[name]?.isValid
  }), [validationState, validationRules, validateField, markFieldTouched]);

  const isFormValid = Object.values(validationState).every(field => field.isValid);

  return {
    validationState,
    validateField,
    validateAllFields,
    clearErrors,
    markFieldTouched,
    isFormValid,
    getFieldProps
  };
}