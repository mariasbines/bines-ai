import { useId } from 'react';
import { format } from 'date-fns';

interface PostmarkProps {
  number: number;
  publishedISO: string;
  size?: number;
  className?: string;
}

const SHAPE_COUNT = 11;

function shapeFor(n: number): React.ReactNode {
  const idx = ((n - 1) % SHAPE_COUNT) + 1;
  switch (idx) {
    case 1:
      return (
        <>
          <circle cx={100} cy={73} r={9} fill="currentColor" />
          <circle cx={100} cy={100} r={15} fill="currentColor" />
          <circle cx={100} cy={127} r={9} fill="currentColor" />
        </>
      );
    case 2:
      return (
        <>
          <path d="M 70 110 A 30 30 0 0 1 130 110 Z" fill="currentColor" />
          <line
            x1={58}
            y1={116}
            x2={142}
            y2={116}
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </>
      );
    case 3:
      return (
        <>
          <circle cx={92} cy={100} r={16} fill="currentColor" />
          <path d="M 110 88 L 132 100 L 110 112 Z" fill="currentColor" />
        </>
      );
    case 4:
      return (
        <>
          <path d="M 70 122 L 90 88 L 110 122 Z" fill="currentColor" />
          <path d="M 96 122 L 118 80 L 140 122 Z" fill="currentColor" />
        </>
      );
    case 5:
      return (
        <path
          d="M 110 70 A 30 30 0 1 0 110 130 A 22 30 0 1 1 110 70 Z"
          fill="currentColor"
        />
      );
    case 6:
      return (
        <>
          <circle cx={100} cy={100} r={24} fill="none" stroke="currentColor" strokeWidth={3} />
          <circle cx={100} cy={100} r={14} fill="none" stroke="currentColor" strokeWidth={2.5} />
          <circle cx={100} cy={100} r={5} fill="currentColor" />
        </>
      );
    case 7:
      return (
        <path
          d="M 60 105 Q 75 88 90 105 T 120 105 T 150 105"
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
        />
      );
    case 8:
      return <ellipse cx={100} cy={100} rx={11} ry={30} fill="currentColor" />;
    case 9:
      return (
        <>
          <line
            x1={62}
            y1={100}
            x2={138}
            y2={100}
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <line
            x1={100}
            y1={62}
            x2={100}
            y2={138}
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={100} cy={100} r={5} fill="currentColor" />
        </>
      );
    case 10:
      return (
        <>
          <path d="M 66 112 A 12 12 0 0 1 90 112 Z" fill="currentColor" />
          <path d="M 84 112 A 14 14 0 0 1 112 112 Z" fill="currentColor" />
          <path d="M 106 112 A 12 12 0 0 1 130 112 Z" fill="currentColor" />
        </>
      );
    case 11:
      return (
        <>
          <path
            d="M 100 73 L 124 100 L 100 127 L 76 100 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
          />
          <circle cx={100} cy={100} r={5} fill="currentColor" />
        </>
      );
  }
}

const fmtPostmarkDate = (iso: string) =>
  format(new Date(`${iso}T00:00:00Z`), 'd·MMM·yyyy').toUpperCase();

export function Postmark({
  number,
  publishedISO,
  size = 76,
  className,
}: PostmarkProps) {
  const uid = useId();
  const arcId = `${uid}-arc`;
  const dateLabel = fmtPostmarkDate(publishedISO);

  return (
    <svg
      width={size}
      height={size * 1.05}
      viewBox="0 0 200 210"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`postmark ${dateLabel}`}
      className={className}
    >
      <defs>
        <path id={arcId} d="M 35 178 A 80 18 0 0 0 165 178" />
      </defs>
      <circle cx={100} cy={100} r={70} fill="none" stroke="currentColor" strokeWidth={2} />
      {shapeFor(number)}
      <text
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontWeight={500}
        fontSize={14}
        fill="currentColor"
        letterSpacing={1.6}
      >
        <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
          {dateLabel}
        </textPath>
      </text>
    </svg>
  );
}
