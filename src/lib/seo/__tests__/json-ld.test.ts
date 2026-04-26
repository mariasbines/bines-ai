import { describe, it, expect } from 'vitest';
import { websiteJsonLd, personJsonLd, articleJsonLd } from '../json-ld';

describe('websiteJsonLd', () => {
  it('declares schema.org WebSite with bines.ai identity', () => {
    const ld = websiteJsonLd();
    expect(ld['@type']).toBe('WebSite');
    expect(ld.name).toBe('bines.ai');
    expect(ld.url).toBe('https://bines.ai');
  });
});

describe('personJsonLd', () => {
  it('declares Maria Bines with both LinkedIn and SynapseDx as sameAs', () => {
    const ld = personJsonLd();
    expect(ld['@type']).toBe('Person');
    expect(ld.name).toBe('Maria Bines');
    const sameAs = ld.sameAs as string[];
    expect(sameAs).toContain('https://www.linkedin.com/in/maria-bines/');
    expect(sameAs).toContain('https://synapsedx.ai');
  });
});

describe('articleJsonLd', () => {
  it('routes Fieldwork pieces to /fieldwork/<slug>', () => {
    const ld = articleJsonLd({
      slug: '06-brain-swap',
      title: 'The brain-swap',
      description: 'Witcher III, four playthroughs.',
      published: '2026-04-26',
      tags: ['ai', 'attention'],
      type: 'fieldwork',
    });
    expect(ld.url).toBe('https://bines.ai/fieldwork/06-brain-swap');
    expect(ld['@type']).toBe('Article');
    expect(ld.headline).toBe('The brain-swap');
    expect(ld.keywords).toBe('ai, attention');
  });

  it('routes changed-my-mind pieces to /changed-my-mind/<slug>', () => {
    const ld = articleJsonLd({
      slug: '04-singularity-different-clothes',
      title: 'Different clothes',
      description: 'Same singularity.',
      published: '2026-04-25',
      tags: ['ai'],
      type: 'changed-my-mind',
    });
    expect(ld.url).toBe('https://bines.ai/changed-my-mind/04-singularity-different-clothes');
  });

  it('uses the latest revision date as dateModified when revised dates are present', () => {
    const ld = articleJsonLd({
      slug: '01-x',
      title: 'X',
      description: 'x',
      published: '2026-01-01',
      revised: ['2026-02-01', '2026-03-15'],
      tags: ['ai'],
    });
    expect(ld.dateModified).toBe('2026-03-15T00:00:00Z');
    expect(ld.datePublished).toBe('2026-01-01T00:00:00Z');
  });

  it('falls back to published date for dateModified when no revisions exist', () => {
    const ld = articleJsonLd({
      slug: '01-x',
      title: 'X',
      description: 'x',
      published: '2026-01-01',
      tags: ['ai'],
    });
    expect(ld.dateModified).toBe('2026-01-01T00:00:00Z');
  });
});
