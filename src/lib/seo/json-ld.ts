/**
 * JSON-LD generators for schema.org structured data — the highest-leverage
 * lever for both SEO (rich-result eligibility) and AEO (AI assistants extract
 * author identity, publish date, and article structure from these blocks).
 *
 * Each helper returns a plain JS object suitable for stringify-into-script:
 *
 *   <script type="application/ld+json"
 *           dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }} />
 */

const SITE_URL = 'https://bines.ai';

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}#website`,
    url: SITE_URL,
    name: 'bines.ai',
    description:
      'Editorial notes on AI and life by Maria Bines — Fieldwork, postcards, and an AI chat trained on her voice.',
    publisher: { '@id': `${SITE_URL}#person` },
    inLanguage: 'en',
  };
}

export function personJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}#person`,
    name: 'Maria Bines',
    description:
      'Kentucky-raised, London-based, accidentally Canadian-sounding. Builds AI for regulated industries by day and argues with it by night.',
    url: SITE_URL,
    sameAs: [
      'https://www.linkedin.com/in/maria-bines/',
      'https://synapsedx.ai',
    ],
    worksFor: {
      '@type': 'Organization',
      name: 'SynapseDx',
      url: 'https://synapsedx.ai',
    },
  };
}

export interface ArticleJsonLdInput {
  slug: string;
  title: string;
  description: string;
  published: string; // ISO date YYYY-MM-DD
  revised?: string[]; // ISO dates
  tags: readonly string[];
  type?: 'fieldwork' | 'changed-my-mind';
}

export function articleJsonLd(input: ArticleJsonLdInput): Record<string, unknown> {
  const path = input.type === 'changed-my-mind' ? 'changed-my-mind' : 'fieldwork';
  const url = `${SITE_URL}/${path}/${input.slug}`;
  const dateModified =
    input.revised && input.revised.length > 0
      ? input.revised[input.revised.length - 1]
      : input.published;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    headline: input.title,
    description: input.description,
    datePublished: `${input.published}T00:00:00Z`,
    dateModified: `${dateModified}T00:00:00Z`,
    author: { '@id': `${SITE_URL}#person` },
    publisher: { '@id': `${SITE_URL}#person` },
    inLanguage: 'en',
    keywords: input.tags.join(', '),
    isPartOf: { '@id': `${SITE_URL}#website` },
  };
}
