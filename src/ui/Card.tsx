/**
 * Card component — semantic <article> or <section> with consistent padding
 * and theming. Supports multiple visual variants.
 */

import { type HTMLAttributes } from 'react';
import { clsx } from '../utils/clsx';

export type CardVariant = 'default' | 'glass' | 'gradient' | 'accent';
export type CardSize = 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Whether to use <article> (default <section>). */
  asArticle?: boolean;
  /** Whether the card is interactive (adds hover/focus states). */
  interactive?: boolean;
  /** Visual variant. */
  variant?: CardVariant;
  /** Size variant. */
  size?: CardSize;
}

const Card = ({
  asArticle = false,
  interactive = false,
  variant = 'default',
  size = 'md',
  className,
  children,
  ...rest
}: CardProps) => {
  const Tag = asArticle ? 'article' : 'section';
  return (
    <Tag
      className={clsx(
        'card',
        `card-${size}`,
        `card-${variant}`,
        { 'is-interactive': interactive },
        className
      )}
      data-interactive={interactive || undefined}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Card;