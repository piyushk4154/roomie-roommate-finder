interface CompatibilityRingProps {
  score: number;
  size?: 'sm' | 'lg';
}

export function CompatibilityRing({ score, size = 'sm' }: CompatibilityRingProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const isLg = size === 'lg';
  const dimension = isLg ? 92 : 58;
  const strokeWidth = isLg ? 7 : 5;
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    clamped >= 80
      ? 'stroke-emerald-600'
      : clamped >= 60
        ? 'stroke-amber-500'
        : 'stroke-rose-600';

  const textColor =
    clamped >= 80
      ? 'text-emerald-700'
      : clamped >= 60
        ? 'text-amber-700'
        : 'text-rose-700';

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: dimension, height: dimension }}
      aria-label={`${clamped}% lifestyle compatibility`}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-stone-200"
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className={`${strokeColor} transition-all duration-300`}
        />
      </svg>
      <span
        className={`absolute font-display font-bold tabular-nums ${
          isLg ? 'text-xl' : 'text-xs'
        } ${textColor}`}
      >
        {clamped}%
      </span>
    </div>
  );
}
