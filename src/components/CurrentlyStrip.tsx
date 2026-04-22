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

/**
 * The "currently →" data strip. Two lines: the current thought + the site
 * stats. Prop-driven in this story; story 001.008 wires props to /now MDX.
 */
export function CurrentlyStrip({ currently, stats, updated, className }: CurrentlyStripProps) {
  return (
    <div
      className={`font-mono text-xs tracking-wide ${className ?? ''}`}
      aria-label="Current state of the site"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
        <span className="text-ink/60">currently</span>
        <span className="text-ruby" aria-hidden="true">→</span>
        <span>{currently}</span>
      </div>
      <div className="text-ink/60">
        {stats.fieldwork} fieldwork · {stats.postcards} postcards · {stats.changedMyMind} changed my mind · updated {FORMATTER.format(updated)}
      </div>
    </div>
  );
}
