import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'bines.ai — Kentucky-raised, London-based, accidentally Canadian-sounding';

export default function Image() {
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
            fontSize: 28,
            textTransform: 'uppercase',
            letterSpacing: 6,
            color: '#B0213A',
          }}
        >
          bines.ai
        </div>
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.05, maxWidth: 960 }}>
          fieldwork and postcards from someone who actually uses the AI she writes about.
        </div>
        <div style={{ fontSize: 24, color: '#1A1814AA' }}>
          Kentucky · London · editorial-maximalist · diagnostic not confessional
        </div>
      </div>
    ),
    { ...size },
  );
}
