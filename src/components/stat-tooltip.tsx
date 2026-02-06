"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface StatTooltipProps {
  children: React.ReactNode;
  data: { label: string; value: string | number; subValue?: string }[];
  title?: string;
  className?: string;
}

export function StatTooltip({ children, data, title, className }: StatTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(false), 150);
  };

  if (data.length === 0) {
    return <>{children}</>;
  }

  return (
    <div 
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="cursor-help">
        {children}
      </div>
      
      {isVisible && (
        <div 
          className="absolute z-50 left-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-[280px] max-w-[400px] max-h-[300px] overflow-y-auto"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {title && (
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
              {title}
            </p>
          )}
          <table className="w-full text-xs">
            <tbody>
              {data.slice(0, 20).map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <td className="py-1 pr-3 text-gray-700 dark:text-gray-300 font-medium">
                    {row.label}
                  </td>
                  <td className="py-1 text-right text-gray-900 dark:text-gray-100 font-mono">
                    {typeof row.value === 'number' ? row.value.toLocaleString() : row.value}
                  </td>
                  {row.subValue && (
                    <td className="py-1 pl-2 text-right text-gray-500 dark:text-gray-400 text-[10px]">
                      {row.subValue}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 20 && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              +{data.length - 20} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}
