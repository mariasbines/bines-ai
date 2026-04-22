import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Metadata } from '../Metadata';
import type { Fieldwork } from '@/lib/content/types';

function mkPiece(overrides: Partial<Fieldwork['frontmatter']> = {}): Fieldwork {
  return {
    frontmatter: {
      id: 1,
      slug: '01-a',
      title: 'A',
      published: '2026-04-14',
      status: 'in-rotation',
      tags: ['memory', 'attention'],
      media: { readMinutes: 5, watchMinutes: 4 },
      pushback: { count: 0 },
      excerpt: 'ex',
      ...overrides,
    } as Fieldwork['frontmatter'],
    body: '',
    filePath: '',
  };
}

describe('<Metadata>', () => {
  it('formats published date as "14 Apr 2026"', () => {
    render(<Metadata piece={mkPiece()} />);
    const time = screen.getByText('14 Apr 2026');
    expect(time.tagName.toLowerCase()).toBe('time');
    expect(time).toHaveAttribute('datetime', '2026-04-14');
  });
  it('renders watch + read when watchMinutes present', () => {
    render(<Metadata piece={mkPiece()} />);
    expect(screen.getByText(/watch 4 min\s+·\s+read 5 min/)).toBeInTheDocument();
  });
  it('omits watch prefix when watchMinutes absent', () => {
    render(<Metadata piece={mkPiece({ media: { readMinutes: 5 } })} />);
    expect(screen.getByText('read 5 min')).toBeInTheDocument();
    expect(screen.queryByText(/watch/)).not.toBeInTheDocument();
  });
  it('renders "0 responses" when pushback.count is 0', () => {
    render(<Metadata piece={mkPiece()} />);
    expect(screen.getByText('0 responses')).toBeInTheDocument();
  });
  it('renders "1 response" singular', () => {
    render(<Metadata piece={mkPiece({ pushback: { count: 1 } })} />);
    expect(screen.getByText('1 response')).toBeInTheDocument();
  });
  it('renders "not yet" when no change-my-mind count', () => {
    render(<Metadata piece={mkPiece()} />);
    expect(screen.getByText('not yet')).toBeInTheDocument();
  });
  it('joins tags with · separator', () => {
    render(<Metadata piece={mkPiece()} />);
    expect(screen.getByText('memory · attention')).toBeInTheDocument();
  });
});
