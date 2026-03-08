import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const { secret } = (await request.json()) as { secret?: string };

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || !secret || secret !== adminSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const isProduction = process.env.NODE_ENV === "production";

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, adminSecret, {
    path: "/",
    secure: isProduction,
    sameSite: "strict",
    // NOT httpOnly — client components need to read it for nav visibility
    httpOnly: false,
    // 30 days
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
