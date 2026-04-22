import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../MdxBody', () => ({
  MdxBody: ({ source }: { source: string }) => (
    <div data-testid="mdx-body">{source}</div>
  ),
}));

import { TasteShelf } from '../TasteShelf';
import type { Taste } from '@/lib/content/types';

const taste: Taste = {
  frontmatter: {
    updated: '2026-04-22',
    items: [
      { title: 'A book', by: 'Someone', kind: 'book', note: 'ex note' },
      { title: 'Linked', link: 'https://example.com' },
    ],
  } as Taste['frontmatter'],
  body: 'intro body',
  filePath: '',
};

describe('<TasteShelf>', () => {
  it('renders Taste h1', () => {
    render(<TasteShelf taste={taste} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Taste' })).toBeInTheDocument();
  });
  it('renders last-updated time', () => {
    render(<TasteShelf taste={taste} />);
    const time = screen.getByText('22 Apr 2026');
    expect(time.tagName.toLowerCase()).toBe('time');
  });
  it('renders the first item with title + by + kind + note', () => {
    render(<TasteShelf taste={taste} />);
    expect(screen.getByText('A book')).toBeInTheDocument();
    expect(screen.getByText('· Someone')).toBeInTheDocument();
    expect(screen.getByText('book')).toBeInTheDocument();
    expect(screen.getByText('ex note')).toBeInTheDocument();
  });
  it('renders a linked item as an anchor', () => {
    render(<TasteShelf taste={taste} />);
    const link = screen.getByRole('link', { name: 'Linked' });
    expect(link).toHaveAttribute('href', 'https://example.com');
  });
  it('renders the intro body via MdxBody', () => {
    render(<TasteShelf taste={taste} />);
    expect(screen.getByTestId('mdx-body')).toHaveTextContent('intro body');
  });
});
