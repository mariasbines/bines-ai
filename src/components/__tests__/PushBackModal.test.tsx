import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

import { PushBackModal } from '../PushBackModal';

describe('<PushBackModal>', () => {
  const defaultProps = {
    open: false,
    onClose: vi.fn(),
    slug: '01-test',
    title: 'Test',
  };

  it('renders a dialog with aria-label', () => {
    const { container } = render(<PushBackModal {...defaultProps} open />);
    const dialog = container.querySelector('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Push back on Test');
  });

  it('renders the privacy notice', () => {
    render(<PushBackModal {...defaultProps} open />);
    expect(screen.getByText(/no email, no newsletter/i)).toBeInTheDocument();
  });

  it('renders the character counter', () => {
    render(<PushBackModal {...defaultProps} open />);
    expect(screen.getByText(/0 \/ 2000/)).toBeInTheDocument();
  });

  it('disables submit button when message too short', () => {
    render(<PushBackModal {...defaultProps} open />);
    const btn = screen.getByRole('button', { name: /send/i });
    expect(btn).toBeDisabled();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<PushBackModal {...defaultProps} open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an error when fetch returns 429', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response('{}', { status: 429 })),
    ) as unknown as typeof fetch;
    render(<PushBackModal {...defaultProps} open />);
    const textarea = screen.getByPlaceholderText(/tell me what you disagree/i);
    fireEvent.change(textarea, { target: { value: 'At least ten characters of pushback here.' } });
    const btn = screen.getByRole('button', { name: /send/i });
    fireEvent.click(btn);
    // Wait for the microtask chain
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert').textContent).toMatch(/steady on/i);
  });
});
