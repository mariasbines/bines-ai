# Context: bines.ai — launch

## Repo state (as of 22 April 2026)

Cloned from `mariasbines/bines-ai` (public GitHub repo). Scaffolded August 2025 as a Next.js starter, then untouched until this session.

**Files in the scaffold:**

```
bines-ai/
├── .gitignore
├── README.md                   (placeholder)
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── tsconfig.json
├── public/                     (Next.js default assets)
└── src/
    └── app/                    (empty App Router scaffold)
```

**Stack already installed:**

- Next.js 15.5.0
- React 19.1.0 + react-dom 19.1.0
- TypeScript 5
- Tailwind CSS v4 (via @tailwindcss/postcss)
- ESLint 9 + eslint-config-next
- pnpm 10.15.0
- Turbopack (dev + build)

Everything current as of Apr 2026. No tech debt; we build directly on this.

## Domain

- `bines.ai` registered at Name.com
- Nameservers: Name.com default (`ns1-4.name.com`), set 12 Aug 2025
- DNS records: **none** (empty CSV export confirmed 22 Apr 2026)
- MX records: **none** — no email configured on the domain
- Expiry: TBD (Maria to capture)

Clean slate for Vercel deployment. Migration path: point nameservers from Name.com default → Vercel's nameservers at cutover story.

## Hosting

Vercel Pro, already licensed under Maria's personal account. Will create a new Vercel project linked to `mariasbines/bines-ai`.

## Existing personal-project pattern reference

Maria's other personal project — Morgan's photography site (`morgan-ashley-photography`) — uses Astro, not Next.js. Choosing Next.js here is deliberate: this site has a first-class AI chat feature, where Next.js App Router + streaming is the canonical path and every Anthropic reference implementation is Next.js.

## Firewall

**No SynapseDx infrastructure coupling.** No Coherence MCP, no KB plugin, no ISAAC telemetry to SynapseDx servers, no shared SynapseDx design tokens. ISAAC workflow is used locally for development discipline only.

## Not-yet-answered constraints

- Exact colour palette within editorial-maximalist direction
- Final typeface pairing
- Publishing cadence (target: Fieldwork ~monthly, Postcards ~weekly — to be confirmed)
- LinkedIn corpus mining strategy (deferred to a later session once the site shell exists)
