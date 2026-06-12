import type { ArgueLogEntry } from '@/lib/argue-log/schema';

/**
 * The pure aggregator is separated from the Blob-reading loader so it can
 * be unit-tested without storage mocks. Loading lives in the page (it
 * composes readArgueLogDay, which is already tested in argue-log).
 */

export interface ArgueDayEntries {
  day: string;
  entries: ArgueLogEntry[];
}

export interface ArgueStats {
  /** Distinct conversations. Entries without a conversation_id (pre-Phase-A
   * log lines) each count as their own conversation — the honest reading
   * of a log line that cannot be threaded. */
  conversations: number;
  /** Total round-trips (one entry = one user turn answered or refused). */
  exchanges: number;
  refusals: number;
  /** Oldest → newest; zero-entry days included so the series has no gaps. */
  byDay: Array<{ day: string; conversations: number; exchanges: number }>;
  /** Fieldwork slugs visitors argued from, sorted desc. null from_slug
   * (direct /argue visits) reported under 'direct'. */
  topOrigins: Array<{ origin: string; exchanges: number }>;
  models: Array<{ model: string; exchanges: number }>;
}

export function aggregateArgueStats(days: ArgueDayEntries[]): ArgueStats {
  const allConversations = new Set<string>();
  const origins = new Map<string, number>();
  const models = new Map<string, number>();
  const byDay: ArgueStats['byDay'] = [];
  let exchanges = 0;
  let refusals = 0;
  let unthreaded = 0;

  for (const { day, entries } of days) {
    const dayConversations = new Set<string>();
    let dayUnthreaded = 0;
    for (const e of entries) {
      exchanges += 1;
      if (e.refused) refusals += 1;

      if (e.conversation_id) {
        allConversations.add(e.conversation_id);
        dayConversations.add(e.conversation_id);
      } else {
        unthreaded += 1;
        dayUnthreaded += 1;
      }

      const origin =
        e.from_slug === undefined || e.from_slug === null
          ? 'direct'
          : e.from_slug;
      origins.set(origin, (origins.get(origin) ?? 0) + 1);

      if (e.model) models.set(e.model, (models.get(e.model) ?? 0) + 1);
    }
    byDay.push({
      day,
      conversations: dayConversations.size + dayUnthreaded,
      exchanges: entries.length,
    });
  }

  const desc = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]);

  return {
    conversations: allConversations.size + unthreaded,
    exchanges,
    refusals,
    byDay,
    topOrigins: desc(origins).map(([origin, n]) => ({
      origin,
      exchanges: n,
    })),
    models: desc(models).map(([model, n]) => ({ model, exchanges: n })),
  };
}
