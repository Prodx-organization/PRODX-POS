import React from 'react';

interface NetworkHealthGaugeProps {
  active: number;
  total: number;
  size?: number;
}

export const NetworkHealthGauge: React.FC<NetworkHealthGaugeProps> = ({ active, total, size = 60 }) => {
  const percentage = total > 0 ? Math.round((active / total) * 100) : 0;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let color = 'text-emerald-500';
  if (percentage < 50) color = 'text-rose-500';
  else if (percentage < 80) color = 'text-amber-500';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          className="text-slate-200 dark:text-slate-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${color} transition-all duration-500 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-text">
        {percentage}%
      </span>
    </div>
  );
};
