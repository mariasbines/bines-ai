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
  pushback: { count: 0, landed: 0, excerpts: [] },
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

// Story 003.007 — PushbackSummary integration.
describe('<FieldworkArticle> — <PushbackSummary> integration (story 003.007)', () => {
  it('renders the pushback summary when piece.pushback.count > 0', () => {
    const withPushback: Fieldwork = {
      ...basePiece,
      pushback: { count: 2, landed: 1, excerpts: ['a quiet but sharp line.'] },
    };
    render(<FieldworkArticle piece={withPushback} />);
    expect(screen.getByLabelText('Pushback summary')).toBeInTheDocument();
    expect(screen.getByText('pushback (2)')).toBeInTheDocument();
    expect(screen.getByText('landed (1)')).toBeInTheDocument();
    expect(screen.getByText('a quiet but sharp line.')).toBeInTheDocument();
  });

  it('does not render the pushback summary when piece.pushback.count === 0', () => {
    render(<FieldworkArticle piece={basePiece} />);
    expect(screen.queryByLabelText('Pushback summary')).not.toBeInTheDocument();
  });

  it('renders <PushbackSummary> between <MdxBody> and the article footer (DOM order)', () => {
    const withPushback: Fieldwork = {
      ...basePiece,
      pushback: { count: 1, landed: 0, excerpts: ['line one'] },
    };
    const { container } = render(<FieldworkArticle piece={withPushback} />);

    const body = container.querySelector('[data-testid="mdx-body"]');
    const summary = container.querySelector('[aria-label="Pushback summary"]');
    const footerLink = screen.getByRole('link', { name: /argue with this/i });

    expect(body).toBeTruthy();
    expect(summary).toBeTruthy();
    expect(footerLink).toBeTruthy();

    // body precedes summary; summary precedes footer link.
    expect(
      body!.compareDocumentPosition(summary!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      summary!.compareDocumentPosition(footerLink) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
