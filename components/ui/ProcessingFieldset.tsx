import React from 'react';

interface ProcessingFieldsetProps {
  isProcessing?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * ProcessingFieldset
 * - Wrap form sections that should be disabled/greyed out while an async process runs.
 * - Uses native <fieldset disabled> semantics so nested form controls are disabled.
 * - Adds a light opacity to visually indicate disabled state.
 */
export default function ProcessingFieldset({ isProcessing = false, className = '', children }: ProcessingFieldsetProps) {
  return (
    <fieldset
      disabled={!!isProcessing}
      aria-busy={!!isProcessing}
      className={`relative border-0 p-0 m-0 ${isProcessing ? 'opacity-60 pointer-events-none' : ''} ${className}`}
    >
      {children}
    </fieldset>
  );
}
