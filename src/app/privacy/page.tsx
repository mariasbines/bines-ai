import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What bines.ai logs, what it does not, how long it keeps it, and how to ask for deletion.',
};

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl">
      <header className="mb-10">
        <h1 className="font-serif font-black text-5xl tracking-tight">Privacy</h1>
        <p className="mt-3 font-serif text-base text-ink/70 italic leading-relaxed max-w-xl">
          What this site logs, what it does not, and how long it keeps it.
        </p>
      </header>

      <div className="font-serif text-lg leading-relaxed space-y-6 [&_p]:my-0 [&_em]:italic">
        <h2 className="font-serif font-black text-2xl tracking-tight">No tracking, no cookies</h2>

        <p>
          bines.ai does not set tracking cookies. There is no third-party analytics, no Google
          Tag Manager, no advertising pixels, no fingerprinting. The site uses Vercel&apos;s
          first-party analytics, which is privacy-respecting by design — no PII, no cross-site
          identifiers, no cookies. There is no cookie-consent banner because there are no
          cookies that require consent.
        </p>

        <h2 className="font-serif font-black text-2xl tracking-tight pt-4">/argue conversations</h2>

        <p>
          The <a href="/argue" className="text-accent underline underline-offset-4 hover:opacity-80">/argue</a>{' '}
          chat is the one place this site keeps records of what visitors do. When you argue with the
          AI, the conversation is sent to <a
            href="https://www.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4 hover:opacity-80"
          >
            Anthropic
          </a>{' '}
          to generate a reply, and a copy is kept on this site for <strong>90 days</strong> so
          Maria can see how the chat is being used.
        </p>

        <p>
          What is stored: the user and assistant turns of the conversation, a salted-hashed IP
          (irreversible — Maria cannot recover the original IP from it), and a timestamp. What is{' '}
          <strong>not</strong> stored: your real IP, your name, your email, your account, your
          location, your device, or anything that could identify you to Maria.
        </p>

        <p>
          After 90 days the daily log file is automatically deleted. There is no backup outside
          the rolling window.
        </p>

        <h2 className="font-serif font-black text-2xl tracking-tight pt-4">
          Anthropic and the chat
        </h2>

        <p>
          The chat is powered by{' '}
          <a
            href="https://www.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4 hover:opacity-80"
          >
            Anthropic&apos;s Claude API
          </a>
          . Anthropic processes the conversation under their{' '}
          <a
            href="https://www.anthropic.com/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4 hover:opacity-80"
          >
            commercial privacy policy
          </a>{' '}
          — they do not use API conversations to train their models.
        </p>

        <h2 className="font-serif font-black text-2xl tracking-tight pt-4">Hosting</h2>

        <p>
          The site is hosted on{' '}
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4 hover:opacity-80"
          >
            Vercel
          </a>
          . Like any web host, Vercel sees request metadata (IP, user-agent, the URL you visited)
          for the purposes of serving the page and protecting against abuse. Vercel&apos;s{' '}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4 hover:opacity-80"
          >
            privacy policy
          </a>{' '}
          covers that.
        </p>

        <h2 className="font-serif font-black text-2xl tracking-tight pt-4">Deletion requests</h2>

        <p>
          Because conversations are stored against a salted hash with no backwards link to your
          identity, Maria cannot find <em>your</em> conversation on request — there is no key
          to look it up by. Practically: nothing personal to delete. If you want a specific
          conversation removed sooner than its 90-day expiry, message Maria on{' '}
          <a
            href="https://www.linkedin.com/in/maria-bines/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4 hover:opacity-80"
          >
            LinkedIn
          </a>{' '}
          with the approximate timestamp and she will manually scrub it.
        </p>

        <h2 className="font-serif font-black text-2xl tracking-tight pt-4">Changes</h2>

        <p>
          When this policy changes materially, the change ships in the same release as whatever
          surface is changing — no quiet update windows. The disclosure on the chat itself
          updates at the same time as the data practice it describes.
        </p>
      </div>
    </article>
  );
}
