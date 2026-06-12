import { describe, it, expect } from 'vitest';
import {
  identifyAiCrawler,
  identifyAiReferrer,
  botSlug,
} from '../ai-crawlers';

describe('identifyAiCrawler', () => {
  it('identifies the invited AI crawlers from realistic UA strings', () => {
    expect(
      identifyAiCrawler(
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
      ),
    ).toBe('GPTBot');
    expect(
      identifyAiCrawler(
        'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
      ),
    ).toBe('ClaudeBot');
    expect(
      identifyAiCrawler('Mozilla/5.0 (compatible; PerplexityBot/1.0)'),
    ).toBe('PerplexityBot');
    expect(
      identifyAiCrawler('Mozilla/5.0 (compatible; OAI-SearchBot/1.0)'),
    ).toBe('OAI-SearchBot');
    expect(identifyAiCrawler('Mozilla/5.0; Google-Extended')).toBe(
      'Google-Extended',
    );
  });

  it('distinguishes the -User fetchers from the crawl bots', () => {
    expect(identifyAiCrawler('ChatGPT-User/1.0')).toBe('ChatGPT-User');
    expect(identifyAiCrawler('Perplexity-User/1.0')).toBe('Perplexity-User');
  });

  it('returns null for browsers, search bots, and empty UAs', () => {
    expect(
      identifyAiCrawler('Mozilla/5.0 (Macintosh) Safari/605.1.15'),
    ).toBeNull();
    expect(
      identifyAiCrawler('Mozilla/5.0 (compatible; Googlebot/2.1)'),
    ).toBeNull();
    expect(identifyAiCrawler('')).toBeNull();
  });
});

describe('identifyAiReferrer', () => {
  it('identifies AI answer surfaces from hosts and full URLs', () => {
    expect(identifyAiReferrer('https://chatgpt.com/')).toBe('ChatGPT');
    expect(identifyAiReferrer('chat.openai.com')).toBe('ChatGPT');
    expect(identifyAiReferrer('https://www.perplexity.ai')).toBe('Perplexity');
    expect(identifyAiReferrer('copilot.microsoft.com')).toBe('Copilot');
    expect(identifyAiReferrer('claude.ai')).toBe('Claude');
  });

  it('returns null for ordinary referrers and empty strings', () => {
    expect(identifyAiReferrer('https://www.google.com')).toBeNull();
    expect(identifyAiReferrer('linkedin.com')).toBeNull();
    expect(identifyAiReferrer('')).toBeNull();
  });
});

describe('botSlug', () => {
  it('lowercases and dashes display names', () => {
    expect(botSlug('OAI-SearchBot')).toBe('oai-searchbot');
    expect(botSlug('Google-Extended')).toBe('google-extended');
    expect(botSlug('ChatGPT-User')).toBe('chatgpt-user');
  });
});
