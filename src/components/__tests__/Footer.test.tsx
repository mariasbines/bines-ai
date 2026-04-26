import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '../Footer';

describe('<Footer>', () => {
  it('renders the current year in the copyright', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${year} Maria Bines`))).toBeInTheDocument();
  });

  it('renders About / Privacy / Argue links', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: /argue/i })).toHaveAttribute('href', '/argue');
  });

  it('flips the year when the system clock advances to a new year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-03-14T12:00:00Z'));
    try {
      render(<Footer />);
      expect(screen.getByText(/© 2099 Maria Bines/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders the "my own work, mostly" tag', () => {
    render(<Footer />);
    expect(screen.getByText(/my own work, mostly/i)).toBeInTheDocument();
  });
});

beforeEach(() => {
  // No-op — timer mocks are scoped per-test where needed.
});

afterEach(() => {
  vi.useRealTimers();
});
