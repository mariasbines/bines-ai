#!/usr/bin/env node
// Automated Claude PR review. Runs in GitHub Actions on PR open/sync targeting master.
// See .github/workflows/claude-review.yml for invocation context.

import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const {
  ANTHROPIC_API_KEY,
  GITHUB_TOKEN,
  PR_NUMBER,
  PR_TITLE = '',
  PR_BODY = '',
  REPO,
} = process.env;

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1500;
const MAX_DIFF_CHARS = 40000;
const MAX_ARCH_CHARS = 8000;

const BOT_HEADER =
  '### 🤖 Claude review\n\n' +
  '*Automated review by Claude Sonnet 4.6. Advisory only — human approval still required. ' +
  'Reply to this comment if you disagree; label the PR `skip-review` to bypass next time.*\n\n';

const SYSTEM_PROMPT = `You are reviewing a pull request for bines.ai — Maria Bines's personal site. You are being called automatically by GitHub Actions; your output will be posted as a PR comment.

Review rubric — check these five things, in this order:

1. Correctness — does the code match what the story says it should do? Cite ACs.
2. Scope — does the change stay within the "Files to Modify" list in the story? Flag any out-of-scope edits.
3. Security — hardcoded secrets, XSS paths (plain-text chat output), prompt-injection gaps in chat code, API key exposure via NEXT_PUBLIC_*, unvalidated user input reaching storage.
4. Regression risk — what existing behaviour might this break? Be concrete: "if X relied on Y, this changes it."
5. Voice drift — if touching content (MDX), system prompts, or user-facing copy, does it still match CLAUDE.md's voice rules (diagnostic not confessional, British+Southern+Canadian register, contrarian first, leave a question hanging, no corporate hedging)?

Output shape (stay under 400 words total):

## Must-fix
<issues that block merge; file:line citations where possible>

## Suggestions
<nice-to-haves; OK as follow-up>

## Nothing to flag
<only populate if the PR is clean — leave Must-fix and Suggestions empty in that case>

Be specific. Prefer file:line citations over vague advice. If you have nothing to say, say exactly that.`;

function extractStoryId(title, body) {
  const titleMatch = /\[(\d{3}\.\d{3})\]/.exec(title);
  if (titleMatch) return titleMatch[1];
  const bodyMatch = /story:?\s*(\d{3}\.\d{3})/i.exec(body);
  if (bodyMatch) return bodyMatch[1];
  return null;
}

async function readIfExists(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

async function main() {
  if (!ANTHROPIC_API_KEY) {
    console.log(
      'ANTHROPIC_API_KEY not set — skipping review. Expected on first run before the secret is configured.',
    );
    process.exit(0);
  }
  if (!PR_NUMBER || !REPO) {
    throw new Error('PR_NUMBER and REPO env vars are required');
  }

  const diff = execSync(`gh pr diff ${PR_NUMBER} --repo ${REPO}`, {
    encoding: 'utf8',
    env: { ...process.env, GH_TOKEN: GITHUB_TOKEN },
  });
  const truncatedDiff =
    diff.length > MAX_DIFF_CHARS
      ? diff.slice(0, MAX_DIFF_CHARS) + '\n\n[diff truncated — original was ' + diff.length + ' chars]'
      : diff;

  const storyId = extractStoryId(PR_TITLE, PR_BODY);
  const storyPath = storyId
    ? `.isaac/epics/launch/artifacts/06-story-${storyId}.md`
    : null;
  const storyContent = storyPath ? await readIfExists(storyPath) : null;
  const claudeMd = (await readIfExists('CLAUDE.md')) || '';
  const architectureMd =
    (await readIfExists('.isaac/epics/launch/artifacts/03-architecture.md')) || '';

  const userContent = [
    `# PR #${PR_NUMBER}`,
    `Title: ${PR_TITLE}`,
    '',
    storyId
      ? `Story referenced: **${storyId}**\n\n### Story spec\n\n${storyContent || '(story file missing at ' + storyPath + ')'}`
      : '(no story ID detected in title or body — PR may be a meta change)',
    '',
    '### CLAUDE.md (project rules)',
    '',
    claudeMd,
    '',
    '### Architecture doc (relevant excerpts)',
    '',
    architectureMd.slice(0, MAX_ARCH_CHARS),
    '',
    '### PR diff',
    '',
    '```diff',
    truncatedDiff,
    '```',
  ].join('\n');

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const reviewText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  const commentBody = BOT_HEADER + reviewText;
  const tmpFile = `/tmp/claude-review-${PR_NUMBER}.md`;
  await writeFile(tmpFile, commentBody);

  execSync(`gh pr comment ${PR_NUMBER} --repo ${REPO} --body-file ${tmpFile}`, {
    env: { ...process.env, GH_TOKEN: GITHUB_TOKEN },
    stdio: 'inherit',
  });

  console.log(`✓ Claude review posted on PR #${PR_NUMBER}`);
}

main().catch((err) => {
  console.error('Claude review failed:', err);
  process.exit(1);
});
