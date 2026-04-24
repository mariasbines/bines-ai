import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import type { ArgueLogEntry } from '@/lib/argue-log/schema';

// Mock the storage module at the top level. readArgueLogDay + listArgueLogDays
// are awaited inside the Server Component.
vi.mock('@/lib/argue-log/storage', () => ({
  readArgueLogDay: vi.fn(),
  listArgueLogDays: vi.fn(),
}));

import { readArgueLogDay, listArgueLogDays } from '@/lib/argue-log/storage';

const readMock = vi.mocked(readArgueLogDay);
const listMock = vi.mocked(listArgueLogDays);

const HEX64 = 'a'.repeat(64);

function makeEntry(overrides: Partial<ArgueLogEntry> = {}): ArgueLogEntry {
  return {
    schema_version: 1,
    timestamp: '2026-04-24T12:00:00.000Z',
    ip_hash: HEX64,
    salt_version: 'current',
    turns: [
      { role: 'user', content: 'hello there' },
      { role: 'assistant', content: 'hi back' },
    ],
    guard_signals: [],
    verdict: { harm: 'none', off_brand: [] },
    refused: false,
    model: 'claude-sonnet-4-6',
    latency_ms: { pre_flight: 45, stream: 320 },
    ...overrides,
  };
}

beforeEach(() => {
  readMock.mockReset();
  listMock.mockReset();
  // Default: no days, no entries. Individual tests override.
  readMock.mockResolvedValue([]);
  listMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderPage(searchParams: Record<string, string> = {}) {
  // Fresh-import so the module-level searchParams Promise is re-evaluated.
  const mod = await import('../page');
  const Page = mod.default;
  const sp = Promise.resolve(searchParams);
  const element = await Page({ searchParams: sp });
  return render(element);
}

describe('/argue/log page', () => {
  describe('AC-002 — default day + ?day param + invalid day', () => {
    it("defaults to today's UTC day when ?day is absent", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-24T08:00:00Z'));
      listMock.mockResolvedValue(['2026-04-24']);
      readMock.mockResolvedValue([makeEntry()]);

      await renderPage();

      expect(readMock).toHaveBeenCalledWith('2026-04-24');
    });

    it('uses ?day=YYYY-MM-DD when provided', async () => {
      listMock.mockResolvedValue(['2026-04-22', '2026-04-24']);
      readMock.mockResolvedValue([
        makeEntry({ timestamp: '2026-04-22T10:00:00.000Z' }),
      ]);

      await renderPage({ day: '2026-04-22' });

      expect(readMock).toHaveBeenCalledWith('2026-04-22');
    });

    it('renders a polite error on invalid day (no storage read, 200)', async () => {
      const { container } = await renderPage({ day: 'nope' });

      expect(readMock).not.toHaveBeenCalled();
      expect(container.textContent).toMatch(/not a valid day|invalid day/i);
      // Sidebar index still rendered (day nav functional).
      expect(listMock).toHaveBeenCalled();
    });
  });

  describe('AC-003 — entry header rendering', () => {
    it('shows timestamp, first 12 chars of ip hash, turn count, verdict, refused, model, latencies', async () => {
      listMock.mockResolvedValue(['2026-04-24']);
      readMock.mockResolvedValue([
        makeEntry({
          timestamp: '2026-04-24T12:00:00.000Z',
          ip_hash: 'b'.repeat(64),
          turns: [
            { role: 'user', content: 'q1' },
            { role: 'assistant', content: 'a1' },
          ],
          model: 'claude-sonnet-4-6',
          latency_ms: { pre_flight: 55, stream: 410 },
        }),
      ]);

      const { container } = await renderPage({ day: '2026-04-24' });
      const text = container.textContent ?? '';

      // Timestamp
      expect(text).toContain('2026-04-24T12:00:00');
      // First 12 chars of ip hash (and NOT the full 64)
      expect(text).toContain('b'.repeat(12));
      expect(text).not.toContain('b'.repeat(64));
      // Turn count
      expect(text).toMatch(/2\s*turn/i);
      // Verdict badge — harm: none, off_brand empty → clean
      expect(text).toMatch(/clean|none/i);
      // Model
      expect(text).toContain('claude-sonnet-4-6');
      // Latencies
      expect(text).toMatch(/55/);
      expect(text).toMatch(/410/);
    });

    it('renders a harm-category verdict in the header when harm !== none', async () => {
      listMock.mockResolvedValue(['2026-04-24']);
      readMock.mockResolvedValue([
        makeEntry({ verdict: { harm: 'hate', off_brand: [] } }),
      ]);

      const { container } = await renderPage({ day: '2026-04-24' });
      expect(container.textContent ?? '').toMatch(/hate/i);
    });

    it('renders off-brand categories in the header when verdict flags them', async () => {
      listMock.mockResolvedValue(['2026-04-24']);
      readMock.mockResolvedValue([
        makeEntry({
          verdict: {
            harm: 'none',
            off_brand: ['electoral_politics'],
          },
          refused: true,
          model: '',
        }),
      ]);

      const { container } = await renderPage({ day: '2026-04-24' });
      const text = container.textContent ?? '';
      expect(text).toMatch(/electoral_politics/i);
      expect(text).toMatch(/refused/i);
    });

    it('renders turn content in <pre> with white-space: pre-wrap', async () => {
      listMock.mockResolvedValue(['2026-04-24']);
      readMock.mockResolvedValue([
        makeEntry({
          turns: [
            { role: 'user', content: 'a line\nwith\nbreaks' },
            { role: 'assistant', content: 'reply' },
          ],
        }),
      ]);

      const { container } = await renderPage({ day: '2026-04-24' });
      const pres = container.querySelectorAll('pre');
      expect(pres.length).toBeGreaterThan(0);
      // At least one <pre> must carry the pre-wrap directive (Tailwind
      // class or inline style — accept either).
      const hasPreWrap = Array.from(pres).some((el) => {
        const cls = el.getAttribute('class') ?? '';
        const style = el.getAttribute('style') ?? '';
        return (
          cls.includes('whitespace-pre-wrap') ||
          style.includes('pre-wrap')
        );
      });
      expect(hasPreWrap).toBe(true);
    });
  });

  describe('AC-004 — scrub-by-default on harm !== none', () => {
    it('wraps harm-flagged entry in <details> without `open`', async () => {
      listMock.mockResolvedValue(['2026-04-24']);
      readMock.mockResolvedValue([
        makeEntry({
          verdict: { harm: 'hate', off_brand: [] },
        }),
      ]);

      const { container } = await renderPage({ day: '2026-04-24' });
      const closedDetails = container.querySelectorAll(
        'details:not([open])',
      );
      expect(closedDetails.length).toBeGreaterThan(0);
      // Summary includes harm category.
      const summary = container.querySelector('details:not([open]) summary');
      expect(summary?.textContent ?? '').toMatch(/hate/i);
      expect(summary?.textContent ?? '').toMatch(/hidden|flagged/i);
    });

    it('renders non-harm entries without a <details> wrapper', async () => {
      listMock.mockResolvedValue(['2026-04-24']);
      readMock.mockResolvedValue([
        makeEntry({
          verdict: { harm: 'none', off_brand: [] },
        }),
      ]);

      const { container } = await renderPage({ day: '2026-04-24' });
      // The whole entry body should be visible — no enclosing closed details.
      expect(container.querySelectorAll('details:not([open])').length).toBe(0);
    });
  });

  describe('AC-005 — day navigation + sidebar', () => {
    it('shows sidebar listing all days newest first', async () => {
      listMock.mockResolvedValue([
        '2026-04-24',
        '2026-04-22',
        '2026-04-20',
      ]);
      readMock.mockResolvedValue([]);

      const { container } = await renderPage({ day: '2026-04-24' });

      const links = Array.from(container.querySelectorAll('a'));
      const hrefs = links.map((a) => a.getAttribute('href') ?? '');
      expect(hrefs.some((h) => h.includes('2026-04-24'))).toBe(true);
      expect(hrefs.some((h) => h.includes('2026-04-22'))).toBe(true);
      expect(hrefs.some((h) => h.includes('2026-04-20'))).toBe(true);

      // Newest-first order asserted by checking the first occurrence.
      const firstIdx = hrefs.findIndex((h) => h.includes('2026-04-24'));
      const middleIdx = hrefs.findIndex((h) => h.includes('2026-04-22'));
      const lastIdx = hrefs.findIndex((h) => h.includes('2026-04-20'));
      expect(firstIdx).toBeLessThan(middleIdx);
      expect(middleIdx).toBeLessThan(lastIdx);
    });

    it('prev/next day navigation walks the day index', async () => {
      listMock.mockResolvedValue([
        '2026-04-24',
        '2026-04-22',
        '2026-04-20',
      ]);
      readMock.mockResolvedValue([]);

      const { container } = await renderPage({ day: '2026-04-22' });

      // Prev is the chronologically-older day (2026-04-20).
      const prev = container.querySelector('a[rel="prev"]');
      expect(prev?.getAttribute('href') ?? '').toContain('2026-04-20');
      // Next is the chronologically-newer day (2026-04-24).
      const next = container.querySelector('a[rel="next"]');
      expect(next?.getAttribute('href') ?? '').toContain('2026-04-24');
    });

    it('disables prev/next when on the extremes', async () => {
      listMock.mockResolvedValue(['2026-04-24', '2026-04-22']);
      readMock.mockResolvedValue([]);

      const { container } = await renderPage({ day: '2026-04-24' });

      // On the newest day, there is no newer day — next link absent or disabled.
      const next = container.querySelector('a[rel="next"]');
      expect(next).toBeNull();
      // But a prev link should exist.
      const prev = container.querySelector('a[rel="prev"]');
      expect(prev?.getAttribute('href') ?? '').toContain('2026-04-22');
    });
  });

  describe('AC-006 — robots noindex metadata', () => {
    it('exports metadata with robots.index === false', async () => {
      const mod = await import('../page');
      const meta = mod.metadata;
      expect(meta.robots).toBeDefined();
      if (typeof meta.robots === 'object' && meta.robots !== null) {
        expect((meta.robots as { index?: boolean }).index).toBe(false);
        expect((meta.robots as { follow?: boolean }).follow).toBe(false);
      } else {
        // String fallback ("noindex, nofollow")
        expect(meta.robots).toMatch(/noindex/i);
      }
    });
  });

  describe('AC-008 — no Blob URL in rendered HTML', () => {
    it('rendered HTML contains no Blob URL substring', async () => {
      listMock.mockResolvedValue(['2026-04-24']);
      readMock.mockResolvedValue([
        makeEntry({
          turns: [
            { role: 'user', content: 'normal question' },
            { role: 'assistant', content: 'normal reply' },
          ],
        }),
      ]);

      const { container } = await renderPage({ day: '2026-04-24' });
      const html = container.innerHTML;
      expect(html).not.toMatch(/blob\.vercel-storage\.com/);
      // The storage module yields no URLs to the page layer; the page output
      // should not contain any https:// external URL at all. (Internal
      // anchors are href="/argue/log?day=…" — relative.)
      expect(html).not.toMatch(/https:\/\//);
    });
  });

  describe('AC-009 — empty-day case', () => {
    it('renders "no conversations on this day" and keeps nav functional', async () => {
      listMock.mockResolvedValue(['2026-04-24']);
      readMock.mockResolvedValue([]);

      const { container } = await renderPage({ day: '2026-04-24' });
      const text = container.textContent ?? '';
      expect(text).toMatch(/no conversations on this day/i);
      // Sidebar link present.
      const links = Array.from(container.querySelectorAll('a'));
      const hrefs = links.map((a) => a.getAttribute('href') ?? '');
      expect(hrefs.some((h) => h.includes('2026-04-24'))).toBe(true);
    });
  });

  describe('AC-010 — storage errors render a minimal message without leaking details', () => {
    it('renders "log temporarily unreadable" on storage throw', async () => {
      listMock.mockRejectedValue(new Error('Blob token invalid: tkn_xxx'));
      readMock.mockRejectedValue(new Error('Blob token invalid: tkn_xxx'));

      const { container } = await renderPage({ day: '2026-04-24' });
      const html = container.innerHTML;
      expect(container.textContent ?? '').toMatch(/temporarily unreadable/i);
      // The leaked token string must NOT appear.
      expect(html).not.toContain('tkn_xxx');
      expect(html).not.toContain('BLOB_READ_WRITE_TOKEN');
    });
  });

  describe('AC-007 — no self-link to /argue/log exists in the sitemap', () => {
    it('sitemap.ts does not list /argue/log', async () => {
      // Sitemap route imports from @/lib/content/*, not @/lib/argue-log.
      const mod = await import('@/app/sitemap');
      const entries = await mod.default();
      const urls = entries.map((e: { url: string }) => e.url);
      expect(urls.every((u) => !u.includes('/argue/log'))).toBe(true);
    });
  });
});
