interface WordmarkProps {
  className?: string;
}

/**
 * "bines.ai" — Fraunces 900 for the letters, ruby for the dot separator.
 * Matches the mock header in ~/Documents/bines-ai-brainstorm/stamp-final.html.
 */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <span
      className={`font-serif font-black text-2xl tracking-tight leading-none ${className ?? ''}`}
      aria-label="bines.ai"
    >
      bines<span className="text-ruby" aria-hidden="true">.</span>ai
    </span>
  );
}
