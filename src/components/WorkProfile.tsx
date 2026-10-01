import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * /work — Maria's professional profile, ported from the standalone
 * "Maria Stone Bines - Profile.html" (Oct 2026). Copy is locked: it was
 * edited line by line, so change words only at Maria's request.
 *
 * Colours are the site's jewel tokens only. The hero gate draws once on
 * load; `prefers-reduced-motion` shows it finished (see globals.css,
 * `.work-draw` / `.work-pop`).
 */

export const PROFILE_PDF_HREF = '/media/work/maria-stone-bines-profile.pdf';
const EMAIL_HREF = 'mailto:maria.d.bines@gmail.com?subject=Fractional%20architecture%20%2F%20AI';

type Jewel = 'emerald' | 'sapphire' | 'ruby' | 'topaz' | 'amethyst' | 'ink';
const v = (c: Jewel) => `var(--color-${c})`;
const withC = (c: Jewel, extra: Record<string, string | number> = {}) =>
  ({ ['--c' as string]: v(c), ...extra }) as CSSProperties;

const focusRing =
  'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-sapphire focus-visible:rounded-[2px]';
const secH =
  'font-serif font-bold text-[clamp(30px,3.8vw,46px)] leading-[1.05] tracking-[-0.015em]';

const USEFUL: { title: string; body: string; className: string }[] = [
  {
    title: 'Running AI in production, not just launching it.',
    body: 'Agents fail quietly. I set up the alarms that notice when one goes silent, a record of every action it takes, and a clear path for the people who have to act when something goes wrong.',
    className:
      "bg-sapphire rounded-tr-[90px] [&_p]:pr-10 after:content-[''] after:absolute after:-right-[46px] after:-bottom-[46px] after:size-[120px] after:rounded-full after:bg-topaz",
  },
  {
    title: 'Build and deploy a team can trust.',
    body: 'Every change checked before it goes in, released the same way to every environment, and new environments set up from a description rather than by hand. It holds whether a person or an AI wrote the code.',
    className: 'bg-emerald rounded-bl-[56px]',
  },
  {
    title: 'Guardrails for agents and for engineers.',
    body: "Agents get only the access they need, every action is checked against their rules, and if the check can't run the answer is no. Tests have to be seen failing before anyone trusts them to pass.",
    className: 'bg-amethyst',
  },
  {
    title: 'Architecture that holds up.',
    body: 'One home for every fact, decisions written down where people will find them, and review boards that help teams ship rather than queue.',
    className: 'bg-ruby rounded-br-[90px]',
  },
];

const DECISIONS: { icon: ReactNode; title: string; body: string; src?: string }[] = [
  {
    icon: (
      <>
        <rect x="14" y="16" width="12" height="56" fill={v('ink')} />
        <rect x="54" y="16" width="12" height="56" fill={v('ink')} />
        <rect x="8" y="8" width="64" height="12" fill={v('topaz')} />
        <circle cx="40" cy="50" r="9" fill={v('emerald')} />
      </>
    ),
    title: 'Every agent action goes through one gate.',
    body: "Nothing an AI agent does reaches a business system without being checked against its rules and written down. If the gate can't check, the answer is no.",
    src: 'I designed the gateway that does this, called Coherence, and have written more of it than anyone.',
  },
  {
    icon: (
      <>
        <rect x="10" y="10" width="44" height="58" fill="var(--color-paper)" stroke={v('ink')} strokeWidth="3" />
        <path d="M18 26 H 46 M18 38 H 46 M18 50 H 36" stroke={v('ink')} strokeWidth="3" />
        <circle cx="58" cy="58" r="13" fill={v('emerald')} />
      </>
    ),
    title: 'Write the decision down, then let a check enforce it.',
    body: 'Architecture decisions live where people actually read them. An automatic check stops anyone, person or agent, from quietly breaking one.',
  },
  {
    icon: (
      <>
        <path d="M10 40 H 52" stroke={v('sapphire')} strokeWidth="10" strokeLinecap="round" />
        <rect x="56" y="14" width="12" height="52" fill={v('ruby')} />
      </>
    ),
    title: 'The engineering system comes first. Then the AI writes code.',
    body: "Every piece of work starts as a written design and a plan, which a second model reviews before any code exists. Tests have to fail before they're trusted to pass, and nothing merges until every check is green. The agents type faster. The architecture, the rules and the sign-off stay human.",
  },
  {
    icon: (
      <>
        <circle cx="40" cy="40" r="28" fill="none" stroke={v('ink')} strokeWidth="3" strokeDasharray="6 6" />
        <circle cx="40" cy="40" r="10" fill={v('ruby')} />
      </>
    ),
    title: 'Silence is not a pass.',
    body: "No error, no alert and no output can all mean something broke. A check only counts once it has been seen catching the real failure. It's the rule I'd bring to any team running AI.",
  },
];

