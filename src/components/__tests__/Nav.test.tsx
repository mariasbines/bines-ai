import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nav } from '../Nav';
import { NAV } from '@/lib/content/site';

describe('<Nav>', () => {
  it('renders one link per visible NAV item', () => {
    render(<Nav />);
    const visible = NAV.filter((n) => !n.hideInMainNav);
    for (const item of visible) {
      expect(screen.getByRole('link', { name: item.label })).toBeInTheDocument();
    }
  });
  it('does not render items flagged hideInMainNav', () => {
    render(<Nav />);
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
  });
});
