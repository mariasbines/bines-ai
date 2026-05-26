'use client';

import { useEffect, useRef } from 'react';
import type { Fieldwork } from '@/lib/content/types';
import { GalleryPanel } from './GalleryPanel';

interface GalleryProps {
  pieces: Fieldwork[];
}

/**
 * The gallery's scroll container. Horizontal scroll-snap of one panel per
 * Fieldwork piece. Listens for ArrowLeft / ArrowRight when focused and
 * scrolls one panel-width in that direction. Includes a quiet `← →` glyph
 * at the top-right of the container as a discoverability affordance for
 * non-touch desktop visitors.
 *
 * Renders empty state when no pieces in scope (shouldn't happen in prod
 * with current content, but keeps the page graceful during transitions).
 */
export function Gallery({ pieces }: GalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
    };
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, []);

  if (pieces.length === 0) {
    return (
      <p className="font-serif text-base text-ink/60 italic leading-relaxed">
        Nothing in the gallery yet — come back when there&apos;s more to look at.
      </p>
    );
  }

  return (
    <section
      ref={containerRef}
      role="region"
      aria-label="Fieldwork gallery, horizontal scroll"
      tabIndex={0}
      data-testid="gallery"
      className="relative w-screen left-1/2 -translate-x-1/2 flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {pieces.map((piece, index) => (
        <GalleryPanel
          key={piece.frontmatter.slug}
          piece={piece}
          priority={index === 0}
        />
      ))}

      {/* Scroll affordance glyph — quiet, top-right of the container. */}
      <div
        data-testid="gallery-affordance"
        aria-hidden="true"
        className="pointer-events-none fixed top-6 right-6 z-10 font-mono text-xs uppercase tracking-[0.14em] text-ink/30 mix-blend-multiply"
      >
        ← →
      </div>
    </section>
  );
}
