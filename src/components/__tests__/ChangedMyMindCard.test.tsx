import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChangedMyMindCard } from '../ChangedMyMindCard';
import type { Fieldwork } from '@/lib/content/types';

const piece: Fieldwork = {
  frontmatter: {
    id: 4,
    slug: '04-singularity-different-clothes',
    title: 'I was right about the singularity. I was wrong about the wires.',
    published: '2026-04-25',
    status: 'changed-my-mind',
    supersedes: '05-singularity-is-here',
    originalPosition: 'Mankind would converge with machines via wires by 2030.',
    newPosition: 'The convergence is real but the shape is psychological codependency.',
    tags: ['ai'],
    media: { readMinutes: 3 },
    pushback: { count: 0 },
    excerpt: 'ex',
    accent: 'amethyst',
  } as Fieldwork['frontmatter'],
  body: '',
  filePath: '',
};

describe('<ChangedMyMindCard>', () => {
  it('links the title to /changed-my-mind/<slug>', () => {
    render(<ChangedMyMindCard piece={piece} />);
    const link = screen.getByRole('link', { name: /singularity/i });
    expect(link).toHaveAttribute('href', '/changed-my-mind/04-singularity-different-clothes');
  });
  it('renders the I-used-to-think + now-I-think pair', () => {
    render(<ChangedMyMindCard piece={piece} />);
    expect(screen.getByText(/Mankind would converge with machines via wires/)).toBeInTheDocument();
    expect(screen.getByText(/psychological codependency/)).toBeInTheDocument();
  });
  it('renders the fieldwork id padded with a zero', () => {
    render(<ChangedMyMindCard piece={piece} />);
    expect(screen.getByText(/fieldwork 04/i)).toBeInTheDocument();
  });
  it('throws when given a non-changed-my-mind piece (defensive)', () => {
    const wrong = {
      ...piece,
      frontmatter: { ...piece.frontmatter, status: 'in-rotation' } as Fieldwork['frontmatter'],
    };
    expect(() => render(<ChangedMyMindCard piece={wrong} />)).toThrow();
  });
});
