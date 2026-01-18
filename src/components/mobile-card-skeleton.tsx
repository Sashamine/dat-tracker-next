"use client";

export function MobileCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-6 h-4 skeleton rounded" />
          <div className="w-7 h-7 skeleton rounded-full" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-16 h-5 skeleton rounded" />
              <div className="w-10 h-4 skeleton rounded" />
            </div>
            <div className="w-32 h-4 skeleton rounded" />
          </div>
        </div>
        <div className="text-right">
          <div className="w-16 h-6 skeleton rounded mb-1" />
          <div className="w-12 h-4 skeleton rounded ml-auto" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div>
          <div className="w-10 h-3 skeleton rounded mb-1" />
          <div className="w-12 h-5 skeleton rounded" />
        </div>
        <div>
          <div className="w-16 h-3 skeleton rounded mb-1" />
          <div className="w-14 h-5 skeleton rounded" />
        </div>
        <div>
          <div className="w-14 h-3 skeleton rounded mb-1" />
          <div className="w-16 h-5 skeleton rounded" />
        </div>
      </div>
    </div>
  );
}

export function MobileCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="lg:hidden space-y-3 p-3 bg-gray-50 dark:bg-gray-950">
      {Array.from({ length: count }).map((_, i) => (
        <MobileCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="hidden lg:block">
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="h-12 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4">
          {[40, 40, 120, 60, 80, 80, 80, 80, 80, 100, 100, 80].map((w, i) => (
            <div key={i} className="skeleton rounded" style={{ width: w, height: 16 }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4"
          >
            <div className="w-6 h-4 skeleton rounded" />
            <div className="w-7 h-7 skeleton rounded-full" />
            <div className="w-28">
              <div className="w-16 h-4 skeleton rounded mb-1" />
              <div className="w-24 h-3 skeleton rounded" />
            </div>
            <div className="w-10 h-5 skeleton rounded" />
            <div className="w-12 h-5 skeleton rounded" />
            <div className="w-12 h-4 skeleton rounded" />
            <div className="w-14 h-5 skeleton rounded" />
            <div className="w-12 h-4 skeleton rounded" />
            <div className="w-14 h-4 skeleton rounded" />
            <div className="w-16 h-4 skeleton rounded" />
            <div className="w-20 h-5 skeleton rounded" />
            <div className="w-14 h-4 skeleton rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DataTableSkeleton() {
  return (
    <>
      <MobileCardSkeletonList count={6} />
      <TableSkeleton />
    </>
  );
}
