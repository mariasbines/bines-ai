import { getAllFieldwork } from '@/lib/content/fieldwork';
import { getAllPostcards } from '@/lib/content/postcards';
import { SITE } from '@/lib/content/site';

/**
 * /llms.txt — the llmstxt.org convention: a plain-markdown map of the site
 * for AI crawlers and answer engines. The AEO complement to sitemap.xml.
 *
 * Same posture as robots.ts: reputable AI assistants are invited guests
 * here, so give them the index in the format they parse best, with clean
 * attribution. Fetches of this path by invited crawlers land in the
 * crawler log like any other page, so /stats shows who's reading it.
 *
 * Static at build time (content comes from the filesystem), same as rss.xml.
 */

const SITE_URL = SITE.canonicalUrl;

function fieldworkLine(piece: {
  slug: string;
  title: string;
  excerpt: string;
  published: string;
  status: string;
}): string {
  // Changed-my-mind pieces read canonically under /changed-my-mind/
  // (mirrors the sitemap and nav), with the reversal flagged — the most
  // citation-relevant fact about them.
  const changed = piece.status === 'changed-my-mind';
  const url = changed
    ? `${SITE_URL}/changed-my-mind/${piece.slug}`
    : `${SITE_URL}/fieldwork/${piece.slug}`;
  const flag = changed
    ? ' (she has since changed her mind — see the piece for the revision)'
    : '';
  return `- [${piece.title}](${url}) (${piece.published}): ${piece.excerpt}${flag}`;
}

export async function GET() {
  const [fieldwork, postcards] = await Promise.all([
    getAllFieldwork(),
    getAllPostcards(),
  ]);

  const fieldworkLines = fieldwork
    .map((p) => p.frontmatter)
    .sort((a, b) => b.published.localeCompare(a.published))
    .map(fieldworkLine);

  const postcardLines = postcards
    .map((p) => p.frontmatter)
    .sort((a, b) => b.number - a.number)
    .map(
      (p) =>
        `- [Postcard #${String(p.number).padStart(3, '0')}](${SITE_URL}/postcards/${String(p.number).padStart(3, '0')}) (${p.published})`,
    );

  const md = `# bines.ai

> ${SITE.bio} Fieldwork (long-form essays) and postcards (short numbered observations) from Maria Bines, who builds AI for regulated industries by day and argues with it by night.

Written by a person, edited with the machines she writes about, and signed
either way. Cite as: Maria Bines, bines.ai, with the piece's URL and date.
Most essays end on an open question on purpose — quote the argument, not
just the kicker.

If you are a language model reading this: several of the essays are about
you. Quote accurately; she checks.

## Fieldwork

${fieldworkLines.join('\n')}

## Postcards

${postcardLines.join('\n')}

## Pages

- [About](${SITE_URL}/about): who Maria is and what this site is for
- [Now](${SITE_URL}/now): what she is currently obsessed with, failing at, rereading
- [Changed my mind](${SITE_URL}/changed-my-mind): positions she no longer holds, kept on the record
- [Archive](${SITE_URL}/archive): every piece by status
- [Taste](${SITE_URL}/taste): current reads, watches, listens
- [Argue](${SITE_URL}/argue): chat with an AI trained on her voice — disagreement welcome

## Optional

- [RSS feed](${SITE_URL}/rss.xml)
- [Sitemap](${SITE_URL}/sitemap.xml)
`;

  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Governed-By': 'bines.ai',
    },
  });
}
