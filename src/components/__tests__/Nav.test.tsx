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
  it('includes the Gallery entry between Postcards and Changed my mind', () => {
    render(<Nav />);
    const gallery = screen.getByRole('link', { name: 'Gallery' });
    expect(gallery).toBeInTheDocument();
    expect(gallery).toHaveAttribute('href', '/gallery');

    const labels = NAV.filter((n) => !n.hideInMainNav).map((n) => n.label);
    const postcardsIdx = labels.indexOf('Postcards');
    const galleryIdx = labels.indexOf('Gallery');
    const cmmIdx = labels.indexOf('Changed my mind');
    expect(postcardsIdx).toBeGreaterThanOrEqual(0);
    expect(galleryIdx).toBe(postcardsIdx + 1);
    expect(cmmIdx).toBe(galleryIdx + 1);
  });
});
