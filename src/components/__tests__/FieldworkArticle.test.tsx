import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock MdxBody to keep test synchronous + decouple from @mdx-js/mdx.
vi.mock('../MdxBody', () => ({
  MdxBody: ({ source }: { source: string }) => (
    <div data-testid="mdx-body">{source}</div>
  ),
}));

// Mock VideoLoop to avoid needing jsdom video / IntersectionObserver support.
vi.mock('../VideoLoop', () => ({
  VideoLoop: ({ alt }: { alt: string }) => <div data-testid="video-loop">{alt}</div>,
}));

import { FieldworkArticle } from '../FieldworkArticle';
import type { Fieldwork } from '@/lib/content/types';

const basePiece: Fieldwork = {
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
    render(<FieldworkArticle piece={basePiece} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Foo Bar');
  });
  it('wraps in <article>', () => {
    const { container } = render(<FieldworkArticle piece={basePiece} />);
    expect(container.querySelector('article')).toBeInTheDocument();
  });
  it('omits the video slot when no headerVideo is present', () => {
    render(<FieldworkArticle piece={basePiece} />);
    expect(screen.queryByTestId('video-loop')).not.toBeInTheDocument();
  });
  it('renders VideoLoop when headerVideo + posterFrame are present', () => {
    const withVideo: Fieldwork = {
      ...basePiece,
      frontmatter: {
        ...basePiece.frontmatter,
        media: {
          readMinutes: 5,
          headerVideo: 'https://blob.example/vid.mp4',
          posterFrame: 'https://blob.example/poster.jpg',
        },
      } as Fieldwork['frontmatter'],
    };
    render(<FieldworkArticle piece={withVideo} />);
    expect(screen.getByTestId('video-loop')).toBeInTheDocument();
  });
  it('shows retired banner for retired pieces', () => {
    render(
      <FieldworkArticle
        piece={{
          ...basePiece,
          frontmatter: {
            ...basePiece.frontmatter,
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
    render(<FieldworkArticle piece={basePiece} />);
    expect(screen.getByTestId('mdx-body')).toHaveTextContent('Body content');
  });
});
