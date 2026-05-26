import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('../GalleryPanel', () => ({
  GalleryPanel: ({
    piece,
    priority,
  }: {
    piece: { frontmatter: { slug: string; title: string } };
    priority: boolean;
  }) => (
    <div
      data-testid="gallery-panel"
      data-slug={piece.frontmatter.slug}
      data-priority={priority ? '1' : '0'}
    >
      {piece.frontmatter.title}
    </div>
  ),
}));

import { Gallery } from '../Gallery';
import type { Fieldwork } from '@/lib/content/types';

function makePiece(slug: string, title: string): Fieldwork {
  return {
    frontmatter: {
      id: 1,
      slug,
      title,
      published: '2026-04-22',
      status: 'in-rotation',
      tags: ['ai'],
      media: {
        readMinutes: 5,
        headerVideo: `/media/${slug}/h.mp4`,
        posterFrame: `/media/${slug}/p.jpg`,
      },
      pushback: { count: 0 },
      excerpt: 'ex',
    } as Fieldwork['frontmatter'],
    body: '',
    filePath: '',
    pushback: { count: 0, landed: 0, excerpts: [] },
  };
}

describe('<Gallery>', () => {
  it('renders one panel per piece in the given order', () => {
    const pieces = [
      makePiece('a', 'Alpha'),
      makePiece('b', 'Beta'),
      makePiece('c', 'Gamma'),
    ];
    render(<Gallery pieces={pieces} />);
    const panels = screen.getAllByTestId('gallery-panel');
    expect(panels).toHaveLength(3);
    expect(panels[0]).toHaveAttribute('data-slug', 'a');
    expect(panels[1]).toHaveAttribute('data-slug', 'b');
    expect(panels[2]).toHaveAttribute('data-slug', 'c');
  });

  it('passes priority=true only to the first panel', () => {
    render(
      <Gallery
        pieces={[makePiece('a', 'A'), makePiece('b', 'B'), makePiece('c', 'C')]}
      />,
    );
    const panels = screen.getAllByTestId('gallery-panel');
    expect(panels[0]).toHaveAttribute('data-priority', '1');
    expect(panels[1]).toHaveAttribute('data-priority', '0');
    expect(panels[2]).toHaveAttribute('data-priority', '0');
  });

  it('renders the scroll affordance glyph', () => {
    render(<Gallery pieces={[makePiece('a', 'A')]} />);
    const affordance = screen.getByTestId('gallery-affordance');
    expect(affordance.textContent).toContain('←');
    expect(affordance.textContent).toContain('→');
  });

  it('renders empty-state copy when pieces is empty', () => {
    render(<Gallery pieces={[]} />);
    expect(
      screen.getByText(/nothing in the gallery yet/i),
    ).toBeInTheDocument();
  });

  it('container has region semantics and tabIndex=0 for keyboard focus', () => {
    render(<Gallery pieces={[makePiece('a', 'A')]} />);
    const region = screen.getByTestId('gallery');
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('aria-label', 'Fieldwork gallery, horizontal scroll');
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('ArrowRight key on the container calls scrollBy with positive clientWidth', () => {
    render(
      <Gallery pieces={[makePiece('a', 'A'), makePiece('b', 'B')]} />,
    );
    const region = screen.getByTestId('gallery');
    const scrollBySpy = vi.fn();
    Object.defineProperty(region, 'scrollBy', { value: scrollBySpy, configurable: true });
    Object.defineProperty(region, 'clientWidth', { value: 1024, configurable: true });
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(scrollBySpy).toHaveBeenCalledWith({ left: 1024, behavior: 'smooth' });
  });

  it('ArrowLeft key on the container calls scrollBy with negative clientWidth', () => {
    render(
      <Gallery pieces={[makePiece('a', 'A'), makePiece('b', 'B')]} />,
    );
    const region = screen.getByTestId('gallery');
    const scrollBySpy = vi.fn();
    Object.defineProperty(region, 'scrollBy', { value: scrollBySpy, configurable: true });
    Object.defineProperty(region, 'clientWidth', { value: 800, configurable: true });
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(scrollBySpy).toHaveBeenCalledWith({ left: -800, behavior: 'smooth' });
  });

  it('does not call scrollBy for non-arrow keys', () => {
    render(
      <Gallery pieces={[makePiece('a', 'A'), makePiece('b', 'B')]} />,
    );
    const region = screen.getByTestId('gallery');
    const scrollBySpy = vi.fn();
    Object.defineProperty(region, 'scrollBy', { value: scrollBySpy, configurable: true });
    fireEvent.keyDown(region, { key: 'Enter' });
    fireEvent.keyDown(region, { key: ' ' });
    fireEvent.keyDown(region, { key: 'Tab' });
    expect(scrollBySpy).not.toHaveBeenCalled();
  });
});
