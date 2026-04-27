import Link from 'next/link';

interface CurrentlyStripProps {
  currently: string;
  stats: {
    fieldwork: number;
    postcards: number;
    changedMyMind: number;
  };
  updated: Date;
  className?: string;
}

// Intl.DateTimeFormat chosen over date-fns: no extra import, same en-GB output.
// date-fns is installed and available if future stories need richer formatting.
const FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const linkClass =
  'underline-offset-2 decoration-transparent hover:decoration-current decoration-1 underline transition-colors hover:text-ink/90 motion-reduce:transition-none';

/**
 * The "currently →" data strip. Two lines: the current thought + the site
 * stats. Each count is a quiet link to its index — no shouty button styling,
 * just an underline-on-hover that rewards the curious without pretending to
 * be a CTA.
 */
export function CurrentlyStrip({ currently, stats, updated, className }: CurrentlyStripProps) {
  return (
    <div
      className={`font-mono text-xs tracking-wide ${className ?? ''}`}
      aria-label="Current state of the site"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
        <span className="text-ink/60">currently</span>
        <span className="accent-cycle" aria-hidden="true">→</span>
        <span>{currently}</span>
      </div>
      <div className="text-ink/60">
        {stats.fieldwork}{' '}
        <Link href="/fieldwork" className={linkClass}>
          fieldwork
        </Link>
        {' · '}
        {stats.postcards}{' '}
        <Link href="/postcards" className={linkClass}>
          postcards
        </Link>
        {' · '}
        {stats.changedMyMind}{' '}
        <Link href="/changed-my-mind" className={linkClass}>
          changed my mind
        </Link>
        {' · updated '}{FORMATTER.format(updated)}
      </div>
    </div>
  );
}
