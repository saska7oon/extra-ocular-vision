import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Button from '../../src/ui/Button';

describe('Button', () => {
  it('renders children as a semantic button', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName.toLowerCase()).toBe('button');
  });

  it('sets aria-busy and disables when loading', () => {
    render(<Button loading={true}>Saving...</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
  });

  it('sets aria-disabled when disabled', () => {
    render(<Button disabled={true}>Done</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toBeDisabled();
  });

  it('applies variant and size data attributes', () => {
    render(
      <Button variant="secondary" size="lg">
        Big
      </Button>,
    );
    const btn = screen.getByRole('button', { name: /big/i });
    expect(btn).toHaveAttribute('data-variant', 'secondary');
    expect(btn).toHaveAttribute('data-size', 'lg');
  });
});
