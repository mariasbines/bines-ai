import { EXCERPT_MAX_CHARS } from '@/lib/argue-judge/schema';

interface PushbackSummaryProps {
  count: number;
  landed: number;
  excerpts: string[];
}

/**
 * Component-level truncation. The judge schema already enforces
 * `excerpt.length <= EXCERPT_MAX_CHARS`, so under normal conditions this
 * function is a no-op. The defence is belt-and-braces against a future
 * schema relaxation or a hypothetical bypass (PB2-DAT-003). Cuts to the
 * last whitespace before the cap and appends " — " so it's visibly truncated;
 * falls back to a hard cut for no-whitespace overflow.
 */
function truncateExcerpt(text: string): string {
  if (text.length <= EXCERPT_MAX_CHARS) return text;
  const slice = text.slice(0, EXCERPT_MAX_CHARS);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut} — `;
}

/**
 * Public summary of judge verdicts on a Fieldwork piece. Server component.
 *
 * Returns null when count is zero — silent absence on pieces that haven't
 * accumulated verdicts yet. All visitor text is rendered as React text
 * nodes; this component NEVER uses dangerouslySetInnerHTML (PB2-SEC-004
 * hard guarantee). Loader supplies excerpts in confidence-descending order;
 * this component preserves that order.
 *
 * Voice-checked labels: "pushback", "landed", "anonymous". Author-controlled,
 * not visitor-controlled — drift is caught by `docs/argue-voice-check.md`.
 */
export function PushbackSummary({ count, landed, excerpts }: PushbackSummaryProps) {
  if (count === 0) return null;

  return (
    <section
      aria-label="Pushback summary"
      className="mt-12 pt-6 border-t border-ink/15"
    >
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60">
        pushback ({count})
      </p>
      {landed > 0 ? (
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink/60 mt-1">
          landed ({landed})
        </p>
      ) : null}
      {excerpts.length > 0 ? (
        <div className="mt-6 space-y-5">
          {excerpts.map((raw, i) => (
            <blockquote
              key={i}
              className="font-serif italic text-lg text-ink/80 border-l-2 border-accent pl-4"
            >
              <p>{truncateExcerpt(raw)}</p>
              <cite className="not-italic font-mono text-xs uppercase tracking-[0.14em] text-ink/50 block mt-2">
                — anonymous
              </cite>
            </blockquote>
          ))}
        </div>
      ) : null}
    </section>
  );
}
