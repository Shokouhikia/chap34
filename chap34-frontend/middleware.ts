import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type RedirectEntry = { source_path: string; destination_path: string; status_code: number };

// Admin-managed 301/302 redirects (see /panel/admin/redirects). Fetched
// from the backend and cached for 60s via Next's Data Cache, so an admin's
// change shows up within a minute without a redeploy, without hitting the
// backend on every request.
async function fetchRedirects(): Promise<RedirectEntry[]> {
  try {
    const res = await fetch(`${API_URL}/api/seo/redirects`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.redirects || [];
  } catch {
    return [];
  }
}

export async function middleware(req: NextRequest) {
  const redirects = await fetchRedirects();
  if (redirects.length === 0) return NextResponse.next();

  const path = req.nextUrl.pathname;
  const match = redirects.find((r) => r.source_path === path);
  if (!match) return NextResponse.next();

  const destination = req.nextUrl.clone();
  destination.pathname = match.destination_path;
  return NextResponse.redirect(destination, match.status_code);
}

export const config = {
  matcher: [
    // Skip Next internals and static assets so every asset load doesn't
    // pay for a redirects lookup.
    "/((?!_next/static|_next/image|favicon.ico|images/|img/|models/).*)",
  ],
};
