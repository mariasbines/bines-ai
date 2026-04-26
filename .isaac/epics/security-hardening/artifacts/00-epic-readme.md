# Epic: security-hardening

**Status:** Planned. Not yet started.
**Captured:** 26 Apr 2026
**Sequence:** Epic 004 in the bines.ai project (after launch / argue-hardening / pushback-v2).

## Why

Maria asked a security audit question on 26 Apr 2026. Inventory ran across the site and produced 14 measures already in place (rate-limit, agent-guard, salted IP hash, timing-safe secrets, edge-runtime API key isolation, system-prompt hardening, no third-party JS, etc.) plus a Phase-1 hardening sweep landed in commit `1cd4c53` on `dev` (security headers, UA-snark middleware, per-bot robots allow-list). See conversation transcript and `git show 1cd4c53` for the full state.

This epic captures the residual hardening work — items that are reasonable to add but were intentionally deferred from the Phase-1 sweep because they need more care to do correctly. None of them are emergencies.

## Scope

One story: `004.001 — phase-2 hardening`. Four ACs:
1. Content Security Policy (CSP) with nonces.
2. `X-Robots-Tag: noindex` on admin-only routes.
3. Rate-limit on `/api/argue-judge/run` (the new chat-end beacon endpoint).
4. Belt-and-braces sweeps captured in test guards.

## Out of scope

- WAF / Cloudflare-level DDoS protection (Vercel platform handles common cases)
- CSRF tokens (no auth-cookie surface for visitors)
- Subresource integrity (no third-party scripts loaded)
- Certificate pinning (Vercel-managed)

## Dependencies

- Phase-1 sweep (`1cd4c53`) is already on `dev`. This epic builds on it.
- Pushback-v2 Phase B (already shipped) added `/api/argue-judge/run` — that's the rate-limit target in AC-003.
