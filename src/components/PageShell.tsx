import type { ReactNode } from 'react';
import Link from 'next/link';
import { Stamp } from './Stamp';
import { Wordmark } from './Wordmark';
import { Nav } from './Nav';
import { CurrentlyStrip } from './CurrentlyStrip';
import { AntipatternsStrip } from './AntipatternsStrip';
import { Footer } from './Footer';
import { CURRENTLY_PLACEHOLDER, SITE_STATS_PLACEHOLDER } from '@/lib/content/site';
import { getCurrentlyLine } from '@/lib/content/now';
import { getSiteStats } from '@/lib/content/stats';

interface PageShellProps {
  children: ReactNode;
}

/**
 * Persistent chrome wrapping every page. Top bar = stamp + wordmark + nav,
 * then a "currently" data strip. Main content. Footer antipatterns.
 *
 * Async server component — fetches live /now + stats. Falls back to
 * placeholders when content is absent (dev state or partial seeding).
 */
export async function PageShell({ children }: PageShellProps) {
  const [currentlyLine, stats] = await Promise.all([getCurrentlyLine(), getSiteStats()]);

  const currently = currentlyLine ?? CURRENTLY_PLACEHOLDER;
  const currentlyStats = {
    fieldwork: stats.fieldworkCount,
    postcards: stats.postcardCount,
    changedMyMind: stats.changedMyMindCount,
  };
  // If stats.updated is the epoch fallback (no content at all), use the placeholder date.
  const updated =
    stats.updated.getTime() === new Date('1970-01-01T00:00:00Z').getTime()
      ? SITE_STATS_PLACEHOLDER.updated
      : stats.updated;

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:text-paper focus:px-3 focus:py-2 focus:rounded"
      >
        Skip to content
      </a>

      <header className="border-b border-ink/12 px-6 sm:px-8 pt-6 pb-5">
        <div className="flex items-center justify-between gap-6 flex-wrap mb-4">
          <Link
            href="/"
            aria-label="bines.ai home"
            className="flex items-center gap-3 text-ink hover:text-ink/80 transition-opacity duration-150 motion-reduce:transition-none"
          >
            <Stamp size={56} />
            <Wordmark />
          </Link>
          <Nav />
        </div>
        <CurrentlyStrip currently={currently} stats={currentlyStats} updated={updated} />
      </header>

      <main id="main-content" className="flex-1 px-6 sm:px-8 py-16 w-full max-w-4xl mx-auto">
        {children}
      </main>

      <footer className="border-t border-ink/12 px-6 sm:px-8 py-12 mt-24">
        <AntipatternsStrip />
        <Footer />
      </footer>
    </div>
  );
}
