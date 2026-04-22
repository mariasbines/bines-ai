import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock window.matchMedia (jsdom doesn't implement it)
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Mock the chat client
vi.mock('@/lib/chat/client', () => ({
  postChat: vi.fn(() => Promise.resolve({ ok: true })),
}));

import { ChatInterface } from '../ChatInterface';

describe('<ChatInterface>', () => {
  it('renders with empty log and disclaimer', () => {
    render(<ChatInterface />);
    // aria-live log present
    expect(screen.getByRole('log')).toBeInTheDocument();
    // disclaimer block present
    expect(screen.getByText(/not Maria/i)).toBeInTheDocument();
    expect(screen.getByText(/push back when it does/i)).toBeInTheDocument();
  });

  it('renders the privacy note', () => {
    render(<ChatInterface />);
    expect(screen.getByText(/not stored/i)).toBeInTheDocument();
    expect(screen.getByText(/sent to Anthropic/i)).toBeInTheDocument();
  });

  it('renders the chat input with submit button', () => {
    render(<ChatInterface />);
    expect(screen.getByLabelText('Your message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /push back/i })).toBeInTheDocument();
  });
});
