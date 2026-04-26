import { ImageResponse } from 'next/og';
import { BIO_LINE } from '@/lib/content/site';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'bines.ai — editorial notes on AI and life';

/**
 * Site-wide OpenGraph image. Rendered when a visitor pastes the bare
 * bines.ai URL into LinkedIn, iMessage, Slack, etc. Per-Fieldwork pieces
 * have their own og image (see src/app/fieldwork/[slug]/opengraph-image.tsx).
 *
 * Layout: paper-cream background, b-stamp colophon on the left, wordmark
 * "bines.ai" + bio line stacked on the right. Matches the site header
 * register without being a literal screenshot.
 */
export default function Image() {
  const PAPER = '#FFFFF4';
  const INK = '#1A1814';
  const RUBY = '#B0213A';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: PAPER,
          color: INK,
          display: 'flex',
          alignItems: 'center',
          padding: 96,
          fontFamily: 'serif',
        }}
      >
        {/* B-stamp colophon on the left — pure CSS circles, no SVG (Satori limitation) */}
        <div
          style={{
            width: 280,
            height: 280,
            borderRadius: '50%',
            border: `2px solid ${INK}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 72,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: '50%',
              border: `1px solid ${INK}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontSize: 180,
                fontWeight: 900,
                color: INK,
                fontFamily: 'serif',
                lineHeight: 1,
                marginTop: -16,
              }}
            >
              b
            </div>
          </div>
        </div>

        {/* Wordmark + bio on the right */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 132,
              fontWeight: 900,
              letterSpacing: -3,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'baseline',
            }}
          >
            <span>bines</span>
            <span style={{ color: RUBY }}>.</span>
            <span>ai</span>
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 28,
              lineHeight: 1.4,
              color: '#1A1814CC',
              maxWidth: 720,
            }}
          >
            {BIO_LINE}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
