import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../MdxBody', () => ({
  MdxBody: ({ source }: { source: string }) => (
    <div data-testid="mdx-body">{source}</div>
  ),
}));

import { PostcardCard } from '../PostcardCard';
import type { Postcard } from '@/lib/content/types';

const pc: Postcard = {
  frontmatter: { number: 1, published: '2026-04-22' } as Postcard['frontmatter'],
  body: 'Hello',
  filePath: '',
};

describe('<PostcardCard>', () => {
  it('renders zero-padded number header', () => {
    render(<PostcardCard postcard={pc} />);
    expect(screen.getByText(/postcard #001/i)).toBeInTheDocument();
  });
  it('links header to /postcards/001 by default', () => {
    render(<PostcardCard postcard={pc} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/postcards/001');
  });
  it('omits link when linkTitle=false', () => {
    render(<PostcardCard postcard={pc} linkTitle={false} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('renders the MDX body via MdxBody', () => {
    render(<PostcardCard postcard={pc} />);
    expect(screen.getByTestId('mdx-body')).toHaveTextContent('Hello');
  });
  it('renders the signoff "maria · 22 apr"', () => {
    render(<PostcardCard postcard={pc} />);
    expect(screen.getByText(/maria · 22 apr/)).toBeInTheDocument();
  });
  it('pads postcard 47 to "047"', () => {
    render(
      <PostcardCard
        postcard={{ ...pc, frontmatter: { ...pc.frontmatter, number: 47 } }}
      />,
    );
    expect(screen.getByText(/postcard #047/i)).toBeInTheDocument();
  });
});
