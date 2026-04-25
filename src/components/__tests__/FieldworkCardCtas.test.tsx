import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock WatchDialog + VideoLoop to avoid jsdom complexity.
vi.mock('../VideoLoop', () => ({
  VideoLoop: ({ alt }: { alt: string }) => <div data-testid="video-loop">{alt}</div>,
}));
vi.mock('../WatchDialog', () => ({
  WatchDialog: ({ open, title }: { open: boolean; title: string }) =>
    open ? <div role="dialog" aria-label={title} data-testid="watch-dialog">{title}</div> : null,
}));

import { FieldworkCardCtas } from '../FieldworkCardCtas';
import type { Fieldwork } from '@/lib/content/types';

const basePiece: Fieldwork = {
  frontmatter: {
    id: 1,
    slug: 'a',
    title: 'A',
    published: '2026-04-22',
    status: 'in-rotation',
    tags: ['memory'],
    media: { readMinutes: 5 },
    pushback: { count: 0 },
    excerpt: 'ex',
  } as Fieldwork['frontmatter'],
  body: '',
  filePath: '',
};

describe('<FieldworkCardCtas>', () => {
  it('omits [ watch ] entirely when no testimonial', () => {
    render(<FieldworkCardCtas piece={basePiece} />);
    expect(screen.queryByRole('button', { name: /watch/i })).not.toBeInTheDocument();
  });

  it('renders [ watch ] when testimonial + poster are set', () => {
    const withVideo: Fieldwork = {
      ...basePiece,
      frontmatter: {
        ...basePiece.frontmatter,
        media: {
          readMinutes: 5,
          testimonial: 'https://example/t.mp4',
          posterFrame: 'https://example/p.jpg',
        },
      } as Fieldwork['frontmatter'],
    };
    render(<FieldworkCardCtas piece={withVideo} />);
    expect(screen.getByRole('button', { name: /watch/i })).toBeInTheDocument();
  });

  it('opens WatchDialog on click when testimonial present', () => {
    const withVideo: Fieldwork = {
      ...basePiece,
      frontmatter: {
        ...basePiece.frontmatter,
        media: {
          readMinutes: 5,
          testimonial: 'https://example/t.mp4',
          posterFrame: 'https://example/p.jpg',
        },
      } as Fieldwork['frontmatter'],
    };
    render(<FieldworkCardCtas piece={withVideo} />);
    expect(screen.queryByTestId('watch-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /watch/i }));
    expect(screen.getByTestId('watch-dialog')).toBeInTheDocument();
  });

  it('[ read ] link href matches slug', () => {
    render(<FieldworkCardCtas piece={basePiece} />);
    const link = screen.getByRole('link', { name: /\[ read \]/ });
    expect(link).toHaveAttribute('href', '/fieldwork/a');
  });

  it('does NOT render [ push back ] — hidden until v2 redesign ships', () => {
    render(<FieldworkCardCtas piece={basePiece} />);
    expect(screen.queryByRole('button', { name: /push back/i })).not.toBeInTheDocument();
  });
});
