/**
 * Card component — semantic <article> or <section> with consistent padding
 * and theming.
 */

import { type HTMLAttributes } from 'react';
import { clsx } from '../utils/clsx';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Whether to use <article> (default <section>). */
  asArticle?: boolean;
  /** Whether the card is interactive (adds hover/focus states). */
  interactive?: boolean;
}

const Card = ({
  asArticle = false,
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) => {
  const Tag = asArticle ? 'article' : 'section';
  return (
    <Tag
      className={clsx('card', { 'is-interactive': interactive }, className)}
      data-interactive={interactive || undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Card;
