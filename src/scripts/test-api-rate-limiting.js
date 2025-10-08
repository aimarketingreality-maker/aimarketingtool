/**
 * API Rate Limiting Test Script
 *
 * This script tests the actual API endpoints to verify rate limiting is working.
 * Run this script while the development server is running.
 *
 * Usage: node src/scripts/test-api-rate-limiting.js
 */

const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_ENDPOINTS = [
  {
    name: 'Authentication (sync-user)',
    path: '/api/sync-user',
    method: 'POST',
    body: {},
    headers: {},
    maxRequests: 5
  },
  {
    name: 'General API (funnels list)',
    path: '/api/funnels',
    method: 'GET',
    headers: {},
    maxRequests: 100
  }
];

// Make HTTP request
function makeRequest(endpoint, authToken = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Rate-Limit-Test-Script/1.0',
        ...endpoint.headers
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);

    if (endpoint.body) {
      req.write(JSON.stringify(endpoint.body));
    }

    req.end();
  });
}

// Test rate limiting for an endpoint
async function testEndpointRateLimit(endpoint) {
  console.log(`\n=== Testing ${endpoint.name} ===`);
  console.log(`Endpoint: ${endpoint.method} ${endpoint.path}`);
  console.log(`Expected limit: ${endpoint.maxRequests} requests/minute\n`);

  const results = [];
  let hitLimit = false;

  // Make requests until we hit the limit or reach a reasonable max
  const maxTestRequests = Math.min(endpoint.maxRequests + 3, 15);

  for (let i = 1; i <= maxTestRequests; i++) {
    try {
      const result = await makeRequest(endpoint);
      const rateLimitHeaders = {
        limit: result.headers['x-ratelimit-limit'],
        remaining: result.headers['x-ratelimit-remaining'],
        reset: result.headers['x-ratelimit-reset']
      };

      results.push({
        request: i,
        status: result.status,
        rateLimitHeaders,
        hitLimit: result.status === 429
      });

      console.log(`Request ${i}: Status ${result.status} | Remaining: ${rateLimitHeaders.remaining || 'N/A'} | Limit: ${rateLimitHeaders.limit || 'N/A'}`);

      if (result.status === 429) {
        console.log(`  ⚠️  Rate limit hit! ${result.data}`);
        hitLimit = true;
        break;
      }

      if (i >= endpoint.maxRequests && !hitLimit) {
        console.log(`  ℹ️  Reached expected limit without hitting rate limit`);
        break;
      }

    } catch (error) {
      console.error(`Request ${i}: Error - ${error.message}`);
      break;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Analyze results
  const successRequests = results.filter(r => r.status < 400).length;
  const rateLimitedRequests = results.filter(r => r.hitLimit).length;

  console.log(`\nResults Summary:`);
  console.log(`  Successful requests: ${successRequests}`);
  console.log(`  Rate limited requests: ${rateLimitedRequests}`);
  console.log(`  Rate limiting working: ${rateLimitedRequests > 0 ? '✅ Yes' : '❓ Not detected'}`);

  return {
    endpoint: endpoint.name,
    successRequests,
    rateLimitedRequests,
    working: rateLimitedRequests > 0
  };
}

// Main test function
async function runApiTests() {
  console.log('🚀 Starting API Rate Limiting Tests');
  console.log('Make sure the development server is running on http://localhost:3000');

  // Test each endpoint
  const results = [];

  for (const endpoint of TEST_ENDPOINTS) {
    try {
      const result = await testEndpointRateLimit(endpoint);
      results.push(result);
    } catch (error) {
      console.error(`Failed to test ${endpoint.name}:`, error.message);
      results.push({
        endpoint: endpoint.name,
        successRequests: 0,
        rateLimitedRequests: 0,
        working: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));

  const workingEndpoints = results.filter(r => r.working).length;
  const totalEndpoints = results.length;

  console.log(`Endpoints tested: ${totalEndpoints}`);
  console.log(`Rate limiting working: ${workingEndpoints}/${totalEndpoints}`);

  if (workingEndpoints === totalEndpoints) {
    console.log('🎉 All endpoints have rate limiting properly configured!');
  } else {
    console.log('⚠️  Some endpoints may not have rate limiting enabled.');
  }

  console.log('\nDetailed Results:');
  results.forEach(result => {
    const status = result.working ? '✅' : '❌';
    const name = result.error ? `${result.endpoint} (Error)` : result.endpoint;
    console.log(`  ${status} ${name}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  });
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest({
      path: '/api/health',
      method: 'GET',
      headers: {}
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Run tests
async function main() {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.error('❌ Server is not running on http://localhost:3000');
    console.error('Please start the development server with: npm run dev');
    process.exit(1);
  }

  await runApiTests();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Test interrupted by user');
  process.exit(0);
});

// Run the tests
if (require.main === module) {
  main().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { runApiTests, testEndpointRateLimit };