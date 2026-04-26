import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PullQuote } from '../PullQuote';

describe('<PullQuote>', () => {
  it('renders as <blockquote>', () => {
    const { container } = render(<PullQuote>Test</PullQuote>);
    expect(container.querySelector('blockquote')).toBeInTheDocument();
  });
  it('renders children', () => {
    render(<PullQuote>The intention is not the thing.</PullQuote>);
    expect(screen.getByText(/The intention is not the thing/)).toBeInTheDocument();
  });
});
