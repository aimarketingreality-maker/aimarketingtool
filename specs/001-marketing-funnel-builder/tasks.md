---
description: "Updated task list for Marketing Funnel Builder with n8n Integration - Code Quality & Security Focus"
---

# Tasks: Marketing Funnel Builder with n8n Integration - Updated

**Input**: Design documents from `/specs/001-marketing-funnel-builder/` and Code Quality Review (Oct 8, 2025)
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Critical testing focus - Integration tests, API endpoint tests, security tests

**Organization**: Tasks organized by priority and user story with emphasis on code quality, security, and production readiness

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- **[CRITICAL]**: High priority security/stability issues that must be addressed immediately
- Include exact file paths in descriptions

## Path Conventions
- **Next.js App Router**: `src/app/`, `src/components/`, `src/lib/`, `tests/`
- **Database**: PostgreSQL with Supabase migrations
- **API**: RESTful endpoints in `src/app/api/`

## Current Implementation Status ✅ (Updated Oct 8, 2025)

**Core MVP Functionality**: **SUBSTANTIALLY COMPLETED**
- ✅ Next.js 15 + React 19 + TypeScript 5.x project initialized
- ✅ Tailwind CSS v4 and development tools configured
- ✅ Supabase project with Row Level Security (RLS) enabled
- ✅ Database schema executed and working
- ✅ Authentication system with Supabase Auth functional
- ✅ Funnel creation, page management, and template selection working
- ✅ Builder canvas with navigation operational
- ✅ Mailchimp credential service implemented
- ✅ n8n workflow template system created
- ✅ Workflow management API endpoints built
- ✅ Funnel publishing API with workspace isolation

**Progress Summary**: **45/140 tasks completed** (32% overall progress)
- **Phase 1 (Setup)**: 6/6 completed ✅
- **Phase 2 (Foundational)**: 11/11 completed ✅
- **Phase 3 (User Story 1)**: 28/36 completed (78% - MVP nearly complete)
- **Advanced Features**: Mailchimp, n8n workflows, workflow APIs completed ✅

**Critical Issues Identified**: 🚨 **HIGH PRIORITY FIXES NEEDED**
- 🚨 Deprecated authentication middleware using @supabase/auth-helpers-nextjs
- 🚨 Redundant Supabase client creation in API routes
- 🚨 Missing input validation and sanitization
- 🚨 Lack of comprehensive testing coverage
- ⚠️ Loose typing in component configurations
- ⚠️ Missing rate limiting and security headers

---

## Phase 1: Code Quality & Security Critical Fixes 🚨

### T115 [CRITICAL] [US1] Update authentication middleware to use @supabase/ssr
**File**: `src/middleware.ts`
- Replace deprecated `@supabase/auth-helpers-nextjs` with `@supabase/ssr`
- Update createMiddlewareClient to use new pattern from @supabase/ssr
- Ensure session management remains consistent
- Test authentication flows after migration
- Update package.json dependencies

### T116 [CRITICAL] [US1] Remove redundant Supabase client creation in API routes
**File**: `src/app/api/funnels/route.ts` (lines 16-19)
- Remove redundant `createClient` call in authenticateRequest function
- Use existing `supabaseAdmin` client from `@/lib/db` for token validation
- Update authentication pattern across all API routes
- Ensure security permissions remain properly enforced
- Test authentication in all API endpoints

### T117 [CRITICAL] [US1] Install and configure Zod for input validation
**Files**: Multiple
- Install Zod package: `npm install zod`
- Create validation schemas for all API request/response types
- Add input validation middleware or utilities
- Update all API routes to use Zod validation
- Create common validation patterns for reusable validation

### T118 [P] [US1] Create comprehensive input validation schemas
**File**: `src/lib/validation/schemas.ts`
- Define Zod schemas for funnel creation/update requests
- Define schemas for page creation/update requests
- Define schemas for component configuration validation
- Define schemas for user authentication requests
- Define schemas for workflow configuration
- Add sanitization rules for security (XSS, SQL injection prevention)

### T119 [P] [US1] Update API routes with input validation
**Files**: All API route files
- Update funnel API routes with Zod validation
- Update page API routes with Zod validation
- Update component API routes with Zod validation
- Update authentication routes with Zod validation
- Update workflow API routes with Zod validation
- Add proper error responses for validation failures

