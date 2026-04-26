import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrentlyStrip } from '../CurrentlyStrip';

describe('<CurrentlyStrip>', () => {
  // Use local-time Date constructor (month is 0-indexed, so 3 = April).
  // Avoids timezone-dependent assertion failure on CI runners west of UTC —
  // Intl.DateTimeFormat('en-GB', ...) formats in local tz; a UTC-midnight ISO
  // string would render as the prior day anywhere non-UTC.
  const props = {
    currently: 'test thought',
    stats: { fieldwork: 4, postcards: 12, changedMyMind: 1 },
    updated: new Date(2026, 3, 22),
  };

  it('renders the current thought', () => {
    render(<CurrentlyStrip {...props} />);
    expect(screen.getByText('test thought')).toBeInTheDocument();
  });

  it('renders each count next to its label', () => {
    render(<CurrentlyStrip {...props} />);
    const stripText = screen.getByLabelText('Current state of the site').textContent ?? '';
    expect(stripText).toMatch(/4\s+fieldwork/);
    expect(stripText).toMatch(/12\s+postcards/);
    expect(stripText).toMatch(/1\s+changed my mind/);
    expect(stripText).toMatch(/updated 22 Apr 2026/);
  });

  it('links each count label to its index page', () => {
    render(<CurrentlyStrip {...props} />);
    expect(screen.getByRole('link', { name: 'fieldwork' })).toHaveAttribute('href', '/fieldwork');
    expect(screen.getByRole('link', { name: 'postcards' })).toHaveAttribute('href', '/postcards');
    expect(screen.getByRole('link', { name: 'changed my mind' })).toHaveAttribute(
      'href',
      '/changed-my-mind',
    );
  });
});
