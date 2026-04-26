import { useId } from 'react';

interface SynapseDxMarkProps {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * The synapses-network mark from `synapsedx-main/public/synapsedx-logo.svg`,
 * with the brand cyan→blue gradient preserved. Wordmark stripped. The
 * SynapseDx palette is otherwise forbidden on bines.ai (project CLAUDE.md),
 * but the trademark logo is the deliberate exception — it's a credentials
 * link, not site chrome.
 */
export function SynapseDxMark({
  size = 22,
  className,
  ariaLabel = 'SynapseDx',
}: SynapseDxMarkProps) {
  const uid = useId();
  const gradientId = `${uid}-grad`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4E6" />
          <stop offset="100%" stopColor="#0099CC" />
        </linearGradient>
      </defs>
      <g
        stroke={`url(#${gradientId})`}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      >
        <line x1={30} y1={30} x2={18} y2={15} />
        <line x1={30} y1={30} x2={42} y2={22.5} />
        <line x1={30} y1={30} x2={12} y2={34.5} />
        <line x1={30} y1={30} x2={42} y2={37.5} />
        <line x1={30} y1={30} x2={22.5} y2={46.5} />
      </g>
      <g fill={`url(#${gradientId})`}>
        <circle cx={30} cy={30} r={6} />
        <circle cx={18} cy={15} r={4.5} />
        <circle cx={42} cy={22.5} r={3.75} />
        <circle cx={12} cy={34.5} r={5.25} />
        <circle cx={42} cy={37.5} r={3.3} />
        <circle cx={22.5} cy={46.5} r={6.3} />
      </g>
    </svg>
  );
}
