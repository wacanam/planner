'use client';

type Props = {
  percent: number;
  label?: string;
  color?: string;
};

export function CoverageChart({ percent, label, color = 'bg-blue-400' }: Props) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium text-gray-800">{clamped.toFixed(1)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className={`${color} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {!label && <p className="text-xs text-right text-gray-500">{clamped.toFixed(1)}% covered</p>}
    </div>
  );
}
