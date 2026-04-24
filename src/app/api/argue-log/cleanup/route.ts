import { listArgueLogDays, deleteArgueLogDay } from '@/lib/argue-log/storage';

export const runtime = 'edge';

const GOVERNED_BY_HEADER = { 'X-Governed-By': 'bines.ai' } as const;
const RETENTION_DAYS = 90;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...GOVERNED_BY_HEADER },
  });
}

/**
 * Length-normalised, XOR-accumulator string comparison — no early-out on
 * content. Length-dependent early return is an accepted leak (reveals token
 * length, not content). No Node crypto.timingSafeEqual on edge runtime.
 * CRON_SECRET is documented as ASCII hex only in docs/argue-log-ops.md
 * (L-004 finding): BMP-range charCodeAt is exact for ASCII.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function daysBetween(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[argue-log-cleanup] CRON_SECRET unconfigured');
    return jsonResponse(500, { error: 'misconfigured' });
  }

  const auth = req.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (
    !auth.startsWith(prefix) ||
    !timingSafeEqual(auth.slice(prefix.length), secret)
  ) {
    return jsonResponse(401, { error: 'unauthorized' });
  }

  const now = new Date();
  const allDays = await listArgueLogDays();
  const deleted: string[] = [];
  let skipped = 0;

  for (const day of allDays) {
    // Defence-in-depth: storage already filters to well-formed keys, but
    // re-validate here before constructing any further state (AC-005).
    if (!DAY_KEY_RE.test(day)) {
      skipped++;
      continue;
    }
    const dayDate = new Date(`${day}T00:00:00Z`);
    if (Number.isNaN(dayDate.getTime())) {
      skipped++;
      continue;
    }
    if (daysBetween(now, dayDate) > RETENTION_DAYS) {
      await deleteArgueLogDay(day);
      deleted.push(day);
    } else {
      skipped++;
    }
  }

  return jsonResponse(200, { deleted, skipped });
}
