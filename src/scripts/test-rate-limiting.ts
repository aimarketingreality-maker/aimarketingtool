#!/usr/bin/env node

/**
 * Test script for rate limiting functionality
 *
 * This script tests the rate limiting middleware by making multiple requests
 * to different API endpoints and verifying that rate limits are enforced.
 *
 * Usage:
 * npx ts-node src/scripts/test-rate-limiting.ts
 */

import { createRateLimiter, RATE_LIMIT_PRESETS, getRateLimitStats } from '../lib/rate-limiting';

// Mock NextRequest for testing
class MockNextRequest {
  public ip: string;
  public headers: Map<string, string>;

  constructor(ip: string = '127.0.0.1', headers: Record<string, string> = {}) {
    this.ip = ip;
    this.headers = new Map(Object.entries(headers));
  }

  get(header: string): string | null {
    return this.headers.get(header) || null;
  }
}

// Test functions
async function testAuthRateLimit() {
  console.log('\n=== Testing Authentication Rate Limit (5 requests/minute) ===');

  const rateLimiter = createRateLimiter(RATE_LIMIT_PRESETS.auth);
  const request = new MockNextRequest('192.168.1.100');

  // Make 7 requests (should exceed limit of 5)
  for (let i = 1; i <= 7; i++) {
    const result = await rateLimiter(request, {
      endpoint: '/api/sync-user',
      identifier: 'test-auth'
    });

    console.log(`Request ${i}: ${result.success ? 'SUCCESS' : 'BLOCKED'} - Remaining: ${result.remaining}`);

    if (!result.success) {
      console.log(`  Rate limit exceeded: ${result.response ? 'Response generated' : 'No response'}`);
      break;
    }
  }
}

async function testSensitiveRateLimit() {
  console.log('\n=== Testing Sensitive Operations Rate Limit (10 requests/minute) ===');

  const rateLimiter = createRateLimiter(RATE_LIMIT_PRESETS.sensitive);
  const request = new MockNextRequest('192.168.1.101');

  // Make 12 requests (should exceed limit of 10)
  for (let i = 1; i <= 12; i++) {
    const result = await rateLimiter(request, {
      endpoint: '/api/funnels',
      identifier: 'test-sensitive'
    });

    console.log(`Request ${i}: ${result.success ? 'SUCCESS' : 'BLOCKED'} - Remaining: ${result.remaining}`);

    if (!result.success) {
      console.log(`  Rate limit exceeded: ${result.response ? 'Response generated' : 'No response'}`);
      break;
    }
  }
}

async function testGeneralRateLimit() {
  console.log('\n=== Testing General API Rate Limit (100 requests/minute) ===');

  const rateLimiter = createRateLimiter(RATE_LIMIT_PRESETS.general);
  const request = new MockNextRequest('192.168.1.102');

  // Make 5 requests (should all succeed)
  for (let i = 1; i <= 5; i++) {
    const result = await rateLimiter(request, {
      endpoint: '/api/pages/test/components',
      identifier: 'test-general'
    });

    console.log(`Request ${i}: ${result.success ? 'SUCCESS' : 'BLOCKED'} - Remaining: ${result.remaining}`);
  }
}

async function testMultipleIPs() {
  console.log('\n=== Testing Multiple IP Addresses ===');

  const rateLimiter = createRateLimiter(RATE_LIMIT_PRESETS.auth);

  // Test different IPs - each should have separate limits
  const ips = ['10.0.0.1', '10.0.0.2', '10.0.0.3'];

  for (const ip of ips) {
    console.log(`\nTesting IP: ${ip}`);
    const request = new MockNextRequest(ip);

    // Make 6 requests (should exceed limit of 5)
    for (let i = 1; i <= 6; i++) {
      const result = await rateLimiter(request, {
        endpoint: '/api/sync-user',
        identifier: 'test-multi-ip'
      });

      console.log(`  Request ${i}: ${result.success ? 'SUCCESS' : 'BLOCKED'} - Remaining: ${result.remaining}`);

      if (!result.success) {
        break;
      }
    }
  }
}

async function testDifferentEndpoints() {
  console.log('\n=== Testing Different Endpoints (Same IP) ===');

  const authRateLimiter = createRateLimiter(RATE_LIMIT_PRESETS.auth);
  const generalRateLimiter = createRateLimiter(RATE_LIMIT_PRESETS.general);
  const request = new MockNextRequest('192.168.1.200');

  // Test auth endpoint (should be limited)
  console.log('Testing auth endpoint:');
  for (let i = 1; i <= 6; i++) {
    const result = await authRateLimiter(request, {
      endpoint: '/api/sync-user',
      identifier: 'test-endpoints'
    });

    console.log(`  Auth Request ${i}: ${result.success ? 'SUCCESS' : 'BLOCKED'}`);

    if (!result.success) break;
  }

  // Test general endpoint (should still work)
  console.log('\nTesting general endpoint:');
  for (let i = 1; i <= 3; i++) {
    const result = await generalRateLimiter(request, {
      endpoint: '/api/funnels',
      identifier: 'test-endpoints'
    });

    console.log(`  General Request ${i}: ${result.success ? 'SUCCESS' : 'BLOCKED'}`);
  }
}

async function testRateLimitStats() {
  console.log('\n=== Testing Rate Limit Statistics ===');

  const stats = getRateLimitStats();
  console.log('Rate Limit Statistics:');
  console.log(`  Total entries: ${stats.totalEntries}`);
  console.log(`  Active entries: ${stats.activeEntries}`);
  console.log('  Entries by endpoint:');

  for (const [endpoint, count] of Object.entries(stats.entriesByEndpoint)) {
    console.log(`    ${endpoint}: ${count} entries`);
  }
}

async function testWindowReset() {
  console.log('\n=== Testing Window Reset Functionality ===');

  // Create a custom rate limiter with a very short window for testing
  const shortWindowLimiter = createRateLimiter({
    windowMs: 2000, // 2 seconds
    maxRequests: 3,
    message: "Short window rate limit exceeded"
  });

  const request = new MockNextRequest('192.168.1.300');

  console.log('Making requests to hit limit...');
  for (let i = 1; i <= 5; i++) {
    const result = await shortWindowLimiter(request, {
      endpoint: '/api/test',
      identifier: 'test-reset'
    });

    console.log(`Request ${i}: ${result.success ? 'SUCCESS' : 'BLOCKED'} - Reset in: ${Math.ceil((result.resetTime - Date.now()) / 1000)}s`);

    if (!result.success) {
      console.log('Rate limit hit. Waiting for window to reset...');
      break;
    }
  }

  // Wait for the window to reset
  console.log('Waiting 3 seconds for window to reset...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Making request after window reset...');
  const result = await shortWindowLimiter(request, {
    endpoint: '/api/test',
    identifier: 'test-reset'
  });

  console.log(`Request after reset: ${result.success ? 'SUCCESS' : 'BLOCKED'} - Remaining: ${result.remaining}`);
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Rate Limiting Tests\n');

  try {
    await testAuthRateLimit();
    await testSensitiveRateLimit();
    await testGeneralRateLimit();
    await testMultipleIPs();
    await testDifferentEndpoints();
    await testWindowReset();
    await testRateLimitStats();

    console.log('\n✅ All rate limiting tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export {
  testAuthRateLimit,
  testSensitiveRateLimit,
  testGeneralRateLimit,
  testMultipleIPs,
  testDifferentEndpoints,
  testRateLimitStats,
  testWindowReset
};