import { useState } from "react";
import { useAdoptionEvents, AdoptionEvent } from "@/lib/hooks/use-adoption-events";
import { formatDaysUntil } from "@/lib/data/scheduled-events";
import { cn } from "@/lib/utils";
import { ExternalLink, Star, ChevronDown, ChevronUp } from "lucide-react";

interface AdoptionTimelineProps {
  ticker: string;
  className?: string;
}

function getEventIcon(type: string) {
  switch (type) {
    case "first_purchase":
      return "🚀";
    case "accumulation":
      return "💰";
    case "sell":
      return "🚨";
    case "governance":
      return "🏛️";
    case "treasury_policy":
      return "📜";
    default:
      return "📍";
  }
}

function getSignificanceColor(sig: number, type: string) {
  if (type === 'sell') return "text-red-500 fill-red-500";
  if (sig >= 5) return "text-amber-500 fill-amber-500";
  if (sig >= 3) return "text-blue-500 fill-blue-500";
  return "text-gray-400 fill-gray-400";
}

export function AdoptionTimeline({ ticker, className }: AdoptionTimelineProps) {
  const { events, isLoading } = useAdoptionEvents(ticker);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      ))}
    </div>;
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
        <p className="text-sm text-gray-500">No adoption milestones recorded for {ticker} yet.</p>
      </div>
    );
  }

  // Event Collapsing Logic:
  // If >5 events, show the 3 most recent + the First Adoption (oldest). 
  // Hide the middle ones behind an expand toggle.
  const COLLAPSE_THRESHOLD = 5;
  const isCollapsible = events.length > COLLAPSE_THRESHOLD;
  
  const visibleEvents = isExpanded || !isCollapsible 
    ? events 
    : [
        ...events.slice(0, 3), // 3 most recent
        events[events.length - 1] // First adoption
      ];

  const hiddenCount = events.length - visibleEvents.length;

  return (
    <div className={cn("relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-800 before:to-transparent", className)}>
      {visibleEvents.map((event, idx) => {
        // Insert the "Expand" button before the last item if collapsed
        const showExpandButton = !isExpanded && isCollapsible && idx === visibleEvents.length - 1;
        
        return (
          <div key={event.id}>
            {showExpandButton && (
              <div className="relative flex justify-center my-6 z-10">
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm"
                >
                  <ChevronDown size={14} />
                  {hiddenCount} previous events
                </button>
              </div>
            )}
            <div className={cn(
              "relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active",
              event.event_type === 'sell' && "opacity-100"
            )}>
              {/* Dot */}
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors",
                event.event_type === 'sell' 
                  ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-600" 
                  : "border-white dark:border-gray-950 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              )}>
                <span className="text-lg">{getEventIcon(event.event_type)}</span>
              </div>
              
              {/* Card */}
              <div className={cn(
                "w-[calc(100%-4rem)] md:w-[45%] p-4 rounded-lg border shadow-sm transition-all hover:shadow-md",
                event.event_type === 'sell'
                  ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              )}>
                <div className="flex items-center justify-between mb-1">
                  <time className="font-mono text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {event.event_date}
                  </time>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={10} 
                        className={cn(i < event.significance ? getSignificanceColor(event.significance, event.event_type) : "text-gray-200 dark:text-gray-800")} 
                      />
                    ))}
                  </div>
                </div>
                
                <h4 className={cn(
                  "text-sm font-bold mb-1 leading-tight",
                  event.event_type === 'sell' ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
                )}>
                  {event.description}
                </h4>
                
                {event.source_url && (
                  <a 
                    href={event.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline mt-2"
                  >
                    Verification Source <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      {isExpanded && isCollapsible && (
        <div className="relative flex justify-center mt-6 z-10">
          <button 
            onClick={() => setIsExpanded(false)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm"
          >
            <ChevronUp size={14} />
            Show less
          </button>
        </div>
      )}
    </div>
  );
}
