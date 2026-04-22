import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../ChatInput';

describe('<ChatInput>', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    onAbort: vi.fn(),
    disabled: false,
    streaming: false,
  };

  it('renders a textarea with the accessible label', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByLabelText('Your message')).toBeInTheDocument();
  });

  it('shows the [ push back ] button label when idle', () => {
    render(<ChatInput {...defaultProps} value="hi" />);
    expect(screen.getByRole('button')).toHaveTextContent('[ push back ]');
  });

  it('shows the streaming label while streaming', () => {
    render(<ChatInput {...defaultProps} streaming value="hi" />);
    expect(screen.getByRole('button')).toHaveTextContent(/streaming/);
  });

  it('disables button when value is empty', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('Enter submits (onSubmit called)', () => {
    const onSubmit = vi.fn();
    render(<ChatInput {...defaultProps} onSubmit={onSubmit} value="hi" />);
    const ta = screen.getByLabelText('Your message');
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false });
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('Shift+Enter does NOT submit', () => {
    const onSubmit = vi.fn();
    render(<ChatInput {...defaultProps} onSubmit={onSubmit} value="hi" />);
    const ta = screen.getByLabelText('Your message');
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Escape calls onAbort when streaming', () => {
    const onAbort = vi.fn();
    render(<ChatInput {...defaultProps} onAbort={onAbort} streaming />);
    const ta = screen.getByLabelText('Your message');
    fireEvent.keyDown(ta, { key: 'Escape' });
    expect(onAbort).toHaveBeenCalledOnce();
  });

  it('Escape does NOT call onAbort when not streaming', () => {
    const onAbort = vi.fn();
    render(<ChatInput {...defaultProps} onAbort={onAbort} />);
    const ta = screen.getByLabelText('Your message');
    fireEvent.keyDown(ta, { key: 'Escape' });
    expect(onAbort).not.toHaveBeenCalled();
  });
});
