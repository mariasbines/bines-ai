'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Fieldwork } from '@/lib/content/types';
import { GalleryPanel } from './GalleryPanel';

interface GalleryProps {
  pieces: Fieldwork[];
  description: string;
}

/**
 * The gallery's scroll container plus its header controls. Panels are
 * full-bleed (100vw × 100dvh) horizontal scroll-snap, one per Fieldwork
 * piece. The prev / next buttons live in the header — on paper, beside the
 * title — deliberately NOT over the artwork. They're the discoverability
 * affordance for mouse-only desktop visitors, who have no swipe gesture and
 * whose vertical wheel doesn't move a horizontal container.
 *
 * Each button is disabled (dimmed, inert) when there's nothing more to
 * scroll in that direction, so the toolbar stays put rather than shifting.
 * ArrowLeft / ArrowRight still scroll one panel-width when the panel region
 * is focused.
 */
export function Gallery({ pieces, description }: GalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Recompute which directions still have content to reveal. A small
  // threshold absorbs sub-pixel rounding at the snap points.
  const syncScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < max - 8);
  }, []);

  const scrollByPanel = useCallback((direction: 1 | -1) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  }, []);

  // Size the panel strip to the viewport height that's left below the page
  // chrome (site nav + this gallery header), so a full panel — caption and
  // all — fits on screen instead of spilling past the fold. A plain 100dvh
  // panel overflows by exactly the height of everything stacked above it.
  const sizeStrip = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const topOffset = el.getBoundingClientRect().top + window.scrollY;
    el.style.height = `${Math.max(360, window.innerHeight - topOffset)}px`;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    syncScrollState();
    sizeStrip();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      scrollByPanel(event.key === 'ArrowRight' ? 1 : -1);
    };

    const onResize = () => {
      sizeStrip();
      syncScrollState();
    };

    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('scroll', syncScrollState, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('keydown', onKeyDown);
      el.removeEventListener('scroll', syncScrollState);
      window.removeEventListener('resize', onResize);
    };
  }, [scrollByPanel, sizeStrip, syncScrollState]);

  const buttonClass =
    'grid h-11 w-11 place-items-center rounded-full border border-ink/15 bg-paper font-mono text-base text-ink transition-opacity duration-150 hover:border-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-25';

  return (
    <div className="space-y-8">
      <header className="mb-4 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-serif font-black text-4xl sm:text-5xl tracking-tight">
            Gallery
          </h1>
          <p className="mt-3 font-serif text-base text-ink/70 italic">{description}</p>
        </div>
        {pieces.length > 0 ? (
          <div className="flex shrink-0 gap-2" aria-label="Gallery navigation">
            <button
              type="button"
              data-testid="gallery-prev"
              aria-label="Previous panel"
              disabled={!canScrollLeft}
              onClick={() => scrollByPanel(-1)}
              className={buttonClass}
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              data-testid="gallery-next"
              aria-label="Next panel"
              disabled={!canScrollRight}
              onClick={() => scrollByPanel(1)}
              className={buttonClass}
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}
      </header>

      {pieces.length === 0 ? (
        <p className="font-serif text-base text-ink/60 italic leading-relaxed">
          Nothing in the gallery yet — come back when there&apos;s more to look at.
        </p>
      ) : (
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
        </section>
      )}
    </div>
  );
}
