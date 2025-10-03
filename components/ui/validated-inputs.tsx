// Enhanced Input Components with Validation
import React, { forwardRef, useState } from 'react';
import { Input } from './input';
import { Textarea } from './textarea';
import { Label } from './label';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { cn } from './utils';

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isInvalid?: boolean;
  showValidation?: boolean;
  helperText?: string;
}

export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ label, error, isInvalid, showValidation = true, helperText, className, ...props }, ref) => {
    const hasError = isInvalid && error;
    const isValid = showValidation && !isInvalid && props.value && String(props.value).length > 0;

    return (
      <div className="space-y-2">
        {label && (
          <Label 
            htmlFor={props.id} 
            className={cn(hasError && "text-red-600")}
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        <div className="relative">
          <Input
            ref={ref}
            className={cn(
              className,
              hasError && "border-red-500 focus:ring-red-500 focus:border-red-500",
              isValid && "border-green-500 focus:ring-green-500 focus:border-green-500"
            )}
            {...props}
          />
          
          {showValidation && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {hasError && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              {isValid && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>
          )}
        </div>
        
        {hasError && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        
        {helperText && !hasError && (
          <p className="text-sm text-gray-600">{helperText}</p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  isInvalid?: boolean;
  showValidation?: boolean;
  helperText?: string;
  maxLength?: number;
}

export const ValidatedTextarea = forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  ({ label, error, isInvalid, showValidation = true, helperText, maxLength, className, ...props }, ref) => {
    const hasError = isInvalid && error;
    const isValid = showValidation && !isInvalid && props.value && String(props.value).length > 0;
    const currentLength = props.value ? String(props.value).length : 0;

    return (
      <div className="space-y-2">
        {label && (
          <Label 
            htmlFor={props.id} 
            className={cn(hasError && "text-red-600")}
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        <div className="relative">
          <Textarea
            ref={ref}
            className={cn(
              className,
              hasError && "border-red-500 focus:ring-red-500 focus:border-red-500",
              isValid && "border-green-500 focus:ring-green-500 focus:border-green-500"
            )}
            {...props}
          />
          
          {maxLength && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              {currentLength}/{maxLength}
            </div>
          )}
        </div>
        
        {hasError && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        
        {helperText && !hasError && (
          <p className="text-sm text-gray-600">{helperText}</p>
        )}
      </div>
    );
  }
);

ValidatedTextarea.displayName = "ValidatedTextarea";

interface ValidatedPasswordInputProps extends Omit<ValidatedInputProps, 'type'> {
  showStrengthIndicator?: boolean;
}

export const ValidatedPasswordInput = forwardRef<HTMLInputElement, ValidatedPasswordInputProps>(
  ({ showStrengthIndicator = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const password = String(props.value || '');

    const getPasswordStrength = (password: string) => {
      let score = 0;
      const checks = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        numbers: /\d/.test(password),
        symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
      };

      score = Object.values(checks).filter(Boolean).length;

      if (score < 2) return { label: 'Very Weak', color: 'bg-red-500', width: '20%' };
      if (score < 3) return { label: 'Weak', color: 'bg-orange-500', width: '40%' };
      if (score < 4) return { label: 'Fair', color: 'bg-yellow-500', width: '60%' };
      if (score < 5) return { label: 'Good', color: 'bg-blue-500', width: '80%' };
      return { label: 'Strong', color: 'bg-green-500', width: '100%' };
    };

    const strength = getPasswordStrength(password);

    return (
      <div className="space-y-2">
        <div className="relative">
          <ValidatedInput
            ref={ref}
            type={showPassword ? "text" : "password"}
            showValidation={false}
            {...props}
          />
          
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>

        {showStrengthIndicator && password.length > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Password Strength:</span>
              <span className={cn("text-xs font-medium", {
                'text-red-600': strength.label === 'Very Weak' || strength.label === 'Weak',
                'text-yellow-600': strength.label === 'Fair',
                'text-blue-600': strength.label === 'Good',
                'text-green-600': strength.label === 'Strong'
              })}>
                {strength.label}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={cn("h-2 rounded-full transition-all duration-300", strength.color)}
                style={{ width: strength.width }}
              />
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Password must contain:</div>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li className={password.length >= 8 ? 'text-green-600' : 'text-gray-600'}>
                  At least 8 characters
                </li>
                <li className={/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-600'}>
                  One lowercase letter
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-600'}>
                  One uppercase letter
                </li>
                <li className={/\d/.test(password) ? 'text-green-600' : 'text-gray-600'}>
                  One number
                </li>
                <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-600' : 'text-gray-600'}>
                  One special character
                </li>
              </ul>
            </div>
          </div>
        )}

        {props.error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {props.error}
          </p>
        )}
      </div>
    );
  }
);

ValidatedPasswordInput.displayName = "ValidatedPasswordInput";