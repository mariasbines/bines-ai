import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { identifyAiCrawler } from '@/lib/stats/ai-crawlers';
import { appendCrawlerHit } from '@/lib/stats/crawler-log/append';

/**
 * User-Agent substrings of bots that ignore robots.txt's disallow directive.
 * Match is case-insensitive against the request's UA header.
 */
const BLOCKED_BOT_UA = [
  'bytespider',
  'bytedance',
  'amazonbot',
  'ahrefsbot',
  'semrushbot',
  'mj12bot',
  'dotbot',
  'petalbot',
  'megaindex',
  'serpstatbot',
];

const SNARK = `not invited.

if you can read this, you are a bot that ignored the door sign at bines.ai/robots.txt.
that's a choice. close the tab.

if you have a name and a working memory, you are welcome at bines.ai/argue like everyone else.

— maria
`;

const ADMIN_REALM = 'bines.ai admin';

/**
 * Constant-time string compare. Edge runtime has no Node `crypto.timingSafeEqual`,
 * so this is a hand-rolled equivalent. Length-and-content compare without
 * early-out — the password length is documented as ASCII to keep
 * `charCodeAt` exact.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function unauthorized(): NextResponse {
  return new NextResponse('authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${ADMIN_REALM}"`,
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Governed-By': 'bines.ai',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * HTTP Basic Auth gate for admin routes (ADMIN_PATHS). Reads `ARGUE_LOG_PASSWORD` from
 * the environment; fail-closed (503) if unconfigured. Username is ignored
 * — the password alone is the secret. Returns null when the request is
 * authorised; returns a 401 response otherwise.
 */
function checkAdminAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.ARGUE_LOG_PASSWORD;
  if (!expected) {
    return new NextResponse('admin route is not configured', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Governed-By': 'bines.ai',
        'Cache-Control': 'no-store',
      },
    });
  }
  const header = req.headers.get('authorization') ?? '';
  const prefix = 'Basic ';
  if (!header.startsWith(prefix)) return unauthorized();
  let decoded: string;
  try {
    decoded = atob(header.slice(prefix.length));
  } catch {
    return unauthorized();
  }
  const colonIndex = decoded.indexOf(':');
  const password = colonIndex < 0 ? decoded : decoded.slice(colonIndex + 1);
  if (!timingSafeEqual(password, expected)) return unauthorized();
  return null;
}

/** Admin-only path prefixes — basic auth gate (shared ARGUE_LOG_PASSWORD). */
const ADMIN_PATHS = ['/argue/log', '/stats'];

export function middleware(req: NextRequest, event: NextFetchEvent): NextResponse {
  const path = req.nextUrl.pathname;

  if (ADMIN_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    const denied = checkAdminAuth(req);
    if (denied) return denied;
  }

  const rawUa = req.headers.get('user-agent') ?? '';
  const ua = rawUa.toLowerCase();
  if (ua && BLOCKED_BOT_UA.some((needle) => ua.includes(needle))) {
    return new NextResponse(SNARK, {
      status: 403,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Governed-By': 'bines.ai',
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'no-store',
      },
    });
  }

  // AEO signal: invited AI crawlers don't run the client analytics script,
  // so they're invisible to Vercel Web Analytics. Log their page fetches to
  // Blob for the /stats AEO panel. Fire-and-forget after the response — a
  // logging failure must never break a crawler's (or anyone's) request.
  const bot = identifyAiCrawler(rawUa);
  if (bot && !path.startsWith('/api/')) {
    event.waitUntil(
      appendCrawlerHit({
        schema_version: 1,
        timestamp: new Date().toISOString(),
        bot,
        path: path.slice(0, 500),
        ua: rawUa.slice(0, 300),
      }).catch(() => {
        // Swallowed by design — observability must not affect availability.
      }),
    );
  }

  return NextResponse.next();
}

/**
 * Run on every route except Next internals, static media, and the
 * argue-judge live endpoints (which need to be reachable from any UA on
 * page-close beacons — UA can be empty or weird there).
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|media/|stamp.svg|favicon.ico).*)'],
};
