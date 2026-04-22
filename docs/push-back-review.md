# Push-back review — how Maria reads the Blob log

Submissions from the `[ push back ]` CTA land in Vercel Blob at:

```
push-back/{YYYY-MM-DD}.jsonl
```

One file per day. Each line is a single JSON object:

```json
{"timestamp": "2026-04-22T14:33:02.123Z", "slug": "01-best-thing-not-at-work", "message": "...", "name": "Anon"}
```

## How to read them

### Via Vercel dashboard

1. Go to the bines.ai project in the Vercel dashboard.
2. Storage → Blob → the `push-back/` folder.
3. Click the file for the date you want. Browser renders the raw NDJSON.
4. Copy + paste into a local editor or `jq .` for pretty-printing.

### Via `vercel blob` CLI

```bash
vercel blob download push-back/2026-04-22.jsonl --out ./review.jsonl
jq . ./review.jsonl
```

## Retention + privacy

- No IP addresses persisted. Rate-limit uses IP but doesn't store it.
- No email collected; no follow-up mechanism. If someone signed their name, it's in the `name` field; otherwise it's empty.
- Daily-file format means retention policy is trivial: delete files older than N days to purge.
- Modal-visible privacy notice: *"we store what you send until maria has reviewed it. we don't share it. no email, no newsletter — ever."*

## Reviewing cadence

- Check every ~week during launch month.
- File any recurring pushback themes into memory or a dedicated "recurring responses" doc.
- Legitimate corrections to facts in a Fieldwork piece → edit the MDX + note the correction via a `revised` frontmatter date array.
- Actionable "change my mind" material → candidate for a future 001.010 `/changed-my-mind/` piece.

## Spam / abuse

- Honeypot catches most automated submissions.
- Upstash rate-limit at 5/hour/IP blocks scripted floods.
- If a real spam wave emerges: tune the limits via `UPSTASH_REDIS_REST_URL` env; no redeploy needed if you edit thresholds inline in `rate-limit.ts` and push.

## When to escalate

- Any submission that identifies a specific individual with apparent malice → delete the file, preserve a screenshot for your records.
- Legal threats or demands → forward to your solicitor; do NOT respond via the push-back channel (there's no reply mechanism by design).
