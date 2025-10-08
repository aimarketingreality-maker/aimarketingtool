import { NextRequest, NextResponse } from "next/server";

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom message when limit exceeded
}

// Rate limiting presets for different endpoint types
export const RATE_LIMIT_PRESETS = {
  // Authentication endpoints - very strict
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    message: "Too many authentication attempts. Please try again later."
  },

  // Sensitive operations - moderate strictness
  sensitive: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: "Too many sensitive operations. Please slow down."
  },

  // General API endpoints - more lenient
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: "Rate limit exceeded. Please try again later."
  },

  // Webhook endpoints - very lenient but need protection against spam
  webhook: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
    message: "Webhook rate limit exceeded."
  }
};

// Interface for tracking rate limit data
interface RateLimitData {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// In-memory store for rate limiting data
// In production, consider using Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitData>();

// Cleanup interval to remove expired entries
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Set up cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (now - data.firstRequest > MAX_AGE) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

// Extract client IP from request
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  const xClientIP = request.headers.get('x-client-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  if (xClientIP) {
    return xClientIP;
  }

  // Fallback to request IP
  return request.ip || 'unknown';
}

// Generate a unique key for rate limiting
function generateRateLimitKey(ip: string, endpoint: string, identifier?: string): string {
  const parts = [ip, endpoint];
  if (identifier) {
    parts.push(identifier);
  }
  return parts.join(':');
}

// Main rate limiting function
export function createRateLimiter(config: RateLimitConfig) {
  return async function rateLimit(
    request: NextRequest,
    options?: {
      endpoint?: string;
      identifier?: string;
      skipSuccessfulRequests?: boolean;
    }
  ): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    response?: NextResponse;
  }> {
    const ip = getClientIP(request);
    const endpoint = options?.endpoint || 'unknown';
    const key = generateRateLimitKey(ip, endpoint, options?.identifier);
    const now = Date.now();

    // Get or create rate limit data
    let rateLimitData = rateLimitStore.get(key);

    if (!rateLimitData) {
      rateLimitData = {
        count: 0,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
      rateLimitStore.set(key, rateLimitData);
    }

    // Check if the window has expired
    if (now > rateLimitData.resetTime) {
      rateLimitData = {
        count: 0,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
      rateLimitStore.set(key, rateLimitData);
    }

    // Increment request count
    rateLimitData.count++;

    const remaining = Math.max(0, config.maxRequests - rateLimitData.count);

    // Log rate limiting events for monitoring
    if (rateLimitData.count === 1) {
      console.log(`Rate limit tracking started for ${key} (max: ${config.maxRequests}/${config.windowMs}ms)`);
    }

    if (rateLimitData.count > config.maxRequests) {
      console.warn(`Rate limit exceeded for ${key}: ${rateLimitData.count}/${config.maxRequests}`);

      const response = NextResponse.json(
        {
          error: config.message || "Rate limit exceeded",
          limit: config.maxRequests,
          remaining: 0,
          resetTime: Math.ceil(rateLimitData.resetTime / 1000)
        },
        { status: 429 }
      );

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitData.resetTime / 1000).toString());
      response.headers.set('Retry-After', Math.ceil((rateLimitData.resetTime - now) / 1000).toString());

      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: rateLimitData.resetTime,
        response
      };
    }

    return {
      success: true,
      limit: config.maxRequests,
      remaining,
      resetTime: rateLimitData.resetTime
    };
  };
}

// Convenience functions for different endpoint types
export const rateLimitAuth = createRateLimiter(RATE_LIMIT_PRESETS.auth);
export const rateLimitSensitive = createRateLimiter(RATE_LIMIT_PRESETS.sensitive);
export const rateLimitGeneral = createRateLimiter(RATE_LIMIT_PRESETS.general);
export const rateLimitWebhook = createRateLimiter(RATE_LIMIT_PRESETS.webhook);

// Middleware function to apply rate limiting to API routes
export async function applyRateLimit(
  request: NextRequest,
  type: keyof typeof RATE_LIMIT_PRESETS,
  options?: {
    endpoint?: string;
    identifier?: string;
  }
): Promise<{
  success: boolean;
  response?: NextResponse;
}> {
  const config = RATE_LIMIT_PRESETS[type];
  const rateLimiter = createRateLimiter(config);

  const result = await rateLimiter(request, options);

  if (!result.success && result.response) {
    return {
      success: false,
      response: result.response
    };
  }

  return { success: true };
}

// Function to add rate limit headers to successful responses
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

  return response;
}

// Determine rate limit type based on request path and method
export function determineRateLimitType(path: string, method: string): keyof typeof RATE_LIMIT_PRESETS {
  // Authentication-related endpoints
  if (path.includes('/sync-user') || path.includes('/auth/')) {
    return 'auth';
  }

  // Sensitive operations (POST/PUT/DELETE on important resources)
  if (path.includes('/credentials/') ||
      path.includes('/workflows/') ||
      path.includes('/webhooks/')) {
    return 'sensitive';
  }

  // Webhook endpoints
  if (path.includes('/webhooks/')) {
    return 'webhook';
  }

  // General API endpoints
  return 'general';
}

// Get rate limiting statistics for monitoring
export function getRateLimitStats(): {
  totalEntries: number;
  entriesByEndpoint: Record<string, number>;
  activeEntries: number;
} {
  const now = Date.now();
  let activeEntries = 0;
  const entriesByEndpoint: Record<string, number> = {};

  for (const [key, data] of rateLimitStore.entries()) {
    const parts = key.split(':');
    const endpoint = parts[1] || 'unknown';
    entriesByEndpoint[endpoint] = (entriesByEndpoint[endpoint] || 0) + 1;

    if (now <= data.resetTime) {
      activeEntries++;
    }
  }

  return {
    totalEntries: rateLimitStore.size,
    entriesByEndpoint,
    activeEntries
  };
}