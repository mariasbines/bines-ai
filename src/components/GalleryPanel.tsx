'use client';

import Link from 'next/link';
import type { Fieldwork } from '@/lib/content/types';
import { accentFor, accentVar } from '@/lib/design/accent';
import { VideoLoop } from './VideoLoop';

interface GalleryPanelProps {
  piece: Fieldwork;
  priority: boolean;
}

/**
 * One panel in the gallery's horizontal scroll-snap. Full viewport size,
 * embeds the piece's hero video, threads the piece's accent via
 * `--color-accent`, renders a `font-mono` caption over a linear-gradient
 * scrim, and wraps the whole panel in a click-through link to the source
 * Fieldwork piece.
 *
 * Defensive: returns `null` for pieces missing `headerVideo` or
 * `posterFrame` (logs a console warning so the gap is visible in dev /
 * build). Keeps the gallery render robust against incomplete frontmatter.
 *
 * When `priority` is true (first panel only), renders a faint right-edge
 * gradient as a scroll affordance for non-touch desktop users.
 */
export function GalleryPanel({ piece, priority }: GalleryPanelProps) {
  const { id, slug, title, media } = piece.frontmatter;
  if (!media.headerVideo || !media.posterFrame) {
    if (typeof console !== 'undefined') {
      console.warn(
        `[GalleryPanel] piece "${slug}" missing headerVideo or posterFrame; skipping in gallery render`,
      );
    }
    return null;
  }

  const accent = accentFor(piece);
  const idPadded = id.toString().padStart(2, '0');

  return (
    <article
      data-testid="gallery-panel"
      data-slug={slug}
      className="relative w-screen h-[100dvh] shrink-0 snap-center"
      style={{ ['--color-accent' as string]: accentVar(accent) } as React.CSSProperties}
    >
      <Link
        href={`/fieldwork/${slug}`}
        aria-label={`Read fieldwork ${idPadded}: ${title}`}
        className="block absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-accent)]"
      >
        <VideoLoop
          src={media.headerVideo}
          poster={media.posterFrame}
          captions={media.captions}
          alt={`Atmospheric loop for ${title}`}
          priority={priority}
          pauseWhenOffscreen
          className="!aspect-auto absolute inset-0 [&>video]:!h-full [&>video]:!w-full"
        />

        {/* Scrim: ink fades from bottom up so the caption sits on a readable surface. */}
        <div
          data-testid="gallery-panel-scrim"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/70 to-transparent"
        />

        {/* Caption: bottom-left, font-mono, "fieldwork ##" in accent. */}
        <div className="absolute bottom-6 left-6 font-mono text-xs uppercase tracking-[0.14em]">
          <span className="text-[color:var(--color-accent)]">fieldwork {idPadded}</span>
          <span className="mx-1 text-paper/70" aria-hidden="true">
            ·
          </span>
          <span className="text-paper">{title}</span>
        </div>

        {/* First-panel-only scroll affordance: faint right-edge gradient. */}
        {priority ? (
          <div
            data-testid="gallery-panel-affordance"
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink/10 to-transparent"
          />
        ) : null}
      </Link>
    </article>
  );
}
