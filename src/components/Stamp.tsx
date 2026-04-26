import { useId } from 'react';

export type StampSize = 32 | 56 | 96 | 240;

interface StampProps {
  size?: StampSize;
  label?: string;
  className?: string;
}

/**
 * Inline SVG of the bines.ai colophon. Uses currentColor so it inherits
 * its fill from the parent's text colour — wrap in a `text-ruby` or
 * `text-emerald` element to recolour without touching the component.
 *
 * Size drops different content at smaller renderings:
 *   240 / 96 / 56 — full stamp with top + bottom curved text + b
 *   32            — outer ring (thickened) + b, favicon-scale (text too small to read)
 *
 * Each instance gets unique `defs` IDs via useId() so multiple stamps
 * on one page don't collide.
 */
export function Stamp({
  size = 96,
  label = 'bines.ai colophon stamp',
  className,
}: StampProps) {
  const uid = useId();
  const topId = `${uid}-top`;
  const botId = `${uid}-bot`;

  const showText = size >= 56;
  const showInnerRing = size >= 56;

  // Scale the outer stroke up at favicon sizes so the ring stays visible
  const outerStroke = size <= 32 ? 6 : size <= 56 ? 3 : 1.6;
  const innerStroke = size <= 56 ? 1.2 : 0.6;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      className={className}
    >
      {showText ? (
        <defs>
          <path id={topId} d="M 26 100 A 74 74 0 0 1 174 100" />
          <path id={botId} d="M 26 100 A 74 74 0 0 0 174 100" />
        </defs>
      ) : null}
      <circle
        cx={100}
        cy={100}
        r={88}
        fill="none"
        stroke="currentColor"
        strokeWidth={outerStroke}
      />
      {showInnerRing ? (
        <circle
          cx={100}
          cy={100}
          r={55}
          fill="none"
          stroke="currentColor"
          strokeWidth={innerStroke}
        />
      ) : null}
      {showText ? (
        <>
          <text
            fontFamily="var(--font-inter), system-ui, sans-serif"
            fontWeight={700}
            fontSize={12}
            fill="currentColor"
            letterSpacing={3.4}
          >
            <textPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
              BINES.AI
            </textPath>
          </text>
          <text
            fontFamily="var(--font-inter), system-ui, sans-serif"
            fontWeight={500}
            fontSize={8.5}
            fill="currentColor"
            letterSpacing={2.4}
          >
            <textPath
              href={`#${botId}`}
              // @ts-expect-error — SVG2 attribute, types lag
              side="right"
              startOffset="50%"
              textAnchor="middle"
            >
              KENTUCKY · LONDON
            </textPath>
          </text>
        </>
      ) : null}
      <text
        x={100}
        y={128}
        textAnchor="middle"
        fontFamily="var(--font-fraunces), Georgia, serif"
        fontWeight={900}
        fontSize={96}
        fill="currentColor"
      >
        b
      </text>
    </svg>
  );
}