const SKILLS_CORE: [string, Jewel, string][] = [
  ['Enterprise architecture', 'sapphire', 'rounded-tr-[48px]'],
  ['AI agents and guardrails', 'ruby', 'rounded-full'],
  ['Data architecture', 'amethyst', 'rounded-bl-[48px]'],
  ['Leading architecture teams', 'emerald', ''],
];
const SKILLS_STRONG: [string, Jewel][] = [
  ['Running AI in production', 'topaz'],
  ['Build and deploy pipelines', 'ink'],
  ['Architecture governance', 'sapphire'],
  ['Large language models', 'ruby'],
  ['Microsoft Azure', 'emerald'],
  ['Databricks', 'amethyst'],
  ['Power BI and analytics', 'topaz'],
];
const SKILLS_ALSO = [
  'Engineering systems for AI coding agents',
  'Identity and access',
  'Python and TypeScript',
  'Postgres',
  'Google Cloud',
  'Pre-sales and deal shaping',
  'Board and fundraising',
  'Agile delivery',
];

const MODEL_MIX: { pct: number; c: Jewel; name: string; does: string }[] = [
  { pct: 60, c: 'topaz', name: 'Claude', does: 'builds: design, code and agents' },
  { pct: 25, c: 'emerald', name: 'GPT and Codex', does: 'review: a second opinion on every plan and change' },
  { pct: 10, c: 'sapphire', name: 'Gemini', does: 'challenges: a voice in the multi-model council' },
  { pct: 5, c: 'amethyst', name: 'Grok and DeepSeek', does: 'cross-check' },
];

export const ROLES: { org: string; c: Jewel; role: string; beat: string; what: string }[] = [
  {
    org: 'SynapseDx',
    c: 'ruby',
    role: 'Co-Founder & CEO, lead platform architect. Aug 2024 to now, full-time from Jul 2026',
    beat: 'Governing AI agents',
    what: 'Designed the gateway every agent action passes through, so each one is checked against its rules and recorded. Set up how code gets designed, checked and released by a team that works with AI agents. Run the seed raise, the board and go-to-market.',
  },
  {
    org: "Lloyd's of London",
    c: 'amethyst',
    role: "Lead Enterprise Data Architect. Sep 2023 to Jun 2026. Joined Endava in Mar 2023, placed at Lloyd's through Endava, then direct from Apr 2024",
    beat: 'Technology in a regulated market',
    what: "Reshaped the architecture review board and design authority that decide what gets built in the world's specialist insurance market. Evaluated new technology, including AI, set the plans for APIs, disaster recovery and test environments, and ran the Microsoft and Databricks relationships.",
  },
  {
    org: 'Microsoft',
    c: 'sapphire',
    role: 'Director, Cloud Solution Architecture (Data & AI). Dec 2021 to Mar 2023',
    beat: 'Data and AI at scale',
    what: 'Led three teams of 45 cloud solution architects in data and AI, behind an $80m-a-year business in industrials, manufacturing, energy and pharma.',
  },
  {
    org: 'Avanade',
    c: 'emerald',
    role: 'Director, Digital Analytics, Innovation & Industry. Apr 2012 to Feb 2020',
    beat: 'Machine learning before it was called AI',
    what: 'Built early machine learning prototypes on Azure and spoke on predictive analytics in healthcare to 5,000 people. Delivered the first Power BI implementation in North America, and led data programmes and deals up to $3.1m.',
  },
];