### T120 [CRITICAL] [US1] Implement rate limiting for authentication endpoints
**File**: `src/lib/rate-limiting.ts`
- Create rate limiting middleware using Redis or in-memory store
- Apply rate limiting to `/api/auth/*` endpoints
- Apply rate limiting to sensitive API endpoints
- Configure appropriate limits (e.g., 5 requests per minute for auth)
- Add proper rate limit headers and error responses

### T121 [CRITICAL] [US1] Add security headers and CSRF protection
**File**: `src/middleware.ts` and `src/lib/security.ts`
- Implement security headers middleware (CSP, HSTS, etc.)
- Add CSRF token validation for state-changing operations
- Implement proper CORS configuration
- Add content-type validation for API requests
- Implement request origin validation

---

## Phase 2: Testing Infrastructure & Coverage

### T122 [CRITICAL] [Setup] Set up comprehensive testing framework
**Files**: Multiple
- Ensure Jest and React Testing Library are properly configured
- Configure Supabase testing utilities with mock data
- Set up test database isolation and cleanup
- Configure environment variables for testing
- Create test helper utilities for authentication and API testing

### T123 [P] [Setup] Create API endpoint test suite
**File**: `tests/api/`
- Create tests for all funnel API endpoints
- Create tests for all page API endpoints
- Create tests for all component API endpoints
- Create tests for authentication flows
- Create tests for workflow API endpoints
- Test error scenarios and edge cases

### T124 [P] [Setup] Create authentication and authorization tests
**File**: `tests/auth/`
- Test JWT token generation and validation
- Test user registration and login flows
- Test workspace-based access control
- Test role-based permissions
- Test session management and expiry
- Test security scenarios (invalid tokens, etc.)

### T125 [P] [Setup] Create database integration tests
**File**: `tests/database/`
- Test database schema constraints
- Test Row Level Security (RLS) policies
- Test foreign key relationships and cascading deletes
- Test database transaction handling
- Test data validation at database level
- Test concurrent database operations

### T126 [P] [Setup] Create workflow execution tests
**File**: `tests/workflows/`
- Test n8n workflow template instantiation
- Test workflow execution triggers
- Test workflow error handling and retry logic
- Test webhook handling and processing
- Test integration with external services (Mailchimp, etc.)
- Test workflow status tracking and monitoring

---

## Phase 3: Performance & Type Safety Improvements

### T127 [P] [US1] Define strict TypeScript interfaces for component configurations
**File**: `src/types/components.ts`
- Replace `Record<string, any>` with specific interfaces
- Define interfaces for each component type (Hero, OptInForm, etc.)
- Add validation functions for component configuration
- Update database types to use strict interfaces
- Add runtime type checking for component configurations

### T128 [P] [US1] Optimize database queries and add indexes
**Files**: Database migrations and query files
- Analyze slow queries and add appropriate database indexes
- Optimize funnel listing with pagination limits
- Implement query result caching where appropriate
- Add database connection pooling configuration
- Optimize N+1 query issues in related data fetching

### T129 [P] [US1] Implement API response caching
**File**: `src/lib/cache.ts`
- Implement caching strategy for frequently accessed data
- Cache user profile and workspace information
- Cache template and component library data
- Implement cache invalidation strategies
- Add cache hit/miss monitoring

### T130 [P] [US1] Add structured logging and error monitoring
**File**: `src/lib/logging.ts`
- Implement structured logging with correlation IDs
- Add request tracing for debugging
- Integrate error monitoring service (e.g., Sentry)
- Add performance metrics collection
- Create error reporting dashboards

---

## Phase 4: Production Readiness & Monitoring

### T131 [P] [Setup] Create health check endpoints
**File**: `src/app/api/health/route.ts`
- Create basic health check endpoint
- Add database connectivity check
- Add external service connectivity checks
- Add system resource monitoring
- Create uptime monitoring integration

### T132 [P] [Setup] Implement comprehensive error monitoring
**File**: `src/lib/monitoring.ts`
- Integrate error tracking service (Sentry, etc.)
- Add performance monitoring
- Implement alerting for critical errors
- Create error dashboards and reporting
- Add error notification system

### T133 [P] [Setup] Configure environment-specific settings
**Files**: Multiple configuration files
- Set up production environment configuration
- Configure database connection pooling for production
- Set up CDN and static asset optimization
- Configure backup and recovery procedures
- Add environment variable validation

### T134 [P] [Setup] Add database backup and recovery procedures
**Files**: Database scripts and documentation
- Create automated database backup scripts
- Implement point-in-time recovery procedures
- Document disaster recovery procedures
- Test backup and recovery procedures
- Create monitoring for backup success/failure

