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

function renderGallery(pieces: Fieldwork[]) {
  return render(<Gallery pieces={pieces} description="Atmospheric loops." />);
}

// Drive the container's scroll geometry, then fire a scroll event so the
// component recomputes which directions are still scrollable.
function setScroll(
  region: HTMLElement,
  { scrollLeft, clientWidth, scrollWidth }: { scrollLeft: number; clientWidth: number; scrollWidth: number },
) {
  Object.defineProperty(region, 'scrollLeft', { value: scrollLeft, configurable: true });
  Object.defineProperty(region, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(region, 'scrollWidth', { value: scrollWidth, configurable: true });
  fireEvent.scroll(region);
}

describe('<Gallery>', () => {
  it('renders one panel per piece in the given order', () => {
    renderGallery([
      makePiece('a', 'Alpha'),
      makePiece('b', 'Beta'),
      makePiece('c', 'Gamma'),
    ]);
    const panels = screen.getAllByTestId('gallery-panel');
    expect(panels).toHaveLength(3);
    expect(panels[0]).toHaveAttribute('data-slug', 'a');
    expect(panels[1]).toHaveAttribute('data-slug', 'b');
    expect(panels[2]).toHaveAttribute('data-slug', 'c');
  });

  it('passes priority=true only to the first panel', () => {
    renderGallery([makePiece('a', 'A'), makePiece('b', 'B'), makePiece('c', 'C')]);
    const panels = screen.getAllByTestId('gallery-panel');
    expect(panels[0]).toHaveAttribute('data-priority', '1');
    expect(panels[1]).toHaveAttribute('data-priority', '0');
    expect(panels[2]).toHaveAttribute('data-priority', '0');
  });

  it('renders the gallery header with the title and description', () => {
    renderGallery([makePiece('a', 'A')]);
    expect(screen.getByRole('heading', { name: 'Gallery' })).toBeInTheDocument();
    expect(screen.getByText('Atmospheric loops.')).toBeInTheDocument();
  });

  it('renders labelled prev / next scroll buttons', () => {
    renderGallery([makePiece('a', 'A'), makePiece('b', 'B')]);
    expect(screen.getByTestId('gallery-prev')).toHaveAttribute('aria-label', 'Previous panel');
    expect(screen.getByTestId('gallery-next')).toHaveAttribute('aria-label', 'Next panel');
  });

  it('clicking the next button scrolls one panel-width forward', () => {
    renderGallery([makePiece('a', 'A'), makePiece('b', 'B')]);
    const region = screen.getByTestId('gallery');
    const scrollBySpy = vi.fn();
    Object.defineProperty(region, 'scrollBy', { value: scrollBySpy, configurable: true });
    // Enable the next button: there is content to the right.
    setScroll(region, { scrollLeft: 0, clientWidth: 1024, scrollWidth: 2048 });
    fireEvent.click(screen.getByTestId('gallery-next'));
    expect(scrollBySpy).toHaveBeenCalledWith({ left: 1024, behavior: 'smooth' });
  });

  it('clicking the prev button scrolls one panel-width backward', () => {
    renderGallery([makePiece('a', 'A'), makePiece('b', 'B')]);
    const region = screen.getByTestId('gallery');
    const scrollBySpy = vi.fn();
    Object.defineProperty(region, 'scrollBy', { value: scrollBySpy, configurable: true });
    // Enable the prev button: we're scrolled away from the start.
    setScroll(region, { scrollLeft: 800, clientWidth: 800, scrollWidth: 2400 });
    fireEvent.click(screen.getByTestId('gallery-prev'));
    expect(scrollBySpy).toHaveBeenCalledWith({ left: -800, behavior: 'smooth' });
  });

  it('disables the prev button at the start and enables it once scrolled', () => {
    renderGallery([makePiece('a', 'A'), makePiece('b', 'B')]);
    const region = screen.getByTestId('gallery');
    const prev = screen.getByTestId('gallery-prev');
    // At the start (scrollLeft 0) the prev button is inert.
    expect(prev).toBeDisabled();

    setScroll(region, { scrollLeft: 500, clientWidth: 1000, scrollWidth: 2000 });
    expect(prev).toBeEnabled();
  });

  it('disables the next button once scrolled to the end', () => {
    renderGallery([makePiece('a', 'A'), makePiece('b', 'B')]);
    const region = screen.getByTestId('gallery');
    const next = screen.getByTestId('gallery-next');
    // Scrolled fully right: scrollLeft === scrollWidth - clientWidth.
    setScroll(region, { scrollLeft: 1000, clientWidth: 1000, scrollWidth: 2000 });
    expect(next).toBeDisabled();
  });

  it('renders empty-state copy (and no nav buttons) when pieces is empty', () => {
    renderGallery([]);
    expect(screen.getByText(/nothing in the gallery yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('gallery-prev')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gallery-next')).not.toBeInTheDocument();
  });

  it('container has region semantics and tabIndex=0 for keyboard focus', () => {
    renderGallery([makePiece('a', 'A')]);
    const region = screen.getByTestId('gallery');
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('aria-label', 'Fieldwork gallery, horizontal scroll');
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('ArrowRight key on the container calls scrollBy with positive clientWidth', () => {
    renderGallery([makePiece('a', 'A'), makePiece('b', 'B')]);
    const region = screen.getByTestId('gallery');
    const scrollBySpy = vi.fn();
    Object.defineProperty(region, 'scrollBy', { value: scrollBySpy, configurable: true });
    Object.defineProperty(region, 'clientWidth', { value: 1024, configurable: true });
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(scrollBySpy).toHaveBeenCalledWith({ left: 1024, behavior: 'smooth' });
  });

  it('ArrowLeft key on the container calls scrollBy with negative clientWidth', () => {
    renderGallery([makePiece('a', 'A'), makePiece('b', 'B')]);
    const region = screen.getByTestId('gallery');
    const scrollBySpy = vi.fn();
    Object.defineProperty(region, 'scrollBy', { value: scrollBySpy, configurable: true });
    Object.defineProperty(region, 'clientWidth', { value: 800, configurable: true });
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(scrollBySpy).toHaveBeenCalledWith({ left: -800, behavior: 'smooth' });
  });

  it('does not call scrollBy for non-arrow keys', () => {
    renderGallery([makePiece('a', 'A'), makePiece('b', 'B')]);
    const region = screen.getByTestId('gallery');
    const scrollBySpy = vi.fn();
    Object.defineProperty(region, 'scrollBy', { value: scrollBySpy, configurable: true });
    fireEvent.keyDown(region, { key: 'Enter' });
    fireEvent.keyDown(region, { key: ' ' });
    fireEvent.keyDown(region, { key: 'Tab' });
    expect(scrollBySpy).not.toHaveBeenCalled();
  });
});
