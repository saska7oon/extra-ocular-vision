/**
 * Accessible Button component.
 *
 * - Semantic <button> element
 * - Proper disabled state (aria-disabled for screen readers)
 * - Focus-visible styling
 * - Full keyboard support (Enter, Space)
 * - Variant classes for styling: primary, secondary, outline, danger
 */

import { type ButtonHTMLAttributes } from 'react';
import { clsx } from '../utils/clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant. */
  variant?: ButtonVariant;
  /** Size modifier. */
  size?: ButtonSize;
  /** Whether the button is loading (shows spinner, disables). */
  loading?: boolean;
  /** Accessible label for screen readers (when visual text differs). */
  'aria-label'?: string;
}

const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  children,
  ...rest
}: ButtonProps) => {
  const isDisabled = disabled || loading;
  const classes = clsx(
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    {
      'is-loading': loading,
      'is-disabled': isDisabled,
      'sr-only': Boolean(rest['aria-label'] && !children),
    },
    className,
  );

  return (
    <button
      type="button"
      className={classes}
      disabled={isDisabled}
      aria-busy={loading ? true : undefined}
      aria-disabled={isDisabled ? true : undefined}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
};

export default Button;
