"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState, useEffect, useRef, Suspense } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/client-events";

function PageViewTracker() {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (pathname && pathname !== prev.current) {
      prev.current = pathname;
      trackPageView(pathname);
    }
  }, [pathname]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0, // Data is always stale, enables real-time updates
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <NuqsAdapter>
          <PageViewTracker />
          {children}
        </NuqsAdapter>
      </Suspense>
    </QueryClientProvider>
  );
}
