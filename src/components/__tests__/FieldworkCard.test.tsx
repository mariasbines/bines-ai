import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  it('renders all three CTA elements', () => {
    render(<FieldworkCard piece={piece} />);
    expect(screen.getByRole('button', { name: /watch/i })).toBeDisabled();
    // [ read ] is a Link, not a button
    expect(screen.getByRole('link', { name: /\[ read \]/ })).toHaveAttribute(
      'href',
      '/fieldwork/01-best-thing',
    );
    expect(screen.getByRole('button', { name: /push back/i })).toBeDisabled();
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
