import type { Metadata } from 'next';
import { readArgueLogDay, listArgueLogDays } from '@/lib/argue-log/storage';
import { dayKeyUtc } from '@/lib/argue-log/day';
import { aggregateArgueStats, type ArgueStats } from '@/lib/stats/argue-stats';
import { readCrawlerStats, type CrawlerStats } from '@/lib/stats/crawler-log/read';
import { readVisitStats, type VisitStats } from '@/lib/stats/vercel-analytics';
import {
  readSearchConsoleStats,
  splitBrandQueries,
  type SearchConsoleStats,
} from '@/lib/stats/search-console';

/**
 * /stats — Maria's private analytics dashboard.
 *
 * Four panels, each with an honest empty/unconfigured state (a panel that
 * can't reach its data says so — it never shows a confident zero):
 *   visits  — Vercel Web Analytics read-back (sapphire)
 *   argue   — chat usage aggregated from the argue-log (ruby)
 *   aeo     — invited AI-crawler fetches + AI-surface referrals (amethyst)
 *   seo     — Google Search Console performance (emerald)
 *
 * Gated by Basic auth in middleware.ts (shared ARGUE_LOG_PASSWORD), hidden
 * from robots, absent from the sitemap, linked from nowhere. Server-rendered
 * HTML only — no client JavaScript, charts are CSS bars.
 */

