"use client";

import { useSyncExternalStore } from "react";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

function getCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function subscribe(callback: () => void) {
  // No native cookie-change event; re-check on focus (covers login in another tab)
  window.addEventListener("focus", callback);
  return () => window.removeEventListener("focus", callback);
}

function getSnapshot(): boolean {
  return getCookieValue(ADMIN_COOKIE_NAME) !== undefined;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Returns `true` when the `dat_admin` cookie is present (any value).
 * Used to conditionally render admin nav items in client components.
 */
export function useIsAdmin(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
