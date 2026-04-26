import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Wordmark } from '../Wordmark';

describe('<Wordmark>', () => {
  it('renders bines.ai with an accessible label', () => {
    render(<Wordmark />);
    expect(screen.getByLabelText('bines.ai')).toBeInTheDocument();
  });
  it('renders the ruby dot separator (hidden from a11y)', () => {
    const { container } = render(<Wordmark />);
    const dot = container.querySelector('.text-ruby[aria-hidden="true"]');
    expect(dot).not.toBeNull();
    expect(dot?.textContent).toBe('.');
  });
});
