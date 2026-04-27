/**
 * Site footer — rendered beneath the AntipatternsStrip in PageShell.
 * Three things: dynamic copyright (so the year never goes stale), a small
 * link row to /about + /privacy + /argue, and a quiet "my own work, mostly"
 * tag that callbacks the /now closer.
 *
 * Footer links use plain <a> rather than next/link by design. PageShell is
 * a shared async server layout, and a Link click from the very bottom of a
 * long page leaves scroll parked at the footer — visually the page looks
 * unchanged even though routing succeeded. Hard navigation guarantees the
 * scroll reset to top, and these are low-traffic terminal pages where the
 * full reload cost is negligible. /argue benefits in particular: a fresh
 * load clears any prior chat state.
 *
 * The copyright year is computed at SERVER render time (this is an RSC).
 * On Vercel the year flips automatically at the New Year UTC boundary on
 * the next request after 00:00 — no client work, no static-build staleness.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const linkClass = 'hover:text-ink transition-colors motion-reduce:transition-none';

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
            <a href="/about" className={linkClass}>
              about
            </a>
          </li>
          <li>
            <a href="/privacy" className={linkClass}>
              privacy
            </a>
          </li>
          <li>
            <a href="/argue" className={linkClass}>
              argue
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
