import type { MetadataRoute } from 'next';

const SITE_URL = 'https://bines.ai';

/**
 * robots.txt directives.
 *
 * Posture: this is an editorial site that wants to be found. Major search
 * crawlers and reputable AI assistants are allowed. Aggressive
 * scrape-and-resell aggregators are blocked by name.
 *
 * Bots that ignore robots.txt are caught by middleware.ts (User-Agent
 * sniff → 403 with a snarky body).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: 'Googlebot', allow: '/', disallow: '/api/' },
      { userAgent: 'Bingbot', allow: '/', disallow: '/api/' },
      { userAgent: 'DuckDuckBot', allow: '/', disallow: '/api/' },
      { userAgent: 'Applebot', allow: '/', disallow: '/api/' },

      { userAgent: 'GPTBot', allow: '/', disallow: '/api/' },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: '/api/' },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: '/api/' },
      { userAgent: 'PerplexityBot', allow: '/', disallow: '/api/' },
      { userAgent: 'Perplexity-User', allow: '/', disallow: '/api/' },
      { userAgent: 'ClaudeBot', allow: '/', disallow: '/api/' },
      { userAgent: 'anthropic-ai', allow: '/', disallow: '/api/' },
      { userAgent: 'claude-web', allow: '/', disallow: '/api/' },
      { userAgent: 'Google-Extended', allow: '/', disallow: '/api/' },
      { userAgent: 'Applebot-Extended', allow: '/', disallow: '/api/' },
      { userAgent: 'YouBot', allow: '/', disallow: '/api/' },

      { userAgent: 'Bytespider', disallow: '/' },
      { userAgent: 'ByteDance', disallow: '/' },
      { userAgent: 'Amazonbot', disallow: '/' },
      { userAgent: 'AhrefsBot', disallow: '/' },
      { userAgent: 'SemrushBot', disallow: '/' },
      { userAgent: 'MJ12bot', disallow: '/' },
      { userAgent: 'DotBot', disallow: '/' },

      { userAgent: '*', allow: '/', disallow: '/api/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
