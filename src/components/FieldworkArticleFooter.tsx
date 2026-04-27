import Link from 'next/link';

interface FieldworkArticleFooterProps {
  slug: string;
}

/**
 * End-of-piece CTA. Routes to /argue?from=<slug> so ChatInterface can
 * preface the conversation with the piece context (story 003.002 +
 * pushback v2 phase C: replaces the v1 modal-and-ranks form).
 */
export function FieldworkArticleFooter({ slug }: FieldworkArticleFooterProps) {
  return (
    <div className="mt-12 pt-6 border-t border-ink/15 flex items-center justify-between">
      <p className="font-serif text-sm text-ink/60 italic">
        Disagree with any of that?
      </p>
      <Link
        href={`/argue?from=${encodeURIComponent(slug)}`}
        className="font-mono text-xs uppercase tracking-[0.14em] border border-accent px-3 py-1.5 text-accent hover:bg-accent hover:text-paper transition-colors motion-reduce:transition-none"
      >
        [ argue with this ]
      </Link>
    </div>
  );
}
