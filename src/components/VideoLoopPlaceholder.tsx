interface VideoLoopPlaceholderProps {
  /** Aspect ratio; default 16:9. */
  aspect?: string;
  className?: string;
}

/**
 * Placeholder rectangle for the video header. Replaced in 001.013
 * by the real <VideoLoop>. Renders a flat coloured block with a
 * small label — no animation, no JS.
 */
export function VideoLoopPlaceholder({ aspect = '16 / 9', className }: VideoLoopPlaceholderProps) {
  return (
    <div
      aria-label="Video loop placeholder — real video lands in story 001.013"
      className={`w-full bg-ink/5 border border-ink/10 flex items-center justify-center ${className ?? ''}`}
      style={{ aspectRatio: aspect }}
    >
      <span className="font-mono text-xs text-ink/40 uppercase tracking-[0.14em]">
        —video header—
      </span>
    </div>
  );
}
