import clsx from "clsx";
import { useId } from "react";

/**
 * Medepad mark: a heartbeat line on the teal tile.
 * Animated: a bright pulse travels along the line and the line beats softly (off for reduced motion).
 */
// Centred on the 48×48 tile.
const PULSE = "M8.5 24h6.3l2.9-6.8 4.6 13.6 4-10.4 2.5 3.6h10.7";

export function LogoMark({ size = 44, className, animated = true }: { size?: number; className?: string; animated?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const bg = `mp-bg-${uid}`;
  const shine = `mp-shine-${uid}`;
  const glow = `mp-glow-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Medepad"
    >
      <defs>
        <linearGradient id={bg} x1="6" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0A9384" />
          <stop offset="1" stopColor="#00796B" />
        </linearGradient>
        <linearGradient id={shine} x1="24" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity=".22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={glow} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="1.1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${bg})`} />
      <rect width="48" height="24" rx="14" fill={`url(#${shine})`} />
      <g className={animated ? "logo-beat" : undefined}>
        {/* heartbeat: faint base line + a bright pulse that travels along it */}
        <path
          d={PULSE}
          className={animated ? "logo-ecg-base" : undefined}
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {animated && (
          <path
            d={PULSE}
            pathLength={100}
            className="logo-ecg"
            stroke="#fff"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${glow})`}
          />
        )}
      </g>
    </svg>
  );
}

export function Logo({
  size = 44,
  subtitle = "CLINICAL EDITION",
  className,
  animated = true,
}: {
  size?: number;
  subtitle?: string | null;
  className?: string;
  animated?: boolean;
}) {
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <LogoMark size={size} animated={animated} className="shrink-0 drop-shadow-[0_6px_14px_rgba(0,121,107,0.28)]" />
      <div className="leading-none">
        <div className="font-display text-[1.35rem] font-extrabold tracking-tight text-ink">
          mede<span className="text-brand">pad</span>
        </div>
        {subtitle && <div className="mt-1 text-[10px] font-bold tracking-[0.22em] text-muted">{subtitle}</div>}
      </div>
    </div>
  );
}
