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
  pushback: { count: 0, landed: 0, excerpts: [] },
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

  it('does NOT render any [ read ] link — title is the primary affordance', () => {
    render(<FieldworkCardCtas piece={basePiece} />);
    expect(screen.queryByRole('link', { name: /read/i })).not.toBeInTheDocument();
  });

  it('does NOT render [ push back ] — replaced by [ argue with this ] in v2', () => {
    render(<FieldworkCardCtas piece={basePiece} />);
    expect(screen.queryByText(/push back/i)).not.toBeInTheDocument();
  });
});

// Story 003.008 — the visible "[ argue with this ]" CTA.
describe('<FieldworkCardCtas> — [ argue with this ] CTA (story 003.008)', () => {
  it('(a) renders the link on every card — even when no testimonial', () => {
    render(<FieldworkCardCtas piece={basePiece} />);
    expect(screen.getByRole('link', { name: /argue with this/i })).toBeInTheDocument();
  });

  it('renders the link on cards with a testimonial too', () => {
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
    expect(screen.getByRole('link', { name: /argue with this/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /watch/i })).toBeInTheDocument();
  });

  it('(a) href matches /argue?from=<slug> for the piece', () => {
    const piece: Fieldwork = {
      ...basePiece,
      frontmatter: {
        ...basePiece.frontmatter,
        slug: '04-singularity-different-clothes',
      } as Fieldwork['frontmatter'],
    };
    render(<FieldworkCardCtas piece={piece} />);
    const link = screen.getByRole('link', { name: /argue with this/i });
    expect(link).toHaveAttribute('href', '/argue?from=04-singularity-different-clothes');
  });

  it('(b) link text content is exactly "[ argue with this ]"', () => {
    render(<FieldworkCardCtas piece={basePiece} />);
    const link = screen.getByRole('link', { name: /argue with this/i });
    expect(link.textContent).toBe('[ argue with this ]');
  });

  it('(c) link shares border / hover classes with the sibling [ watch ] button', () => {
    // Intentionally tight class-string assertion: visual-register parity is the
    // PB2-BRD-004 mitigation point. If Tailwind classes change, update component
    // and test together.
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
    const link = screen.getByRole('link', { name: /argue with this/i });
    const watchBtn = screen.getByRole('button', { name: /watch/i });
    for (const cls of [
      'border',
      'border-ink/20',
      'text-ink/80',
      'hover:text-accent',
      'hover:border-accent',
      'transition-colors',
      'motion-reduce:transition-none',
    ]) {
      expect(link.className).toContain(cls);
      expect(watchBtn.className).toContain(cls);
    }
  });

  it('(d) the rendered DOM contains NO "[ push back ]" text anywhere (regression guard)', () => {
    const { container } = render(<FieldworkCardCtas piece={basePiece} />);
    expect(container.textContent).not.toMatch(/push back/i);
  });

  it('(e) link has motion-reduce:transition-none class', () => {
    render(<FieldworkCardCtas piece={basePiece} />);
    const link = screen.getByRole('link', { name: /argue with this/i });
    expect(link.className).toContain('motion-reduce:transition-none');
  });
});
