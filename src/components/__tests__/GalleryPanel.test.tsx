import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../VideoLoop', () => ({
  VideoLoop: ({
    alt,
    priority,
    pauseWhenOffscreen,
  }: {
    alt: string;
    priority?: boolean;
    pauseWhenOffscreen?: boolean;
  }) => (
    <div
      data-testid="video-loop"
      data-priority={priority ? '1' : '0'}
      data-pause-when-offscreen={pauseWhenOffscreen ? '1' : '0'}
    >
      {alt}
    </div>
  ),
}));

import { GalleryPanel } from '../GalleryPanel';
import type { Fieldwork } from '@/lib/content/types';

function makePiece(overrides: Partial<Fieldwork['frontmatter']> = {}): Fieldwork {
  return {
    frontmatter: {
      id: 8,
      slug: '08-both-desks',
      title: 'Precursor',
      published: '2026-05-26',
      status: 'in-rotation',
      tags: ['ai'],
      media: {
        readMinutes: 5,
        headerVideo: '/media/fw08/header.mp4',
        posterFrame: '/media/fw08/poster.jpg',
      },
      pushback: { count: 0 },
      excerpt: 'ex',
      accent: 'emerald',
      ...overrides,
    } as Fieldwork['frontmatter'],
    body: '',
    filePath: '',
    pushback: { count: 0, landed: 0, excerpts: [] },
  };
}

describe('<GalleryPanel>', () => {
  it('renders the piece title in the caption and the padded fieldwork id', () => {
    render(<GalleryPanel piece={makePiece()} priority={false} />);
    expect(screen.getByText('Precursor')).toBeInTheDocument();
    expect(screen.getByText('fieldwork 08')).toBeInTheDocument();
  });

  it('wraps the panel in a link to the source fieldwork piece', () => {
    render(<GalleryPanel piece={makePiece()} priority={false} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/fieldwork/08-both-desks');
  });

  it('sets the --color-accent CSS variable from the piece accent', () => {
    const { container } = render(<GalleryPanel piece={makePiece()} priority={false} />);
    const panel = container.querySelector('article');
    expect(panel).not.toBeNull();
    const inlineStyle = panel?.getAttribute('style') ?? '';
    expect(inlineStyle).toContain('--color-accent');
    expect(inlineStyle).toContain('emerald');
  });

  it('passes priority and pauseWhenOffscreen=true to the underlying VideoLoop', () => {
    render(<GalleryPanel piece={makePiece()} priority />);
    const vl = screen.getByTestId('video-loop');
    expect(vl).toHaveAttribute('data-priority', '1');
    expect(vl).toHaveAttribute('data-pause-when-offscreen', '1');
  });

  it('renders the scrim element above the caption', () => {
    render(<GalleryPanel piece={makePiece()} priority={false} />);
    expect(screen.getByTestId('gallery-panel-scrim')).toBeInTheDocument();
  });

  it('renders the first-panel right-edge affordance only when priority is true', () => {
    const { rerender, queryByTestId } = render(
      <GalleryPanel piece={makePiece()} priority={false} />,
    );
    expect(queryByTestId('gallery-panel-affordance')).toBeNull();
    rerender(<GalleryPanel piece={makePiece()} priority />);
    expect(queryByTestId('gallery-panel-affordance')).not.toBeNull();
  });

  it('returns null and warns when media.headerVideo is missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(
      <GalleryPanel
        piece={makePiece({
          media: { readMinutes: 5, posterFrame: '/media/fw08/poster.jpg' },
        })}
        priority={false}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('returns null and warns when media.posterFrame is missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(
      <GalleryPanel
        piece={makePiece({
          media: { readMinutes: 5, headerVideo: '/media/fw08/header.mp4' },
        })}
        priority={false}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
