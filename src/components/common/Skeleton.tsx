import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  const hasCustomBg = /\bbg-/.test(className);
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md ${
        hasCustomBg ? '' : 'bg-slate-200/80 dark:bg-slate-800/80'
      } ${className}`.trim()}
      {...props}
    />
  );
};
