import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

/**
 * Privacy guard — site content must never name people in Maria's life. Public
 * figures and creators (book authors, game studios, fictional characters) are
 * fine; this test only blocks first names tied to Maria's personal /
 * professional relationships.
 *
 * Memory rule: feedback_bines_ai_no_real_names.md (locked 26 Apr 2026).
 *
 * Add new entries to BLOCKED_NAMES if a fresh first name ever surfaces in
 * a conversation as a real person.
 */
const BLOCKED_NAMES = [
  'Mike',
  'Michael',
  'Dan',
  'Daniel',
  'Jay',
  'Jason',
  'Liana',
  'Morgan',
  'Zac',
  'Zachary',
  'Olga',
  'Fel',
  'Felipe',
];

const SCAN_PATHS = [
  'content/fieldwork',
  'content/postcards',
  'content/now.mdx',
  'content/taste.mdx',
  'src/lib/chat/system-prompt.ts',
  'src/lib/chat/fieldwork-01.ts',
];

function gitGrepBlockedName(name: string): string {
  // Word-boundary match. -i case-insensitive. Returns matching lines or '' on no match.
  // The exclude pattern keeps test files from tripping the guard (the test itself
  // contains the blocklist).
  const cmd = [
    'git',
    'grep',
    '-iwn',
    '--',
    `'${name}'`,
    ...SCAN_PATHS.map((p) => `'${p}'`),
  ].join(' ');
  try {
    return execSync(cmd, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString();
  } catch (err: unknown) {
    const e = err as { status?: number };
    // git grep exits 1 when no matches found — that's the pass condition.
    if (e.status === 1) return '';
    throw err;
  }
}

describe('bines.ai privacy guard — no real names in published content', () => {
  for (const name of BLOCKED_NAMES) {
    it(`does not contain "${name}" in any visitor-facing surface`, () => {
      const matches = gitGrepBlockedName(name);
      expect(matches.trim()).toBe('');
    });
  }
});
