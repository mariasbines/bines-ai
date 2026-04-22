interface PullQuoteProps {
  children: React.ReactNode;
  className?: string;
}

export function PullQuote({ children, className }: PullQuoteProps) {
  return (
    <blockquote
      className={`font-serif italic text-2xl sm:text-3xl leading-snug my-10 border-l-4 border-accent pl-6 text-ink ${className ?? ''}`}
    >
      {children}
    </blockquote>
  );
}
