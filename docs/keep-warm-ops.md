# Keep-warm operations runbook

Internal docs for the `/api/keep-warm` cron. Scope: why it exists, the
schedule, and how to run it by hand.

Written for a single-operator context (Maria). British English throughout.
Brevity over voice — this is a runbook, not copy.

---

## 1 · Why it exists

The rate limiter on `/api/chat` is backed by a free-tier Vercel Marketplace
Upstash store (`upstash-kv-yellow-pocket`). Upstash archives free databases
that receive no traffic for a few weeks. The limiter only writes keys when
someone actually uses the chat, so a quiet week leaves the store idle and
eligible for archiving.

If the store is archived the chat still works — the route fails open
(`src/app/api/chat/route.ts`) — but it runs **unthrottled**, which removes the
guard against someone hammering the Anthropic key. Keeping the store warm
preserves that protection.

## 2 · What it does

`GET /api/keep-warm` calls `touchChatRedis()` (`src/lib/chat/rate-limit.ts`),
which writes a single key `bines:chat:keepalive` with a 14-day TTL. One cheap
write resets Upstash's inactivity clock. The key self-expires, so it never
accumulates.

Responses:

- `200 { "warmed": true, "at": "<iso>" }` — pinged the store.
- `200 { "warmed": false, "reason": "no-redis" }` — no Redis configured
  (dev/CI); nothing to warm, not an error.
- `401` — bad/missing bearer token.
- `500 { "error": "misconfigured" }` — `CRON_SECRET` unset.

## 3 · Schedule

`vercel.json`: `0 5 * * 1` (Mondays 05:00 UTC, after the daily cleanup/sweep
crons). Weekly leaves comfortable margin against the "few weeks" idle window.

## 4 · Auth + manual run

Same `Authorization: Bearer ${CRON_SECRET}` posture as the other crons
(timing-safe compare). To run by hand:

```bash
curl -s https://bines.ai/api/keep-warm \
  -H "Authorization: Bearer $CRON_SECRET"
```

`CRON_SECRET` lives in the Vercel project env (Production + Preview).
