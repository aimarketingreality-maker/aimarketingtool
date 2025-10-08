import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

// Security configuration
export const SECURITY_CONFIG = {
  // Content Security Policy
  csp: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://checkout.stripe.com"],
    'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    'font-src': ["'self'", "https://fonts.gstatic.com"],
    'img-src': ["'self'", "data:", "https:", "blob:"],
    'connect-src': ["'self'", "https://api.stripe.com", "https://js.stripe.com"],
    'frame-src': ["'self'", "https://js.stripe.com", "https://checkout.stripe.com"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  },
  // Other security headers
  headers: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  },
};

// CSRF token configuration
export const CSRF_CONFIG = {
  tokenLength: 32,
  cookieName: 'csrf-token',
  headerName: 'X-CSRF-Token',
  maxAge: 60 * 60 * 24, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  httpOnly: false,
};

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a CSRF token with timestamp
 */
export function generateCSRFToken(): string {
  const timestamp = Date.now().toString();
  const randomPart = generateSecureToken(CSRF_CONFIG.tokenLength);
  const combined = `${timestamp}:${randomPart}`;
  return createHash('sha256').update(combined).digest('hex');
}

/**
 * Validate a CSRF token (basic validation)
 */
export function validateCSRFToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Basic format validation (should be a hex string)
  return /^[a-f0-9]{64}$/i.test(token);
}

/**
 * Check if request should be protected from CSRF
 */
export function shouldProtectFromCSRF(request: NextRequest): boolean {
  const method = request.method;
  const path = request.nextUrl.pathname;

  // Protect state-changing methods
  const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

  // Don't protect API routes that handle their own CSRF protection
  const excludedPaths = [
    '/api/webhooks/',
    '/api/stripe/',
    '/api/external/',
  ];

  // Don't protect authentication endpoints (they use different protection)
  const authPaths = [
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/logout',
    '/api/auth/refresh',
  ];

  const isProtectedMethod = protectedMethods.includes(method);
  const isExcludedPath = excludedPaths.some(p => path.startsWith(p));
  const isAuthPath = authPaths.includes(path);

  return isProtectedMethod && !isExcludedPath && !isAuthPath;
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Add Content Security Policy
  const cspDirectives = Object.entries(SECURITY_CONFIG.csp)
    .map(([directive, values]) => {
      const value = values.length > 0 ? values.join(' ') : "'none'";
      return `${directive} ${value}`;
    })
    .join('; ');

  response.headers.set('Content-Security-Policy', cspDirectives);

  // Add other security headers
  Object.entries(SECURITY_CONFIG.headers).forEach(([header, value]) => {
    response.headers.set(header, value);
  });

  return response;
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  // Try various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) {
    return realIP.trim();
  }

  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  if (clientIP) {
    return clientIP.trim();
  }

  // Fallback to request IP
  return request.ip || 'unknown';
}

/**
 * Validate origin for CORS/CSRF protection
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // If no origin or referer, allow (but could be suspicious)
  if (!origin && !referer) {
    return true;
  }

  // Get the allowed origin
  const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'production'
      ? `https://${host}`
      : `http://${host}`);

  // Check origin header
  if (origin) {
    return origin === allowedOrigin;
  }

  // Check referer header
  if (referer) {
    try {
      const refererURL = new URL(referer);
      const refererOrigin = `${refererURL.protocol}//${refererURL.host}`;
      return refererOrigin === allowedOrigin;
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Middleware to add security headers
 */
export function securityMiddleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // Add security headers to all responses
  addSecurityHeaders(response);

  return response;
}

/**
 * Check if request is suspicious (basic bot detection)
 */
export function isSuspiciousRequest(request: NextRequest): {
  isSuspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const userAgent = request.headers.get('user-agent') || '';
  const accept = request.headers.get('accept') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';

  // No user agent
  if (!userAgent) {
    reasons.push('No user agent');
  }

  // Very short user agent
  if (userAgent.length < 10) {
    reasons.push('Very short user agent');
  }

  // Suspicious user agent patterns
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /go-http/i,
    /node/i,
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    reasons.push('Suspicious user agent pattern');
  }

  // Missing common headers
  if (!accept) {
    reasons.push('Missing Accept header');
  }

  if (!acceptLanguage && request.method === 'GET') {
    reasons.push('Missing Accept-Language header for GET request');
  }

  // Too many headers (possible header injection)
  const headerCount = Array.from(request.headers.keys()).length;
  if (headerCount > 50) {
    reasons.push('Too many headers');
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Sanitize URL to prevent open redirect attacks
 */
export function sanitizeURL(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const parsedURL = new URL(url, 'http://localhost');

    // Allow only http and https protocols
    if (!['http:', 'https:'].includes(parsedURL.protocol)) {
      return null;
    }

    // Allow only localhost and same origin in development
    if (process.env.NODE_ENV === 'development') {
      const allowedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
      if (!allowedHosts.includes(parsedURL.hostname)) {
        return null;
      }
    }

    return parsedURL.toString();
  } catch {
    return null;
  }
}

/**
 * Create a security audit log entry
 */
export function createSecurityLogEntry(
  request: NextRequest,
  event: string,
  details: Record<string, any> = {}
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent'),
    method: request.method,
    path: request.nextUrl.pathname,
    query: request.nextUrl.search,
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
    ...details,
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('[SECURITY]', JSON.stringify(logEntry, null, 2));
  }

  // In production, this should go to a security logging service
  // TODO: Integrate with logging service like Sentry, LogRocket, etc.
}