import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'About bines.ai — an editorial site by Maria Bines on AI and life. AI-assisted writing, voice rules, and the difference between Fieldwork and Postcards.',
};

export default function AboutPage() {
  return (
    <article className="max-w-2xl">
      <header className="mb-10">
        <h1 className="font-serif font-black text-5xl tracking-tight">About</h1>
      </header>

      <div className="font-serif text-lg leading-relaxed space-y-6 [&_p]:my-0 [&_em]:italic">
        <p>
          bines.ai is an editorial site about AI and life — written by Maria Bines, a
          Kentucky-raised, London-based AI practitioner who builds AI for regulated industries by
          day and argues with it by night.
        </p>

        <p>
          The pieces here are <em>diagnostic, not confessional.</em> Observations more than
          feelings-prose. Short declarative sentences. Lowercase openers. The voice belongs to
          Maria; the editing is done in conversation with an AI she trusts. Anything published
          here had a human read it, push back on it, and approve it before it shipped.
        </p>

        <h2 className="font-serif font-black text-2xl tracking-tight pt-6">
          Fieldwork, postcards, and the rest
        </h2>

        <p>
          <strong>Fieldwork</strong> pieces are the longer arguments — usually 3–5 minutes to read,
          one thesis per piece. They live in rotation until the thesis is wrong, at which point
          they get retired or get a public <em>changed-my-mind</em> follow-up.
        </p>

        <p>
          <strong>Postcards</strong> are short notes — Maria&apos;s opinions on her own LinkedIn
          posts, mostly. The frame is <em>opinion-about-my-opinion.</em>
        </p>

        <p>
          <strong>/now</strong> is the strip line at the top of every page — what Maria is doing
          right now, edited monthly. <strong>/taste</strong> is the rotating shelf of books, games,
          and shows. <strong>/argue</strong> is a chat trained on Maria&apos;s voice; it is not
          Maria — it is an AI doing its best impression — and it tells you so when asked.
        </p>

        <h2 className="font-serif font-black text-2xl tracking-tight pt-6">
          On AI assistance
        </h2>

        <p>
          Most pieces on this site are written with AI assistance — drafting, editing, structural
          critique, occasionally generating a turn of phrase that earned its slot. The voice is
          Maria&apos;s; the work to refine it is collaborative. That distinction is on purpose,
          and it&apos;s the through-line of more than one piece here. There is no separate badge
          on individual pieces because the assistance is the rule, not the exception.
        </p>

        <p>
          The /argue chat is explicitly AI — it answers honestly when asked, retains conversations
          for 90 days so Maria can see how it&apos;s being used (no IP, no account — just the
          conversation), and points to a crisis line when a visitor signals distress.
        </p>

        <h2 className="font-serif font-black text-2xl tracking-tight pt-6">
          Distinct from SynapseDx
        </h2>

        <p>
          Maria runs an AI company called <a
            href="https://synapsedx.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4 hover:opacity-80"
          >
            SynapseDx
          </a>{' '}
          — boring AI for regulated industries. bines.ai is{' '}
          <em>deliberately</em> not a SynapseDx surface. The opinions here are personal. Nothing on
          this site should be read as SynapseDx commercial position, customer commentary, or
          product roadmap. Confidential information stays confidential; named customers are not
          mentioned.
        </p>

        <h2 className="font-serif font-black text-2xl tracking-tight pt-6">Contact</h2>

        <p>
          Push back on the <a href="/argue" className="text-accent underline underline-offset-4 hover:opacity-80">/argue</a>{' '}
          chat. Or find Maria on{' '}
          <a
            href="https://www.linkedin.com/in/maria-bines/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4 hover:opacity-80"
          >
            LinkedIn
          </a>
          .
        </p>
      </div>
    </article>
  );
}
