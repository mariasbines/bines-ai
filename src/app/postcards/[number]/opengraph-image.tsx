import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { getPostcardByNumber } from '@/lib/content/postcards';
import { accentFor } from '@/lib/design/accent';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const JEWEL_HEX: Record<string, string> = {
  emerald: '#0F7B5A',
  sapphire: '#1B3A8C',
  ruby: '#B0213A',
  topaz: '#C28F2A',
  amethyst: '#3F1E4C',
};

interface Props {
  params: Promise<{ number: string }>;
}

export default async function Image({ params }: Props) {
  const { number: numberParam } = await params;
  const n = Number(numberParam);
  if (!Number.isInteger(n) || n <= 0) notFound();
  const pc = await getPostcardByNumber(n);
  if (!pc) notFound();
  const accent =
    JEWEL_HEX[accentFor({ frontmatter: { id: pc.frontmatter.number, accent: pc.frontmatter.accent } })];
  const padded = pc.frontmatter.number.toString().padStart(3, '0');

  // First 220 chars of body as a teaser
  const body = pc.body.trim().replace(/\s+/g, ' ').slice(0, 220);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FFFFF4',
          color: '#1A1814',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            fontSize: 26,
            textTransform: 'uppercase',
            letterSpacing: 6,
            color: accent,
          }}
        >
          POSTCARD #{padded} · bines.ai
        </div>
        <div style={{ fontSize: 42, lineHeight: 1.3, fontStyle: 'italic', maxWidth: 1000 }}>
          {body}{body.length >= 220 ? '…' : ''}
        </div>
        <div style={{ fontSize: 22, color: '#1A1814AA' }}>maria</div>
      </div>
    ),
    { ...size },
  );
}
