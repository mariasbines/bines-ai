import type { ReactNode } from 'react';
import Link from 'next/link';
import { Stamp } from './Stamp';
import { Wordmark } from './Wordmark';
import { Nav } from './Nav';
import { CurrentlyStrip } from './CurrentlyStrip';
import { AntipatternsStrip } from './AntipatternsStrip';
import { CURRENTLY_PLACEHOLDER, SITE_STATS_PLACEHOLDER } from '@/lib/content/site';

interface PageShellProps {
  children: ReactNode;
}

/**
 * Persistent chrome wrapping every page. Top bar = stamp + wordmark + nav,
 * then a "currently" data strip. Main content. Footer antipatterns.
 */
export function PageShell({ children }: PageShellProps) {
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
        <CurrentlyStrip
          currently={CURRENTLY_PLACEHOLDER}
          stats={{
            fieldwork: SITE_STATS_PLACEHOLDER.fieldwork,
            postcards: SITE_STATS_PLACEHOLDER.postcards,
            changedMyMind: SITE_STATS_PLACEHOLDER.changedMyMind,
          }}
          updated={SITE_STATS_PLACEHOLDER.updated}
        />
      </header>

      <main id="main-content" className="flex-1 px-6 sm:px-8 py-16 w-full max-w-4xl mx-auto">
        {children}
      </main>

      <footer className="border-t border-ink/12 px-6 sm:px-8 py-12 mt-24">
        <AntipatternsStrip />
      </footer>
    </div>
  );
}
