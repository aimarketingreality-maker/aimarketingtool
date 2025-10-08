import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const usingPlaceholders = !supabaseUrl || supabaseUrl.includes('your-supabase-url');

  let session = null;

  if (!usingPlaceholders) {
    try {
      const supabase = createMiddlewareClient({ req, res })
      const result = await supabase.auth.getSession()
      session = result.data.session;
    } catch (error) {
      console.error('Middleware auth error:', error);
      // Continue without session
    }
  }

  // In development mode, allow access to builder without authentication
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Redirect to login if accessing protected routes without session (only in production)
  if (!session && !isDevelopment && !usingPlaceholders && req.nextUrl.pathname.startsWith('/builder')) {
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
  matcher: ['/builder/:path*', '/auth/:path*']
}