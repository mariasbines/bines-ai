import { BIO_LINE } from '@/lib/content/site';

interface BioLineProps {
  className?: string;
}

/**
 * Renders the locked bio line from site.ts. No props for the content
 * itself — copy is fixed by design.
 */
export function BioLine({ className }: BioLineProps) {
  return <p className={`font-serif text-lg leading-relaxed ${className ?? ''}`}>{BIO_LINE}</p>;
}