---

## Phase 5: User Story 1 Completion - Lead Magnet Funnel

### T135 [P] [US1] Add real-time preview functionality to funnel builder
**File**: `src/components/builder/PreviewPanel.tsx`
- Create live preview component for funnel pages
- Implement real-time synchronization between editor and preview
- Add mobile preview options
- Test component rendering in preview mode
- Add preview sharing capabilities

### T136 [P] [US1] Create dynamic funnel rendering and public display
**Files**: `src/app/f/[workspaceSlug]/[funnelSlug]/page.tsx`
- Create public funnel page rendering system
- Implement SEO optimization for public pages
- Add analytics tracking for public pages
- Test funnel page load performance
- Add social media meta tags

### T137 [P] [US1] Implement integration testing for lead magnet funnel
**File**: `tests/integration/lead-magnet-funnel.test.ts`
- Create end-to-end test for complete lead magnet funnel flow
- Test form submission to Mailchimp integration
- Test workflow execution and tracking
- Test error scenarios in the funnel flow
- Test mobile responsiveness and accessibility

### T138 [P] [US1] Add load testing for funnel performance
**File**: `tests/performance/funnel-load.test.ts`
- Create load testing scenarios for funnel pages
- Test concurrent user handling (1000+ users)
- Test database performance under load
- Test API endpoint performance under load
- Add performance benchmarking and monitoring

---

## Phase 6: User Story 2 - Product Sales Funnel (Optional Extension)

### T139 [P] [US2] Create Stripe integration for payment processing
**File**: `src/lib/stripe.ts`
- Implement Stripe payment processing
- Create payment button components
- Add webhook handling for payment events
- Test payment flows and error handling
- Add payment analytics and reporting

### T140 [P] [US2] Implement digital product delivery system
**File**: `src/lib/product-delivery.ts`
- Create secure product access system
- Implement download protection and access control
- Add product usage tracking
- Test product delivery workflows
- Create customer support tools

---

## Phase 7: Documentation & Deployment

### T141 [P] [Setup] Create comprehensive API documentation
**File**: `docs/api/`
- Document all API endpoints with OpenAPI/Swagger
- Create authentication and authorization guides
- Add error response documentation
- Create integration examples and tutorials
- Set up interactive API documentation

### T142 [P] [Setup] Create deployment and operations documentation
**File**: `docs/deployment/`
- Document deployment procedures and checklists
- Create monitoring and alerting guides
- Document backup and recovery procedures
- Create troubleshooting guides
- Add security best practices documentation

### T143 [P] [Setup] Prepare production deployment configuration
**Files**: Deployment configuration files
- Configure production build settings
- Set up environment-specific configurations
- Configure CI/CD pipeline
- Set up production monitoring and alerting
- Create deployment rollback procedures

---

## Execution Strategy & Dependencies

### Critical Path (Must Complete Before Others)
1. **T115-T121**: Security and authentication fixes (BLOCKING)
2. **T122-T126**: Testing infrastructure setup
3. **T127-T130**: Performance and type safety improvements

### User Story 1 Completion Path
1. **T135-T138**: Complete User Story 1 functionality and testing
2. **All Phase 1-3 tasks**: Must complete before production deployment

### Parallel Execution Opportunities
- **T118-T121**: Can be developed in parallel after T115-T117
- **T123-T126**: Can be developed in parallel after T122
- **T127-T130**: Can be developed in parallel with testing tasks

### MVP Scope Recommendation
**Focus on completing**: T115-T138 for production-ready User Story 1 implementation
- Critical security fixes (T115-T121)
- Basic testing coverage (T122-T126)
- Performance optimizations (T127-T130)
- Complete User Story 1 functionality (T135-T138)

### Success Criteria
- All critical security issues resolved
- Authentication system using updated @supabase/ssr
- Comprehensive input validation implemented
- Basic test coverage (80%+ of code)
- Performance benchmarks met (<2s load time)
- User Story 1 fully functional and tested

### Risk Mitigation
- Address security vulnerabilities immediately (T115-T121)
- Implement comprehensive testing before production
- Monitor performance throughout development
- Maintain backward compatibility during updates
- Create rollback procedures for all changes

---

**Total Tasks**: 143 tasks (28 new tasks added for code quality and security)
**Estimated Timeline**: 2-3 weeks for critical fixes and testing completion
**Priority**: Address all critical security issues (T115-T121) immediately