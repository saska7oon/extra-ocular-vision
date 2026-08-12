/**
 * SkipLink component — a visually-hidden link that appears on keyboard focus,
 * allowing screen-reader and keyboard users to skip to a target element.
 */

import { type AnchorHTMLAttributes } from 'react';
import { clsx } from '../utils/clsx';

export interface SkipLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The href to skip to (e.g. "#main-content"). */
  href: string;
  /** Visible label (read by screen readers). */
  children: React.ReactNode;
}

const SkipLink = ({ href, children, className }: SkipLinkProps) => {
  return (
    <a href={href} className={clsx('skip-link', className)} tabIndex={-1}>
      {children}
    </a>
  );
};

export default SkipLink;
