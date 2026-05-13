import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FieldworkCard } from '../FieldworkCard';
import type { Fieldwork } from '@/lib/content/types';

const piece: Fieldwork = {
  frontmatter: {
    id: 1,
    slug: '01-best-thing',
    title: 'The best thing',
    published: '2026-04-22',
    status: 'in-rotation',
    tags: ['memory'],
    media: { readMinutes: 5 },
    pushback: { count: 0 },
    excerpt: 'ex',
    accent: 'emerald',
  } as Fieldwork['frontmatter'],
  body: '',
  filePath: '',
  pushback: { count: 0, landed: 0, excerpts: [] },
};

describe('<FieldworkCard>', () => {
  it('renders the FIELDWORK 01 label and in-rotation status', () => {
    render(<FieldworkCard piece={piece} />);
    expect(screen.getByText(/fieldwork 01/i)).toBeInTheDocument();
    expect(screen.getByText('in rotation')).toBeInTheDocument();
  });
  it('zero-pads the id', () => {
    render(
      <FieldworkCard
        piece={{ ...piece, frontmatter: { ...piece.frontmatter, id: 7 } }}
      />,
    );
    expect(screen.getByText(/fieldwork 07/i)).toBeInTheDocument();
  });
  it('links the title to /fieldwork/<slug>', () => {
    render(<FieldworkCard piece={piece} />);
    const link = screen.getByRole('link', { name: /The best thing/ });
    expect(link).toHaveAttribute('href', '/fieldwork/01-best-thing');
  });
  it('renders no CTAs when there is no testimonial — title is the primary affordance', () => {
    render(<FieldworkCard piece={piece} />);
    expect(screen.queryByRole('button', { name: /watch/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /read/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /push back/i })).not.toBeInTheDocument();
  });
  it('sets --color-accent on the article root', () => {
    const { container } = render(<FieldworkCard piece={piece} />);
    const article = container.querySelector('article');
    const style = article?.getAttribute('style') ?? '';
    expect(style).toContain('--color-accent');
    expect(style).toContain('var(--color-emerald)');
  });
  it('renders retired-still-right status label', () => {
    const retired = {
      ...piece,
      frontmatter: { ...piece.frontmatter, status: 'retired-still-right' as const },
    };
    render(<FieldworkCard piece={retired} />);
    expect(screen.getByText('retired · still right')).toBeInTheDocument();
  });
});

// Story 003.007 — pushback count badge.
describe('<FieldworkCard> — pushback count badge (story 003.007)', () => {
  it('(a) renders NO badge when pushback.count === 0', () => {
    render(<FieldworkCard piece={piece} />);
    expect(screen.queryByTestId('pushback-badge')).not.toBeInTheDocument();
    // And there should be no text matching "pushback" + a number.
    expect(screen.queryByText(/^\d+ pushback/)).not.toBeInTheDocument();
  });

  it('(b) renders "1 pushback" (singular) when count === 1', () => {
    const one: Fieldwork = {
      ...piece,
      pushback: { count: 1, landed: 0, excerpts: [] },
    };
    render(<FieldworkCard piece={one} />);
    const badge = screen.getByTestId('pushback-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('1 pushback');
  });

  it('(c) renders "5 pushbacks" (plural) when count === 5', () => {
    const many: Fieldwork = {
      ...piece,
      pushback: { count: 5, landed: 2, excerpts: ['a', 'b', 'c'] },
    };
    render(<FieldworkCard piece={many} />);
    const badge = screen.getByTestId('pushback-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('5 pushbacks');
  });

  it('(d) badge has accent class applied (inherits jewel-tone)', () => {
    const one: Fieldwork = {
      ...piece,
      pushback: { count: 2, landed: 0, excerpts: [] },
    };
    render(<FieldworkCard piece={one} />);
    const badge = screen.getByTestId('pushback-badge');
    expect(badge.className).toContain('text-accent');
  });

  it('(e) component source contains no SynapseDx palette hex values', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/FieldworkCard.tsx'),
      'utf8',
    );
    const forbidden = ['#0A0F1A', '#00D4AA', '#F26B38', '#0EA5E9'];
    for (const hex of forbidden) {
      expect(source.toUpperCase()).not.toContain(hex.toUpperCase());
    }
  });
});
