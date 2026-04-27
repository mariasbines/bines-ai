import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BIO_LINE } from '@/lib/content/site';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'bines.ai — editorial notes on AI and life';

/**
 * Site-wide OpenGraph image. The card already shows "bines.ai" in the title
 * and host slots, so the image deliberately omits the wordmark — just the
 * b-stamp colophon (with curved Kentucky · London text preserved via a
 * pre-rasterised PNG, since Satori rejects SVG <textPath>) and the bio line.
 *
 * Per-Fieldwork pieces have their own OG image at
 * src/app/fieldwork/[slug]/opengraph-image.tsx.
 */
export default async function Image() {
  const PAPER = '#FFFFF4';
  const INK = '#1A1814';

  const stampPath = path.join(process.cwd(), 'public', 'media', 'og-stamp.png');
  const stampBytes = await readFile(stampPath);
  const stampSrc = `data:image/png;base64,${stampBytes.toString('base64')}`;

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
        <img
          src={stampSrc}
          width={360}
          height={360}
          alt=""
          style={{ marginRight: 96, flexShrink: 0 }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            fontSize: 56,
            lineHeight: 1.25,
            color: INK,
            maxWidth: 640,
            fontStyle: 'italic',
          }}
        >
          {BIO_LINE}
        </div>
      </div>
    ),
    { ...size },
  );
}
