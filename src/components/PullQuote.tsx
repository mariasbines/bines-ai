interface PullQuoteProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Full colour-block pull-quote. Sits on the per-piece jewel (`--color-accent`)
 * with paper text on top. Matches the mood-board treatment — an emerald/
 * sapphire/ruby/topaz/amethyst block depending on which Fieldwork piece
 * this quote lives in.
 */
export function PullQuote({ children, className }: PullQuoteProps) {
  return (
    <blockquote
      className={`relative my-12 rounded-sm bg-accent px-8 py-10 sm:px-12 sm:py-12 text-paper ${className ?? ''}`}
    >
      <span
        aria-hidden="true"
        className="font-serif absolute left-6 top-4 text-6xl leading-none opacity-50 select-none"
      >
        &ldquo;
      </span>
      <div className="font-serif italic text-xl sm:text-2xl leading-snug [&_em]:not-italic [&_em]:font-bold">
        {children}
      </div>
    </blockquote>
  );
}