export const metadata: Metadata = {
  title: 'stats',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 28;

function lastNDays(n: number, now: Date): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(dayKeyUtc(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return out;
}

async function loadArgueStats(now: Date): Promise<ArgueStats | null> {
  try {
    const windowDays = lastNDays(WINDOW_DAYS, now);
    // Only fetch days that actually exist in Blob — listArgueLogDays is one
    // call; absent days contribute empty entries to keep the series gapless.
    const present = new Set(await listArgueLogDays());
    const days = await Promise.all(
      windowDays.map(async (day) => ({
        day,
        entries: present.has(day) ? await readArgueLogDay(day) : [],
      })),
    );
    return aggregateArgueStats(days);
  } catch {
    return null;
  }
}

async function loadCrawlerStats(now: Date): Promise<CrawlerStats | null> {
  try {
    return await readCrawlerStats(WINDOW_DAYS, { now });
  } catch {
    return null;
  }
}

/* ---------- presentation ---------- */

type Jewel = 'sapphire' | 'ruby' | 'amethyst' | 'emerald';

const JEWEL_TEXT: Record<Jewel, string> = {
  sapphire: 'text-sapphire',
  ruby: 'text-ruby',
  amethyst: 'text-amethyst',
  emerald: 'text-emerald',
};

const JEWEL_BG: Record<Jewel, string> = {
  sapphire: 'bg-sapphire',
  ruby: 'bg-ruby',
  amethyst: 'bg-amethyst',
  emerald: 'bg-emerald',
};

function Panel({
  title,
  jewel,
  children,
}: {
  title: string;
  jewel: Jewel;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-ink/10 py-8 first:border-t-0">
      <h2
        className={`font-mono text-xs uppercase tracking-wider mb-5 ${JEWEL_TEXT[jewel]}`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function BigNumber({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-serif text-4xl font-light text-ink">{value}</div>
      <div className="font-mono text-xs text-ink/50 mt-1">{label}</div>
    </div>
  );
}

function Unavailable({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink/60 m-0">{children}</p>;
}

/** Server-rendered bar chart — one row per day, width as % of max. */
function DayBars({
  points,
  jewel,
}: {
  points: Array<{ day: string; value: number }>;
  jewel: Jewel;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="flex items-end gap-px h-16 mt-4" aria-hidden>
      {points.map((p) => (
        <div
          key={p.day}
          title={`${p.day}: ${p.value}`}
          className={`flex-1 min-w-0 ${p.value > 0 ? JEWEL_BG[jewel] : 'bg-ink/10'}`}
          style={{ height: `${Math.max(2, Math.round((p.value / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}

function RankTable({
  rows,
  valueLabel,
}: {
  rows: Array<{ label: string; value: number; badge?: string | null }>;
  valueLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink/50 m-0">nothing yet</p>;
  }
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <table className="w-full text-sm border-collapse">
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.label}-${i}`} className="border-t border-ink/5 first:border-t-0">
            <td className="py-1.5 pr-3 font-mono text-xs text-ink/80 break-all">
              {r.label}
              {r.badge ? (
                <span className="ml-2 text-amethyst font-medium">
                  [{r.badge}]
                </span>
              ) : null}
            </td>
            <td className="py-1.5 w-24 text-right font-mono text-xs text-ink/60">
              {r.value.toLocaleString('en-GB')} {valueLabel}
            </td>
            <td className="py-1.5 pl-3 w-1/4" aria-hidden>
              <div
                className="h-1.5 bg-ink/15"
                style={{ width: `${Math.round((r.value / max) * 100)}%` }}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-xs text-ink/50 mt-6 mb-2">{children}</h3>
  );
}

/* ---------- panels ---------- */

function VisitsPanel({ visits }: { visits: VisitStats | null }) {
  if (!visits) {
    return (
      <Unavailable>
        not configured — set VERCEL_API_TOKEN, VERCEL_PROJECT_ID and
        VERCEL_TEAM_ID.
      </Unavailable>
    );
  }
  if (visits.unavailable) {
    return (
      <Unavailable>
        temporarily unavailable — the Vercel analytics endpoints did not
        answer (this is not the same as zero traffic).
      </Unavailable>
    );
  }
  return (
    <>
      <div className="flex flex-wrap gap-x-12 gap-y-4">
        <BigNumber
          label="page views"
          value={(visits.pageViews ?? 0).toLocaleString('en-GB')}
        />
        <BigNumber
          label="visitors"
          value={(visits.visitors ?? 0).toLocaleString('en-GB')}
        />
        <BigNumber
          label="bounce rate"
          value={`${Math.round((visits.bounceRate ?? 0) * 100)}%`}
        />
      </div>
      <DayBars
        points={visits.timeSeries.map((p) => ({
          day: p.date,
          value: p.views,
        }))}
        jewel="sapphire"
      />
      <SubHeading>top pages</SubHeading>
      <RankTable
        rows={visits.topPages.map((p) => ({ label: p.path, value: p.views }))}
        valueLabel="views"
      />
      <SubHeading>referrers · AI surfaces + LinkedIn tagged</SubHeading>
      <RankTable
        rows={visits.referrers.map((r) => ({
          label: r.source || '(direct)',
          value: r.views,
          badge: r.aiSurface ?? r.socialSurface,
        }))}
        valueLabel="views"
      />
    </>
  );
}

function ArguePanel({ argue }: { argue: ArgueStats | null }) {
  if (!argue) {
    return (
      <Unavailable>argue-log unreadable — check BLOB_READ_WRITE_TOKEN.</Unavailable>
    );
  }
  return (
    <>
      <div className="flex flex-wrap gap-x-12 gap-y-4">
        <BigNumber
          label="conversations"
          value={argue.conversations.toLocaleString('en-GB')}
        />
        <BigNumber
          label="exchanges"
          value={argue.exchanges.toLocaleString('en-GB')}
        />
        <BigNumber
          label="refusals"
          value={argue.refusals.toLocaleString('en-GB')}
        />
      </div>
      <DayBars
        points={argue.byDay.map((d) => ({ day: d.day, value: d.exchanges }))}
        jewel="ruby"
      />
      <SubHeading>argued from</SubHeading>
      <RankTable
        rows={argue.topOrigins.map((o) => ({
          label: o.origin,
          value: o.exchanges,
        }))}
        valueLabel="exch."
      />
      <SubHeading>models</SubHeading>
      <RankTable
        rows={argue.models.map((m) => ({ label: m.model, value: m.exchanges }))}
        valueLabel="exch."
      />
    </>
  );
}

function AeoPanel({
  crawlers,
  visits,
}: {
  crawlers: CrawlerStats | null;
  visits: VisitStats | null;
}) {
  const aiReferrals = (visits?.referrers ?? []).filter((r) => r.aiSurface);
  const aiReferralViews = aiReferrals.reduce((sum, r) => sum + r.views, 0);

  if (!crawlers) {
    return (
      <Unavailable>
        crawler log unreadable — check BLOB_READ_WRITE_TOKEN.
      </Unavailable>
    );
  }
  return (
    <>
      <div className="flex flex-wrap gap-x-12 gap-y-4">
        <BigNumber
          label="AI crawler fetches"
          value={crawlers.totalHits.toLocaleString('en-GB')}
        />
        <BigNumber
          label="visits referred by AI answers"
          value={aiReferralViews.toLocaleString('en-GB')}
        />
        <BigNumber
          label="llms.txt fetches"
          value={crawlers.llmsTxtHits.toLocaleString('en-GB')}
        />
      </div>
      <DayBars
        points={crawlers.byDay.map((d) => ({ day: d.day, value: d.hits }))}
        jewel="amethyst"
      />
      <SubHeading>by crawler</SubHeading>
      <RankTable
        rows={crawlers.byBot.map((b) => ({ label: b.botSlug, value: b.hits }))}
        valueLabel="fetches"
      />
      <SubHeading>what they read</SubHeading>
      <RankTable
        rows={crawlers.topPaths.map((p) => ({ label: p.path, value: p.hits }))}
        valueLabel="fetches"
      />
      {crawlers.totalHits === 0 ? (
        <p className="text-xs text-ink/50 mt-4">
          counting started when this page shipped — crawlers usually show up
          within days.
        </p>
      ) : null}
    </>
  );
}

function SeoPanel({ seo }: { seo: SearchConsoleStats }) {
  if (seo.status === 'unconfigured') {
    return (
      <Unavailable>
        not connected — verify bines.ai in Google Search Console, then set
        GSC_CLIENT_EMAIL and GSC_PRIVATE_KEY.
      </Unavailable>
    );
  }
  if (seo.status === 'error') {
    return <Unavailable>Search Console error: {seo.message}</Unavailable>;
  }
  const { brand, topic, brandPosition } = splitBrandQueries(seo.queries);
  const queryRow = (q: (typeof seo.queries)[number]) => ({
    label: `${q.keys[0] ?? ''} · pos ${Math.round(q.position * 10) / 10}`,
    value: q.impressions,
  });
  return (
    <>
      <div className="flex flex-wrap gap-x-12 gap-y-4">
        <BigNumber
          label="clicks"
          value={seo.totals.clicks.toLocaleString('en-GB')}
        />
        <BigNumber
          label="impressions"
          value={seo.totals.impressions.toLocaleString('en-GB')}
        />
        <BigNumber
          label="avg position"
          value={seo.totals.position === null ? '—' : String(seo.totals.position)}
        />
        <BigNumber
          label="your name, avg position"
          value={brandPosition === null ? '—' : String(brandPosition)}
        />
      </div>
      <SubHeading>your name (the query you should own)</SubHeading>
      <RankTable rows={brand.map(queryRow)} valueLabel="impr." />
      <SubHeading>topic queries</SubHeading>
      <RankTable rows={topic.map(queryRow)} valueLabel="impr." />
      <SubHeading>pages</SubHeading>
      <RankTable
        rows={seo.pages.map((p) => ({
          label: (p.keys[0] ?? '').replace('https://bines.ai', '') || '/',
          value: p.impressions,
        }))}
        valueLabel="impr."
      />
    </>
  );
}

/* ---------- page ---------- */

export default async function StatsPage() {
  const now = new Date();
  const [visits, argue, crawlers, seo] = await Promise.all([
    readVisitStats(WINDOW_DAYS, { now }),
    loadArgueStats(now),
    loadCrawlerStats(now),
    readSearchConsoleStats(WINDOW_DAYS, { now }),
  ]);

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-light text-ink m-0">stats</h1>
        <p className="font-mono text-xs text-ink/50 mt-2 m-0">
          trailing {WINDOW_DAYS} days · admin-only · rendered{' '}
          {now.toISOString().slice(0, 16).replace('T', ' ')} utc
        </p>
      </header>

      <Panel title="visits" jewel="sapphire">
        <VisitsPanel visits={visits} />
      </Panel>

      <Panel title="argue — the chatbot" jewel="ruby">
        <ArguePanel argue={argue} />
      </Panel>

      <Panel title="aeo — answer engines" jewel="amethyst">
        <AeoPanel crawlers={crawlers} visits={visits} />
      </Panel>

      <Panel title="seo — google search" jewel="emerald">
        <SeoPanel seo={seo} />
      </Panel>
    </main>
  );
}
