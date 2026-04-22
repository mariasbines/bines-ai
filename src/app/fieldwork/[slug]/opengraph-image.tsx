import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { getFieldworkBySlug } from '@/lib/content/fieldwork';
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
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const piece = await getFieldworkBySlug(slug);
  if (!piece) notFound();
  const accent = JEWEL_HEX[accentFor(piece)];
  const idPadded = piece.frontmatter.id.toString().padStart(2, '0');

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
          FIELDWORK {idPadded} · bines.ai
        </div>
        <div style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.05, maxWidth: 960 }}>
          {piece.frontmatter.title}
        </div>
        <div style={{ fontSize: 22, color: '#1A1814AA', maxWidth: 1000 }}>
          {piece.frontmatter.excerpt.slice(0, 200)}
        </div>
      </div>
    ),
    { ...size },
  );
}
