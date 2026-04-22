import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../MdxBody', () => ({
  MdxBody: ({ source }: { source: string }) => (
    <div data-testid="mdx-body">{source}</div>
  ),
}));

import { ChangedMyMindArticle } from '../ChangedMyMindArticle';
import type { Fieldwork } from '@/lib/content/types';

const piece: Fieldwork = {
  frontmatter: {
    id: 99,
    slug: '99-new-thought',
    title: 'I changed my mind',
    published: '2027-01-01',
    status: 'changed-my-mind',
    supersedes: '01-old-thought',
    originalPosition: 'the old way',
    newPosition: 'the new way',
    tags: ['meta'],
    media: { readMinutes: 5 },
    pushback: { count: 0 },
    excerpt: 'ex',
  } as Fieldwork['frontmatter'],
  body: 'Body',
  filePath: '',
};

describe('<ChangedMyMindArticle>', () => {
  it('renders the supersedes link in the header', () => {
    render(<ChangedMyMindArticle piece={piece} />);
    const links = screen.getAllByRole('link');
    expect(links.some((l) => l.getAttribute('href') === '/fieldwork/01-old-thought')).toBe(true);
  });
  it('renders I-used-to-think + now-I-think blocks', () => {
    render(<ChangedMyMindArticle piece={piece} />);
    expect(screen.getByText('the old way')).toBeInTheDocument();
    expect(screen.getByText('the new way')).toBeInTheDocument();
  });
  it('renders the title', () => {
    render(<ChangedMyMindArticle piece={piece} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('I changed my mind');
  });
  it('renders the MDX body', () => {
    render(<ChangedMyMindArticle piece={piece} />);
    expect(screen.getByTestId('mdx-body')).toHaveTextContent('Body');
  });
  it('renders "read the original" footer link', () => {
    render(<ChangedMyMindArticle piece={piece} />);
    expect(screen.getByText(/read the original/)).toBeInTheDocument();
  });
});
