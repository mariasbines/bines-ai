import Link from 'next/link';

/**
 * Site footer — rendered beneath the AntipatternsStrip in PageShell.
 * Three things: dynamic copyright (so the year never goes stale), a small
 * link row to /about + /privacy + /argue, and a quiet "my own work, mostly"
 * tag that callbacks the /now closer.
 *
 * The copyright year is computed at SERVER render time (this is an RSC).
 * On Vercel the year flips automatically at the New Year UTC boundary on
 * the next request after 00:00 — no client work, no static-build staleness.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <div className="mt-10 pt-6 border-t border-ink/10 font-mono text-xs text-ink/55 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p>
        © {year} Maria Bines{' '}
        <span aria-hidden="true" className="text-ink/30">·</span>{' '}
        <span className="italic">my own work, mostly</span>
      </p>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 uppercase tracking-[0.14em]">
          <li>
            <Link href="/about" className="hover:text-ink transition-colors motion-reduce:transition-none">
              about
            </Link>
          </li>
          <li>
            <Link
              href="/privacy"
              className="hover:text-ink transition-colors motion-reduce:transition-none"
            >
              privacy
            </Link>
          </li>
          <li>
            <Link
              href="/argue"
              className="hover:text-ink transition-colors motion-reduce:transition-none"
            >
              argue
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