const TALKS: { dot: string; c: Jewel; title: string; where: string; href?: string }[] = [
  {
    dot: '2026',
    c: 'ruby',
    title: 'How to be early and wrong about AI agents in production',
    where: 'Apollo Product Engineering, September 2026',
  },
  {
    dot: '2026',
    c: 'sapphire',
    title: 'Beyond the AI hype',
    where: 'The esynergy Podcast, August 2026',
    href: 'https://www.youtube.com/watch?v=c7WJDLk2Gs0',
  },
  {
    dot: '2023',
    c: 'topaz',
    title: 'Broker bot, meet underwriter bot',
    where:
      'Early 2023, to a big tech audience. AI agents as broker and underwriter, with a human underwriter working across both',
  },
  { dot: '5,000', c: 'emerald', title: 'Predictive analytics in healthcare', where: 'Avanade Tech Summit' },
];

const DONT = [
  'AI strategy decks with no code behind them',
  'Pilots with no road to production',
  '"Transformation" with no date on it',
];

const btn =
  'inline-block rounded-full border-2 px-[22px] py-3 font-sans text-base font-semibold no-underline';

function Talk({ dot, c, title, where }: (typeof TALKS)[number]) {
  return (
    <>
      <span
        className="grid size-[58px] place-items-center rounded-full font-sans text-[13px] font-bold text-paper"
        style={{ background: v(c) }}
      >
        {dot}
      </span>
      <div>
        <h3 className="font-serif text-[19px] font-bold leading-[1.2] group-hover:underline group-hover:underline-offset-4">
          {title}
        </h3>
        <p className="mt-[3px] text-[14.5px] text-ink/70">{where}</p>
      </div>
    </>
  );
}

