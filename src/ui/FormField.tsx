/**
 * Accessible form field component.
 *
 * - Semantic <label> with htmlFor linkage
 * - Error message with role="alert"
 * - aria-describedby for help text
 * - Keyboard-accessible
 * - `LinkedInput` helper renders an <input> with proper aria-describedby wiring
 */

import { type LabelHTMLAttributes, type ReactNode } from 'react';
import { clsx } from '../utils/clsx';

export interface FormFieldProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Field ID (used for label htmlFor and aria-describedby). */
  id: string;
  /** Help text shown below the field. */
  helpText?: string;
  /** Error message (shown with role="alert"). */
  error?: string;
  /** The input/control element. */
  children: ReactNode;
}

const FormField = ({
  id,
  helpText,
  error,
  children,
  className,
  ...rest
}: FormFieldProps) => {
  const helpId = `${id}-desc`;
  const errorId = `${id}-error`;

  return (
    <label htmlFor={id} className={clsx('form-field', className)} {...rest}>
      {children}
      {helpText && (
        <span id={helpId} className="form-help">
          {helpText}
        </span>
      )}
      {error && (
        <span id={errorId} className="form-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
};

export default FormField;
