<!--
Sync Impact Report:
Version change: 0.0.0 → 1.0.0 (Initial constitution creation)
Modified principles: None (new constitution)
Added sections: All sections (new constitution)
Removed sections: None (new constitution)
Templates requiring updates:
  ✅ .specify/templates/plan-template.md (checked for Constitution Check references)
  ⚠ .specify/templates/spec-template.md (needs verification for new principles)
  ⚠ .specify/templates/tasks-template.md (needs verification for new principles)
  ✅ .specify/templates/commands/*.md (checked for outdated references)
Follow-up TODOs: None (all placeholders filled)
-->

# AI Marketing Tool Constitution

## Core Principles

### I. User-First Experience Design
Every feature MUST prioritize marketer and entrepreneur user experience over technical convenience. Components MUST be conversion-optimized, mobile-responsive, and WCAG 2.1 AA compliant. Visual editors MUST be intuitive with drag-and-drop functionality, real-time preview, and clear property panels. No user should need technical knowledge to launch a complete funnel with working automation.

### II. Template-Driven Development (NON-NEGOTIABLE)
All core functionality MUST be delivered through pre-built templates. Lead Magnet Funnel, Product Sales Funnel, Webinar Registration Funnel, and Booking Funnel templates are mandatory. Each template MUST include complete page layouts AND corresponding n8n workflow templates. Customization is permitted only after template selection - no blank canvas creation allowed.

### III. n8n Workflow Integration
Every funnel component interaction MUST trigger configurable n8n workflows. Opt-in forms, payment buttons, and registration submissions MUST automatically execute corresponding workflows. Workflow templates MUST cover Mailchimp integration, Stripe payment processing, CRM synchronization, and email sequences. Multi-tenant workflow isolation is mandatory for security and reliability.

### IV. Component Architecture (Library-First)
Marketing components MUST be standalone, reusable libraries with well-defined interfaces. Hero Section, Opt-in Form, Video Embed, Testimonials, Countdown Timer, Payment Button, and Guarantee components MUST be independently testable and documented. Each component MUST support both visual editing and programmatic configuration with clear prop schemas.

### V. Performance & Reliability Standards
Published funnels MUST achieve Google PageSpeed Insights score of 85+ on mobile with average page load time under 2 seconds. The system MUST support 1,000 concurrent users with proper error handling and retry logic for n8n workflow failures. All funnel submissions MUST be processed reliably with status visibility and error recovery mechanisms.

## Technology Constraints

### Web Application Stack
Primary framework is Next.js 15 with React 19 and TypeScript 5.x. UI uses Tailwind CSS with a dark theme design system. Authentication uses Supabase Auth with PostgreSQL storage. All database operations MUST use Row Level Security (RLS) for multi-tenant data isolation.

### Integration Requirements
Core integrations MUST include Mailchimp, ConvertKit, ActiveCampaign (email providers), HubSpot and Pipedrive (CRMs), Stripe and PayPal (payment processors). MCP (Model Context Protocol) support is required for AI tool connections. All integrations MUST use official APIs with proper error handling and rate limiting compliance.

### Development Standards
Code MUST follow TypeScript strict mode with comprehensive type definitions. ESLint and Prettier configurations are mandatory. Component props MUST be fully typed with interface definitions. All API routes MUST include authentication checks and proper error responses.

## Quality Assurance

### Testing Requirements
Integration tests are mandatory for all funnel templates and n8n workflow connections. Component libraries MUST have unit tests covering all prop combinations. User flow testing MUST validate complete funnel creation, customization, workflow connection, and publication process. Performance testing MUST verify load times and concurrent user handling.

### Review Process
All changes MUST pass visual regression testing for marketing components. Template modifications MUST preserve conversion optimization principles. n8n workflow template changes MUST be tested with actual service providers. Security reviews MUST validate authentication and data isolation for multi-tenant architecture.

## Governance

This constitution supersedes all other development practices and style guides. Amendments require documentation of changes, impact analysis on existing templates/components, and migration plans for affected user funnels. All pull requests MUST verify compliance with constitutional principles using automated checks where possible.

Version updates follow semantic versioning: MAJOR for breaking changes to user workflows, MINOR for new template or component additions, PATCH for improvements and bug fixes. Template compatibility MUST be maintained across MINOR versions with clear migration guides for MAJOR version changes.

**Version**: 1.0.0 | **Ratified**: 2025-10-07 | **Last Amended**: 2025-10-07