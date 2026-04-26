import type { MetadataRoute } from 'next';
import { getAllFieldwork } from '@/lib/content/fieldwork';
import { getAllPostcards } from '@/lib/content/postcards';

const SITE_URL = 'https://bines.ai';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [fieldwork, postcards] = await Promise.all([getAllFieldwork(), getAllPostcards()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/postcards`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/changed-my-mind`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/archive`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/now`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/taste`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/argue`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const fwUrls: MetadataRoute.Sitemap = fieldwork.map((p) => ({
    url: `${SITE_URL}/fieldwork/${p.frontmatter.slug}`,
    lastModified: new Date(`${p.frontmatter.published}T00:00:00Z`),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const cmmUrls: MetadataRoute.Sitemap = fieldwork
    .filter((p) => p.frontmatter.status === 'changed-my-mind')
    .map((p) => ({
      url: `${SITE_URL}/changed-my-mind/${p.frontmatter.slug}`,
      lastModified: new Date(`${p.frontmatter.published}T00:00:00Z`),
      changeFrequency: 'yearly',
      priority: 0.7,
    }));

  const pcUrls: MetadataRoute.Sitemap = postcards.map((pc) => ({
    url: `${SITE_URL}/postcards/${pc.frontmatter.number.toString().padStart(3, '0')}`,
    lastModified: new Date(`${pc.frontmatter.published}T00:00:00Z`),
    changeFrequency: 'yearly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...fwUrls, ...cmmUrls, ...pcUrls];
}
