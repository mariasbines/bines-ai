import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PushbackSummary } from '../PushbackSummary';
import { EXCERPT_MAX_CHARS } from '@/lib/argue-judge/schema';

describe('<PushbackSummary>', () => {
  it('returns null when count === 0 (silent absence)', () => {
    const { container } = render(
      <PushbackSummary count={0} landed={0} excerpts={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders header + one blockquote when count > 0, landed === 0, one excerpt', () => {
    render(
      <PushbackSummary count={1} landed={0} excerpts={['one sharp line.']} />,
    );
    expect(screen.getByText('pushback (1)')).toBeInTheDocument();
    expect(screen.queryByText(/^landed \(/)).not.toBeInTheDocument();
    expect(screen.getByText('one sharp line.')).toBeInTheDocument();
    // One blockquote, one cite.
    expect(document.querySelectorAll('blockquote')).toHaveLength(1);
    expect(screen.getByText('— anonymous')).toBeInTheDocument();
  });

  it('renders header + landed line + multiple blockquotes when count > 0, landed > 0', () => {
    render(
      <PushbackSummary
        count={3}
        landed={2}
        excerpts={['first', 'second', 'third']}
      />,
    );
    expect(screen.getByText('pushback (3)')).toBeInTheDocument();
    expect(screen.getByText('landed (2)')).toBeInTheDocument();
    expect(document.querySelectorAll('blockquote')).toHaveLength(3);
    expect(document.querySelectorAll('cite')).toHaveLength(3);
  });

  it('renders no blockquotes when count > 0 but excerpts is empty (every verdict had null excerpt)', () => {
    render(<PushbackSummary count={2} landed={0} excerpts={[]} />);
    expect(screen.getByText('pushback (2)')).toBeInTheDocument();
    expect(document.querySelectorAll('blockquote')).toHaveLength(0);
    expect(screen.queryByText(/^landed \(/)).not.toBeInTheDocument();
  });

  it('renders HTML-shaped excerpt content as inert text (PB2-SEC-004 XSS regression)', () => {
    const hostile = '<script>alert(1)</script><img onerror=x src=y>';
    const { container } = render(
      <PushbackSummary count={1} landed={0} excerpts={[hostile]} />,
    );
    // No live <script> or <img> element from the excerpt.
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    // Literal string appears as DOM text content.
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('renders an excerpt of exactly EXCERPT_MAX_CHARS chars verbatim (no truncation)', () => {
    const exact = 'a'.repeat(EXCERPT_MAX_CHARS);
    render(<PushbackSummary count={1} landed={0} excerpts={[exact]} />);
    expect(screen.getByText(exact)).toBeInTheDocument();
  });

  it('truncates an excerpt longer than EXCERPT_MAX_CHARS with " — " suffix and no mid-word cut', () => {
    // 300 chars, all whitespace-separated 4-letter words → guaranteed to have a
    // space within the 240 char window.
    const words = Array.from({ length: 60 }, () => 'word').join(' ');
    expect(words.length).toBeGreaterThan(EXCERPT_MAX_CHARS);
    render(<PushbackSummary count={1} landed={0} excerpts={[words]} />);

    const block = document.querySelector('blockquote p');
    const rendered = block?.textContent ?? '';
    // Allow tolerance for the " — " visible suffix (3 chars).
    expect(rendered.length).toBeLessThanOrEqual(EXCERPT_MAX_CHARS + 3);
    expect(rendered.endsWith(' — ')).toBe(true);
    // No mid-word cut: the last visible word must be complete ("word", not "wo").
    const beforeSuffix = rendered.slice(0, -3).trimEnd();
    const lastWord = beforeSuffix.split(' ').pop() ?? '';
    expect(lastWord).toBe('word');
  });

  it('handles degenerate no-whitespace overflow excerpt with hard cap + " — " suffix', () => {
    // 300-char single token (no spaces). Truncation falls back to a hard cut.
    const monolith = 'a'.repeat(300);
    render(<PushbackSummary count={1} landed={0} excerpts={[monolith]} />);
    const block = document.querySelector('blockquote p');
    const rendered = block?.textContent ?? '';
    expect(rendered.length).toBeLessThanOrEqual(EXCERPT_MAX_CHARS + 3);
    expect(rendered.endsWith(' — ')).toBe(true);
  });

  it('preserves excerpt order as supplied (loader is the sort authority)', () => {
    render(
      <PushbackSummary
        count={3}
        landed={0}
        excerpts={['alpha', 'beta', 'gamma']}
      />,
    );
    const blockTexts = Array.from(document.querySelectorAll('blockquote p')).map(
      (el) => el.textContent,
    );
    expect(blockTexts).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('does NOT use dangerouslySetInnerHTML in component source (PB2-SEC-004 grep audit)', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/PushbackSummary.tsx'),
      'utf8',
    );
    // Strip comments before grepping — the doc-comment intentionally names the
    // prop as a "never used" guarantee, which should not trip this guard. Only
    // actual JSX/JS usage counts.
    const codeOnly = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(codeOnly).not.toContain('dangerouslySetInnerHTML');
  });

  it('does NOT include SynapseDx palette hex values in component source', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/PushbackSummary.tsx'),
      'utf8',
    );
    const forbidden = ['#0A0F1A', '#00D4AA', '#F26B38', '#0EA5E9'];
    for (const hex of forbidden) {
      expect(source.toUpperCase()).not.toContain(hex.toUpperCase());
    }
  });
});
