import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { VideoLoop } from '../VideoLoop';

// IntersectionObserver mock — captures the callback so tests can trigger
// entry/exit events synchronously. Replaces jsdom's missing IO API.
const observers: MockIO[] = [];

class MockIO {
  callback: IntersectionObserverCallback;
  disconnected = false;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observers.push(this);
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {
    this.disconnected = true;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  observers.length = 0;
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = MockIO;
});

afterEach(() => {
  delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
});

function fireIO(isIntersecting: boolean) {
  const obs = observers[observers.length - 1];
  if (!obs) throw new Error('No IntersectionObserver instance to fire');
  act(() => {
    obs.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      obs as unknown as IntersectionObserver,
    );
  });
}

describe('<VideoLoop>', () => {
  it('renders a <video> with poster and muted/loop/playsInline attrs', () => {
    const { container } = render(
      <VideoLoop src="https://example/v.mp4" poster="https://example/p.jpg" alt="a loop" priority />,
    );
    const videos = container.querySelectorAll('video');
    // The noscript content is not parsed in jsdom the same way;
    // at minimum one scripted video should be in the output.
    expect(videos.length).toBeGreaterThanOrEqual(1);
    const scripted = Array.from(videos).find((v) => !v.parentElement?.closest('noscript'));
    expect(scripted).toBeDefined();
    expect(scripted).toHaveAttribute('poster', 'https://example/p.jpg');
    expect(scripted?.muted).toBe(true);
    expect(scripted?.loop).toBe(true);
    expect(scripted?.playsInline).toBe(true);
  });

  it('includes captions track when captions prop given', () => {
    const { container } = render(
      <VideoLoop
        src="https://example/v.mp4"
        poster="https://example/p.jpg"
        captions="https://example/c.vtt"
        alt="a"
        priority
      />,
    );
    const track = container.querySelector('track');
    expect(track).not.toBeNull();
    expect(track).toHaveAttribute('kind', 'captions');
    expect(track).toHaveAttribute('src', 'https://example/c.vtt');
    expect(track).toHaveAttribute('default');
  });

  it('does not include track when captions absent', () => {
    const { container } = render(
      <VideoLoop src="https://example/v.mp4" poster="https://example/p.jpg" alt="a" priority />,
    );
    expect(container.querySelector('track')).toBeNull();
  });

  it('respects priority via preload="auto"', () => {
    const { container } = render(
      <VideoLoop src="https://example/v.mp4" poster="https://example/p.jpg" alt="a" priority />,
    );
    const scripted = Array.from(container.querySelectorAll('video')).find(
      (v) => !v.parentElement?.closest('noscript'),
    );
    expect(scripted).toHaveAttribute('preload', 'auto');
  });

  it('defaults non-priority videos to preload="metadata"', () => {
    const { container } = render(
      <VideoLoop src="https://example/v.mp4" poster="https://example/p.jpg" alt="a" />,
    );
    const scripted = Array.from(container.querySelectorAll('video')).find(
      (v) => !v.parentElement?.closest('noscript'),
    );
    expect(scripted).toHaveAttribute('preload', 'metadata');
  });

  // Story 005.002 — pauseWhenOffscreen regression guard. Without the prop,
  // the IO disconnects after first intersection (existing behaviour).
  it('without pauseWhenOffscreen, IO disconnects after first entry (regression guard for AC-019)', () => {
    render(
      <VideoLoop src="https://example/v.mp4" poster="https://example/p.jpg" alt="a" />,
    );
    expect(observers).toHaveLength(1);
    expect(observers[0].disconnected).toBe(false);
    fireIO(true);
    expect(observers[0].disconnected).toBe(true);
  });

  // Story 005.002 — pauseWhenOffscreen=true keeps IO alive and toggles
  // play/pause on intersection state.
  it('with pauseWhenOffscreen, IO stays alive across multiple intersections', () => {
    const { container } = render(
      <VideoLoop
        src="https://example/v.mp4"
        poster="https://example/p.jpg"
        alt="a"
        pauseWhenOffscreen
      />,
    );
    const scripted = Array.from(container.querySelectorAll('video')).find(
      (v) => !v.parentElement?.closest('noscript'),
    );
    expect(scripted).toBeDefined();
    const playSpy = vi.spyOn(scripted!, 'play').mockResolvedValue();
    const pauseSpy = vi.spyOn(scripted!, 'pause').mockImplementation(() => {});

    fireIO(true);
    expect(observers[0].disconnected).toBe(false);
    expect(playSpy).toHaveBeenCalled();

    playSpy.mockClear();
    fireIO(false);
    expect(observers[0].disconnected).toBe(false);
    expect(pauseSpy).toHaveBeenCalled();

    pauseSpy.mockClear();
    fireIO(true);
    expect(playSpy).toHaveBeenCalled();
  });

  // Story 005.002 — priority + pauseWhenOffscreen: video plays on mount AND
  // can be paused when scrolled out. The first gallery panel needs both.
  it('with priority + pauseWhenOffscreen, observer still attaches and can pause on exit', () => {
    const { container } = render(
      <VideoLoop
        src="https://example/v.mp4"
        poster="https://example/p.jpg"
        alt="a"
        priority
        pauseWhenOffscreen
      />,
    );
    expect(observers).toHaveLength(1);
    const scripted = Array.from(container.querySelectorAll('video')).find(
      (v) => !v.parentElement?.closest('noscript'),
    );
    expect(scripted).toBeDefined();
    const pauseSpy = vi.spyOn(scripted!, 'pause').mockImplementation(() => {});

    fireIO(false);
    expect(pauseSpy).toHaveBeenCalled();
    expect(observers[0].disconnected).toBe(false);
  });

  it('shows play-button overlay when prefers-reduced-motion is active', () => {
    (window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
    const { container } = render(
      <VideoLoop src="https://example/v.mp4" poster="https://example/p.jpg" alt="a" priority />,
    );
    // The effect runs async; the overlay appears synchronously on first render
    // because setReduced runs in useEffect which RTL flushes.
    const button = container.querySelector('button[aria-label="Play video"]');
    expect(button).not.toBeNull();
  });
});
