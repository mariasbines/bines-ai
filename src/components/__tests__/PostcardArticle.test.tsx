import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../MdxBody', () => ({
  MdxBody: ({ source }: { source: string }) => (
    <div data-testid="mdx-body">{source}</div>
  ),
}));

import { PostcardArticle } from '../PostcardArticle';
import type { Postcard } from '@/lib/content/types';

const pc: Postcard = {
  frontmatter: { number: 7, published: '2026-04-22' } as Postcard['frontmatter'],
  body: 'Body',
  filePath: '',
};

describe('<PostcardArticle>', () => {
  it('renders number header with padding', () => {
    render(<PostcardArticle postcard={pc} />);
    expect(screen.getByText(/postcard #007/i)).toBeInTheDocument();
  });
  it('renders long date signoff', () => {
    render(<PostcardArticle postcard={pc} />);
    expect(screen.getByText(/maria · 22 apr 2026/)).toBeInTheDocument();
  });
  it('wraps in <article>', () => {
    const { container } = render(<PostcardArticle postcard={pc} />);
    expect(container.querySelector('article')).toBeInTheDocument();
  });
});
