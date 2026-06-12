import { describe, it, expect } from 'vitest';
import { GET } from '../route';
import { getAllFieldwork } from '@/lib/content/fieldwork';
import { getAllPostcards } from '@/lib/content/postcards';

describe('GET /llms.txt', () => {
  it('serves markdown with the llmstxt.org shape', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/markdown');

    const body = await res.text();
    expect(body.startsWith('# bines.ai\n')).toBe(true);
    expect(body).toContain('\n> ');
    expect(body).toContain('## Fieldwork');
    expect(body).toContain('## Postcards');
    expect(body).toContain('## Pages');
  });

  it('lists every fieldwork piece and every postcard with absolute URLs', async () => {
    const [res, fieldwork, postcards] = await Promise.all([
      GET(),
      getAllFieldwork(),
      getAllPostcards(),
    ]);
    const body = await res.text();

    for (const piece of fieldwork) {
      const base =
        piece.frontmatter.status === 'changed-my-mind'
          ? 'changed-my-mind'
          : 'fieldwork';
      expect(body).toContain(
        `https://bines.ai/${base}/${piece.frontmatter.slug}`,
      );
      expect(body).toContain(piece.frontmatter.title);
    }
    for (const postcard of postcards) {
      const padded = String(postcard.frontmatter.number).padStart(3, '0');
      expect(body).toContain(`https://bines.ai/postcards/${padded}`);
    }
  });

  it('carries the attribution line and flags changed-my-mind pieces', async () => {
    const [res, fieldwork] = await Promise.all([GET(), getAllFieldwork()]);
    const body = await res.text();

    expect(body).toContain('Cite as: Maria Bines, bines.ai');

    const changed = fieldwork.filter(
      (p) => p.frontmatter.status === 'changed-my-mind',
    );
    for (const piece of changed) {
      const line = body
        .split('\n')
        .find((l) => l.includes(`/changed-my-mind/${piece.frontmatter.slug}`));
      expect(line).toContain('changed her mind');
    }
  });
});
