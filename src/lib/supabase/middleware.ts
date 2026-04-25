import { NextResponse, type NextRequest } from 'next/server'

/**
 * Edge middleware: gatekeeping only. NO Supabase SDK calls.
 *
 * The previous implementation called supabase.auth.getSession() in the edge
 * runtime, which can trigger a token-refresh network round-trip to the
 * Supabase auth server. Under flaky edge → Supabase connectivity that call
 * hangs and the whole edge function times out, taking the site down.
 *
 * We don't need verified auth here — RLS at the database layer is the actual
 * security boundary. The middleware's job is just gatekeeping: "does this
 * request look authenticated enough to let through, or should we send them
 * to /login?". Checking for the presence of a Supabase auth cookie is a
 * good-enough proxy. If someone forges a cookie they'll just bounce off RLS
 * when actual data fetches run.
 *
 * Pages that need verified auth (the user's actual ID for queries) call
 * getSessionUser() server-side, which runs in the Node Lambda — not the edge
 * runtime — so the same hang doesn't apply there.
 */
export async function updateSession(request: NextRequest) {
  // Skip middleware entirely for the root path — it's a fully static landing
  // page that doesn't need any auth gating.
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next({ request })
  }

  // Look for any Supabase auth cookie (they're named sb-<project>-auth-token,
  // sometimes split into .0/.1 chunks for long tokens).
  const hasAuthCookie = request.cookies
    .getAll()
    .some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register')

  // Unauthenticated users on protected routes → /login
  if (!hasAuthCookie && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated users hitting auth pages → /dashboard
  if (hasAuthCookie && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}
