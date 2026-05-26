'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoLoopProps {
  src: string;
  captions?: string;
  poster: string;
  alt: string;
  priority?: boolean;
  className?: string;
  /**
   * When true, the IntersectionObserver stays alive for the component's
   * lifetime and toggles the video's play/pause as the wrapper enters and
   * exits the viewport. Default (false) preserves the original behaviour:
   * the observer disconnects after the first intersection and the video
   * keeps playing regardless of subsequent scroll position.
   *
   * Use case: the `/gallery` page renders multiple `<VideoLoop>` panels
   * side by side; this prop ensures only the in-view panel's video plays
   * at any moment, bounding CPU + bandwidth.
   */
  pauseWhenOffscreen?: boolean;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Autoplaying muted video loop with captions, lazy-loaded below the fold.
 * Reduced-motion users see a poster image + play button overlay.
 *
 * Renders a <noscript> native <video> fallback for no-JS visitors.
 *
 * With `pauseWhenOffscreen` enabled (gallery use case), the IO stays alive
 * and the video pauses on scroll-out / resumes on scroll-in. The video's
 * `src` is loaded once the wrapper first enters the viewport and remains
 * loaded thereafter (preserves browser-cached video data).
 */
export function VideoLoop({
  src,
  captions,
  poster,
  alt,
  priority = false,
  className,
  pauseWhenOffscreen = false,
}: VideoLoopProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(priority);
  const [hasBeenInView, setHasBeenInView] = useState(priority);
  const [userPlay, setUserPlay] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  // Mirror inView → hasBeenInView (once true, stays true). This decouples the
  // `src` loading decision (one-way latch) from the `inView` play/pause state
  // (two-way under pauseWhenOffscreen). Without this, toggling inView back to
  // false would unset src and force the browser to unload the video.
  useEffect(() => {
    if (inView && !hasBeenInView) setHasBeenInView(true);
  }, [inView, hasBeenInView]);

  useEffect(() => {
    // Always-observe path: pauseWhenOffscreen toggles inView with intersection
    // state across the component's lifetime. Cleanup disconnects on unmount.
    if (pauseWhenOffscreen) {
      const el = wrapperRef.current;
      if (!el || typeof IntersectionObserver === 'undefined') {
        setInView(true);
        return;
      }
      const obs = new IntersectionObserver(
        (entries) => {
          const last = entries[entries.length - 1];
          if (last) setInView(last.isIntersecting);
        },
        { rootMargin: '200px' },
      );
      obs.observe(el);
      return () => obs.disconnect();
    }

    // Legacy path (existing behaviour preserved exactly): if priority,
    // there's no need to observe — the video plays on mount. Otherwise
    // observe and disconnect after the first intersection sets
    // inView=true permanently. Deps intentionally exclude `inView` so the
    // effect doesn't re-run when the observer fires.
    if (priority) return;
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [priority, pauseWhenOffscreen]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduced && !userPlay) {
      v.pause();
      return;
    }
    if (inView) {
      // Browsers return a Promise from play(); jsdom returns undefined.
      const p = v.play();
      if (p && typeof (p as Promise<void>).catch === 'function') {
        (p as Promise<void>).catch(() => {
          // Autoplay may be blocked; leave paused.
        });
      }
    } else if (pauseWhenOffscreen) {
      // When the gallery's panel scrolls out of view, pause to free CPU.
      v.pause();
    }
  }, [inView, reduced, userPlay, pauseWhenOffscreen]);

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full ${className ?? ''}`}
      style={{ aspectRatio: '16 / 9' }}
    >
      <noscript>
        <video
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      </noscript>
      <video
        ref={videoRef}
        src={hasBeenInView ? src : undefined}
        poster={poster}
        preload={priority ? 'auto' : 'metadata'}
        // @ts-expect-error fetchpriority is a valid HTML attr; React types lag
        fetchpriority={priority ? 'high' : undefined}
        muted
        loop
        playsInline
        aria-label={alt}
        className="w-full h-full object-cover"
      >
        {captions ? (
          <track kind="captions" src={captions} srcLang="en" label="English" default />
        ) : null}
      </video>
      {reduced && !userPlay ? (
        <button
          type="button"
          aria-label="Play video"
          onClick={() => setUserPlay(true)}
          className="absolute inset-0 flex items-center justify-center bg-ink/20 hover:bg-ink/30 transition-colors motion-reduce:transition-none"
        >
          <span className="font-mono text-sm text-paper border border-paper px-4 py-2">▶ play</span>
        </button>
      ) : null}
    </div>
  );
}
