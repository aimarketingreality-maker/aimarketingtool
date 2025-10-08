# Rate Limiting Implementation

This document describes the rate limiting implementation for the AI Marketing Tool API endpoints.

## Overview

The rate limiting system protects API endpoints from brute force attacks and abuse while maintaining good user experience for legitimate users. It uses in-memory storage with automatic cleanup and supports different rate limits for different endpoint types.

## Features

- **In-memory rate limiting** using JavaScript Map
- **Different rate limits** for different endpoint types
- **Automatic cleanup** of expired entries
- **Proper HTTP headers** (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- **IP-based tracking** with support for various proxy headers
- **Endpoint-specific tracking** to prevent cross-contamination
- **Statistics and monitoring** capabilities

## Rate Limiting Rules

| Endpoint Type | Max Requests | Time Window | Use Cases |
|---------------|--------------|-------------|-----------|
| **Authentication** | 5 requests | 1 minute | `/api/sync-user`, login attempts |
| **Sensitive Operations** | 10 requests | 1 minute | Funnel creation, component creation |
| **General API** | 100 requests | 1 minute | Data retrieval, general operations |
| **Webhooks** | 1000 requests | 1 minute | Incoming webhook processing |

## Implementation Details

### Core Components

1. **Rate Limiting Middleware** (`src/lib/rate-limiting.ts`)
   - Main rate limiting logic
   - Configuration presets
   - IP extraction utilities
   - Statistics tracking

2. **API Route Integration**
   - Applied to authentication endpoints
   - Applied to funnel management endpoints
   - Applied to component management endpoints

### Key Functions

#### `createRateLimiter(config: RateLimitConfig)`
Creates a rate limiter function with the specified configuration.

#### `applyRateLimit(request: NextRequest, type: RateLimitType, options?: RateLimitOptions)`
Applies rate limiting to a request with automatic endpoint detection.

#### `addRateLimitHeaders(response: NextResponse, limit: number, remaining: number, resetTime: number)`
Adds rate limiting headers to successful responses.

### IP Detection

The system uses multiple headers to detect the real client IP address:
1. `x-forwarded-for` - Standard proxy header
2. `x-real-ip` - Nginx proxy header
3. `cf-connecting-ip` - Cloudflare header
4. `x-client-ip` - Custom header
5. Falls back to `request.ip`

## Protected Endpoints

### Authentication Endpoints
- `POST /api/sync-user` - Rate limit: 5 requests/minute

### Funnel Management
- `GET /api/funnels` - Rate limit: 100 requests/minute
- `POST /api/funnels` - Rate limit: 10 requests/minute

### Component Management
- `GET /api/pages/[pageId]/components` - Rate limit: 100 requests/minute
- `POST /api/pages/[pageId]/components` - Rate limit: 10 requests/minute
- `PUT /api/pages/[pageId]/components` - Rate limit: 10 requests/minute

## Response Headers

When rate limiting is active, responses include these headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
Retry-After: 45
```

## Error Response

When rate limits are exceeded, the API returns:

```json
{
  "error": "Too many authentication attempts. Please try again later.",
  "limit": 5,
  "remaining": 0,
  "resetTime": 1640995200
}
```

HTTP Status: `429 Too Many Requests`

## Testing

### Unit Tests
Run the comprehensive test suite:

```bash
npx tsx src/scripts/test-rate-limiting.ts
```

### API Integration Tests
Test the actual API endpoints (requires running server):

```bash
node src/scripts/test-api-rate-limiting.js
```

### Manual Testing
You can also test manually using curl:

```bash
# Test authentication endpoint (will be rate limited after 5 requests)
for i in {1..7}; do
  curl -i -X POST http://localhost:3000/api/sync-user \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer your-token-here" \
    -d '{}'
  echo ""
done
```

## Configuration

### Custom Rate Limits

To add custom rate limits for new endpoints:

```typescript
import { applyRateLimit } from "@/lib/rate-limiting";

// In your API route
export async function POST(request: NextRequest) {
  const rateLimitResult = await applyRateLimit(request, 'sensitive', {
    endpoint: '/api/custom-endpoint',
    identifier: 'custom-operation'
  });

  if (!rateLimitResult.success && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  // Continue with your route logic...
}
```

### Custom Rate Limiter

For more specific requirements, create a custom rate limiter:

```typescript
import { createRateLimiter } from "@/lib/rate-limiting";

const customLimiter = createRateLimiter({
  windowMs: 30 * 1000, // 30 seconds
  maxRequests: 20,
  message: "Custom rate limit exceeded"
});
```

## Monitoring

### Statistics
Get current rate limiting statistics:

```typescript
import { getRateLimitStats } from "@/lib/rate-limiting";

const stats = getRateLimitStats();
console.log(`Active entries: ${stats.activeEntries}`);
console.log(`Total entries: ${stats.totalEntries}`);
```

### Logging
Rate limiting events are automatically logged:
- Rate limit tracking started
- Rate limits exceeded
- Cleanup operations

## Production Considerations

### Memory Usage
- Current implementation uses in-memory storage
- Automatic cleanup prevents memory leaks
- Consider Redis for distributed deployments

### Scaling
- For multi-server deployments, consider using Redis or similar
- The current implementation works well for single-server deployments

### Performance
- Minimal overhead per request
- Efficient Map-based storage
- Automatic cleanup prevents memory growth

## Security Considerations

1. **IP Spoofing**: The system trusts proxy headers, ensure your reverse proxy is properly configured
2. **Memory Exhaustion**: Automatic cleanup prevents memory-based DoS attacks
3. **Rate Limit Bypass**: Multiple requests from different IPs will have separate limits
4. **Logging**: Rate limit events are logged for monitoring and detection

## Future Enhancements

1. **Redis Integration**: For distributed rate limiting
2. **User-based Limits**: Rate limiting by authenticated user ID
3. **Adaptive Rate Limiting**: Dynamic limits based on traffic patterns
4. **Rate Limit Whitelisting**: Skip rate limiting for trusted IPs
5. **Custom Rate Limit Policies**: More granular control over rate limiting rules

## Troubleshooting

### Common Issues

1. **Rate Limiting Too Aggressive**: Adjust the `maxRequests` in the presets
2. **Rate Limiting Not Working**: Ensure the middleware is properly integrated
3. **Memory Usage**: Monitor the cleanup process and adjust intervals if needed
4. **IP Detection Issues**: Check proxy configuration and headers

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=rate-limiting npm run dev
```

This will provide detailed logs about rate limiting decisions.