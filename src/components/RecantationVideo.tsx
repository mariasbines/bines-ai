interface RecantationVideoProps {
  src: string;
  poster: string;
  captions?: string;
}

/**
 * Maria-to-camera recantation, rendered inline on a change-my-mind detail
 * page. Native <video controls> — the visitor presses play, the video plays
 * once with audio, captions toggle via the player UI. Distinct from the
 * silent auto-loop <VideoLoop> used for Fieldwork editorial-art headers.
 *
 * No JS state, no client island. Server-rendered. The native element handles
 * lazy frame loading via `preload="metadata"` (just enough to render the
 * poster + duration without buffering the full clip).
 */
export function RecantationVideo({ src, poster, captions }: RecantationVideoProps) {
  return (
    <figure className="mb-10">
      <video
        controls
        preload="metadata"
        poster={poster}
        playsInline
        className="w-full rounded-sm border border-ink/15 bg-ink/5"
      >
        <source src={src} type="video/mp4" />
        {captions ? (
          <track kind="captions" srcLang="en" label="English" src={captions} default />
        ) : null}
      </video>
      <figcaption className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-ink/55">
        the recantation
      </figcaption>
    </figure>
  );
}
