import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  addSecurityHeaders,
  shouldProtectFromCSRF,
  validateOrigin,
  isSuspiciousRequest,
  createSecurityLogEntry,
  generateCSRFToken,
  CSRF_CONFIG
} from '@/lib/security'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Add security headers to all responses
  addSecurityHeaders(res)

  // Security logging for suspicious requests
  const suspiciousCheck = isSuspiciousRequest(req)
  if (suspiciousCheck.isSuspicious) {
    createSecurityLogEntry(req, 'SUSPICIOUS_REQUEST', {
      reasons: suspiciousCheck.reasons,
    })
  }

  // Validate origin for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    if (!validateOrigin(req)) {
      createSecurityLogEntry(req, 'INVALID_ORIGIN', {
        origin: req.headers.get('origin'),
        referer: req.headers.get('referer'),
      })

      return new NextResponse(
        JSON.stringify({ error: 'Invalid origin' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  // CSRF protection for state-changing requests
  if (shouldProtectFromCSRF(req)) {
    const csrfToken = req.cookies.get(CSRF_CONFIG.cookieName)?.value
    const headerToken = req.headers.get(CSRF_CONFIG.headerName)

    if (!csrfToken || !headerToken || csrfToken !== headerToken) {
      createSecurityLogEntry(req, 'CSRF_TOKEN_MISMATCH', {
        hasCookieToken: !!csrfToken,
        hasHeaderToken: !!headerToken,
      })

      return new NextResponse(
        JSON.stringify({ error: 'CSRF token mismatch' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const usingPlaceholders = !supabaseUrl || supabaseUrl.includes('your-supabase-url');

  let session = null;

  if (!usingPlaceholders) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name) {
              return req.cookies.get(name)?.value
            },
            set(name, value, options) {
              req.cookies.set({
                name,
                value,
                ...options,
              })
              res.cookies.set({
                name,
                value,
                ...options,
              })
            },
            remove(name, options) {
              req.cookies.set({
                name,
                value: '',
                ...options,
              })
              res.cookies.set({
                name,
                value: '',
                ...options,
              })
            },
          },
        }
      )

      const { data: { session: userSession } } = await supabase.auth.getSession()
      session = userSession;
    } catch (error) {
      console.error('Middleware auth error:', error);
      createSecurityLogEntry(req, 'AUTH_ERROR', { error: error.message })
      // Continue without session
    }
  }

  // Generate and set CSRF token for GET requests to protected pages
  if (req.method === 'GET' && req.nextUrl.pathname.startsWith('/builder')) {
    const existingToken = req.cookies.get(CSRF_CONFIG.cookieName)?.value

    if (!existingToken) {
      const newToken = generateCSRFToken()
      res.cookies.set(CSRF_CONFIG.cookieName, newToken, {
        maxAge: CSRF_CONFIG.maxAge,
        secure: CSRF_CONFIG.secure,
        sameSite: CSRF_CONFIG.sameSite,
        httpOnly: CSRF_CONFIG.httpOnly,
      })
    }
  }

  // In development mode, allow access to builder without authentication
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Redirect to login if accessing protected routes without session (only in production)
  if (!session && !isDevelopment && !usingPlaceholders && req.nextUrl.pathname.startsWith('/builder')) {
    createSecurityLogEntry(req, 'UNAUTHORIZED_ACCESS')
    const redirectUrl = new URL('/auth/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to builder if authenticated user tries to access auth pages
  if (session && !usingPlaceholders && req.nextUrl.pathname.startsWith('/auth')) {
    const redirectUrl = new URL('/builder/templates', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/builder/:path*',
    '/auth/:path*',
    '/api/funnels/:path*',
    '/api/pages/:path*',
    '/api/components/:path*',
    '/api/workspaces/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}