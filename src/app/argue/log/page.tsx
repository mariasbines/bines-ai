import type { Metadata } from 'next';
import Link from 'next/link';
import { readArgueLogDay, listArgueLogDays } from '@/lib/argue-log/storage';
import { isValidDayKey, dayKeyUtc } from '@/lib/argue-log/day';
import type { ArgueLogEntry } from '@/lib/argue-log/schema';

/**
 * /argue/log — Maria's read-only admin view of the conversation log.
 *
 * Gated by Vercel Deployment Protection at the project level (no app-level
 * auth). Hidden from robots, not linked from anywhere on the site, not
 * listed in the sitemap.
 *
 * Server-rendered HTML only — no client JavaScript. Day-by-day navigation.
 * Harm-flagged entries scrubbed behind a native <details> by default
 * (operator-wellbeing mitigation per ARGUE-PRV-001).
 */
export const metadata: Metadata = {
  title: 'argue log',
  robots: { index: false, follow: false },
};

// Next 15 App Router: searchParams is a Promise that must be awaited.
interface PageProps {
  searchParams: Promise<{ day?: string }>;
}

function summariseVerdict(v: ArgueLogEntry['verdict']): {
  label: string;
  tone: 'neutral' | 'warn' | 'alarm';
} {
  if (v.harm !== 'none') {
    return { label: `harm: ${v.harm}`, tone: 'alarm' };
  }
  if (v.off_brand.length > 0) {
    return { label: `off-brand: ${v.off_brand.join(', ')}`, tone: 'warn' };
  }
  return { label: 'clean', tone: 'neutral' };
}

function verdictClass(tone: 'neutral' | 'warn' | 'alarm'): string {
  if (tone === 'alarm') return 'text-ruby';
  if (tone === 'warn') return 'text-amber-700';
  return 'text-ink/70';
}

function EntryTurns({ entry }: { entry: ArgueLogEntry }) {
  return (
    <ol className="mt-3 space-y-3 list-none pl-0">
      {entry.turns.map((turn, i) => (
        <li key={i} className="text-sm">
          <div className="font-mono text-xs uppercase tracking-wider text-ink/50 mb-1">
            {turn.role}
          </div>
          <pre className="whitespace-pre-wrap font-serif text-ink/90 leading-relaxed m-0">
            {turn.content}
          </pre>
        </li>
      ))}
    </ol>
  );
}

function EntryCard({ entry }: { entry: ArgueLogEntry }) {
  const v = summariseVerdict(entry.verdict);
  const shortHash = entry.ip_hash.slice(0, 12);
  const preFlight = entry.latency_ms.pre_flight;
  const stream =
    entry.latency_ms.stream === null ? '—' : `${entry.latency_ms.stream}ms`;
  const scrubbed = entry.verdict.harm !== 'none';

  const header = (
    <header className="text-xs font-mono text-ink/70 flex flex-wrap gap-x-4 gap-y-1 mb-2">
      <span>{entry.timestamp}</span>
      <span>ip {shortHash}…</span>
      <span>{entry.turns.length} turns</span>
      <span className={verdictClass(v.tone)}>{v.label}</span>
      {entry.refused ? <span className="text-ruby">refused</span> : null}
      <span>{entry.model || '(refusal)'}</span>
      <span>
        pre-flight {preFlight}ms · stream {stream}
      </span>
      {entry.guard_signals.length > 0 ? (
        <span>guard: {entry.guard_signals.join(',')}</span>
      ) : null}
    </header>
  );

  if (scrubbed) {
    return (
      <section className="border-t border-ink/10 py-4 first:border-t-0">
        {header}
        <details>
          <summary className="cursor-pointer text-sm text-ink/60 hover:text-ink">
            hidden — flagged as: {entry.verdict.harm}
          </summary>
          <EntryTurns entry={entry} />
        </details>
      </section>
    );
  }

  return (
    <section className="border-t border-ink/10 py-4 first:border-t-0">
      {header}
      <EntryTurns entry={entry} />
    </section>
  );
}

function Sidebar({ days, activeDay }: { days: string[]; activeDay: string }) {
  return (
    <aside className="sm:w-56 shrink-0">
      <h2 className="font-mono text-xs uppercase tracking-wider text-ink/50 mb-3">
        days
      </h2>
      {days.length === 0 ? (
        <p className="text-sm text-ink/60">no days yet</p>
      ) : (
        <ul className="space-y-1 list-none pl-0">
          {days.map((d) => (
            <li key={d}>
              <Link
                href={`/argue/log?day=${d}`}
                className={
                  d === activeDay
                    ? 'text-sm font-mono underline'
                    : 'text-sm font-mono text-ink/70 hover:text-ink'
                }
              >
                {d}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function DayNav({
  days,
  activeDay,
}: {
  days: string[];
  activeDay: string;
}) {
  // `days` arrives sorted newest-first (listArgueLogDays contract).
  const idx = days.indexOf(activeDay);
  // Newer day = one slot earlier in the newest-first list.
  const newer = idx > 0 ? days[idx - 1] : null;
  // Older day = one slot later.
  const older =
    idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null;

  return (
    <nav
      className="flex gap-4 text-xs font-mono"
      aria-label="day navigation"
    >
      {older ? (
        <Link rel="prev" href={`/argue/log?day=${older}`} className="underline">
          ← {older}
        </Link>
      ) : (
        <span className="text-ink/30">← older</span>
      )}
      {newer ? (
        <Link rel="next" href={`/argue/log?day=${newer}`} className="underline">
          {newer} →
        </Link>
      ) : null}
    </nav>
  );
}

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;
  const requestedDay = sp.day;
  const invalidDay =
    typeof requestedDay === 'string' && !isValidDayKey(requestedDay);

  const activeDay =
    typeof requestedDay === 'string' && isValidDayKey(requestedDay)
      ? requestedDay
      : dayKeyUtc();

  let entries: ArgueLogEntry[] = [];
  let days: string[] = [];
  let storageFailed = false;

  try {
    [entries, days] = await Promise.all([
      invalidDay ? Promise.resolve([] as ArgueLogEntry[]) : readArgueLogDay(activeDay),
      listArgueLogDays(),
    ]);
  } catch (err) {
    // Log only metadata — error message is a string, may include sensitive
    // details. Use err.name to keep the signal but not the payload.
    console.error(
      '[argue-log page] read failed:',
      err instanceof Error ? err.name : 'unknown',
    );
    storageFailed = true;
  }

  return (
    <div className="max-w-5xl">
      {/* Belt-and-braces: inline noindex in addition to the metadata export. */}
      <meta name="robots" content="noindex, nofollow" />

      <header className="mb-8">
        <h1 className="font-serif font-black text-4xl tracking-tight mb-2">
          argue log
        </h1>
        <p className="font-mono text-xs text-ink/60">
          read-only · scrub-by-default on harm · UTC days
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-10">
        <Sidebar days={days} activeDay={activeDay} />

        <main className="flex-1 min-w-0">
          {storageFailed ? (
            <p className="text-sm text-ruby">log temporarily unreadable.</p>
          ) : invalidDay ? (
            <p className="text-sm text-ink/70">not a valid day.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <h2 className="font-mono text-sm text-ink/80">
                  {activeDay}
                </h2>
                <DayNav days={days} activeDay={activeDay} />
              </div>

              {entries.length === 0 ? (
                <p className="text-sm text-ink/60">
                  no conversations on this day.
                </p>
              ) : (
                <div>
                  {entries.map((e, i) => (
                    <EntryCard key={`${e.timestamp}-${i}`} entry={e} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
