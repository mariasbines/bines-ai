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
 * Each button is dimmed (aria-disabled) when there's nothing more to
 * scroll in that direction, but never actually disabled: a click always
 * fires and the browser clamps the scroll at the ends. The dimming is
 * cosmetic and self-heals on the first scroll event — a stale mount-time
 * read must never be able to brick the controls (it did once: the
 * size-contained panels land their layout after the first state read).
 * ArrowLeft / ArrowRight still scroll one panel-width when the panel region
 * is focused.
 */
export function Gallery({ pieces, description }: GalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Resolve the LIVE scroll container at call time. Streaming hydration can
  // replace the section's DOM node after mount, leaving `containerRef`
  // pointing at a detached copy — scrolls on it move nothing and its
  // zero scrollWidth reads as "nothing to scroll", which bricked the
  // arrows. Never trust the ref blindly: fall back to the document when
  // the referenced node is no longer connected.
  const liveContainer = useCallback((): HTMLElement | null => {
    const el = containerRef.current;
    if (el && el.isConnected) return el;
    return document.querySelector<HTMLElement>('[data-testid="gallery"]');
  }, []);

  // Recompute which directions still have content to reveal. A small
  // threshold absorbs sub-pixel rounding at the snap points.
  const syncScrollState = useCallback(() => {
    const el = liveContainer();
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < max - 8);
  }, [liveContainer]);

  const scrollByPanel = useCallback(
    (direction: 1 | -1) => {
      const el = liveContainer();
      if (!el) return;
      el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
    },
    [liveContainer],
  );

  // Size the panel strip to the viewport height that's left below the page
  // chrome (site nav + this gallery header), so a full panel — caption and
  // all — fits on screen instead of spilling past the fold. A plain 100dvh
  // panel overflows by exactly the height of everything stacked above it.
  const sizeStrip = useCallback(() => {
    const el = liveContainer();
    if (!el) return;
    const topOffset = el.getBoundingClientRect().top + window.scrollY;
    el.style.height = `${Math.max(360, window.innerHeight - topOffset)}px`;
  }, [liveContainer]);

  useEffect(() => {
    const el = liveContainer();
    if (!el) return;

    // Order matters: the strip must have its real height before the
    // scroll-state read — size-contained panels report no scrollable
    // overflow while the strip is collapsed, which left both buttons
    // permanently disabled when this read ran first.
    sizeStrip();
    syncScrollState();

    // The size-contained panels settle their layout after first paint
    // (fonts, the JS-set strip height, video posters), and a single
    // mount-time read can land before the container reports its true
    // scrollWidth. Re-measure on a short settle schedule; reads are
    // cheap and idempotent.
    const settleTimers = [0, 250, 1000].map((ms) =>
      window.setTimeout(() => {
        sizeStrip();
        syncScrollState();
      }, ms),
    );

    const onResize = () => {
      sizeStrip();
      syncScrollState();
    };

    // Scroll events don't bubble, but they ARE observable on window in the
    // capture phase. Listening there (instead of on `el`) survives the
    // container node being swapped out from under us by hydration.
    const onAnyScroll = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.dataset?.testid === 'gallery') syncScrollState();
    };

    // Belt and braces: re-read whenever the container's box actually
    // changes (font swaps, chrome above the strip settling, etc.) —
    // window resize alone misses layout shifts that happen after mount.
    // Observing document.body too keeps this working even if `el` is the
    // node that got swapped.
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(el);
    if (document.body) observer?.observe(document.body);

    window.addEventListener('scroll', onAnyScroll, { capture: true, passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      settleTimers.forEach((t) => window.clearTimeout(t));
      observer?.disconnect();
      window.removeEventListener('scroll', onAnyScroll, { capture: true });
      window.removeEventListener('resize', onResize);
    };
  }, [liveContainer, scrollByPanel, sizeStrip, syncScrollState]);

  // Keyboard support lives on the element via React (not a manual
  // listener), so it always rides whichever DOM node React currently owns.
  const onContainerKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      scrollByPanel(event.key === 'ArrowRight' ? 1 : -1);
    },
    [scrollByPanel],
  );

  const buttonClass =
    'grid h-11 w-11 place-items-center rounded-full border border-ink/15 bg-paper font-mono text-base text-ink transition-opacity duration-150 hover:border-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink aria-disabled:opacity-25';

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
              aria-disabled={!canScrollLeft}
              onClick={() => scrollByPanel(-1)}
              className={buttonClass}
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              data-testid="gallery-next"
              aria-label="Next panel"
              aria-disabled={!canScrollRight}
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
          onKeyDown={onContainerKeyDown}
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
