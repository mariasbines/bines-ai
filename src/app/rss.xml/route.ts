import { Feed } from 'feed';
import { getAllFieldwork } from '@/lib/content/fieldwork';
import { getAllPostcards } from '@/lib/content/postcards';
import { mdxBodyToHtml } from '@/lib/content/to-html';

const SITE_URL = 'https://bines.ai';

export async function GET() {
  const feed = new Feed({
    title: 'bines.ai',
    description:
      'Fieldwork and postcards from someone who actually uses the AI she writes about.',
    id: SITE_URL,
    link: SITE_URL,
    language: 'en',
    copyright: `© ${new Date().getFullYear()} Maria Bines`,
    feedLinks: {
      rss2: `${SITE_URL}/rss.xml`,
    },
  });

  const [fieldwork, postcards] = await Promise.all([getAllFieldwork(), getAllPostcards()]);

  interface Item {
    title: string;
    date: Date;
    description: string;
    html: string;
    url: string;
  }

  const fwItems: Item[] = await Promise.all(
    fieldwork.map(async (p) => ({
      title: p.frontmatter.title,
      date: new Date(`${p.frontmatter.published}T00:00:00Z`),
      description: p.frontmatter.excerpt,
      html: await mdxBodyToHtml(p.body),
      url: `${SITE_URL}/fieldwork/${p.frontmatter.slug}`,
    })),
  );

  const pcItems: Item[] = await Promise.all(
    postcards.map(async (pc) => ({
      title: `Postcard #${pc.frontmatter.number.toString().padStart(3, '0')}`,
      date: new Date(`${pc.frontmatter.published}T00:00:00Z`),
      description: pc.body.slice(0, 200),
      html: await mdxBodyToHtml(pc.body),
      url: `${SITE_URL}/postcards/${pc.frontmatter.number.toString().padStart(3, '0')}`,
    })),
  );

  const items = [...fwItems, ...pcItems].sort((a, b) => b.date.getTime() - a.date.getTime());

  for (const item of items) {
    feed.addItem({
      title: item.title,
      id: item.url,
      link: item.url,
      date: item.date,
      description: item.description,
      content: item.html,
    });
  }

  return new Response(feed.rss2(), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
