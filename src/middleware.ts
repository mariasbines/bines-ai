import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function middleware(req: NextRequest): NextResponse {
  const ua = (req.headers.get('user-agent') ?? '').toLowerCase();
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
