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
  it('renders the formatted stats line', () => {
    render(<CurrentlyStrip {...props} />);
    expect(
      screen.getByText(/4 fieldwork · 12 postcards · 1 changed my mind · updated 22 Apr 2026/),
    ).toBeInTheDocument();
  });
});
