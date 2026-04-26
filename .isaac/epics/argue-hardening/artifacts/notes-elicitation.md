# Elicitation answers (pending full concept doc)

Captured 24 Apr 2026 so these survive a pivot. Maria's answers to the nine Phase-1 clarifying questions. Write `01-concept.md` against these when we come back.

## Locked

1. **Retention** — 90 days rolling, auto-expire.
2. **IP handling** — salted hash (rotating salt quarterly). No raw IPs.
3. **What gets logged** — full conversation (user + assistant), plus guard signals, Haiku filter verdict, and Anthropic moderation verdict per turn.
4. **Admin access** — web page at `/argue/log` behind Vercel Deployment Protection. **No email digest** (explicit decline — Maria doesn't want nasty content pushed to her).
5. **Blob access** — private namespace for conversation logs. Admin page proxy-reads from the server. NOT `access: 'public'` like push-back.
6. **Filter categories** — full list as offered: electoral politics; hot-button social issues (abortion, immigration, gun control, Israel/Palestine, Ukraine, trans rights as identity debate); race-as-identity-politics; religion; named real people outside Maria's published circle; family-of-Maria beyond what's on site; conspiracy / crypto hype.
7. **Refusal tone** — in-voice redirect: *"not my lane — Maria doesn't have a public position on this, and I don't invent them. What else have you got?"*
8. **Classifier choice** — **both**, layered:
   - **Anthropic moderation endpoint** → flags harm categories (hate, threats, sexual, violence). These entries are **scrubbed-by-default in Maria's admin view** — metadata visible, content behind click-to-reveal.
   - **Haiku 4.5 pre-flight** → flags off-brand categories from Q6. These entries get the in-voice refusal in the chat AND render normally in the admin log (they're interesting data, not toxic).
9. **Ship order** — log first, filter second. Log is invisible to visitors. Share /argue cautiously for a week, then tune the filter based on observed traffic.

## Implications for stories (Phase 6 preview)

Likely story shape:
- **002.001** — Conversation log (storage, private blob, daily JSONL, salted-hash IPs).
- **002.002** — Admin view at `/argue/log` behind Deployment Protection, with scrub-by-default mode + click-to-reveal.
- **002.003** — Anthropic moderation endpoint integration; attaches verdict to each turn.
- **002.004** — Haiku pre-flight classifier; refuses off-brand topics with in-voice redirect.
- **002.005** — Refusal template + system-prompt tightening to back the classifier.
- **002.006** — Launch QA + voice check before making /argue publicly shareable.

Rate-limit implications (resolved 24 Apr): rate limit is at endpoint, gates both Haiku pre-flight + Sonnet main-call. Bad actor can't burn Haiku budget faster than Sonnet. No change needed to rate-limit code.
