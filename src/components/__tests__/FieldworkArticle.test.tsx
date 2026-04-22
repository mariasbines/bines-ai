import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock MdxBody to keep test synchronous + decouple from @mdx-js/mdx.
vi.mock('../MdxBody', () => ({
  MdxBody: ({ source }: { source: string }) => (
    <div data-testid="mdx-body">{source}</div>
  ),
}));

import { FieldworkArticle } from '../FieldworkArticle';
import type { Fieldwork } from '@/lib/content/types';

const piece: Fieldwork = {
  frontmatter: {
    id: 3,
    slug: '03-foo',
    title: 'Foo Bar',
    published: '2026-04-22',
    status: 'in-rotation',
    tags: ['memory'],
    media: { readMinutes: 5 },
    pushback: { count: 0 },
    excerpt: 'ex',
  } as Fieldwork['frontmatter'],
  body: 'Body content',
  filePath: '',
};

describe('<FieldworkArticle>', () => {
  it('renders an h1 with the piece title', () => {
    render(<FieldworkArticle piece={piece} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Foo Bar');
  });
  it('wraps in <article>', () => {
    const { container } = render(<FieldworkArticle piece={piece} />);
    expect(container.querySelector('article')).toBeInTheDocument();
  });
  it('renders the video-loop placeholder', () => {
    render(<FieldworkArticle piece={piece} />);
    expect(screen.getByLabelText(/Video loop placeholder/)).toBeInTheDocument();
  });
  it('shows retired banner for retired pieces', () => {
    render(
      <FieldworkArticle
        piece={{
          ...piece,
          frontmatter: {
            ...piece.frontmatter,
            status: 'retired-still-right',
          } as Fieldwork['frontmatter'],
        }}
      />,
    );
    expect(screen.getByText(/retired —/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see archive/ })).toHaveAttribute(
      'href',
      '/archive',
    );
  });
  it('renders the MDX body via MdxBody', () => {
    render(<FieldworkArticle piece={piece} />);
    expect(screen.getByTestId('mdx-body')).toHaveTextContent('Body content');
  });
});
