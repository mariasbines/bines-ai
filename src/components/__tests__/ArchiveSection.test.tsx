import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArchiveSection } from '../ArchiveSection';
import type { Fieldwork } from '@/lib/content/types';

function mkPiece(slug: string, extras: Partial<Fieldwork['frontmatter']> = {}): Fieldwork {
  return {
    frontmatter: {
      id: 1,
      slug,
      title: `Title ${slug}`,
      published: '2026-04-01',
      status: 'retired-still-right',
      tags: ['memory'],
      media: { readMinutes: 5 },
      pushback: { count: 0 },
      excerpt: 'ex',
      ...extras,
    } as Fieldwork['frontmatter'],
    body: '',
    filePath: '',
  };
}

describe('<ArchiveSection>', () => {
  it('renders empty message when pieces array is empty', () => {
    render(
      <ArchiveSection
        title="still right"
        pieces={[]}
        linkPattern="fieldwork"
        emptyMessage="nothing here"
      />,
    );
    expect(screen.getByText('nothing here')).toBeInTheDocument();
    expect(screen.getByText(/still right.*\(0\)/)).toBeInTheDocument();
  });
  it('renders heading with count', () => {
    render(
      <ArchiveSection
        title="still right"
        pieces={[mkPiece('a'), mkPiece('b')]}
        linkPattern="fieldwork"
        emptyMessage=""
      />,
    );
    expect(screen.getByText(/still right.*\(2\)/)).toBeInTheDocument();
  });
  it('links regular retired pieces to /fieldwork/[slug]', () => {
    render(
      <ArchiveSection
        title="still right"
        pieces={[mkPiece('a')]}
        linkPattern="fieldwork"
        emptyMessage=""
      />,
    );
    expect(screen.getByRole('link', { name: 'Title a' })).toHaveAttribute('href', '/fieldwork/a');
  });
  it('links changed-my-mind pieces to /changed-my-mind/[slug]', () => {
    render(
      <ArchiveSection
        title="changed my mind"
        pieces={[mkPiece('b', { status: 'changed-my-mind' })]}
        linkPattern="changed-my-mind"
        emptyMessage=""
      />,
    );
    expect(screen.getByRole('link', { name: 'Title b' })).toHaveAttribute(
      'href',
      '/changed-my-mind/b',
    );
  });
  it('renders retirement date from retiredAt when present', () => {
    render(
      <ArchiveSection
        title="still right"
        pieces={[mkPiece('a', { retiredAt: '2026-04-20' })]}
        linkPattern="fieldwork"
        emptyMessage=""
      />,
    );
    expect(screen.getByText(/20 Apr 2026/)).toBeInTheDocument();
  });
  it('falls back to published when retiredAt absent', () => {
    render(
      <ArchiveSection
        title="still right"
        pieces={[mkPiece('a')]}
        linkPattern="fieldwork"
        emptyMessage=""
      />,
    );
    expect(screen.getByText(/1 Apr 2026/)).toBeInTheDocument();
  });
  it('renders reason when retiredReason present', () => {
    render(
      <ArchiveSection
        title="still right"
        pieces={[mkPiece('a', { retiredReason: 'no longer load-bearing' })]}
        linkPattern="fieldwork"
        emptyMessage=""
      />,
    );
    expect(screen.getByText(/no longer load-bearing/)).toBeInTheDocument();
  });
});
