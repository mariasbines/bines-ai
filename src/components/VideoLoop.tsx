'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoLoopProps {
  src: string;
  captions?: string;
  poster: string;
  alt: string;
  priority?: boolean;
  className?: string;
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
 */
export function VideoLoop({
  src,
  captions,
  poster,
  alt,
  priority = false,
  className,
}: VideoLoopProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(priority);
  const [userPlay, setUserPlay] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (priority || inView) return;
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
  }, [priority, inView]);

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
    }
  }, [inView, reduced, userPlay]);

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
        src={inView ? src : undefined}
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
