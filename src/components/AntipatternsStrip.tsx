import { ANTIPATTERNS } from '@/lib/content/antipatterns';

interface AntipatternsStripProps {
  className?: string;
}

/**
 * The "i don't do" list. Rendered in the footer via PageShell. Reads
 * from antipatterns.ts so the list is editable in one canonical place.
 */
export function AntipatternsStrip({ className }: AntipatternsStripProps) {
  return (
    <section
      aria-label="Things this site refuses to be"
      className={`font-mono text-xs ${className ?? ''}`}
    >
      <p className="uppercase tracking-[0.14em] text-ink/60 mb-3">i don&apos;t do</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 leading-relaxed">
        {ANTIPATTERNS.map((item, i) => (
          <li key={item} className="flex items-center gap-3">
            {i > 0 ? <span aria-hidden="true" className="text-ink/40">·</span> : null}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
