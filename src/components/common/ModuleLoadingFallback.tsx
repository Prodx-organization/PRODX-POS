import React from 'react';
import { Skeleton } from './Skeleton';

export const ModuleLoadingFallback: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[450px] p-6 flex flex-col gap-6 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>

      <div className="w-full flex-1 min-h-[280px]">
        <Skeleton className="w-full h-full rounded-xl" />
      </div>
    </div>
  );
};
