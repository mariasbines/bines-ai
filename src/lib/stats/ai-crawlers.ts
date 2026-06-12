/**
 * AI crawler + AI referrer identification for the AEO panel on /stats.
 *
 * Pure, no env, no I/O — safe to import from middleware (edge) and from
 * server components alike.
 *
 * The crawler table mirrors the *invited* AI bots in src/app/robots.ts.
 * If a bot is added or removed there, update this table in the same PR
 * (the /stats AEO panel counts only bots we have chosen to welcome —
 * blocked scrapers get a 403 in middleware and are deliberately not part
 * of the answer-engine story).
 */

/** UA substring (lowercase) → display name shown on /stats. Order matters:
 * first match wins, so more specific substrings come before generic ones
 * (e.g. 'chatgpt-user' before 'gptbot' is not required, but 'perplexity-user'
 * must precede 'perplexity'). */
const AI_CRAWLER_TABLE: ReadonlyArray<readonly [string, string]> = [
  ['oai-searchbot', 'OAI-SearchBot'],
  ['chatgpt-user', 'ChatGPT-User'],
  ['gptbot', 'GPTBot'],
  ['perplexity-user', 'Perplexity-User'],
  ['perplexitybot', 'PerplexityBot'],
  ['claudebot', 'ClaudeBot'],
  ['claude-web', 'Claude-Web'],
  ['anthropic-ai', 'Anthropic-AI'],
  ['google-extended', 'Google-Extended'],
  ['applebot-extended', 'Applebot-Extended'],
  ['youbot', 'YouBot'],
];

/**
 * Identify an invited AI crawler from a User-Agent header.
 * Returns the display name, or null when the UA is not a known AI crawler.
 */
export function identifyAiCrawler(userAgent: string): string | null {
  const ua = userAgent.toLowerCase();
  if (!ua) return null;
  for (const [needle, name] of AI_CRAWLER_TABLE) {
    if (ua.includes(needle)) return name;
  }
  return null;
}

/** Referrer host substring (lowercase) → AI surface name. Used to break out
 * "humans arriving from an AI answer" in the visits referrer table. */
const AI_REFERRER_TABLE: ReadonlyArray<readonly [string, string]> = [
  ['chatgpt.com', 'ChatGPT'],
  ['chat.openai.com', 'ChatGPT'],
  ['perplexity.ai', 'Perplexity'],
  ['copilot.microsoft.com', 'Copilot'],
  ['gemini.google.com', 'Gemini'],
  ['claude.ai', 'Claude'],
  ['you.com', 'You.com'],
  ['chat.deepseek.com', 'DeepSeek'],
];

/**
 * Identify an AI answer-surface from a referrer string (full URL or bare
 * host — both occur in Vercel's referrer stats). Returns the surface name,
 * or null for ordinary referrers.
 */
export function identifyAiReferrer(referrer: string): string | null {
  const ref = referrer.toLowerCase();
  if (!ref) return null;
  for (const [needle, name] of AI_REFERRER_TABLE) {
    if (ref.includes(needle)) return name;
  }
  return null;
}

/** Slug-safe form of a bot display name, used in Blob pathnames. */
export function botSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
