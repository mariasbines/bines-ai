# Argue-log operations runbook

Internal docs for the `/argue` conversation log. Scope: the Blob-backed
JSONL store under `argue-log/`, the daily cleanup cron, and the four env
vars the log layer reads.

Written for a single-operator context (Maria). British English throughout.
Brevity over voice — this is a runbook, not copy.

Status: ships with story 002.001 (foundation). Consumers arrive in 002.002
(admin view) and 002.004 (route integration).

---

## 1 · Salt rotation (quarterly)

The argue-log hashes IPs with a salt so the stored `ip_hash` can't be
walked back to a raw address by anyone who ever sees the log file.
Rotating the salt quarterly means a leaked log can only correlate visitors
within one quarter — not across the whole life of the site.

We run two salt env vars so rotation is zero-downtime:

- `ARGUE_LOG_IP_SALT_CURRENT` — the salt used for *new* writes.
- `ARGUE_LOG_IP_SALT_PREVIOUS` — the salt used for the *previous* quarter.
  Kept live for one quarter after rotation so historical entries stay
  interpretable if you ever need to correlate within their window.

### Procedure

1. Generate a new 32-byte hex value locally:

   ```bash
   openssl rand -hex 32
   ```

   Do not paste this into chat. Use clipboard → CLI → clear clipboard.

2. In the Vercel dashboard (Project → Settings → Environment Variables),
   apply this order **on Production and Preview**:

   - Set `ARGUE_LOG_IP_SALT_PREVIOUS` to the value currently in
     `ARGUE_LOG_IP_SALT_CURRENT`.
   - Set `ARGUE_LOG_IP_SALT_CURRENT` to the new value.

3. Redeploy. Until redeploy the edge route is still running against the
   old env values.

New writes land with `salt_version: "current"`. The admin view (002.002)
records which salt applied to each entry so the pair can be distinguished
at read time.

### Notes

- Never reuse an old salt value. Treat rotation as destroying the old
  correlation window.
- If you ever lose `ARGUE_LOG_IP_SALT_CURRENT`, the log layer fails
  closed at the route boundary (see 002.004). Set a new one immediately;
  do not backfill.

---

## 2 · Cron-secret rotation (annual)

`CRON_SECRET` authorises Vercel's scheduler to call the daily cleanup
endpoint. Rotate annually, or immediately if it's ever exposed.

### Procedure

1. Generate a new token locally. ASCII hex only:

   ```bash
   openssl rand -hex 32
   ```

   **Keep CRON_SECRET ASCII hex.** The route's timing-safe comparison is
   length + charCodeAt based; BMP-range chars are exact but non-ASCII
   values are unnecessary and muddy the contract.

2. Set `CRON_SECRET` on Production in the Vercel dashboard.

3. Redeploy. Vercel's next cron invocation picks up the new value from
   the deployed environment.

4. Confirm the next scheduled run succeeds (Project → Settings → Crons →
   the job's Last Run column flips to 200).

If a scheduled run returns 401 after rotation, the env var didn't stick —
reopen Settings → Environment Variables and re-save.

---

## 3 · Manual cleanup sweep

To force a sweep outside the cron schedule — for verification or one-off
backlog:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://bines.ai/api/argue-log/cleanup
```

Response shape:

```json
{ "deleted": ["YYYY-MM-DD", ...], "skipped": N }
```

Only day-keys appear in `deleted`. Blob URLs are never returned.

Running this against a preview deploy requires a deployment-protection
bypass — easier to run it against Production once the env vars are set,
or to test via `pnpm vitest run src/app/api/argue-log/cleanup`.

---

## 4 · Vercel env-var setup (first-time)

Four env vars feed the argue-log layer. Set all four on
**Production and Preview** scopes.

| Name | Shape | Purpose |
|---|---|---|
| `ARGUE_LOG_IP_SALT_CURRENT` | 32-byte hex (64 chars) | Salt for new writes |
| `ARGUE_LOG_IP_SALT_PREVIOUS` | 32-byte hex (64 chars) | Salt for the previous quarter |
| `CRON_SECRET` | random ASCII hex token | Auth for the daily cleanup cron |
| `FILTER_MODEL` | model id (optional) | Override for the Haiku classifier in 002.004; defaults to `claude-haiku-4-5` if unset |

`BLOB_READ_WRITE_TOKEN` is already set (shipped in 001.016 for push-back);
the log layer reuses the same store.

### Notes

- **Cron only fires on Production.** Preview deploys do not auto-sweep —
  use the manual curl command from §3 to test, or merge to `master` and
  watch the next scheduled run at 03:30 UTC.
- On first setup before the site ever received argue traffic, the cron
  will return `{ deleted: [], skipped: 0 }`. That's correct.
- `FILTER_MODEL` is read by 002.004 (not by this story). Setting it early
  is harmless.

---

## 5 · Deployment Protection — keep it ON

**Never toggle `Deployment Protection` off on Production.**

The `/argue/log` admin view is protected by nothing more than Vercel's
SSO gate on Production deploys. If Deployment Protection is disabled,
the admin URL becomes publicly reachable and any visitor could read the
raw conversation log.

This is mitigated on the stored content side by the URL-unguessability
of the Blob layer (the log is never served via a public URL to any
client path), but the admin view itself depends on Deployment Protection
for its authZ. The feature is non-negotiable for bines.ai.

If you ever intentionally disable it — e.g. for a contract-testing pass
from an external CI — re-enable it before the session ends.

---

## Appendix · Schema version

Current log schema is `schema_version: 1`. If you need to add a field:

- Non-breaking additions (optional fields) can land in-place if the
  admin view and any log readers tolerate unknown-key presence.
- Breaking changes require a `schema_version: 2` bump and a migration
  plan for historical files. The reader in `src/lib/argue-log/storage.ts`
  uses `.safeParse` per-line and silently skips malformed lines, so
  drift is detectable via test fixtures rather than site breakage.
