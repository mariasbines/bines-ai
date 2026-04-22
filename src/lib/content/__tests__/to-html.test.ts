import { describe, it, expect } from 'vitest';
import { mdxBodyToHtml } from '../to-html';

describe('mdxBodyToHtml', () => {
  it('converts simple markdown to HTML', async () => {
    const html = await mdxBodyToHtml('Hello **world**.');
    expect(html).toContain('<strong>world</strong>');
  });

  it('strips custom JSX component tags but keeps inner text', async () => {
    const html = await mdxBodyToHtml('<PullQuote>key quote</PullQuote>');
    expect(html).not.toContain('<PullQuote>');
    expect(html).not.toContain('</PullQuote>');
    expect(html).toContain('key quote');
  });

  it('preserves paragraphs', async () => {
    const html = await mdxBodyToHtml('Para one.\n\nPara two.');
    expect((html.match(/<p>/g) ?? []).length).toBe(2);
  });

  it('handles em emphasis', async () => {
    const html = await mdxBodyToHtml('*italic*');
    expect(html).toContain('<em>italic</em>');
  });

  it('handles GFM tables', async () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |';
    const html = await mdxBodyToHtml(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<td>1</td>');
  });

  it('strips nested components', async () => {
    const md = '<Aside>note with <FigureCaption>cap</FigureCaption> inside</Aside>';
    const html = await mdxBodyToHtml(md);
    expect(html).not.toMatch(/<[A-Z]/);
    expect(html).toContain('note with');
    expect(html).toContain('cap');
    expect(html).toContain('inside');
  });
});
