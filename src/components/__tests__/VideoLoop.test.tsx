import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { VideoLoop } from '../VideoLoop';

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
});

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
