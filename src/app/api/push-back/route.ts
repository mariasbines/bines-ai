import { PUSH_BACK } from '@/lib/push-back/schema';
import { getPushBackRatelimit } from '@/lib/push-back/rate-limit';
import { appendPushBack } from '@/lib/push-back/storage';

export const runtime = 'edge';

const GOVERNED_BY_HEADER = { 'X-Governed-By': 'bines.ai' } as const;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...GOVERNED_BY_HEADER },
  });
}

function errorResponse(
  status: number,
  error: string,
  category: 'rate-limited' | 'input' | 'upstream',
) {
  return jsonResponse(status, { error, category });
}

function getIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return 'unknown';
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'Invalid JSON body', 'input');
  }

  const parsed = PUSH_BACK.safeParse(body);
  if (!parsed.success) {
    // Honeypot rejection is treated the same as any other validation failure.
    return errorResponse(400, 'Invalid submission', 'input');
  }
  // Non-empty honeypot guards below-the-schema-too (defensive).
  if (parsed.data.website && parsed.data.website.length > 0) {
    return errorResponse(400, 'Invalid submission', 'input');
  }

  const ip = getIp(req);
  const rl = getPushBackRatelimit();
  if (rl) {
    const { success } = await rl.limit(ip);
    if (!success) {
      return errorResponse(
        429,
        "steady on — we've had a lot of pushback already. try again in a bit.",
        'rate-limited',
      );
    }
  }

  try {
    await appendPushBack({
      slug: parsed.data.slug,
      message: parsed.data.message,
      name: parsed.data.name || '',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(
      '[push-back] storage error:',
      err instanceof Error ? err.message : 'unknown',
    );
    return errorResponse(500, 'could not store your pushback; try again in a sec', 'upstream');
  }

  return jsonResponse(200, { ok: true });
}