export function WorkProfile() {
  return (
    <article className="font-sans text-[17px] leading-[1.58] text-ink">
      {/* Hero */}
      <section className="grid grid-cols-1 items-center gap-10 pb-10 min-[900px]:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="font-serif font-black text-[clamp(40px,5.4vw,64px)] leading-[0.98] tracking-[-0.025em]">
            Anyone can start an AI agent. I build the part that says no.
          </h1>
          <p className="mt-6 max-w-[34em] text-[19px] text-ink/70">
            <strong className="font-semibold text-ink">
              Building enterprise systems since 1998, and hands-on with generative AI since 2022.
            </strong>{' '}
            Avanade, Microsoft and Lloyd&apos;s of London, then co-founder and CEO of SynapseDx. AI is
            moving fast, and startups learn fastest close to real problems. So alongside SynapseDx, I
            take on a small number of fractional enterprise AI and architecture engagements.
          </p>
          <div className="mt-[26px] flex flex-wrap items-center gap-3">
            <a href={EMAIL_HREF} className={`${btn} border-ink bg-ink text-paper ${focusRing}`}>
              Email me
            </a>
            <a href="#career" className={`${btn} border-ink ${focusRing}`}>
              See my background
            </a>
          </div>
          <p className="mt-4 text-[15px]">
            <a
              href={PROFILE_PDF_HREF}
              download
              className={`underline decoration-ink/30 underline-offset-4 hover:decoration-ink ${focusRing}`}
            >
              Download the profile (PDF)
            </a>
          </p>
        </div>

        <div aria-hidden="true">
          <svg viewBox="0 30 540 400" className="block h-auto w-full">
            <rect x="408" y="92" width="108" height="78" fill={v('emerald')} transform="rotate(4 462 131)" />
            <rect x="396" y="186" width="122" height="96" fill={v('amethyst')} transform="rotate(-3 457 234)" />
            <rect x="414" y="298" width="98" height="70" fill={v('topaz')} transform="rotate(2 463 333)" />
            <path
              d="M70 170 C 40 110, 120 70, 150 120 C 175 70, 230 110, 200 160 C 250 170, 240 250, 185 245 C 205 300, 130 320, 120 270 C 80 310, 20 260, 65 225 C 15 205, 30 160, 70 170 Z"
              fill={v('sapphire')}
            />
            <circle cx="140" cy="190" r="16" fill="var(--color-paper)" />
            <path
              className="work-draw"
              style={{ ['--len' as string]: '420' } as CSSProperties}
              d="M200 205 C 260 205, 270 230, 305 232 S 360 236, 400 232"
              fill="none"
              stroke={v('emerald')}
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              className="work-draw work-draw-late"
              style={{ ['--len' as string]: '300' } as CSSProperties}
              d="M150 268 C 170 340, 240 360, 296 352"
              fill="none"
              stroke={v('ruby')}
              strokeWidth="12"
              strokeLinecap="round"
            />
            <rect x="300" y="120" width="26" height="290" fill={v('ink')} />
            <rect x="352" y="120" width="26" height="290" fill={v('ink')} />
            <rect x="286" y="96" width="106" height="28" fill={v('topaz')} />
            <rect className="work-pop work-pop-d2" x="282" y="326" width="16" height="52" fill={v('ruby')} />
          </svg>
          <ul className="mt-3.5 ml-[6%] max-w-[30em] list-none p-0 text-[15px]">
            <li className="work-pop work-pop-d1 my-1.5 flex items-baseline gap-2.5">
              <i className="h-2 w-[22px] flex-none -translate-y-0.5 rounded bg-emerald" />
              The agent asks to book a meeting. That&apos;s within its rules, so it goes through.
            </li>
            <li className="work-pop work-pop-d2 my-1.5 flex items-baseline gap-2.5">
              <i className="h-2 w-[22px] flex-none -translate-y-0.5 rounded bg-ruby" />
              It asks to pay a £40,000 invoice. That isn&apos;t, so it&apos;s stopped and a person
              decides.
            </li>
          </ul>
        </div>
      </section>

      {/* Where I'm useful */}
      <section aria-labelledby="work-useful" className="pt-16 max-sm:pt-[52px]">
        <h2 id="work-useful" className={secH}>
          Where I&apos;m useful
        </h2>
        <div className="mt-7 grid grid-cols-1 gap-4 min-[900px]:grid-cols-[1.15fr_1fr]">
          {USEFUL.map((u) => (
            <div
              key={u.title}
              className={`relative overflow-hidden px-8 pt-7 pb-8 text-paper max-sm:px-6 ${u.className}`}
            >
              <h3 className="relative z-[1] font-serif text-[23px] font-bold leading-[1.14]">
                {u.title}
              </h3>
              <p className="relative z-[1] mt-3 text-[15.5px] opacity-95">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What I've built */}
      <section aria-labelledby="work-built" className="pt-16 max-sm:pt-[52px]">
        <h2 id="work-built" className={secH}>
          What I&apos;ve built, and what it taught me
        </h2>
        <p className="mt-2.5 max-w-[40em] text-[17.5px] text-ink/70">
          Four decisions from building SynapseDx. You&apos;ll face the same ones.
        </p>
        <div className="mt-[30px] grid grid-cols-1 gap-x-[52px] gap-y-[34px] min-[900px]:grid-cols-2">
          {DECISIONS.map((d) => (
            <div key={d.title} className="grid grid-cols-[64px_1fr] items-start gap-5 max-sm:grid-cols-[48px_1fr] max-sm:gap-4">
              <svg viewBox="0 0 80 80" aria-hidden="true" className="size-16 max-sm:size-12">
                {d.icon}
              </svg>
              <div>
                <h3 className="font-serif text-2xl font-bold leading-[1.14]">{d.title}</h3>
                <p className="mt-2">{d.body}</p>
                {d.src ? (
                  <p className="mt-2 border-l-[3px] border-topaz pl-3 text-[14.5px] text-ink/70">
                    {d.src}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skills + models + career */}
      <section aria-labelledby="work-skills" id="career" className="scroll-mt-6 pt-16 max-sm:pt-[52px]">
        <h2 id="work-skills" className={secH}>
          Skills
        </h2>
        <ul
          aria-label="Skills, largest are core"
          className="mt-[26px] flex list-none flex-wrap items-center gap-2.5 p-0 font-serif font-bold leading-[1.1]"
        >
          {SKILLS_CORE.map(([s, c, shape]) => (
            <li
              key={s}
              className={`bg-[var(--c)] px-6 py-[18px] text-[26px] text-paper max-sm:px-5 max-sm:py-3.5 max-sm:text-[22px] ${shape}`}
              style={withC(c)}
            >
              {s}
            </li>
          ))}
          {SKILLS_STRONG.map(([s, c]) => (
            <li key={s} className="border-[3px] border-[var(--c)] px-4 py-2.5 text-[19px]" style={withC(c)}>
              {s}
            </li>
          ))}
          {SKILLS_ALSO.map((s) => (
            <li key={s} className="bg-ink/[0.06] px-3 py-1.5 font-sans text-[15px] font-medium">
              {s}
            </li>
          ))}
        </ul>

        <div className="mt-[26px] grid grid-cols-1 items-start gap-x-3.5 gap-y-1.5 sm:grid-cols-[minmax(0,13rem)_1fr]">
          <p className="pt-1.5 font-serif text-[17px] font-bold">
            Models I build with, by the value each brings
          </p>
          <div>
            <div
              role="img"
              aria-label="Rough share of the value each model brings: Claude 60%, OpenAI 25%, Gemini 10%, Grok and DeepSeek 5%"
              className="flex h-[34px] w-full"
            >
              {MODEL_MIX.map((m, i) => (
                <span
                  key={m.name}
                  className={`flex items-center overflow-hidden bg-[var(--c)] text-[11px] font-semibold whitespace-nowrap text-paper sm:text-sm ${
                    i === MODEL_MIX.length - 1
                      ? 'justify-center px-0'
                      : 'border-r-[3px] border-paper px-1 sm:px-2.5'
                  }`}
                  style={withC(m.c, { flex: `0 0 ${m.pct}%` })}
                >
                  {m.pct}%
                </span>
              ))}
            </div>
            <ul className="mt-2.5 grid list-none grid-cols-1 gap-x-5 gap-y-1 p-0 text-[14.5px] text-ink/70 sm:grid-cols-2">
              {MODEL_MIX.map((m) => (
                <li key={m.name} className="border-l-8 border-[var(--c)] pl-2" style={withC(m.c)}>
                  <b className="font-semibold text-ink">{m.name}</b> {m.does}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[14.5px] text-ink/70 sm:col-start-2">
            Several side by side, so one model&apos;s blind spot never becomes the system&apos;s.
          </p>
        </div>

        <h2 className={`${secH} mt-14`}>The last fourteen years</h2>
        <div className="mt-[26px] grid grid-cols-1 gap-x-[26px] gap-y-[22px] sm:grid-cols-2">
          {ROLES.map((r) => (
            <div
              key={r.org}
              data-testid="role-card"
              className="border-t-[6px] border-[var(--c)] pt-3"
              style={withC(r.c)}
            >
              <h3 className="font-serif text-[19px] font-bold leading-[1.15]">{r.org}</h3>
              <p className="mt-[3px] text-sm text-ink/70">{r.role}</p>
              <p className="mt-2.5 font-serif text-[23px] font-medium italic leading-[1.15]">
                {r.beat}
              </p>
              <p className="mt-1.5 text-[14.5px]">{r.what}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Talks + i don't do */}
      <section aria-labelledby="work-talks" className="pt-16 max-sm:pt-[52px]">
        <div className="mt-7 grid grid-cols-1 items-start gap-11 min-[900px]:grid-cols-[1.25fr_1fr]">
          <div>
            <h2 id="work-talks" className={secH}>
              Talks
            </h2>
            <div className="mt-[18px]">
              {TALKS.map((t, i) => {
                const rowClass = `grid grid-cols-[58px_1fr] gap-4 ${
                  i === 0 ? 'pb-3.5' : 'border-t-2 border-ink/15 py-3.5'
                }`;
                return t.href ? (
                  <a
                    key={t.title}
                    href={t.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group no-underline ${rowClass} ${focusRing}`}
                  >
                    <Talk {...t} />
                  </a>
                ) : (
                  <div key={t.title} className={rowClass}>
                    <Talk {...t} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-br-[80px] bg-ruby px-7 pt-6 pb-7 text-paper">
            <h3 className="font-serif text-[28px] font-light italic leading-none">i don&apos;t do</h3>
            <ul className="mt-3.5 list-none p-0 text-base">
              {DONT.map((d) => (
                <li key={d} className="border-t border-paper/35 py-[7px]">
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        aria-labelledby="work-contact"
        id="contact"
        className="mt-[72px] bg-ink px-8 text-paper max-sm:px-5"
      >
        <div className="grid grid-cols-1 items-end gap-10 min-[900px]:grid-cols-[1.4fr_1fr]">
          <div className="pt-14 pb-0 min-[900px]:pb-[60px]">
            <h2
              id="work-contact"
              className="font-serif font-black text-[clamp(34px,4.6vw,56px)] leading-none tracking-[-0.02em]"
            >
              Got an agent nobody will sign off? Let&apos;s talk.
            </h2>
            <div className="mt-[26px] flex flex-wrap gap-3">
              <a
                href={EMAIL_HREF}
                className={`${btn} border-paper bg-paper text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-topaz`}
              >
                maria.d.bines@gmail.com
              </a>
              <Link
                href="/"
                className={`${btn} border-paper focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-topaz`}
              >
                bines.ai
              </Link>
            </div>
            <p className="mt-[22px] text-[15px] opacity-70">Essex, UK. Remote, or London in person.</p>
          </div>
          <div className="relative w-full max-w-[300px] justify-self-center self-end pt-[34px] min-[900px]:max-w-[380px] min-[900px]:justify-self-end">
            <svg
              viewBox="0 0 300 330"
              preserveAspectRatio="xMidYMax meet"
              aria-hidden="true"
              className="absolute inset-y-0 -left-[4%] h-full w-[108%]"
            >
              <circle cx="236" cy="62" r="40" fill={v('topaz')} />
              <path
                d="M150 330 C 40 290, 10 170, 60 70 C 80 30, 120 8, 150 4 C 180 8, 220 30, 240 70 C 290 170, 260 290, 150 330 Z"
                fill={v('emerald')}
              />
              <path d="M150 330 V 40" stroke={v('ink')} strokeWidth="5" />
              <path
                d="M60 120 L 120 150 M50 190 L 115 205 M240 120 L 180 150 M250 190 L 185 205 M70 255 L 125 260 M230 255 L 175 260"
                stroke={v('ink')}
                strokeWidth="9"
                strokeLinecap="round"
              />
            </svg>
            <Image
              src="/media/work/maria-portrait.webp"
              alt="Maria Stone Bines, smiling, in an embroidered white blouse"
              width={640}
              height={619}
              sizes="(min-width: 900px) 380px, 300px"
              className="relative block h-auto w-full"
            />
          </div>
        </div>
      </section>
    </article>
  );
}
