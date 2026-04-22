import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../MdxBody', () => ({
  MdxBody: ({ source }: { source: string }) => (
    <div data-testid="mdx-body">{source}</div>
  ),
}));

import { NowBlock } from '../NowBlock';
import type { Now } from '@/lib/content/types';

const now: Now = {
  frontmatter: {
    updated: '2026-04-22',
    currently: 'the currently line',
  } as Now['frontmatter'],
  body: 'Body here',
  filePath: '',
};

describe('<NowBlock>', () => {
  it('renders Now h1', () => {
    render(<NowBlock now={now} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Now' })).toBeInTheDocument();
  });
  it('renders the currently line', () => {
    render(<NowBlock now={now} />);
    expect(screen.getByText('the currently line')).toBeInTheDocument();
  });
  it('renders last-updated time', () => {
    render(<NowBlock now={now} />);
    const time = screen.getByText('22 Apr 2026');
    expect(time.tagName.toLowerCase()).toBe('time');
    expect(time).toHaveAttribute('datetime', '2026-04-22');
  });
  it('renders the body via MdxBody', () => {
    render(<NowBlock now={now} />);
    expect(screen.getByTestId('mdx-body')).toHaveTextContent('Body here');
  });
});
