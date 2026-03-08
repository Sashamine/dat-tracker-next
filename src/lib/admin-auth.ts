/**
 * Admin authentication utility.
 *
 * Uses a single cookie (`dat_admin`) whose value is the raw ADMIN_SECRET.
 * The cookie is NOT httpOnly so client components can read it for nav visibility,
 * while middleware reads it for route protection.
 */

export const ADMIN_COOKIE_NAME = "dat_admin";

/**
 * Check whether an incoming request carries a valid admin cookie.
 * Works with the Next.js `cookies()` helper (server components / middleware).
 */
export function isAdminRequest(
  cookies: { get: (name: string) => { value: string } | undefined }
): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const token = cookies.get(ADMIN_COOKIE_NAME)?.value;
  return token === secret;
}
