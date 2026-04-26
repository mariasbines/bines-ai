import Link from 'next/link';
import { NAV } from '@/lib/content/site';

interface NavProps {
  className?: string;
}

export function Nav({ className }: NavProps) {
  return (
    <nav
      aria-label="Primary"
      className={`font-mono text-xs uppercase tracking-[0.14em] flex flex-wrap gap-x-6 gap-y-2 ${className ?? ''}`}
    >
      {NAV.filter((item) => !item.hideInMainNav).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-ink/75 hover:text-ink transition-opacity duration-150 motion-reduce:transition-none"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
